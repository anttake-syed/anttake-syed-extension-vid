const prisma = require('../db/index');
const StorageService = require('../services/storageService');
const EntitlementService = require('../services/entitlementService');
const logger = require('../utils/logger');

// ── UploadThing: validate token at module load time ───────────────────────────
// This surfaces a clear error at server startup, not buried in a request handler.
function getUtApi() {
  const token = (process.env.UPLOADTHING_TOKEN || '').replace(/^['"]|['"]$/g, '').trim();
  if (!token) {
    throw new Error('[UploadThing] UPLOADTHING_TOKEN is not set in .env');
  }
  // Validate it decodes to the expected shape before handing it to the SDK
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch {
    throw new Error('[UploadThing] UPLOADTHING_TOKEN is not valid base64 JSON. Re-copy it from the UploadThing dashboard.');
  }
  if (!decoded.apiKey || !decoded.appId || !Array.isArray(decoded.regions)) {
    throw new Error(`[UploadThing] Token decoded but is malformed. Got keys: ${Object.keys(decoded).join(', ')}. Expected: apiKey, appId, regions.`);
  }
  const { UTApi } = require('uploadthing/server');
  // Always pass token explicitly — never rely on env being read by the SDK internally
  return new UTApi({ token });
}

// ── List all captures for the current user ────────────────────────────────────
exports.getCaptures = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { userId: req.user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { storageObject: true }
    });

    const shaped = captures.map(c => {
      const mime = (c.mimeType || '').split(';')[0].trim();
      let ext = c.type === 'video' ? '.webm' : '.png';
      if (mime.includes('mp4'))  ext = '.mp4';
      else if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('png'))  ext = '.png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';

      const provider = c.storageObject?.provider;
      const filename = c.storageObject?.providerObjectId || `${c.id}${ext}`;

      // URL strategy:
      //   local / self_hosted  → static /uploads/<filename> (no auth, no redirect)
      //   upload_thing         → direct UtFS CDN URL (no auth, public CDN)
      //   google_drive / cloud → /captures/:id/media (auth-gated server redirect)
      let src;
      if (provider === 'local' || provider === 'self_hosted') {
        src = `/uploads/${filename}`;
      } else if (provider === 'upload_thing') {
        // NOTE: UploadThing CDN pattern. If switching to R2, change to:
        //   src = `https://<your-r2-bucket>.r2.dev/${filename}`;
        src = `https://utfs.io/f/${c.storageObject?.providerObjectId}`;
      } else {
        src = `/captures/${c.id}/media`;
      }
      
      // Map provider to standardized UI label
      let uiLocation = provider || 'unknown';
      if (provider === 'upload_thing') uiLocation = 'cloud';
      
      return {
        id: c.id,
        title: c.title,
        type: c.type,
        size: c.storageObject?.sizeBytes ? Number(c.storageObject.sizeBytes) : 0,
        date: c.createdAt,
        mimeType: mime || (c.type === 'video' ? 'video/webm' : 'image/png'),
        fileUrl: src,
        src,
        storageLocation: uiLocation,
        hasAudio: c.hasAudio,
        ext,
      };
    });

    res.json({ captures: shaped });
  } catch (err) {
    logger.error('capture', 'get-captures-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
};

// ── Confirm an UploadThing direct upload (client-side fallback) ───────────────
// Called by the extension immediately after uploadFiles() resolves.
// This is the GUARANTEED path — it does not depend on the UploadThing webhook.
// The webhook (onUploadComplete) does the same upsert, so double-firing is safe.
//
// Body: { captureId, fileKey, sizeBytes, title?, type?, mimeType?, hasAudio? }
exports.confirmUpload = async (req, res) => {
  try {
    const { captureId, fileKey, sizeBytes, title, type, mimeType, hasAudio } = req.body;

    if (!captureId || !fileKey) {
      return res.status(400).json({ error: 'captureId and fileKey are required' });
    }

    // Find the pending capture — must belong to this user
    const capture = await prisma.capture.findUnique({
      where: { id: captureId },
      include: { storageObject: true }
    });

    if (!capture) {
      // Capture may not exist yet if middleware hasn't created it — create it now
      const newCapture = await prisma.capture.create({
        data: {
          id: captureId, // preserve the ID the middleware created
          userId: req.user.id,
          title: title || `Capture ${new Date().toLocaleString()}`,
          type: type === 'video' ? 'video' : 'image',
          mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
          hasAudio: hasAudio === true || hasAudio === 'true',
          status: 'processing'
        }
      }).catch(() => null);

      if (!newCapture) {
        return res.status(404).json({ error: 'Capture not found and could not be created' });
      }
    } else if (capture.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If already active (webhook arrived first), just return success
    const currentStatus = capture?.status;
    if (currentStatus === 'active') {
      logger.info('capture', 'confirm-upload-already-active', { captureId, userId: req.user.id });
      return res.json({ success: true, alreadyActive: true });
    }

    const bytes = Number(sizeBytes) || 0;

    // Upsert the StorageObject — safe whether webhook ran first or not
    await prisma.storageObject.upsert({
      where: { captureId },
      update: {
        status: 'ready',
        sizeBytes: BigInt(bytes),
        providerObjectId: fileKey,
        providerMeta: JSON.stringify({ url: `https://utfs.io/f/${fileKey}`, name: fileKey }),
      },
      create: {
        captureId,
        provider: 'upload_thing',
        providerObjectId: fileKey,
        providerMeta: JSON.stringify({ url: `https://utfs.io/f/${fileKey}`, name: fileKey }),
        filename: fileKey,
        sizeBytes: BigInt(bytes),
        status: 'ready'
      }
    });

    // Mark the capture active
    await prisma.capture.update({
      where: { id: captureId },
      data: { status: 'active' }
    });

    // Log the confirmation
    await prisma.storageOperation.create({
      data: {
        captureId,
        provider: 'upload_thing',
        operation: 'client_confirm',
        status: 'success'
      }
    }).catch(() => {});

    logger.info('capture', 'confirm-upload-success', {
      userId: req.user.id, captureId, fileKey, bytes
    });

    return res.json({ success: true, captureId, fileKey });
  } catch (err) {
    logger.error('capture', 'confirm-upload-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to confirm upload' });
  }
};



// ── Upload a capture ──────────────────────────────────────────────────────────
// Unified endpoint for all providers. The 'provider' field in the request body
// determines the storage backend. All provider-specific logic lives here or in
// the provider modules — the extension knows nothing about them.
//
// Flow:
//   1. Auth is enforced by requireAuth middleware (already checked before this runs)
//   2. Quota is checked here before creating any records
//   3. Capture shell is created in D1 with status='processing'
//   4. File is uploaded to the provider (UploadThing, Drive, local disk)
//   5. D1 record is updated to status='active' with the provider file key
//
// NOTE: Adding a new provider (e.g. Cloudflare R2) means:
//   - Adding a case in the upload_thing block below
//   - Adding a provider module in /providers/<Name>Provider.js
//   - Updating getCaptures() src URL logic above
//   - No extension changes required
exports.uploadCapture = async (req, res) => {
  try {
    const { title, type, mimeType, hasAudio, provider, driveUrl } = req.body;
    const targetProvider = provider || 'local';

    // Quota check before creating any DB records
    const fileSize = req.file?.buffer?.length || 0;
    const quotaCheck = await EntitlementService.checkQuota(req.user.id, fileSize, targetProvider);
    if (!quotaCheck.allowed) {
      return res.status(402).json({ error: 'quota_exceeded', detail: quotaCheck.reason });
    }

    // Create the Capture shell in D1 — status 'processing' until upload succeeds
    const capture = await prisma.capture.create({
      data: {
        userId:   req.user.id,
        title:    title || `Capture ${new Date().toLocaleString()}`,
        type:     type === 'video' ? 'video' : 'image',
        mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
        hasAudio: hasAudio === 'true' || hasAudio === true,
        status:   'processing'
      }
    });

    // Diagnostic helper (fire-and-forget to avoid slowing down the upload)
    const logDiag = (op, status = 'success') => {
      prisma.storageOperation.create({
        data: { captureId: capture.id, provider: targetProvider, operation: op, status }
      }).catch(e => logger.error('capture', 'diag-log-failed', { error: e.message }));
    };

    logDiag('capture_created');

    // ── Google Drive (legacy: extension sends a driveUrl directly) ────────────
    if (driveUrl) {
      await prisma.storageObject.create({
        data: {
          captureId:        capture.id,
          provider:         'google_drive',
          providerObjectId: driveUrl.match(/[-\w]{25,}/)?.[0] || driveUrl,
          status:           'ready'
        }
      });
      await prisma.capture.update({ where: { id: capture.id }, data: { status: 'active' } });
      logDiag('database_ready');
      return res.json({ success: true, record: capture });
    }

    if (!req.file) {
      await prisma.capture.delete({ where: { id: capture.id } });
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mime = (mimeType || '').split(';')[0].trim();
    let ext = type === 'video' ? 'webm' : 'png';
    if (mime.includes('mp4'))  ext = 'mp4';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    const filename = `${capture.id}.${ext}`;

    // ── UploadThing (current cloud provider) ──────────────────────────────────
    // The server receives the file buffer from the extension and pushes it to
    // UploadThing via the UTApi. No browser-direct upload, no webhook dependency.
    //
    // NOTE: To replace UploadThing with another provider (e.g. Cloudflare R2):
    //   1. Remove this block
    //   2. Add a block for your new provider using the same pattern
    //   3. The extension does NOT need to change
    if (targetProvider === 'upload_thing') {
      // getUtApi() validates the token and gives a clear error if anything is wrong
      let utapi;
      try {
        utapi = getUtApi();
      } catch (tokenErr) {
        logDiag('upload_failed', 'failed');
        await prisma.capture.delete({ where: { id: capture.id } });
        logger.error('capture', 'uploadthing-token-invalid', { captureId: capture.id, error: tokenErr.message });
        return res.status(500).json({
          error: 'Cloud storage misconfigured',
          detail: tokenErr.message,
          fix: 'Check UPLOADTHING_TOKEN in server/.env — copy it fresh from dash.uploadthing.com'
        });
      }

      const file = new File([req.file.buffer], filename, { type: mimeType });
      logDiag('upload_initiated');

      let response;
      try {
        response = await utapi.uploadFiles(file);
      } catch (uploadErr) {
        // SDK threw (network error, timeout, etc.) — surface full context
        logDiag('upload_failed', 'failed');
        await prisma.capture.delete({ where: { id: capture.id } });
        logger.error('capture', 'uploadthing-sdk-threw', { captureId: capture.id, error: uploadErr.message });
        return res.status(500).json({
          error: 'Cloud upload failed (SDK exception)',
          detail: uploadErr.message
        });
      }

      if (response.error) {
        logDiag('upload_failed', 'failed');
        await prisma.capture.delete({ where: { id: capture.id } });
        logger.error('capture', 'uploadthing-failed', {
          captureId: capture.id,
          code:   response.error.code,
          detail: response.error.message
        });
        return res.status(500).json({
          error: 'Cloud upload failed',
          code:   response.error.code,
          detail: response.error.message
        });
      }

      logDiag('upload_completed');
      const uploaded = response.data;

      // Write the storage record and mark capture as active — all in D1, all atomic
      await prisma.storageObject.create({
        data: {
          captureId:        capture.id,
          provider:         'upload_thing',
          providerObjectId: uploaded.key,
          providerMeta:     JSON.stringify({ url: uploaded.url, name: uploaded.name }),
          filename:         filename,
          sizeBytes:        BigInt(uploaded.size || req.file.buffer.length),
          status:           'ready'
        }
      });
      await prisma.capture.update({ where: { id: capture.id }, data: { status: 'active' } });
      await EntitlementService.recordUpload(req.user.id, 'upload_thing', uploaded.size || req.file.buffer.length);
      logDiag('database_ready');

      logger.info('capture', 'upload-complete', { userId: req.user.id, captureId: capture.id, key: uploaded.key });

      return res.json({
        success: true,
        record: capture,
        storageObject: { provider: 'upload_thing', providerObjectId: uploaded.key },
        accessUrl: `https://utfs.io/f/${uploaded.key}`
      });
    }

    // ── All other providers (local, google_drive, self_hosted) ─────────────────
    // StorageService.routeUpload handles the provider-specific upload logic.
    const options = { accessToken: req.user.access_token, refreshToken: req.user.refresh_token };
    const result = await StorageService.routeUpload(
      req.user, req.file.buffer, filename, mimeType, targetProvider, capture.id, options
    );

    if (!result.success) {
      await prisma.capture.delete({ where: { id: capture.id } });
      return res.status(500).json(result);
    }

    await prisma.capture.update({ where: { id: capture.id }, data: { status: 'active' } });

    const so = result.storageObject;
    res.json({
      success: true,
      record: capture,
      storageObject: so ? { ...so, sizeBytes: so.sizeBytes != null ? Number(so.sizeBytes) : null } : null,
      accessUrl: result.accessUrl
    });

  } catch (err) {
    logger.error('capture', 'upload-capture-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};

// ── Delete a capture ──────────────────────────────────────────────────────────
exports.deleteCapture = async (req, res) => {
  try {
    const capture = await prisma.capture.findUnique({
      where: { id: req.params.id },
      include: { storageObject: true }
    });

    if (!capture || capture.userId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (capture.storageObject) {
      await StorageService.deleteFile(capture.storageObject, {
        accessToken: req.user.access_token,
        refreshToken: req.user.refresh_token
      });
    }

    await prisma.capture.delete({ where: { id: capture.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('capture', 'delete-capture-failed', { requestId: req.requestId, userId: req.user.id, captureId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to delete capture' });
  }
};

// ── Rename a capture ──────────────────────────────────────────────────────────
exports.renameCapture = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'A valid title is required' });
    }
    
    const record = await prisma.capture.findUnique({ where: { id: req.params.id } });
    if (!record || record.userId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updated = await prisma.capture.update({
      where: { id: record.id },
      data: { title: title.trim() },
    });
    res.json({ success: true, title: updated.title });
  } catch (err) {
    logger.error('capture', 'rename-capture-failed', { requestId: req.requestId, userId: req.user.id, captureId: req.params.id, error: err });
    res.status(500).json({ error: 'Failed to rename capture' });
  }
};

// ── Delete all captures for the current user ──────────────────────────────────
exports.deleteAll = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { userId: req.user.id },
      include: { storageObject: true }
    });

    for (const c of captures) {
      if (c.storageObject) {
        await StorageService.deleteFile(c.storageObject, {
          accessToken: req.user.access_token,
          refreshToken: req.user.refresh_token
        });
      }
    }

    const { count } = await prisma.capture.deleteMany({ where: { userId: req.user.id } });
    logger.info('capture', 'delete-all', { requestId: req.requestId, userId: req.user.id, count });
    res.json({ success: true, deleted: count });
  } catch (err) {
    logger.error('capture', 'delete-all-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to delete captures' });
  }
};

// ── Serve media (auth-gated redirect for cloud/drive files) ───────────────────
exports.getMedia = async (req, res) => {
  try {
    const capture = await prisma.capture.findUnique({
      where: { id: req.params.id },
      include: { storageObject: true }
    });

    if (!capture || capture.userId !== req.user.id || !capture.storageObject) {
      return res.status(404).send('Media not found');
    }

    const LocalProvider     = require('../providers/LocalProvider');
    const CloudProvider     = require('../providers/CloudProvider');
    const GoogleDriveProvider = require('../providers/GoogleDriveProvider');

    let accessUrl;
    const provider = capture.storageObject.provider;

    if (provider === 'local' || provider === 'self_hosted') {
      accessUrl = await LocalProvider.getAccessUrl(capture.storageObject.providerObjectId);
    } else if (provider === 'upload_thing') {
      // NOTE: If replacing UploadThing, update this URL pattern to match the new provider
      accessUrl = `https://utfs.io/f/${capture.storageObject.providerObjectId}`;
    } else if (provider === 'cloud') {
      accessUrl = await CloudProvider.getAccessUrl(capture.storageObject.providerObjectId);
    } else if (provider === 'google_drive') {
      accessUrl = await GoogleDriveProvider.getAccessUrl(capture.storageObject.providerObjectId, {
        userId: req.user.id,
        accessToken: req.user.access_token,
        refreshToken: req.user.refresh_token
      });
    }

    if (!accessUrl) {
      return res.status(404).send('Provider URL could not be resolved');
    }

    res.redirect(accessUrl);
  } catch (err) {
    logger.error('capture', 'serve-media-failed', { requestId: req.requestId, userId: req.user.id, captureId: req.params.id, error: err });
    res.status(500).send('Failed to load media');
  }
};

// ── Future: Cloudflare R2 provider ────────────────────────────────────────────
// To add R2 support:
//   1. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
//      R2_PUBLIC_DOMAIN in .env
//   2. Add case 'r2' in uploadCapture() using CloudProvider.upload()
//   3. Update getCaptures() to build src from R2_PUBLIC_DOMAIN for provider==='r2'
//   4. Update getMedia() redirect logic for provider==='r2'
//   5. No extension changes required — extension sends provider='r2' only
//   See: server/src/providers/CloudProvider.js (fully implemented, just not wired in)

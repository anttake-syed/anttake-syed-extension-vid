const prisma = require('../db/prisma');
const storageRouter = require('../services/storageRouter');

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

      // For local files: return the direct static URL — no auth needed, no redirect
      // For cloud/drive: use the /captures/:id/media auth-gated redirect
      let src;
      if (provider === 'local' || provider === 'self_hosted') {
        src = `/uploads/${filename}`;
      } else {
        src = `/captures/${c.id}/media`;
      }
      
      return {
        id: c.id,
        title: c.title,
        type: c.type,
        size: c.storageObject?.sizeBytes ? Number(c.storageObject.sizeBytes) : 0,
        date: c.createdAt,
        mimeType: mime || (c.type === 'video' ? 'video/webm' : 'image/png'),
        fileUrl: src,
        src,
        storageLocation: provider || 'unknown',
        hasAudio: c.hasAudio,
        ext,
      };
    });

    res.json({ captures: shaped });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
};

exports.uploadCapture = async (req, res) => {
  try {
    const { title, type, mimeType, hasAudio, provider, driveUrl } = req.body;
    const targetProvider = provider || 'local';

    // 1. Create the Capture shell in the database first
    const capture = await prisma.capture.create({
      data: {
        userId: req.user.id,
        title: title || `Capture ${new Date().toLocaleString()}`,
        type: type === 'video' ? 'video' : 'image',
        mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
        hasAudio: hasAudio === 'true' || hasAudio === true,
        status: 'processing' // Will be active once upload succeeds
      }
    });

    // 2. If it's a direct Drive upload from the extension (legacy compatibility)
    if (driveUrl) {
      const storageObject = await prisma.storageObject.create({
        data: {
          captureId: capture.id,
          provider: 'google_drive',
          providerObjectId: driveUrl.match(/[-\w]{25,}/)?.[0] || driveUrl,
          status: 'ready'
        }
      });
      await prisma.capture.update({
        where: { id: capture.id },
        data: { status: 'active' }
      });
      return res.json({ success: true, record: capture, storageObject });
    }

    // 3. Otherwise, we route the file buffer through our new StorageRouter
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
    const options = { accessToken: req.user.access_token, refreshToken: req.user.refresh_token };

    const result = await storageRouter.routeUpload(
      req.user, 
      req.file.buffer, 
      filename, 
      capture.mimeType, 
      targetProvider, 
      capture.id,
      options
    );

    if (!result.success) {
      // If it failed, delete the shell capture
      await prisma.capture.delete({ where: { id: capture.id } });
      return res.status(500).json(result);
    }

    // 4. Mark capture as active
    await prisma.capture.update({
      where: { id: capture.id },
      data: { status: 'active' }
    });

    const so = result.storageObject;
    res.json({ 
      success: true, 
      record: capture, 
      storageObject: so ? { ...so, sizeBytes: so.sizeBytes != null ? Number(so.sizeBytes) : null } : null,
      accessUrl: result.accessUrl
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};

exports.deleteCapture = async (req, res) => {
  try {
    const capture = await prisma.capture.findUnique({
      where: { id: req.params.id },
      include: { storageObject: true }
    });

    if (!capture || capture.userId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Attempt to delete from provider
    if (capture.storageObject) {
      await storageRouter.deleteFile(capture.storageObject, {
        accessToken: req.user.access_token,
        refreshToken: req.user.refresh_token
      });
    }

    // Delete from DB
    await prisma.capture.delete({ where: { id: capture.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete capture error:', err);
    res.status(500).json({ error: 'Failed to delete capture' });
  }
};

exports.renameCapture = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'A valid title is required' });
    }
    
    const record = await prisma.capture.findUnique({
      where: { id: req.params.id },
    });

    if (!record || record.userId !== req.user.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updated = await prisma.capture.update({
      where: { id: record.id },
      data: { title: title.trim() },
    });
    res.json({ success: true, title: updated.title });
  } catch (err) {
    console.error('Rename capture error:', err);
    res.status(500).json({ error: 'Failed to rename capture' });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { userId: req.user.id },
      include: { storageObject: true }
    });

    for (const c of captures) {
      if (c.storageObject) {
        await storageRouter.deleteFile(c.storageObject, {
          accessToken: req.user.access_token,
          refreshToken: req.user.refresh_token
        });
      }
    }

    const { count } = await prisma.capture.deleteMany({ where: { userId: req.user.id } });
    console.log(`🗑 Deleted ${count} captures for ${req.user.email}`);
    res.json({ success: true, deleted: count });
  } catch (err) {
    console.error('Delete all captures error:', err);
    res.status(500).json({ error: 'Failed to delete captures' });
  }
};

exports.getMedia = async (req, res) => {
  try {
    const capture = await prisma.capture.findUnique({
      where: { id: req.params.id },
      include: { storageObject: true }
    });

    if (!capture || capture.userId !== req.user.id || !capture.storageObject) {
      return res.status(404).send('Media not found');
    }

    const LocalProvider = require('../providers/LocalProvider');
    const CloudProvider = require('../providers/CloudProvider');
    const GoogleDriveProvider = require('../providers/GoogleDriveProvider');

    let accessUrl;
    const provider = capture.storageObject.provider;
    
    // Dynamically get the access URL
    if (provider === 'local' || provider === 'self_hosted') {
      accessUrl = await LocalProvider.getAccessUrl(capture.storageObject.providerObjectId);
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

    // Redirect the browser to the actual file URL
    // (This avoids having to stream it through our server and handles Range requests automatically via the provider!)
    res.redirect(accessUrl);

  } catch (err) {
    console.error('Serve media error:', err);
    res.status(500).send('Failed to load media');
  }
};
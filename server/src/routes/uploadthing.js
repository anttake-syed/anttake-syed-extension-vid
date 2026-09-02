const { createUploadthing } = require("uploadthing/express");
const { UploadThingError } = require("uploadthing/server");
const EntitlementService = require("../services/entitlementService");
const AssetService = require("../services/assetService");
const prisma = require("../db/index");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const f = createUploadthing();

const uploadRouter = {
  // ── Media route: handles both PNG/JPG screenshots and WebM/MP4 videos ─────────
  // Flow:
  //   1. middleware(): JWT auth + quota check + create pending D1 asset
  //   2. Browser uploads DIRECTLY to UploadThing CDN (file bytes never touch our server)
  //   3. onUploadComplete(): UploadThing calls us back → mark D1 asset as ready
  media: f({
    video: { maxFileSize: "256MB", maxFileCount: 1 },
    image: { maxFileSize: "32MB",  maxFileCount: 1 }
  })
    .input(require('zod').z.object({
      // Client passes these so the middleware can create the correct pending asset
      title:    require('zod').z.string().optional(),
      type:     require('zod').z.enum(['video', 'image']).optional(),
      mimeType: require('zod').z.string().optional(),
      hasAudio: require('zod').z.boolean().optional(),
      sizeBytes: require('zod').z.number().optional(), // for quota check
    }).optional())
    .middleware(async ({ req, input }) => {
      try {
        // Log the incoming request context for debugging
        logger.info('uploadthing', 'middleware-start', {
          headersKeys: req.headers.keys ? Array.from(req.headers.keys()) : Object.keys(req.headers || {}),
          hasAuthorization: req.headers.get ? !!req.headers.get('authorization') : !!req.headers?.authorization,
          input
        });

        // ── 1. Authenticate via JWT from Authorization header ────────────────────
        // UploadThing v7 might pass a standard Web Request (where req.headers is a Headers object)
        // or an Express request. We support both safely.
        const authHeader = req.headers.get ? req.headers.get('authorization') : req.headers?.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UploadThingError({ code: "UNAUTHORIZED", message: "Missing bearer token" });
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        } catch (err) {
          throw new UploadThingError({ code: "UNAUTHORIZED", message: "Invalid token" });
        }

        // ── 2. Quota check BEFORE allowing the upload ────────────────────────────
        const sizeBytes = input?.sizeBytes || 0;
        const quotaCheck = await EntitlementService.checkQuota(decoded.id, sizeBytes, 'upload_thing');
        if (!quotaCheck.allowed) {
          throw new UploadThingError({ code: "FORBIDDEN", message: `Quota exceeded: ${quotaCheck.reason}` });
        }

        // ── 3. Create pending D1 asset BEFORE the upload starts ──────────────────
        const { capture } = await AssetService.createPendingAsset(
          { id: decoded.id },
          input?.title || `Capture ${new Date().toLocaleString()}`,
          input?.type  || 'video',
          input?.mimeType || 'application/octet-stream',
          input?.hasAudio ?? false,
          'upload_thing'
        );

        // Record the upload-intent timestamp for diagnostics
        await prisma.storageOperation.create({
          data: {
            captureId: capture.id,
            provider:  'upload_thing',
            operation: 'upload_intent',
            status:    'pending'
          }
        }).catch(() => {}); // non-fatal

        logger.info('uploadthing', 'upload-intent', {
          userId: decoded.id, captureId: capture.id, sizeBytes
        });

        // Return metadata — UploadThing passes this to onUploadComplete
        return { userId: decoded.id, captureId: capture.id };
      } catch (err) {
        logger.error('uploadthing', 'middleware-error', { error: err.message, stack: err.stack });
        
        // If it's already an UploadThingError, throw it directly
        if (err.name === 'UploadThingError' || err instanceof UploadThingError) {
          throw err;
        }

        // Otherwise, wrap it so the frontend sees the exact failure string
        throw new UploadThingError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Middleware failed: ${err.message}`
        });
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // ── 4. Callback: UploadThing tells us the upload succeeded ───────────────
      // Mark the D1 asset as ready. This is the ONLY place we write the
      // UploadThing file key and actual size into D1.
      try {
        await AssetService.markAssetReady(
          metadata.captureId,
          { id: metadata.userId },
          file.key,
          file.size,
          { url: file.url, name: file.name }
        );

        logger.info('uploadthing', 'upload-complete', {
          userId: metadata.userId,
          captureId: metadata.captureId,
          fileKey: file.key,
          sizeBytes: file.size,
          url: file.url
        });

        // Return captureId to the client SDK — the extension reads this from
        // uploadedFile.serverData.captureId to call /captures/confirm-upload
        return { captureId: metadata.captureId };

      } catch (err) {
        // Mark the pending capture as failed so cleanup jobs can find it
        await prisma.capture.update({
          where: { id: metadata.captureId },
          data: { status: 'failed' }
        }).catch(() => {});

        logger.error('uploadthing', 'upload-complete-error', {
          userId: metadata.userId,
          captureId: metadata.captureId,
          error: err
        });
      }
    }),
};

module.exports = { uploadRouter };

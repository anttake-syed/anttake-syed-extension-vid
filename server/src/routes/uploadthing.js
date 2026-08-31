const { createUploadthing, createRouteHandler } = require("uploadthing/express");
const EntitlementService = require("../services/entitlementService");
const AssetService = require("../services/assetService");
const jwt = require("jsonwebtoken");

const f = createUploadthing();

const uploadRouter = {
  // Define a media route
  media: f({ video: { maxFileSize: "256MB", maxFileCount: 1 }, image: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async ({ req, res }) => {
      // 1. Authenticate
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error("Unauthorized");
      }
      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      } catch (err) {
        throw new Error("Invalid token");
      }

      // 2. We can't know the exact file size before UploadThing starts,
      // but UploadThing enforces the maxFileSize.
      // We can do a basic quota check here.
      const quotaCheck = await EntitlementService.checkQuota(decoded.id, 0, 'upload_thing');
      if (!quotaCheck.allowed) {
        throw new Error("Quota exceeded");
      }

      // Create a pending asset
      const { capture } = await AssetService.createPendingAsset(
        { id: decoded.id },
        "UploadThing Capture",
        "video", // or image, we update it later
        "application/octet-stream",
        true,
        "upload_thing"
      );

      return { userId: decoded.id, captureId: capture.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This is the webhook confirming the upload
      await AssetService.markAssetReady(
        metadata.captureId,
        { id: metadata.userId },
        file.key,
        file.size,
        { url: file.url }
      );
      
      console.log(`Upload complete for userId: ${metadata.userId}, file: ${file.url}`);
    }),
};

module.exports = {
  uploadRouter
};

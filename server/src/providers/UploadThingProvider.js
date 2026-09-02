/**
 * UploadThingProvider.js — DEPRECATED / DEAD CODE
 *
 * This class is no longer used. All UploadThing uploads are handled
 * directly inside captureController.js via getUtApi(), which:
 *   - Validates the UPLOADTHING_TOKEN at call time with a clear human-readable error
 *   - Always passes the token explicitly (never relies on env being read by the SDK)
 *   - Gives deterministic error messages for token format vs network failures
 *
 * This file is kept for reference only. Do NOT import it anywhere.
 *
 * If switching to Cloudflare R2 in the future:
 *   - Use server/src/providers/CloudProvider.js (already has full R2 implementation)
 *   - Add an 'r2' case in captureController.uploadCapture()
 *   - Update getCaptures() src URL logic in captureController.js
 *   - No extension changes required
 */

// module.exports = null; // intentionally empty

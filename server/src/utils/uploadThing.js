// ── UploadThing: validate token at call time ───────────────────────────────
// Shared between captureController.js (uploads) and UploadThingProvider.js
// (deletes) so both surfaces get the same clear, human-readable token errors.
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

module.exports = { getUtApi };

// background/upload.js — AntCapture V2
// Handles uploading blobs to the server via the unified /upload endpoint.
// The 'provider' field tells the server where to store the file:
//   'local'        → saves to /uploads folder on server disk (offline, self-hosted)
//   'cloud'        → saves to UploadThing (requires subscription)
//   'google_drive' → saves to the user's personal Google Drive

import { DEV_SERVER_URL, PROD_SERVER_URL } from '../shared/config.js';
import { Logger } from '../shared/logger.js';
import { genUploader } from '../shared/uploadthingClient.js';

const log = Logger.getLogger('Background: Upload');

/**
 * Resolves the correct API server URL based on the upload destination.
 */
export function getServerUrl(destination) {
  return destination === 'localhost' ? DEV_SERVER_URL : PROD_SERVER_URL;
}

/**
 * Derives the correct file extension and clean MIME type from a raw format/MIME string.
 */
export function resolveVideoMeta(type, format) {
  const baseMime = (format || '').split(';')[0].trim();
  let ext = type === 'video' ? 'webm' : 'png';
  if (type === 'video') {
    if (baseMime.includes('mp4'))       ext = 'mp4';
    else if (baseMime.includes('webm')) ext = 'webm';
  }
  const mimeType = type === 'video' ? `video/${ext}` : 'image/png';
  return { ext, mimeType };
}

/**
 * Uploads a Blob to the server using the V2 unified /upload endpoint.
 *
 * @param {Blob} blob
 * @param {'image'|'video'} type
 * @param {'localhost'|'cloud'|'drive-only'} destination — legacy compat param
 * @param {string} jwt — JWT for authentication
 * @param {number|null} resolution — e.g. 720
 * @param {string|null} format — MIME type string
 * @param {string|null} customFilename — optional custom filename
 * @param {boolean} hasAudio — whether the capture includes audio
 */
export async function uploadToServer(blob, type, destination, jwt, resolution = null, format = null, customFilename = null, hasAudio = true) {
  const serverUrl = getServerUrl(destination);
  const { ext, mimeType } = resolveVideoMeta(type, format);

  let filename = customFilename || `capture-${Date.now()}`;
  if (!filename.endsWith(`.${ext}`)) filename += `.${ext}`;

  let sizeStr = `${(blob.size / 1048576).toFixed(2)} MB`;
  if (resolution) sizeStr = `${resolution}p • ${sizeStr}`;

  // ── Map legacy destination to V2 provider ───────────────────────────────────
  // 'localhost'   → 'local'        (saves to disk on the local server)
  // 'cloud'       → 'upload_thing' (UploadThing direct browser upload)
  // 'drive-only'  → 'google_drive' (user's own Google Drive, no server metadata)
  let provider;
  if (destination === 'localhost') {
    provider = 'local';
  } else if (destination === 'cloud') {
    provider = 'upload_thing';
  } else {
    // 'drive-only' or any other legacy value
    provider = 'google_drive';
  }

  if (provider === 'upload_thing') {
    // ── Direct browser → UploadThing upload ─────────────────────────────────
    // The file bytes go DIRECTLY to UploadThing CDN.
    // Our server only handles auth (middleware) and the completion callback.
    const { uploadFiles } = genUploader({
      url: `${serverUrl}/api/uploadthing`,
      package: 'uploadthing/client',
      fetch: globalThis.fetch.bind(globalThis), // explicitly use globalThis.fetch for service worker compat
      headers: { Authorization: `Bearer ${jwt}` } // Pass headers here so UploadThing sends them to our backend middleware
    });

    try {
      const file = new File([blob], filename, { type: mimeType });

      // UploadThing v7: pass input for metadata
      const response = await uploadFiles('media', {
        files: [file],
        // input is passed to the server middleware so it can create the correct
        // pending D1 asset with the right type/title/hasAudio/sizeBytes
        input: {
          title: customFilename || filename,
          type:  type === 'video' ? 'video' : 'image',
          mimeType,
          hasAudio: hasAudio === true,
          sizeBytes: blob.size,
        }
      });

      log.info(`✅ UploadThing direct upload complete | File: ${filename} | Key: ${response?.[0]?.key}`);
      return { success: true, response };
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('Quota exceeded') || msg.includes('quota')) {
        throw new Error('Your cloud storage is full. Please upgrade your plan.');
      }
      log.error(`UploadThing upload failed: ${msg}`);
      throw new Error(msg || 'Cloud upload failed. Check your internet connection and try again.');
    }
  }

  // ── Unified upload for ALL providers (local, google_drive) ─────────────
  // This keeps the extension simple and provider-agnostic.
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('title', filename);
  formData.append('type', type);
  formData.append('mimeType', mimeType);
  formData.append('hasAudio', hasAudio);
  formData.append('provider', provider);

  const res = await fetch(`${serverUrl}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt || 'local-mode'}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));

    // Drive is full — relay to edit.js so it can prompt to switch to Cloud
    if (data.fallbackRequired && data.reason === 'drive_full') {
      const fallbackErr = new Error(data.message || 'Google Drive is full.');
      fallbackErr.code = 'DRIVE_FULL_FALLBACK';
      throw fallbackErr;
    }

    if (data.error === 'quota_exceeded') {
      throw new Error('Your cloud storage is full. Please upgrade your plan.');
    }

    const errorMsg = data.detail || data.error || data.message || `Upload failed: ${res.status}`;
    log.error(errorMsg);
    throw new Error(errorMsg);
  }

  const result = await res.json();
  log.info(`✅ Upload complete. Provider: ${provider} | File: ${filename}`);
  return result;
}

// background/upload.js — AntCapture V2
// Sends captured blobs to the backend via POST /upload.
// The extension knows NOTHING about UploadThing, R2, or any storage provider.
// The backend decides where and how to store the file.
//
// Provider mapping (sent to server so it knows what to do):
//   'localhost'   → 'local'        — local server, saves to disk
//   'cloud'       → 'upload_thing' — server uploads to UploadThing, returns CDN URL
//   'drive-only'  → 'google_drive' — server uploads to user's Google Drive

import { DEV_SERVER_URL, PROD_SERVER_URL } from '../shared/config.js';
import { Logger } from '../shared/logger.js';

const log = Logger.getLogger('Background: Upload');

/**
 * Resolves the backend API URL.
 * In production: cloud calls go to the SaaS backend.
 * In local testing: all calls go to localhost:3001.
 *
 * NOTE: When testing Cloud Mode locally, set all providers to DEV_SERVER_URL temporarily.
 */
export function getServerUrl(provider) {
  if (provider === 'localhost' || provider === 'local') {
    return DEV_SERVER_URL;  // http://localhost:3001
  }
  return PROD_SERVER_URL;   // https://api.antcapture.anttake.com
}

/**
 * Derives the correct file extension and MIME type from format/type strings.
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
 * Uploads a captured Blob to the backend.
 *
 * The backend handles everything:
 *   - Authentication (JWT check)
 *   - Plan/quota enforcement
 *   - Creating the pending D1 record
 *   - Uploading bytes to the storage provider (UploadThing, Drive, local disk)
 *   - Marking the D1 record as ready
 *
 * The extension just sends the file and waits for success/failure.
 *
 * @param {Blob}    blob           — the captured file
 * @param {string}  type           — 'image' | 'video'
 * @param {string}  destination    — 'localhost' | 'cloud' | 'drive-only'
 * @param {string}  jwt            — user JWT for authentication
 * @param {number}  resolution     — e.g. 1080
 * @param {string}  format         — raw MIME type string from recorder
 * @param {string}  customFilename — user-chosen filename (no extension)
 * @param {boolean} hasAudio       — whether the recording has audio
 */
export async function uploadToServer(blob, type, destination, jwt, resolution = null, format = null, customFilename = null, hasAudio = true) {
  const serverUrl = getServerUrl(destination);
  const { ext, mimeType } = resolveVideoMeta(type, format);

  let filename = customFilename || `capture-${Date.now()}`;
  if (!filename.endsWith(`.${ext}`)) filename += `.${ext}`;

  // Map the extension's destination label to the backend's provider name.
  // The backend uses this to route to the right storage handler.
  let provider;
  if (destination === 'localhost') {
    provider = 'local';
  } else if (destination === 'cloud') {
    // NOTE: 'upload_thing' is the current cloud provider.
    // To switch providers later, change this value to e.g. 'r2' or 'cloudflare'
    // and add the corresponding handler in server/src/controllers/captureController.js
    provider = 'upload_thing';
  } else {
    // 'drive-only'
    provider = 'google_drive';
  }

  log.info(`Uploading ${filename} (${(blob.size / 1048576).toFixed(2)} MB) via ${provider}`);

  // Simple, flat POST — one endpoint, all providers.
  // The backend's captureController.uploadCapture() handles the rest.
  const formData = new FormData();
  formData.append('file',     blob, filename);
  formData.append('title',    customFilename || filename);
  formData.append('type',     type);
  formData.append('mimeType', mimeType);
  formData.append('hasAudio', String(hasAudio));
  formData.append('provider', provider);

  const res = await fetch(`${serverUrl}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt || 'local-mode'}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));

    // Google Drive full — relay to edit.js so it can prompt the user to switch to Cloud
    if (data.fallbackRequired && data.reason === 'drive_full') {
      const fallbackErr = new Error(data.message || 'Google Drive is full.');
      fallbackErr.code = 'DRIVE_FULL_FALLBACK';
      throw fallbackErr;
    }

    if (data.error === 'quota_exceeded') {
      throw new Error('Your cloud storage is full. Please upgrade your plan.');
    }

    const errorMsg = data.detail || data.error || data.message || `Upload failed: ${res.status}`;
    log.error(`Upload failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = await res.json();
  log.info(`✅ Upload complete. Provider: ${provider} | File: ${filename}`);
  return result;
}

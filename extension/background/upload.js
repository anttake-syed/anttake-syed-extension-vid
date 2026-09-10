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
import { genUploader } from '../shared/uploadthing-client.js';

const log = Logger.getLogger('Background: Upload');

/**
 * Resolves the backend API URL.
 * In production: cloud calls go to the SaaS backend.
 * In local testing: all calls go to localhost:3001.
 *
 * NOTE: When testing Cloud Mode locally, set all providers to DEV_SERVER_URL
 * temporarily. As of manifest.json's Chrome Web Store cleanup, localhost is
 * no longer in host_permissions/externally_connectable (it can't ship in a
 * store submission) — for local testing, add
 *   "http://localhost:3001/*", "http://localhost:5173/*"
 * back to host_permissions, and "http://localhost:5173/*" back to
 * externally_connectable.matches, in your local manifest.json only. Do not
 * commit that change.
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

    // Prefer the specific human-readable reason over a generic machine code —
    // storageService.js's catch returns { error: 'upload_failed', message: <real reason> },
    // and `data.error` used to win here, so the real cause (e.g. an expired
    // Google Drive session) was always masked by the useless "upload_failed" label.
    const errorMsg = data.detail || data.message || data.error || `Upload failed: ${res.status}`;
    log.error(`Upload failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = await res.json();
  log.info(`✅ Upload complete. Provider: ${provider} | File: ${filename}`);
  return result;
}

/**
 * Uploads a captured Blob to the backend with real-time progress reporting.
 *
 * This is used by edit.js when the user clicks "Save to Cloud" — it drives the
 * upload progress bar in the sidebar. Unlike uploadToServer() which uses fetch(),
 * this uses XMLHttpRequest which exposes upload progress events.
 *
 * Security: The UPLOADTHING_TOKEN never leaves the server. The backend receives
 * the file buffer, validates quota, creates the D1 record, and pushes to UploadThing.
 * No storage credentials are ever exposed to the browser or extension.
 *
 * @param {Blob}     blob       — the captured file
 * @param {string}   type       — 'image' | 'video'
 * @param {string}   jwt        — user JWT for authentication
 * @param {object}   opts       — { resolution, format, customFilename, hasAudio }
 * @param {Function} onProgress — called with (percent: number) during upload
 * @returns {Promise<object>}   — the server response JSON
 */
export async function uploadWithProgress(blob, type, jwt, opts = {}, onProgress = null) {
  const { resolution = null, format = null, customFilename = null, hasAudio = true } = opts;
  const { ext, mimeType } = resolveVideoMeta(type, format);

  let filename = customFilename || `capture-${Date.now()}`;
  if (!filename.endsWith(`.${ext}`)) filename += `.${ext}`;

  const serverUrl = getServerUrl('cloud');
  log.info(`uploadWithProgress (UploadThing Direct): ${filename} (${(blob.size / 1048576).toFixed(2)} MB)`);

  const { uploadFiles } = genUploader({
    url: `${serverUrl}/api/uploadthing`,
    package: "antcapture-extension"
  });

  try {
    const file = new File([blob], filename, { type: mimeType });
    const response = await uploadFiles("media", {
      files: [file],
      input: {
        title: customFilename || filename,
        type: type,
        mimeType: mimeType,
        hasAudio: Boolean(hasAudio),
        sizeBytes: blob.size,
      },
      headers: {
        "Authorization": `Bearer ${jwt}`,
      },
      onUploadProgress: ({ progress }) => {
        if (onProgress) onProgress(progress);
      }
    });

    log.info(`✅ UploadThing Direct Complete:`, response);

    // ── Client-side confirmation (guaranteed fallback) ────────────────────────
    // The UploadThing webhook (onUploadComplete) marks the capture active, but
    // it can fail or be delayed. We call confirm-upload ourselves so the capture
    // ALWAYS appears in the Web UI, regardless of webhook delivery.
    //
    // The server endpoint is idempotent (upsert) — safe if both paths fire.
    //
    // IMPORTANT: the caller (edit.js) uses `confirmed` to decide whether it's
    // safe to delete the local backup copy. The file bytes landing on the CDN
    // is NOT enough — the DB record must actually be activated first, or the
    // capture uploads successfully but never shows up in the library.
    const uploadedFile = Array.isArray(response) ? response[0] : response;
    let confirmed = false;
    if (uploadedFile?.key) {
      // The captureId was embedded in the upload metadata by the UT middleware.
      // The SDK returns it in the serverData field.
      const captureId = uploadedFile?.serverData?.captureId || uploadedFile?.customId;
      if (captureId) {
        const confirmBody = JSON.stringify({
          captureId,
          fileKey: uploadedFile.key,
          sizeBytes: blob.size,
          title: customFilename || filename,
          type,
          mimeType,
          hasAudio: Boolean(hasAudio),
        });

        const ATTEMPTS = 3;
        for (let attempt = 1; attempt <= ATTEMPTS && !confirmed; attempt++) {
          try {
            const confirmRes = await fetch(`${serverUrl}/captures/confirm-upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
              },
              body: confirmBody,
            });
            if (confirmRes.ok) {
              const confirmData = await confirmRes.json().catch(() => ({}));
              log.info(`✅ Confirmed upload in DB:`, confirmData);
              confirmed = true;
            } else {
              log.warn(`⚠️ confirm-upload attempt ${attempt} failed: HTTP ${confirmRes.status}`);
            }
          } catch (confirmErr) {
            log.warn(`⚠️ confirm-upload attempt ${attempt} threw:`, confirmErr.message);
          }
          if (!confirmed && attempt < ATTEMPTS) {
            await new Promise((r) => setTimeout(r, attempt * 1000));
          }
        }
        if (!confirmed) {
          log.error(`❌ Could not confirm upload after ${ATTEMPTS} attempts — webhook may still activate it, but the capture might not show up yet.`);
        }
      } else {
        log.error(`❌ No captureId returned for uploaded file — cannot confirm activation.`);
      }
    }

    return { success: true, confirmed, files: response };
  } catch (err) {
    log.error(`UploadThing Direct Failed:`, err);
    let errMsg = err.message || "Network error during upload";
    if (errMsg.includes("Quota exceeded")) errMsg = "Your cloud storage is full. Please upgrade your plan.";
    throw new Error(errMsg);
  }
}


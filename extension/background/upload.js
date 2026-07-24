// background/upload.js — AntCapture
// Handles uploading blobs to the server (localhost mode, Google Drive cloud mode, or Google Drive only).

import { DEV_SERVER_URL, PROD_SERVER_URL, IS_DEV } from '../shared/config.js';

export async function getServerUrl() {
  return IS_DEV ? DEV_SERVER_URL : PROD_SERVER_URL;
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
 * Uploads a Blob to a destination (localhost, cloud, or drive-only).
 *
 * @param {Blob} blob
 * @param {'image'|'video'} type
 * @param {'localhost'|'cloud'|'drive-only'} destination
 * @param {string} jwt  — jwt for authentication (optional/not needed for local-mode)
 * @param {number|null} resolution  — e.g. 720
 * @param {string|null} format
 * @param {string|null} customFilename  — optional custom filename
 */
export async function uploadToServer(blob, type, destination, jwt, resolution = null, format = null, customFilename = null) {
  const serverUrl = await getServerUrl();
  const { ext, mimeType } = resolveVideoMeta(type, format);
  
  let filename = customFilename || `capture-${Date.now()}`;
  if (!filename.endsWith(`.${ext}`)) filename += `.${ext}`;

  let sizeStr = `${(blob.size / 1048576).toFixed(2)} MB`;
  if (resolution) sizeStr = `${resolution}p • ${sizeStr}`;

  // ── MODE A: Self-Hosted (localhost) ───────────────────────────────────────
  if (destination === 'localhost') {
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('title', filename);
    formData.append('type', type);
    formData.append('size', sizeStr);
    formData.append('mimeType', mimeType);

    const res = await fetch(`${serverUrl}/upload/local`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt || 'local-mode'}` },
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Local upload failed: ${res.status}`;
      try { const d = await res.json(); errorMsg = d.detail || d.error || errorMsg; }
      catch { /* ignore */ }
      throw new Error(errorMsg);
    }
    return;
  }

  // ── MODE B: Google Drive (Cloud or Drive-Only) ─────────────────────────────
  // 1. Get Google Drive access token from server
  const tokenRes = await fetch(`${serverUrl}/auth/google-token`, {
    headers: { 'Authorization': `Bearer ${jwt}` },
  });
  if (!tokenRes.ok) {
    if (tokenRes.status === 401) {
      chrome.storage.local.remove('user');
    }
    throw new Error('Google session expired. Please sign out and log in again.');
  }
  const { access_token } = await tokenRes.json();

  // 2a. Upload media binary to Google Drive
  const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': mimeType },
    body: blob,
  });
  if (!driveRes.ok) {
    const errObj = await driveRes.json().catch(() => ({}));
    if (driveRes.status === 403 || errObj.error?.message?.toLowerCase().includes('quota')) {
      throw new Error('Google Drive Storage is FULL. Please upgrade or clear space to sync.');
    }
    throw new Error(`Drive upload failed: ${driveRes.statusText}`);
  }
  const { id: fileId } = await driveRes.json();

  // 2b. Set filename metadata on Drive
  const patchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: filename }),
  });
  const { webViewLink } = await patchRes.json();
  const finalDriveUrl = webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  // If destination is drive-only, we stop here and do not save server metadata
  if (destination === 'drive-only') {
    return { driveUrl: finalDriveUrl };
  }

  // 3. Save lightweight metadata to server (bypasses Vercel 4.5 MB limit)
  const metaRes = await fetch(`${serverUrl}/upload/metadata`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: filename, type, size: sizeStr, mimeType, driveUrl: finalDriveUrl }),
  });
  if (!metaRes.ok) {
    let errorMsg = `Metadata save failed: ${metaRes.status}`;
    try { const d = await metaRes.json(); errorMsg = d.detail || d.error || errorMsg; }
    catch { /* ignore */ }
    throw new Error(errorMsg);
  }
  return metaRes.json();
}

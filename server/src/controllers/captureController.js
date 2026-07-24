const { google } = require('googleapis');
const prisma = require('../db/prisma');
const { getValidOAuthClient } = require('../models/helpers');

exports.getCaptures = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      orderBy: { createdAt: 'desc' },
    });
    const shaped = captures.map(c => {
      // Derive extension from stored mimeType (strips codec params like ;codecs=vp9)
      const mime = (c.mimeType || '').split(';')[0].trim();
      let ext = c.type === 'video' ? '.webm' : '.png';
      if (mime.includes('mp4'))  {ext = '.mp4';}
      else if (mime.includes('webm')) {ext = '.webm';}
      else if (mime.includes('png'))  {ext = '.png';}
      else if (mime.includes('jpeg') || mime.includes('jpg')) {ext = '.jpg';}
      return {
        id: c.id,
        title: c.title,
        type: c.type,
        size: c.size,
        date: c.createdAt,
        mimeType: mime || (c.type === 'video' ? 'video/webm' : 'image/png'),
        fileUrl: c.fileUrl,
        src: c.fileUrl,
        driveUrl: c.driveUrl,
        storageLocation: c.storageLocation,
        ext,
      };
    });
    res.json({ captures: shaped });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
};

exports.uploadMetadata = async (req, res) => {
  try {
    const { title, type, size, mimeType, driveUrl } = req.body;
    
    if (!driveUrl) {return res.status(400).json({ error: 'driveUrl is required' });}

    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: title || `Capture ${new Date().toLocaleString()}`,
        type: type === 'video' ? 'video' : 'image',
        size: size || 'Unknown',
        mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
        fileUrl: driveUrl, // Deprecated, but keeping for schema compat
        driveUrl: driveUrl,
        storageLocation: 'drive',
      },
    });

    console.log(`✨ Metadata saved! ID: ${record.id} | User: ${req.user.email}`);
    res.json({ success: true, record });
  } catch (err) {
    console.error('Metadata save error:', err);
    res.status(500).json({ error: 'Metadata save failed', detail: err.message });
  }
};

exports.uploadLocal = async (req, res) => {
  try {
    const { title, type, size, mimeType } = req.body;
    
    if (!req.file) {
      console.log(`❌ [SYNC REJECTED] No file attached in request from ${req.user.email}`);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`\n📥 [INCOMING SYNC] Receiving local file from ${req.user.email}...`);
    console.log(`   - File Type: ${mimeType || type}`);
    console.log(`   - File Size: ${size || 'Unknown'}`);
    console.log(`   - Buffer Size: ${req.file.size} bytes`);

    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: title || `Capture ${new Date().toLocaleString()}`,
        type: type === 'video' ? 'video' : 'image',
        size: size || 'Unknown',
        mimeType: mimeType || (type === 'video' ? 'video/webm' : 'image/png'),
        fileUrl: '', // Will update after getting ID
        driveUrl: '',
        storageLocation: 'local',
        mediaData: req.file.buffer, // Save binary data directly to SQLite
      },
    });

    const fileUrl = `http://localhost:3001/captures/media/${record.id}`;

    await prisma.capture.update({
      where: { id: record.id },
      data: { fileUrl, driveUrl: fileUrl }
    });

    console.log(`✅ [SYNC SUCCESS] File saved to SQLite database!`);
    console.log(`   - DB Record ID: ${record.id}`);
    console.log(`   - Local URL: ${fileUrl}\n`);
    res.json({ success: true, record, fileUrl });
  } catch (err) {
    console.error('❌ [SYNC ERROR] Local save failed:', err);
    res.status(500).json({ error: 'Local file save failed', detail: err.message });
  }
};

// Removed deprecated sync endpoints

exports.removeDrive = async (req, res) => {
  try {
    if (!req.user.access_token) {return res.status(401).json({ error: 'No Google token' });}
    const record = await prisma.capture.findUnique({ where: { id: parseInt(req.params.id, 10), email: req.user.email } });
    if (!record || !record.driveUrl)
      {return res.status(404).json({ error: 'Capture not found or has no Drive file' });}

    const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {return res.status(400).json({ error: 'Invalid Drive URL format' });}

    const userOauth2Client = await getValidOAuthClient(req.user);
    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    await drive.files.delete({ fileId: fileIdMatch[0] });
    await prisma.capture.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove drive error:', err.message);
    res.status(500).json({ error: 'Failed to remove from Google Drive', detail: err.message });
  }
};

exports.deleteCapture = async (req, res) => {
  try {
    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!record || record.email !== req.user.email)
      {return res.status(404).json({ error: 'Not found' });}

    if (record.driveUrl && req.user.access_token) {
      try {
        const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
        if (fileIdMatch) {
          const userOauth2Client = await getValidOAuthClient(req.user);
          const drive = google.drive({ version: 'v3', auth: userOauth2Client });
          await drive.files.delete({ fileId: fileIdMatch[0] });
        }
      } catch (driveErr) {
        console.error('Drive delete failed (continuing):', driveErr.message);
      }
    }

    await prisma.capture.delete({ where: { id: record.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete capture error:', err);
    res.status(500).json({ error: 'Failed to delete capture' });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const { count } = await prisma.capture.deleteMany({ where: { email: req.user.email } });
    console.log(`🗑 Deleted ${count} captures for ${req.user.email}`);
    res.json({ success: true, deleted: count });
  } catch (err) {
    console.error('Delete captures error:', err);
    res.status(500).json({ error: 'Failed to delete captures' });
  }
};

exports.getMedia = async (req, res) => {
  try {
    // Explicit CORS headers on this endpoint — the browser's <video> element
    // sends Range requests that can bypass the global CORS middleware chain.
    // Without these, cross-origin 206 responses are silently rejected by Chrome.
    // NOTE: We rely on the global corsMiddleware for Origin and Credentials to avoid illegal combinations.
    res.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

    // Handle preflight OPTIONS request for the media endpoint
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Range');
      return res.status(204).end();
    }

    const record = await prisma.capture.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });

    if (!record || !record.mediaData) {
      return res.status(404).send('Media not found in database');
    }

    // Strip codec params: "video/webm;codecs=vp9,opus" → "video/webm"
    const rawMime = record.mimeType || (record.type === 'video' ? 'video/webm' : 'image/png');
    let mimeType = rawMime.split(';')[0].trim();

    // Prisma returns a Buffer from SQLite Bytes columns, but normalise it
    // anyway so .length, .slice() and Buffer.byteLength() are always reliable.
    const buffer = Buffer.isBuffer(record.mediaData)
      ? record.mediaData
      : Buffer.from(record.mediaData);

    const totalSize = buffer.length;

    // ── Magic Byte Sniffing (Fixes Video Previews) ─────────────────────────
    // If the file was saved as an .mp4 (for download compatibility) but is 
    // actually a WebM container (Chrome fallback), the browser <video> tag 
    // will refuse to play it if served with Content-Type: video/mp4.
    // We check the first 4 bytes for the EBML header (WebM) to serve the correct MIME.
    if (record.type === 'video' && totalSize >= 4) {
      if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
        mimeType = 'video/webm';
      }
    }

    // ── Handle Range Requests for Video Streaming ───────────────────────────
    if (req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');

      let start, end;

      if (parts[0] === '') {
        // Suffix range (e.g. bytes=-500) — used by MP4 to fetch moov atom at end
        const suffixLen = parseInt(parts[1], 10);
        start = Math.max(0, totalSize - suffixLen);
        end = totalSize - 1;
      } else {
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      }

      // Clamp to valid range
      end = Math.min(end, totalSize - 1);
      start = Math.max(0, start);

      if (start > end) {
        res.set('Content-Range', `bytes */${totalSize}`);
        return res.status(416).send('Range Not Satisfiable');
      }

      const chunkSize = end - start + 1;
      res.set({
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store',
      });
      return res.status(206).send(buffer.subarray(start, end + 1));
    }

    // ── No Range header: send entire file ───────────────────────────────────
    res.set({
      'Content-Length': totalSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store',
    });
    return res.status(200).send(buffer);

  } catch (err) {
    console.error('Serve media error:', err);
    res.status(500).send('Failed to load media');
  }
};
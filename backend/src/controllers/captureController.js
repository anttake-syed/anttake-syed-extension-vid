const { google } = require('googleapis');
const multer = require('multer');
const prisma = require('../db/prisma');
const { formatBytes, parseBytes, getValidOAuthClient } = require('../models/helpers');

exports.upload = multer({ storage: multer.memoryStorage() });

exports.getCaptures = async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { email: req.user.email },
      orderBy: { createdAt: 'desc' },
    });
    const shaped = captures.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      size: c.size,
      date: c.createdAt,
      fileUrl: c.fileUrl,
      src: c.fileUrl,
      driveUrl: c.driveUrl,
      storageLocation: c.storageLocation || 'local',
      ext: c.type === 'video' ? '.webm' : '.png',
    }));
    res.json({ captures: shaped });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
};

exports.serveFile = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const record = await prisma.capture.findUnique({ where: { id } });
    if (!record || !record.data) return res.status(404).send('File not found');
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(record.data);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Error serving file');
  }
};

exports.uploadCapture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });

    const isVideo = req.file.mimetype.startsWith('video');
    const ext = isVideo ? 'webm' : 'png';
    const filename = `capture-${Date.now()}.${ext}`;
    const backendBase = process.env.BACKEND_URL || 'https://api.antcapture.anttake.com';

    const settings = await prisma.userSettings.findUnique({ where: { email: req.user.email } });
    let storagePreference = settings?.storagePreference || 'local';
    if (storagePreference === 'both') storagePreference = 'local';

    let driveUrl = null;

    if (storagePreference === 'drive' && req.user.access_token) {
      try {
        const userOauth2Client = await getValidOAuthClient(req.user);
        const drive = google.drive({ version: 'v3', auth: userOauth2Client });
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(req.file.buffer);
        stream.push(null);
        const driveRes = await drive.files.create({
          requestBody: { name: filename },
          media: { mimeType: req.file.mimetype, body: stream },
          fields: 'id,webViewLink',
        });
        driveUrl = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveRes.data.id}/view`;
        console.log(`☁️ Saved to Google Drive for ${req.user.email}`);
      } catch (driveErr) {
        console.error('Google Drive upload error, falling back to local DB:', driveErr.message);
        storagePreference = 'local';
      }
    }

    const shouldSaveLocal = storagePreference === 'local';
    const storageLocation = storagePreference;

    const record = await prisma.capture.create({
      data: {
        email: req.user.email,
        title: `Capture ${new Date().toLocaleString()}`,
        type: isVideo ? 'video' : 'image',
        size: formatBytes(req.file.size),
        mimeType: req.file.mimetype,
        data: shouldSaveLocal ? req.file.buffer : null,
        fileUrl: '',
        driveUrl,
        storageLocation,
      },
    });

    const fileUrl = `${backendBase}/captures/${record.id}/file`;
    await prisma.capture.update({ where: { id: record.id }, data: { fileUrl } });
    record.fileUrl = fileUrl;

    console.log(`✨ Capture saved! ID: ${record.id} | Storage: ${storageLocation.toUpperCase()} | User: ${req.user.email}`);
    const { data, ...recordWithoutData } = record;
    res.json({ success: true, record: recordWithoutData });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};

exports.syncToDrive = async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    const record = await prisma.capture.findUnique({ where: { id: parseInt(req.params.id, 10), email: req.user.email } });
    if (!record || !record.data) return res.status(404).json({ error: 'Local file data not found' });
    if (record.driveUrl) return res.status(400).json({ error: 'Already synced to Drive' });

    const userOauth2Client = await getValidOAuthClient(req.user);
    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(record.data);
    stream.push(null);
    const ext = record.type === 'video' ? 'webm' : 'png';
    const driveRes = await drive.files.create({
      requestBody: { name: `capture-synced-${Date.now()}.${ext}` },
      media: { mimeType: record.mimeType, body: stream },
      fields: 'id,webViewLink',
    });
    const driveUrl = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveRes.data.id}/view`;
    await prisma.capture.update({ where: { id: record.id }, data: { driveUrl, storageLocation: 'both' } });
    res.json({ success: true, driveUrl });
  } catch (err) {
    console.error('Sync to drive error:', err.message);
    res.status(500).json({ error: 'Failed to sync to Drive', detail: err.message });
  }
};

exports.syncToLocal = async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    const record = await prisma.capture.findUnique({ where: { id: parseInt(req.params.id, 10), email: req.user.email } });
    if (!record || !record.driveUrl) return res.status(404).json({ error: 'Drive file not found' });
    if (record.data) return res.status(400).json({ error: 'Already saved locally' });

    const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) return res.status(400).json({ error: 'Invalid Drive URL format' });

    const userOauth2Client = await getValidOAuthClient(req.user);
    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    const response = await drive.files.get({ fileId: fileIdMatch[0], alt: 'media' }, { responseType: 'arraybuffer' });
    await prisma.capture.update({ where: { id: record.id }, data: { data: Buffer.from(response.data), storageLocation: 'both' } });
    res.json({ success: true });
  } catch (err) {
    console.error('Sync to local error:', err.message);
    res.status(500).json({ error: 'Failed to sync to Local DB', detail: err.message });
  }
};

exports.removeLocal = async (req, res) => {
  try {
    const record = await prisma.capture.findUnique({ where: { id: parseInt(req.params.id, 10), email: req.user.email } });
    if (!record || record.storageLocation !== 'both')
      return res.status(400).json({ error: 'File is not synced in both locations' });
    await prisma.capture.update({ where: { id: record.id }, data: { data: null, storageLocation: 'drive' } });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove local error:', err.message);
    res.status(500).json({ error: 'Failed to remove from Local DB', detail: err.message });
  }
};

exports.removeDrive = async (req, res) => {
  try {
    if (!req.user.access_token) return res.status(401).json({ error: 'No Google token' });
    const record = await prisma.capture.findUnique({ where: { id: parseInt(req.params.id, 10), email: req.user.email } });
    if (!record || record.storageLocation !== 'both')
      return res.status(400).json({ error: 'File is not synced in both locations' });

    const fileIdMatch = record.driveUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) return res.status(400).json({ error: 'Invalid Drive URL format' });

    const userOauth2Client = await getValidOAuthClient(req.user);
    const drive = google.drive({ version: 'v3', auth: userOauth2Client });
    await drive.files.delete({ fileId: fileIdMatch[0] });
    await prisma.capture.update({ where: { id: record.id }, data: { driveUrl: null, storageLocation: 'local' } });
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
      return res.status(404).json({ error: 'Not found' });

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
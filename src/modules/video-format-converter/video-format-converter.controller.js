const path = require('path');
const fs = require('fs');
const { processBatch, PROCESSED_DIR } = require('./video-format-converter.service');
const { safeDelete } = require('./util/file-cleanup.util');

const ALLOWED_OUTPUT_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv'];

/**
 * POST /api/convert/upload
 *
 * Accepts a batch of video files, responds immediately with 202,
 * then starts async conversion in the background.
 */
const upload = (req, res) => {
  const { socketId } = req.body;
  const targetFormat = ALLOWED_OUTPUT_FORMATS.includes(req.body.targetFormat)
    ? req.body.targetFormat
    : 'mp4';
  const files = req.files;

  if (!socketId) {
    console.warn('[Upload] ⚠️  Request rejected: missing socketId');
    return res.status(400).json({ error: 'socketId is required' });
  }

  if (!files || files.length === 0) {
    console.warn(`[Upload] ⚠️  Request rejected: no valid files | socketId=${socketId}`);
    return res.status(400).json({ error: 'No files uploaded or invalid files' });
  }

  const fileNames = files.map((f) => f.originalname).join(', ');
  console.log(`[Upload] 📥 Batch received | socketId=${socketId} | format=${targetFormat} | count=${files.length} | files=[${fileNames}]`);

  res.status(202).json({ message: 'Files accepted for processing', count: files.length });

  processBatch(files, socketId, req.io, req.fileRegistry, targetFormat).catch((err) => {
    console.error('[Upload] ❌ Unexpected batch error:', err);
  });
};

/**
 * GET /api/convert/download/:filename
 *
 * Serves the converted file. Deletes it from disk only after a confirmed
 * successful transfer. On error, the file is preserved so the client can retry;
 * it will be purged when the socket disconnects.
 */
const download = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(PROCESSED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[Download] ⚠️  File not found: ${filename}`);
    return res.status(404).json({ error: 'File not found' });
  }

  console.log(`[Download] 📤 Serving file: ${filename}`);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(`[Download] ❌ Error sending file ${filename}:`, err.message);
      return;
    }

    console.log(`[Download] ✅ File delivered: ${filename}`);

    safeDelete(filePath, 'processed after download');

    const registry = req.fileRegistry;
    if (registry) {
      for (const files of registry.values()) {
        files.delete(filename);
      }
    }
  });
};

module.exports = { upload, download };

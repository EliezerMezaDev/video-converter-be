const path = require('path');
const fs = require('fs');
const { processBatch, PROCESSED_DIR } = require('./video-format-converter.service');
const { safeDelete } = require('./util/file-cleanup.util');

/**
 * POST /api/convert/upload
 *
 * Accepts the batch of .mov files, responds immediately with 202,
 * then starts async conversion in the background.
 */
const upload = (req, res) => {
  const { socketId } = req.body;
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
  console.log(`[Upload] 📥 Batch received | socketId=${socketId} | count=${files.length} | files=[${fileNames}]`);

  res.status(202).json({ message: 'Files accepted for processing', count: files.length });

  processBatch(files, socketId, req.io, req.fileRegistry).catch((err) => {
    console.error('[Upload] ❌ Unexpected batch error:', err);
  });
};

/**
 * GET /api/convert/download/:filename
 *
 * 
 * Serves the converted MP4 file. Deletes it from disk only after a
 * confirmed successful transfer. On error, the file is preserved so
 * the client can retry; it will be purged when the socket disconnects.
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
      // Do NOT delete on error — preserved for retry; cleaned up on socket disconnect.
      console.error(`[Download] ❌ Error sending file ${filename}:`, err.message);
      return;
    }

    console.log(`[Download] ✅ File delivered: ${filename}`);

    safeDelete(filePath, 'processed after download');

    // Remove from registry so disconnect cleanup doesn't re-attempt deletion
    const registry = req.fileRegistry;
    if (registry) {
      for (const files of registry.values()) {
        files.delete(filename);
      }
    }
  });
};

module.exports = { upload, download };

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload.middleware');
const { processBatch } = require('../services/converter.service');

// Batch upload and convert
router.post('/upload', upload.array('videos'), (req, res) => {
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

  const fileNames = files.map(f => f.originalname).join(', ');
  console.log(`[Upload] 📥 Batch received | socketId=${socketId} | count=${files.length} | files=[${fileNames}]`);

  // Accept the request before processing
  res.status(202).json({ 
    message: 'Files accepted for processing', 
    count: files.length 
  });

  // Start background processing
  processBatch(files, socketId, req.io, req.fileRegistry).catch(err => {
    console.error('[Upload] ❌ Unexpected batch error:', err);
  });
});

// Download converted file and delete
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/processed', filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[Download] ⚠️  File not found: ${filename}`);
    return res.status(404).json({ error: 'File not found' });
  }

  console.log(`[Download] 📤 Serving file: ${filename}`);

  res.download(filePath, filename, (err) => {
    if (err) {
      // Do NOT delete on error — the file stays available for retry.
      // It will be cleaned up when the socket disconnects.
      console.error(`[Download] ❌ Error sending file ${filename}:`, err.message);
      return;
    }

    // Only delete after a confirmed successful transfer
    console.log(`[Download] ✅ File delivered: ${filename}`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Download] 🗑️  Cleanup: deleted ${filename} from processed/`);
      }

      // Remove from registry so the disconnect cleanup doesn’t re-attempt deletion
      const registry = req.fileRegistry;
      if (registry) {
        for (const files of registry.values()) {
          files.delete(filename);
        }
      }
    } catch (cleanupErr) {
      console.error(`[Download] ❌ Cleanup error for ${filename}:`, cleanupErr.message);
    }
  });
});

module.exports = router;

const path = require('path');
const fs = require('fs');
const { processBatch, PROCESSED_DIR } = require('./audio-noise-remover.service');
const { uploadSchema } = require('./audio-noise-remover.model');

const upload = (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Parámetros inválidos';
    console.warn(`[AudioUpload] ⚠️  Request rejected: ${message}`);
    return res.status(400).json({ error: message });
  }

  const { socketId } = parsed.data;
  const files = req.files;

  if (!files || files.length === 0) {
    console.warn(`[AudioUpload] ⚠️  Request rejected: no valid files | socketId=${socketId}`);
    return res.status(400).json({ error: 'No se enviaron archivos válidos' });
  }

  const fileNames = files.map((f) => f.originalname).join(', ');
  console.log(`[AudioUpload] 📥 Batch received | socketId=${socketId} | count=${files.length} | files=[${fileNames}]`);

  res.status(202).json({ message: 'Archivos aceptados para procesamiento', count: files.length });

  processBatch(files, socketId, req.io, req.audioFileRegistry).catch((err) => {
    console.error('[AudioUpload] ❌ Unexpected batch error:', err);
  });
};

const download = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(PROCESSED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[AudioDownload] ⚠️  File not found: ${filename}`);
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  console.log(`[AudioDownload] 📤 Serving file: ${filename}`);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(`[AudioDownload] ❌ Error sending file ${filename}:`, err.message);
      return;
    }

    console.log(`[AudioDownload] ✅ File delivered: ${filename}`);

    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.error(`[AudioDownload] ❌ Error deleting file ${filename}:`, e.message);
    }

    const registry = req.audioFileRegistry;
    if (registry) {
      for (const files of registry.values()) {
        files.delete(filename);
      }
    }
  });
};

module.exports = { upload, download };

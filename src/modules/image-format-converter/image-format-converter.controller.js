const path = require('path');
const fs = require('fs');
const { processBatch, PROCESSED_DIR } = require('./image-format-converter.service');
const { uploadSchema } = require('./image-format-converter.model');

const upload = (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Parámetros inválidos';
    console.warn(`[ImgUpload] ⚠️  Request rejected: ${message}`);
    return res.status(400).json({ error: message });
  }

  const { socketId, format } = parsed.data;
  const files = req.files;

  if (!files || files.length === 0) {
    console.warn(`[ImgUpload] ⚠️  Request rejected: no valid files | socketId=${socketId}`);
    return res.status(400).json({ error: 'No se enviaron archivos válidos' });
  }

  const fileNames = files.map((f) => f.originalname).join(', ');
  console.log(`[ImgUpload] 📥 Batch received | socketId=${socketId} | format=${format} | count=${files.length} | files=[${fileNames}]`);

  res.status(202).json({ message: 'Archivos aceptados para procesamiento', count: files.length });

  processBatch(files, format, socketId, req.io, req.imageFileRegistry).catch((err) => {
    console.error('[ImgUpload] ❌ Unexpected batch error:', err);
  });
};

const download = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(PROCESSED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[ImgDownload] ⚠️  File not found: ${filename}`);
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  console.log(`[ImgDownload] 📤 Serving file: ${filename}`);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(`[ImgDownload] ❌ Error sending file ${filename}:`, err.message);
      return;
    }

    console.log(`[ImgDownload] ✅ File delivered: ${filename}`);

    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.error(`[ImgDownload] ❌ Error deleting file ${filename}:`, e.message);
    }

    const registry = req.imageFileRegistry;
    if (registry) {
      for (const files of registry.values()) {
        files.delete(filename);
      }
    }
  });
};

module.exports = { upload, download };

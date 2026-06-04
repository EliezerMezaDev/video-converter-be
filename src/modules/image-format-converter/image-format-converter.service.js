const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const PROCESSED_DIR = path.join(__dirname, 'uploads/processed');

if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

const safeDelete = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`[ImgCleanup] ❌ Failed to delete ${filePath}:`, err.message);
  }
};

const getFormatOptions = (format) => {
  switch (format) {
    case 'webp': return { lossless: true };
    case 'avif': return { lossless: true };
    case 'jpeg': return { quality: 100 };
    default: return {};
  }
};

const processFile = async (file, targetFormat, socketId, io, imageFileRegistry) => {
  const nameWithoutExt = path.parse(file.filename).name;
  const outputFilename = `${nameWithoutExt}.${targetFormat}`;
  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  console.log(`[ImgConverter] ▶️  Starting  | ${file.originalname} → ${outputFilename} | socketId=${socketId}`);

  io.to(socketId).emit('image:progress', {
    file: file.originalname,
    status: 'processing',
  });

  try {
    await sharp(file.path)
      .toFormat(targetFormat, getFormatOptions(targetFormat))
      .toFile(outputPath);

    console.log(`[ImgConverter] ✅ Done      | ${file.originalname} → ${outputFilename}`);

    if (imageFileRegistry?.has(socketId)) {
      imageFileRegistry.get(socketId).add(outputFilename);
    }

    safeDelete(file.path);

    io.to(socketId).emit('image:success', {
      originalName: file.originalname,
      resultName: outputFilename,
      downloadUrl: `/api/v1/images/download/${outputFilename}`,
    });

    return outputFilename;
  } catch (err) {
    console.error(`[ImgConverter] ❌ Failed    | ${file.originalname} | ${err.message}`);

    io.to(socketId).emit('image:error', {
      file: file.originalname,
      error: err.message || 'Conversion failed',
    });

    safeDelete(file.path);
    return null;
  }
};

const processBatch = async (files, targetFormat, socketId, io, imageFileRegistry) => {
  console.log(`[ImgBatch] 🗂️  Starting batch | ${files.length} file(s) | format=${targetFormat} | socketId=${socketId}`);

  const results = [];

  for (const [i, file] of files.entries()) {
    console.log(`[ImgBatch] 📄 File ${i + 1}/${files.length}: ${file.originalname}`);
    const result = await processFile(file, targetFormat, socketId, io, imageFileRegistry);
    const status = result ? 'success' : 'error';
    results.push({ name: file.originalname, status });
  }

  const succeeded = results.filter((r) => r.status === 'success').length;
  console.log(`[ImgBatch] 🏁 Complete | ✅ ${succeeded} succeeded | ❌ ${results.length - succeeded} failed | socketId=${socketId}`);

  io.to(socketId).emit('image:complete', {
    message: 'Batch processing completed',
    summary: results,
  });
};

module.exports = { processBatch, PROCESSED_DIR };

const path = require('path');
const fs = require('fs');
const { convertVideo } = require('./lib/ffmpeg.lib');
const { safeDelete } = require('./util/file-cleanup.util');

const PROCESSED_DIR = path.join(__dirname, 'uploads/processed');

if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

/**
 * Converts a single uploaded file to the target format, emitting Socket.io events
 * for progress, success, and error.
 *
 * @param {Object} file         - Multer file object
 * @param {string} socketId     - Target socket ID
 * @param {Object} io           - Socket.io server instance
 * @param {Map}    fileRegistry - Global registry: socketId → Set<filename>
 * @param {string} targetFormat - Output container format (e.g. 'mp4', 'mkv')
 * @returns {Promise<string|null>} - Output filename on success, null on error
 */
const processFile = async (file, socketId, io, fileRegistry, targetFormat) => {
  const nameWithoutExt = path.parse(file.filename).name;
  const outputFilename = `${nameWithoutExt}.${targetFormat}`;
  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  console.log(`[Converter] ▶️  Starting  | ${file.originalname} → ${outputFilename} | socketId=${socketId}`);

  io.to(socketId).emit('conversion:start', {
    originalName: file.originalname,
    status: 'processing',
  });

  try {
    await convertVideo(file.path, outputPath, targetFormat);

    console.log(`[Converter] ✅ Done      | ${file.originalname} → ${outputFilename}`);

    if (fileRegistry?.has(socketId)) {
      fileRegistry.get(socketId).add(outputFilename);
    }

    safeDelete(file.path, 'raw');

    io.to(socketId).emit('conversion:success', {
      originalName: file.originalname,
      resultName: outputFilename,
      downloadUrl: `/api/convert/download/${outputFilename}`,
    });

    return outputFilename;
  } catch (err) {
    console.error(`[Converter] ❌ Failed    | ${file.originalname} | ${err.message}`);

    io.to(socketId).emit('conversion:error', {
      originalName: file.originalname,
      error: err.message || 'Conversion failed',
    });

    safeDelete(file.path, 'raw after error');
    return null;
  }
};

/**
 * Processes a batch of uploaded files sequentially.
 * Continues even if individual files fail.
 *
 * @param {Array}  files        - Array of Multer file objects
 * @param {string} socketId     - Target socket ID
 * @param {Object} io           - Socket.io server instance
 * @param {Map}    fileRegistry - Global registry: socketId → Set<filename>
 * @param {string} targetFormat - Output container format for all files in the batch
 */
const processBatch = async (files, socketId, io, fileRegistry, targetFormat) => {
  console.log(`[Batch] 🗂️  Starting batch | ${files.length} file(s) | format=${targetFormat} | socketId=${socketId}`);

  const results = [];

  for (const [i, file] of files.entries()) {
    console.log(`[Batch] 📄 File ${i + 1}/${files.length}: ${file.originalname}`);
    const result = await processFile(file, socketId, io, fileRegistry, targetFormat);
    const status = result ? 'success' : 'error';
    results.push({ name: file.originalname, status });
    console.log(`[Batch] ${status === 'success' ? '✅' : '❌'} ${i + 1}/${files.length} ${status}: ${file.originalname}`);
  }

  const succeeded = results.filter((r) => r.status === 'success').length;
  console.log(`[Batch] 🏁 Complete | ✅ ${succeeded} succeeded | ❌ ${results.length - succeeded} failed | socketId=${socketId}`);

  io.to(socketId).emit('conversion:complete', {
    message: 'Batch processing completed',
    summary: results,
  });
};

module.exports = { processFile, processBatch, PROCESSED_DIR };

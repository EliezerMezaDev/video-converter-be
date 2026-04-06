const path = require('path');
const fs = require('fs');
const { convertToMp4 } = require('./lib/ffmpeg.lib');
const { safeDelete } = require('./util/file-cleanup.util');

const PROCESSED_DIR = path.join(__dirname, 'uploads/processed');

// Ensure processed directory exists on module load
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

/**
 * Converts a single uploaded file to MP4, emitting Socket.io events
 * for progress, success, and error.
 *
 * @param {Object} file        - Multer file object
 * @param {string} socketId    - Target socket ID
 * @param {Object} io          - Socket.io server instance
 * @param {Map}    fileRegistry - Global registry: socketId → Set<filename>
 * @returns {Promise<string|null>} - Output filename on success, null on error
 */
const processFile = async (file, socketId, io, fileRegistry) => {
  const nameWithoutExt = path.parse(file.filename).name;
  const outputFilename = `${nameWithoutExt}.mp4`;
  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  console.log(`[Converter] ▶️  Starting  | ${file.originalname} → ${outputFilename} | socketId=${socketId}`);

  io.to(socketId).emit('conversion:progress', {
    file: file.originalname,
    status: 'processing',
  });

  try {
    await convertToMp4(file.path, outputPath);

    console.log(`[Converter] ✅ Done      | ${file.originalname} → ${outputFilename}`);

    // Register for socket-disconnect cleanup
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
      file: file.originalname,
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
 */
const processBatch = async (files, socketId, io, fileRegistry) => {
  console.log(`[Batch] 🗂️  Starting batch | ${files.length} file(s) | socketId=${socketId}`);

  const results = [];

  for (const [i, file] of files.entries()) {
    console.log(`[Batch] 📄 File ${i + 1}/${files.length}: ${file.originalname}`);
    const result = await processFile(file, socketId, io, fileRegistry);
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

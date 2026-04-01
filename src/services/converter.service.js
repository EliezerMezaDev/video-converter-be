const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts a .mov file to .mp4 using copy codec.
 * @param {Object} file Multer file object
 * @param {string} socketId Target socket ID
 * @param {Object} io Socket.io instance
 * @param {Map} fileRegistry Global registry of socketId -> Set<filename>
 * @returns {Promise} Resolves with processed filename
 */
const processFile = (file, socketId, io, fileRegistry) => {
  return new Promise((resolve, reject) => {
    const filenameWithoutExt = path.parse(file.filename).name;
    const outputFilename = `${filenameWithoutExt}.mp4`;
    const outputPath = path.join(__dirname, '../../uploads/processed', outputFilename);
    const inputPath = file.path;

    console.log(`[Converter] ▶️  Starting  | ${file.originalname} → ${outputFilename} | socketId=${socketId}`);

    io.to(socketId).emit('conversion:progress', {
      file: file.originalname,
      status: 'processing'
    });

    ffmpeg(inputPath)
      .outputOptions([
        '-c:v copy',
        '-c:a copy'
      ])
      .save(outputPath)
      .on('start', (cmd) => {
        console.log(`[Converter] 🔧 ffmpeg started | ${file.originalname} | cmd: ${cmd}`);
      })
      .on('progress', (progress) => {
        const pct = progress.percent ? `${Math.round(progress.percent)}%` : 'N/A';
        const time = progress.timemark || 'N/A';
        console.log(`[Converter] ⏳ Progress | ${file.originalname} | ${pct} done | timemark=${time}`);
      })
      .on('end', () => {
        console.log(`[Converter] ✅ Done      | ${file.originalname} → ${outputFilename}`);

        // Register the output file so disconnect cleanup can find it if never downloaded
        if (fileRegistry && fileRegistry.has(socketId)) {
          fileRegistry.get(socketId).add(outputFilename);
        }

        // Remove raw file
        try {
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
            console.log(`[Converter] 🗑️  Cleanup  | Deleted raw file: ${file.filename}`);
          }
        } catch (err) {
          console.error(`[Converter] ❌ Cleanup error for raw file ${file.filename}:`, err.message);
        }

        io.to(socketId).emit('conversion:success', {
          originalName: file.originalname,
          resultName: outputFilename,
          downloadUrl: `/api/convert/download/${outputFilename}`
        });

        resolve(outputFilename);
      })
      .on('error', (err) => {
        console.error(`[Converter] ❌ Failed    | ${file.originalname} | ${err.message}`);
        
        io.to(socketId).emit('conversion:error', {
          file: file.originalname,
          error: err.message || 'Conversion failed'
        });

        // Try clean up raw file on error
        try {
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
            console.log(`[Converter] 🗑️  Cleanup  | Deleted raw file after error: ${file.filename}`);
          }
        } catch (cleanupErr) {
          console.error(`[Converter] ❌ Cleanup error after failure for ${file.filename}:`, cleanupErr.message);
        }

        resolve(null); // Resolve even on error so batch process continues
      });
  });
};

/**
 * Processes a batch of uploaded files.
 * @param {Array} files Array of Multer file objects
 * @param {string} socketId Target socket ID
 * @param {Object} io Socket.io instance
 * @param {Map} fileRegistry Global registry of socketId -> Set<filename>
 */
const processBatch = async (files, socketId, io, fileRegistry) => {
  const results = [];
  console.log(`[Batch] 🗂️  Starting batch | ${files.length} file(s) | socketId=${socketId}`);
  
  for (const [i, file] of files.entries()) {
    console.log(`[Batch] 📄 File ${i + 1}/${files.length}: ${file.originalname}`);
    try {
      const result = await processFile(file, socketId, io, fileRegistry);
      const status = result ? 'success' : 'error';
      results.push({ name: file.originalname, status });
      console.log(`[Batch] ${status === 'success' ? '✅' : '❌'} File ${i + 1}/${files.length} ${status}: ${file.originalname}`);
    } catch (err) {
      console.error(`[Batch] ❌ Unexpected error for ${file.originalname}:`, err.message);
      results.push({ name: file.originalname, status: 'error' });
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.length - succeeded;
  console.log(`[Batch] 🏁 Batch complete | ✅ ${succeeded} succeeded | ❌ ${failed} failed | socketId=${socketId}`);

  io.to(socketId).emit('conversion:complete', {
    message: 'Batch processing completed',
    summary: results
  });
};

module.exports = {
  processFile,
  processBatch
};

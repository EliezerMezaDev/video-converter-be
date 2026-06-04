const path = require('path');
const fs = require('fs');
const { uploadFile, submitJob, pollUntilDone, downloadResult } = require('./lib/audo-ai.lib');

const PROCESSED_DIR = path.join(__dirname, 'uploads/processed');

if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

const safeDelete = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`[AudioCleanup] ❌ Failed to delete ${filePath}:`, err.message);
  }
};

const processFile = async (file, socketId, io, audioFileRegistry) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const nameWithoutExt = path.parse(file.filename).name;
  const outputFilename = `${nameWithoutExt}${ext}`;
  const outputPath = path.join(PROCESSED_DIR, outputFilename);

  console.log(`[AudioDenoiser] ▶️  Starting  | ${file.originalname} | socketId=${socketId}`);

  io.to(socketId).emit('audio:progress', { file: file.originalname, status: 'processing' });

  try {
    const inputPath = await uploadFile(file.path);
    console.log(`[AudioDenoiser] ☁️  Uploaded  | ${file.originalname} → ${inputPath}`);

    const jobId = await submitJob(inputPath);
    console.log(`[AudioDenoiser] 🔧 Submitted | jobId=${jobId}`);

    const audoOutputPath = await pollUntilDone(jobId, (attempt) => {
      io.to(socketId).emit('audio:progress', { file: file.originalname, status: 'processing', attempt });
    });

    await downloadResult(audoOutputPath, outputPath);
    console.log(`[AudioDenoiser] ✅ Done      | ${file.originalname} → ${outputFilename}`);

    if (audioFileRegistry?.has(socketId)) {
      audioFileRegistry.get(socketId).add(outputFilename);
    }

    safeDelete(file.path);

    io.to(socketId).emit('audio:success', {
      originalName: file.originalname,
      resultName: outputFilename,
      downloadUrl: `/api/v1/audio/download/${outputFilename}`,
    });

    return outputFilename;
  } catch (err) {
    console.error(`[AudioDenoiser] ❌ Failed    | ${file.originalname} | ${err.message}`);

    io.to(socketId).emit('audio:error', {
      file: file.originalname,
      error: err.message || 'Error al procesar el audio',
    });

    safeDelete(file.path);
    return null;
  }
};

const processBatch = async (files, socketId, io, audioFileRegistry) => {
  console.log(`[AudioBatch] 🗂️  Starting batch | ${files.length} file(s) | socketId=${socketId}`);

  const results = [];

  for (const [i, file] of files.entries()) {
    console.log(`[AudioBatch] 📄 File ${i + 1}/${files.length}: ${file.originalname}`);
    const result = await processFile(file, socketId, io, audioFileRegistry);
    const status = result ? 'success' : 'error';
    results.push({ name: file.originalname, status });
    console.log(`[AudioBatch] ${status === 'success' ? '✅' : '❌'} ${i + 1}/${files.length} ${status}: ${file.originalname}`);
  }

  const succeeded = results.filter((r) => r.status === 'success').length;
  console.log(`[AudioBatch] 🏁 Complete | ✅ ${succeeded} succeeded | ❌ ${results.length - succeeded} failed | socketId=${socketId}`);

  io.to(socketId).emit('audio:complete', {
    message: 'Procesamiento por lotes completado',
    summary: results,
  });
};

module.exports = { processFile, processBatch, PROCESSED_DIR };

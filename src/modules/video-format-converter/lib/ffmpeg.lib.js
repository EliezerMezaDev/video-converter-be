const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts an input file to MP4 using stream copy (no re-encode).
 * This preserves quality and is extremely fast since no transcoding occurs.
 *
 * @param {string} inputPath  - Absolute path to the source file
 * @param {string} outputPath - Absolute path to write the output MP4
 * @returns {Promise<void>}   - Resolves on success, rejects on ffmpeg error
 */
const convertToMp4 = (inputPath, outputPath) =>
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-c:v copy', '-c:a copy'])
      .save(outputPath)
      .on('start', (cmd) => {
        console.log(`[FFmpeg] 🔧 Started | cmd: ${cmd}`);
      })
      .on('progress', (progress) => {
        const pct = progress.percent ? `${Math.round(progress.percent)}%` : 'N/A';
        const time = progress.timemark || 'N/A';
        console.log(`[FFmpeg] ⏳ Progress | ${pct} done | timemark=${time}`);
      })
      .on('end', resolve)
      .on('error', reject);
  });

module.exports = { convertToMp4 };

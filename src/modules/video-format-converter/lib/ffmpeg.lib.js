const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// Stream-copy preserves the original codecs and only rewraps the container.
// Transcoding (libx264, libvpx-vp9, etc.) is too CPU/RAM-intensive for
// constrained environments (e.g. Render free tier 512 MB) and causes the
// ffmpeg process to be OOM-killed before the `end` event fires.
// mp4 gets faststart so browsers can seek before full download.
const FORMAT_PRESETS = {
  mp4: ['-c copy', '-movflags +faststart'],
};

/**
 * Converts an input video file to the specified output format.
 *
 * @param {string} inputPath    - Absolute path to the source file
 * @param {string} outputPath   - Absolute path to write the output file
 * @param {string} outputFormat - Target container format (e.g. 'mp4', 'mkv')
 * @returns {Promise<void>}     - Resolves on success, rejects on ffmpeg error
 */
const convertVideo = (inputPath, outputPath, outputFormat) =>
  new Promise((resolve, reject) => {
    const options = FORMAT_PRESETS[outputFormat] ?? ['-c copy'];

    ffmpeg(inputPath)
      .outputOptions(options)
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

module.exports = { convertVideo };

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const FORMAT_PRESETS = {
  mp4:  ['-c:v libx264', '-c:a aac', '-movflags +faststart'],
  mkv:  ['-c:v libx264', '-c:a aac'],
  webm: ['-c:v libvpx-vp9', '-c:a libopus'],
  avi:  ['-c:v libx264', '-c:a mp3'],
  mov:  ['-c:v libx264', '-c:a aac'],
  flv:  ['-c:v libx264', '-c:a aac'],
};

const DEFAULT_OPTIONS = ['-c copy'];

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
    const options = FORMAT_PRESETS[outputFormat] ?? DEFAULT_OPTIONS;

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

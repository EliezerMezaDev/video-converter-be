const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const STRENGTH_PRESETS = {
  soft:   'afftdn=nf=-40',
  medium: 'afftdn=nf=-25',
  strong: 'afftdn=nf=-15',
};

const removeNoise = (inputPath, outputPath, strength) =>
  new Promise((resolve, reject) => {
    const filter = STRENGTH_PRESETS[strength] ?? STRENGTH_PRESETS.medium;

    ffmpeg(inputPath)
      .outputOptions([`-af ${filter}`, '-vn'])
      .save(outputPath)
      .on('start', (cmd) => {
        console.log(`[FFmpegAudio] 🔧 Started | cmd: ${cmd}`);
      })
      .on('progress', (progress) => {
        const time = progress.timemark || 'N/A';
        console.log(`[FFmpegAudio] ⏳ Progress | timemark=${time}`);
      })
      .on('end', resolve)
      .on('error', reject);
  });

module.exports = { removeNoise };

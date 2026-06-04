const multer = require('multer');
const path = require('path');
const fs = require('fs');

const RAW_DIR = path.join(__dirname, 'uploads/raw');

if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const ACCEPTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
  'audio/webm',
];

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RAW_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ACCEPTED_MIME_TYPES.includes(file.mimetype) && ACCEPTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no soportado: ${ext}. Formatos permitidos: MP3, WAV, M4A, AAC, OGG, FLAC, OPUS`), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter });

module.exports = upload;

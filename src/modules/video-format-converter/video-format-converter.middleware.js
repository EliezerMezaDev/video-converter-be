const multer = require('multer');
const path = require('path');
const fs = require('fs');
const features = require('../../config/features');

const RAW_DIR = path.join(__dirname, 'uploads/raw');

if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const maxSizeMB = features.feats.converter.fileMaxSize;
const maxSize = maxSizeMB * 1024 * 1024;

const ACCEPTED_MIMETYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/x-flv',
  'video/x-ms-wmv',
  'video/MP2T',
  'video/3gpp',
  'video/x-m4v',
  'video/mpeg',
  'video/ogg',
];

const ACCEPTED_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.flv', '.wmv', '.ts', '.3gp', '.m4v', '.mpeg', '.mpg', '.ogv',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RAW_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ACCEPTED_MIMETYPES.includes(file.mimetype) && ACCEPTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Formato no soportado: ${ext}. Formatos permitidos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, TS, 3GP, M4V`
      ),
      false
    );
  }
};

const upload = multer({ storage, limits: { fileSize: maxSize }, fileFilter });

module.exports = upload;

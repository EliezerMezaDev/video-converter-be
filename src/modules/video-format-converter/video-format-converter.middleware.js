const multer = require('multer');
const path = require('path');
const fs = require('fs');
const features = require('../../config/features');

const RAW_DIR = path.join(__dirname, 'uploads/raw');

// Ensure upload directory exists on module load
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const maxSizeMB = features.feats.converter.fileMaxSize;
const maxSize = maxSizeMB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RAW_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.mov' && file.mimetype === 'video/quicktime') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .mov / video/quicktime is allowed.'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: maxSize }, fileFilter });

module.exports = upload;

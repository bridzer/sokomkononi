const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR, ensureUploadDir } = require('../config/uploads');

ensureUploadDir();

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8);
    const stamp = Date.now().toString(36);
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `img-${stamp}-${rand}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      Object.assign(new Error('Only JPG, PNG, WEBP, GIF or SVG images are allowed'), {
        status: 400,
        expose: true,
      })
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { upload, UPLOAD_DIR };

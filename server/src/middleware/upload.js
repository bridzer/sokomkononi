const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR, ensureUploadDir } = require('../config/uploads');
const { getStorage } = require('../storage');

ensureUploadDir();

// SVG disallowed — browsers may execute embedded scripts when served as image/svg+xml.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Map non-standard browser MIME strings to canonical types. */
const MIME_ALIASES = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function normalizeMime(mimetype) {
  const m = String(mimetype || '').toLowerCase().trim();
  return MIME_ALIASES[m] || m;
}

function mimeFromExtension(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return EXT_TO_MIME[ext] || '';
}

function buildFilename(originalname, mimetype) {
  const ext = (path.extname(originalname) || '').toLowerCase().slice(0, 8);
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    ? ext
    : (() => {
        const byMime = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'image/gif': '.gif',
        };
        return byMime[normalizeMime(mimetype)] || '.jpg';
      })();
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString('hex');
  return `img-${stamp}-${rand}${safeExt}`;
}

/**
 * Accept files when MIME is valid OR when extension is a known image type.
 * Chromium on Windows sometimes sends "" or application/octet-stream.
 */
function isAllowedImage(file) {
  const mime = normalizeMime(file.mimetype);
  if (ALLOWED_MIME.has(mime)) return true;

  if (!mime || mime === 'application/octet-stream') {
    const byExt = mimeFromExtension(file.originalname);
    return ALLOWED_MIME.has(byExt);
  }

  return false;
}

function fileFilter(_req, file, cb) {
  if (!isAllowedImage(file)) {
    console.warn('[upload] rejected MIME:', file.mimetype, 'name:', file.originalname);
    return cb(
      Object.assign(
        new Error(
          `Only JPG, PNG, WEBP or GIF images are allowed (received: ${file.mimetype || 'unknown'})`
        ),
        { status: 415, expose: true }
      )
    );
  }
  cb(null, true);
}

function createMulterStorage() {
  const storageBackend = getStorage();

  if (storageBackend.useMemoryUpload) {
    return multer.memoryStorage();
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      cb(null, buildFilename(file.originalname, file.mimetype));
    },
  });
}

const upload = multer({
  storage: createMulterStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 10,
    fields: 10,
  },
});

module.exports = {
  upload,
  UPLOAD_DIR,
  isAllowedImage,
  normalizeMime,
  buildFilename,
};

const path = require('path');
const fs = require('fs');

/**
 * Directory where admin-uploaded images are stored.
 *
 * On Railway, mount a persistent Volume at `/app/server/uploads` and optionally
 * set UPLOAD_DIR=/app/server/uploads (this is the default relative path anyway).
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

const UPLOAD_PREFIX = '/uploads/';
const PLACEHOLDER_PATH = path.join(__dirname, '..', 'assets', 'placeholder-product.svg');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function resolveUploadFilename(urlOrFilename) {
  if (!urlOrFilename || typeof urlOrFilename !== 'string') return null;
  const raw = urlOrFilename.startsWith(UPLOAD_PREFIX)
    ? urlOrFilename.slice(UPLOAD_PREFIX.length)
    : urlOrFilename;
  const filename = path.basename(raw);
  if (!filename || filename.includes('..')) return null;
  return filename;
}

function uploadFilePath(urlOrFilename) {
  const filename = resolveUploadFilename(urlOrFilename);
  return filename ? path.join(UPLOAD_DIR, filename) : null;
}

function uploadFileExists(urlOrFilename) {
  const filePath = uploadFilePath(urlOrFilename);
  return filePath ? fs.existsSync(filePath) : false;
}

function countUploadFiles() {
  try {
    return fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith('.')).length;
  } catch {
    return 0;
  }
}

module.exports = {
  UPLOAD_DIR,
  UPLOAD_PREFIX,
  PLACEHOLDER_PATH,
  ensureUploadDir,
  resolveUploadFilename,
  uploadFilePath,
  uploadFileExists,
  countUploadFiles,
};

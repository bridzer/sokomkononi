const fs = require('fs');
const path = require('path');

/** Default upload directory when running on Railway (repo root = /app). */
const RAILWAY_DEFAULT_UPLOAD_DIR = '/app/server/uploads';

/**
 * Resolve where uploaded files are stored on disk.
 * On Railway production, defaults to /app/server/uploads (mount your Volume here).
 */
function resolveUploadDir() {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );

  if (isProduction && (onRailway || fs.existsSync('/app'))) {
    return RAILWAY_DEFAULT_UPLOAD_DIR;
  }

  return path.join(__dirname, '..', '..', 'uploads');
}

const UPLOAD_DIR = resolveUploadDir();
const UPLOAD_PREFIX = '/uploads/';
const PLACEHOLDER_PATH = path.join(__dirname, '..', 'assets', 'placeholder-product.svg');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function resolveUploadFilename(urlOrFilename) {
  if (!urlOrFilename || typeof urlOrFilename !== 'string') return null;

  // Absolute URLs (S3/R2/CDN) are not local files
  if (/^https?:\/\//i.test(urlOrFilename)) return null;

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

/**
 * Best-effort check whether UPLOAD_DIR is on a persistent mount (Linux /proc/mounts).
 * Returns true | false | null (unknown, e.g. on Windows dev).
 */
function isUploadDirOnPersistentMount() {
  try {
    const mounts = fs.readFileSync('/proc/mounts', 'utf8');
    const normalized = UPLOAD_DIR.replace(/\/+$/, '');
    return mounts.split('\n').some((line) => {
      const parts = line.split(' ');
      const mountPoint = parts[1];
      return mountPoint === normalized || mountPoint === UPLOAD_DIR;
    });
  } catch {
    return null;
  }
}

function getUploadDiagnostics() {
  const fileCount = countUploadFiles();
  const onMount = isUploadDirOnPersistentMount();
  const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();

  let persistent = storageType === 's3';
  let warning = null;

  if (storageType === 'local') {
    if (process.env.NODE_ENV === 'production') {
      if (onMount === true) {
        persistent = true;
      } else if (onMount === false) {
        persistent = false;
        warning =
          'Uploads are stored on ephemeral disk — they will be LOST on every deploy. ' +
          'Mount a Railway Volume at /app/server/uploads OR set STORAGE_TYPE=s3 with R2/S3 credentials.';
      } else {
        warning =
          'Could not verify a persistent volume. Set UPLOAD_DIR=/app/server/uploads and mount a Railway Volume.';
      }
    } else {
      persistent = true; // local dev — not redeployed constantly
    }
  }

  return {
    storageType,
    uploadDir: UPLOAD_DIR,
    fileCount,
    onPersistentMount: onMount,
    persistent,
    warning,
  };
}

module.exports = {
  UPLOAD_DIR,
  UPLOAD_PREFIX,
  PLACEHOLDER_PATH,
  RAILWAY_DEFAULT_UPLOAD_DIR,
  ensureUploadDir,
  resolveUploadFilename,
  uploadFilePath,
  uploadFileExists,
  countUploadFiles,
  isUploadDirOnPersistentMount,
  getUploadDiagnostics,
};

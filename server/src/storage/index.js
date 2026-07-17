const local = require('./local');
const s3 = require('./s3');

let cached;

/**
 * Storage backend for admin uploads.
 *
 * - local (default): files on disk — MUST use a Railway Volume at /app/server/uploads
 * - s3: Cloudflare R2, AWS S3, etc. — survives redeploys without a Volume
 */
function getStorage() {
  if (cached) return cached;

  const type = (process.env.STORAGE_TYPE || 'local').trim().toLowerCase();
  if (type === 's3') {
    cached = s3;
    return cached;
  }

  cached = local;
  return cached;
}

function resetStorageForTests() {
  cached = null;
}

module.exports = { getStorage, resetStorageForTests };

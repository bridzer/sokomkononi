/**
 * Shared image-upload utilities for cross-browser compatibility.
 *
 * Chromium (Chrome, Edge, Brave, Opera) is stricter than Firefox about:
 *   - multipart Content-Type boundaries (must NOT be set manually)
 *   - empty or non-standard file.type values from the OS file picker
 *   - CORS preflight on authenticated POST requests
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Non-standard MIME strings some browsers/OSes report. */
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

/**
 * Resolve a reliable MIME type for client-side validation.
 * Falls back to file extension when Chromium reports "" or octet-stream.
 */
export function resolveFileMime(file) {
  if (!file) return '';
  const raw = String(file.type || '').toLowerCase().trim();
  if (raw && raw !== 'application/octet-stream') {
    return MIME_ALIASES[raw] || raw;
  }
  const name = String(file.name || '').toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return EXT_TO_MIME[name.slice(dot)] || '';
}

export function isAllowedImageFile(file) {
  const mime = resolveFileMime(file);
  return ALLOWED_MIME.has(mime);
}

export function validateImageFile(file) {
  if (!file) return 'No file selected';
  if (!isAllowedImageFile(file)) {
    return `${file.name}: only JPG, PNG, WEBP or GIF images are allowed`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name}: exceeds 20 MB`;
  }
  return null;
}

/**
 * Turn axios / network errors into user-friendly admin messages.
 */
export function formatUploadError(err) {
  if (!err) return 'Upload failed';

  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Network error — check your connection and try again';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Upload timed out — try a smaller file or check your connection';
  }

  const status = err.response?.status;
  const serverMsg = err.response?.data?.error;

  if (status === 401) return 'Session expired — please sign in again';
  if (status === 403) return 'You do not have permission to upload';
  if (status === 413) return 'File is too large (max 20 MB)';
  if (status === 400 && serverMsg) return serverMsg;
  if (status === 415) return serverMsg || 'Unsupported image type';
  if (status >= 500) return serverMsg || 'Server error — try again shortly';

  // CORS failures in Chromium often surface as network errors with no response.
  if (!err.response && err.request) {
    return 'Upload blocked — connection or CORS issue. Refresh and try again.';
  }

  return serverMsg || err.message || 'Upload failed';
}

/**
 * Build FormData for single-image upload. Optionally attach a resolved MIME
 * when the browser left file.type empty (common on Windows + Chrome).
 */
export function buildSingleImageForm(file) {
  const form = new FormData();
  const mime = resolveFileMime(file);
  // Third argument sets filename; fourth (options.type) helps when type is blank.
  if (mime && !file.type) {
    form.append('image', file, file.name || 'upload.jpg');
  } else {
    form.append('image', file, file.name || 'upload');
  }
  return form;
}

export function buildBatchImageForm(files) {
  const form = new FormData();
  files.forEach((file) => {
    form.append('images', file, file.name || 'upload');
  });
  return form;
}

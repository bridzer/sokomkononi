/**
 * Maps Multer, validation, and generic errors to consistent JSON responses.
 */
function errorHandler(err, req, res, _next) {
  // Multer-specific errors (file too large, wrong field name, etc.)
  if (err.name === 'MulterError') {
    console.error('[API error] Multer:', err.code, err.message, err.field);
    const map = {
      LIMIT_FILE_SIZE: { status: 413, message: 'File is too large (max 20 MB)' },
      LIMIT_FILE_COUNT: { status: 400, message: 'Too many files in one request' },
      LIMIT_UNEXPECTED_FILE: {
        status: 400,
        message: `Unexpected upload field "${err.field}". Use "image" or "images".`,
      },
      LIMIT_PART_COUNT: { status: 400, message: 'Too many form parts' },
    };
    const mapped = map[err.code] || { status: 400, message: err.message };
    return res.status(mapped.status).json({ error: mapped.message, code: err.code });
  }

  // PostgreSQL constraint / data errors
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'Invalid data — check pricing values and try again',
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found' });
  }

  console.error('[API error]', {
    message: err.message,
    status: err.status,
    path: req.originalUrl,
    method: req.method,
    contentType: req.headers['content-type'],
  });

  const status = err.status || err.statusCode || 500;
  const message =
    err.expose || status < 500
      ? err.message
      : 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err.code ? { code: err.code } : {}),
  });
}

module.exports = errorHandler;

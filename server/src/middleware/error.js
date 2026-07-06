function errorHandler(err, _req, res, _next) {
  console.error('[API error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.expose ? err.message : status >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;

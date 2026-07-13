const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:5000';
  const options = {
    target,
    changeOrigin: true,
    // Allow large multipart uploads through the dev proxy (20 MB).
    proxyTimeout: 120000,
    timeout: 120000,
  };
  app.use('/api', createProxyMiddleware(options));
  app.use('/uploads', createProxyMiddleware(options));
};

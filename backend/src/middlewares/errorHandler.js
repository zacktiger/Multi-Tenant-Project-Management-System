const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  console.error(`❌ [${req.method}] ${req.originalUrl} →`, err.message);

  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    code,
  });
}

module.exports = errorHandler;

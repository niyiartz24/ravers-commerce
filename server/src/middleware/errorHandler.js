const multer = require('multer');

/** 404 handler — mounted after all routes. */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Centralized error handler — mounted last. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  // Postgres unique_violation
  if (err.code === '23505') {
    statusCode = 409;
    message = 'That record already exists.';
  }

  // Postgres check/foreign key/not-null violations
  if (['23502', '23503', '23514'].includes(err.code)) {
    statusCode = 400;
    message = 'The submitted data is invalid.';
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : err.message;
  }

  if (!err.isOperational && statusCode === 500 && process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { notFound, errorHandler };

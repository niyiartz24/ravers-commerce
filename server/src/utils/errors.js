/**
 * Operational error with an HTTP status code attached.
 * Throw this from services/controllers for anything that should surface
 * a specific status + message to the client (validation, auth, not found).
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * centralized error handler instead of crashing the process.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, asyncHandler };

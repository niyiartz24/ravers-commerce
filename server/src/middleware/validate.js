const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');

/**
 * Runs after an array of express-validator checks. Throws a single
 * readable AppError with the first validation problem found.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return next(new AppError(first.msg, 422));
  }
  next();
}

module.exports = { validate };

/**
 * AppError - Operational and Application Error Hierarchy
 * Provides structured HTTP error codes, operational classification, and clean serialization.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} [statusCode=500] - HTTP Status code (4xx, 5xx)
   * @param {Object} [details=null] - Additional validation or debugging details
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory method for 400 Bad Request
   * @param {string} message
   * @param {Object} [details]
   * @returns {AppError}
   */
  static badRequest(message = 'Bad Request', details = null) {
    return new AppError(message, 400, details);
  }

  /**
   * Factory method for 404 Not Found
   * @param {string} message
   * @returns {AppError}
   */
  static notFound(message = 'Resource Not Found') {
    return new AppError(message, 404);
  }

  /**
   * Factory method for 429 Too Many Requests
   * @param {string} message
   * @returns {AppError}
   */
  static tooManyRequests(message = 'Rate limit exceeded, please try again later.') {
    return new AppError(message, 429);
  }

  /**
   * Factory method for 500 Internal Server Error
   * @param {string} message
   * @param {Object} [details]
   * @returns {AppError}
   */
  static internal(message = 'Internal Server Error', details = null) {
    return new AppError(message, 500, details);
  }
}

module.exports = AppError;

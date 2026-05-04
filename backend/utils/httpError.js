class HttpError extends Error {
  constructor(statusCode, message, code = undefined, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, HttpError);
  }
}

function createHttpError(statusCode, message, code = undefined, details = undefined) {
  return new HttpError(statusCode, message, code, details);
}

module.exports = { HttpError, createHttpError };

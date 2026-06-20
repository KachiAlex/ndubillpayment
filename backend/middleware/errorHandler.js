function errorHandler(err, req, res, next) {
  const isJsonError = err instanceof SyntaxError && err.status === 400 && 'body' in err;
  if (isJsonError) {
    console.error('[ERROR] JSON Parse Error:', err.message, '| Content-Type:', req.headers['content-type'], '| Body preview:', String(req.body).slice(0, 200));
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }
  
  console.error('[ERROR]', err.message, '| Route:', req.method, req.url);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = Number.isInteger(err.statusCode) || Number.isInteger(err.status)
    ? (err.statusCode || err.status)
    : 500;

  const errorMessage = isProduction
    ? (statusCode >= 500 ? 'An error occurred. Please try again later.' : err.message || 'Request failed')
    : (err.message || 'Internal Server Error');

  const payload = {
    success: false,
    error: errorMessage
  };

  if (err.code) {
    payload.code = err.code;
  }

  if (err.details) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;

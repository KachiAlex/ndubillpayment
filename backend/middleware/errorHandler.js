function errorHandler(err, req, res, next) {
  const isJsonError = err instanceof SyntaxError && err.status === 400 && 'body' in err;
  if (isJsonError) {
    console.error('[ERROR] JSON Parse Error:', err.message, '| Content-Type:', req.headers['content-type'], '| Body preview:', String(req.body).slice(0, 200));
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }
  
  console.error('[ERROR]', err.message, '| Route:', req.method, req.url);
  
  // Sanitize error message in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction 
    ? 'An error occurred. Please try again later.' 
    : (err.message || 'Internal Server Error');
  
  res.status(500).json({ success: false, error: errorMessage });
}

module.exports = errorHandler;

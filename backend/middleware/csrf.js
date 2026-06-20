const crypto = require('crypto');

// In-memory token store (in production, use Redis or similar)
const tokenStore = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  
  if (!token) {
    return res.status(403).json({ success: false, error: 'CSRF token missing' });
  }

  // For API requests, we'll use a simpler approach with session-based tokens
  // In production, this should be tied to user sessions
  const sessionToken = req.session?.csrfToken;
  
  if (!sessionToken) {
    return res.status(403).json({ success: false, error: 'CSRF session token missing' });
  }

  if (token !== sessionToken) {
    return res.status(403).json({ success: false, error: 'CSRF token invalid' });
  }

  next();
}

function generateCsrfToken(req, res, next) {
  const token = generateToken();
  req.session = req.session || {};
  req.session.csrfToken = token;
  res.locals.csrfToken = token;
  next();
}

module.exports = { csrfProtection, generateCsrfToken };

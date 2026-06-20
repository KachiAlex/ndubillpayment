const jwt = require('jsonwebtoken');
const { createHttpError } = require('../utils/httpError');

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return next(createHttpError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.user = decoded;
    next();
  } catch {
    return next(createHttpError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.user_type)) {
      return next(createHttpError(403, 'Access denied', 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { authenticateJWT, authorizeRoles };

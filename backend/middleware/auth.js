const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.user_type)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

module.exports = { authenticateJWT, authorizeRoles };

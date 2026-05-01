const jwt = require('jsonwebtoken');
const { db } = require('../utils/database');

// Authenticate JWT token
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists
    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      matric_no: user.matric_no,
      department: user.department,
      session: user.session
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Authorize specific roles
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};

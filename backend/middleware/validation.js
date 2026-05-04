const Joi = require('joi');
const validator = require('validator');
const { createHttpError } = require('../utils/httpError');

// Sanitization helpers
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return validator.escape(value.trim());
}

function sanitizeEmail(value) {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}

function sanitizeNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? value : num;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = {};
  for (const key in body) {
    if (body.hasOwnProperty(key)) {
      const value = body[key];
      
      if (typeof value === 'string') {
        // Check if it's likely an email
        if (key.toLowerCase().includes('email')) {
          sanitized[key] = sanitizeEmail(value);
        } else {
          sanitized[key] = sanitizeString(value);
        }
      } else if (typeof value === 'number') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => typeof item === 'string' ? sanitizeString(item) : item);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

function validate(schema) {
  return (req, res, next) => {
    // Sanitize input first
    req.body = sanitizeBody(req.body);
    
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const message = error.details.map(d => d.message).join(', ');
      return next(createHttpError(400, message, 'VALIDATION_ERROR', error.details));
    }
    req.body = value;
    next();
  };
}

module.exports = { validate, sanitizeBody, sanitizeString, sanitizeEmail };

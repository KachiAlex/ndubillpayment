const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const database = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const asyncHandler = require('../middleware/asyncHandler');
const AuditLogger = require('../utils/audit');
const { createHttpError } = require('../utils/httpError');

const router = express.Router();

const registerSchema = Joi.object({
  matric_number: Joi.string().pattern(/^NDU\/\d{4}\/\d{3,4}$/i).required().messages({
    'string.pattern.base': 'Student ID must be in format: NDU/YYYY/XXX'
  }),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    }),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  department: Joi.string().required(),
  level: Joi.string().required(),
  session: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    })
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    user_type: user.user_type,
    first_name: user.first_name,
    last_name: user.last_name
  };
  if (user.matric_number) payload.matric_number = user.matric_number;
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'defaultsecret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Register
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { matric_number, email, password, first_name, last_name, department, level, session } = req.body;

  const existing = await database.db('users').where({ email }).orWhere({ matric_number }).first();
  if (existing) {
    throw createHttpError(400, 'Email or matric number already registered', 'USER_EXISTS');
  }

  const [departmentExists, levelExists, sessionExists] = await Promise.all([
    database.db('departments').where({ name: department }).first(),
    database.db('levels').where({ name: level }).first(),
    database.db('sessions').where({ name: session }).first()
  ]);

  if (!departmentExists) {
    throw createHttpError(400, 'Invalid department selected', 'INVALID_DEPARTMENT');
  }
  if (!levelExists) {
    throw createHttpError(400, 'Invalid level selected', 'INVALID_LEVEL');
  }
  if (!sessionExists) {
    throw createHttpError(400, 'Invalid academic session selected', 'INVALID_SESSION');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [user] = await database.db('users').insert({
    matric_number: matric_number.toUpperCase(),
    email: email.toLowerCase(),
    password_hash,
    first_name,
    last_name,
    department,
    level,
    session,
    user_type: 'student'
  }).returning('*');

  await database.db('wallets').insert({ user_id: user.id, balance: 0, currency: 'NGN' });

  await AuditLogger.log({
    action: 'user_registered',
    userId: user.id,
    userEmail: user.email,
    userType: user.user_type,
    entityType: 'user',
    entityId: user.id,
    newValues: { matric_number, email, first_name, last_name, department, level, session },
    req
  });

  const token = generateToken(user);
  res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, first_name, last_name, matric_number, session, user_type: user.user_type } });
}));

// Login
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  if (!database.db) {
    console.error('[LOGIN ERROR] Database not initialized');
    throw createHttpError(503, 'Database unavailable', 'DATABASE_UNAVAILABLE');
  }

  const { email, password } = req.body;
  console.log('[LOGIN] Attempting login for:', email);

  const user = await database.db('users').where({ email: email.toLowerCase() }).first();
  if (!user) {
    console.log('[LOGIN] User not found:', email);
    throw createHttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    console.log('[LOGIN] Invalid password for:', email);
    throw createHttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user);
  console.log('[LOGIN] Success for:', email);

  await AuditLogger.log({
    action: 'user_login',
    userId: user.id,
    userEmail: user.email,
    userType: user.user_type,
    entityType: 'user',
    entityId: user.id,
    req
  });

  res.json({ success: true, token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, matric_number: user.matric_number, user_type: user.user_type } });
}));

// Get current user
router.get('/me', authenticateJWT, asyncHandler(async (req, res) => {
  const user = await database.db('users').where({ id: req.user.id }).first();
  if (!user) throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');
  res.json({ success: true, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, matric_number: user.matric_number, user_type: user.user_type, department: user.department, level: user.level } });
}));

// Update profile
router.put('/profile', authenticateJWT, asyncHandler(async (req, res) => {
  const { first_name, last_name, department, level, session } = req.body;

  const updateData = {};
  if (first_name) updateData.first_name = first_name;
  if (last_name) updateData.last_name = last_name;
  if (department) updateData.department = department;
  if (level) updateData.level = level;
  if (session) updateData.session = session;

  if (department) {
    const departmentExists = await database.db('departments').where({ name: department }).first();
    if (!departmentExists) {
      throw createHttpError(400, 'Invalid department selected', 'INVALID_DEPARTMENT');
    }
  }
  if (level) {
    const levelExists = await database.db('levels').where({ name: level }).first();
    if (!levelExists) {
      throw createHttpError(400, 'Invalid level selected', 'INVALID_LEVEL');
    }
  }
  if (session) {
    const sessionExists = await database.db('sessions').where({ name: session }).first();
    if (!sessionExists) {
      throw createHttpError(400, 'Invalid academic session selected', 'INVALID_SESSION');
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw createHttpError(400, 'No fields to update', 'NO_UPDATE_FIELDS');
  }

  const [user] = await database.db('users')
    .where({ id: req.user.id })
    .update(updateData)
    .returning('*');

  if (!user) throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');

  await AuditLogger.log({
    action: 'profile_updated',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'user',
    entityId: user.id,
    oldValues: { first_name: req.user.first_name, last_name: req.user.last_name },
    newValues: updateData,
    req
  });

  res.json({ success: true, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, matric_number: user.matric_number, user_type: user.user_type, department: user.department, level: user.level } });
}));

// Request password reset
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await database.db('users').where({ email: email.toLowerCase() }).first();

  if (!user) {
    console.log('[Forgot Password] Email not found:', email);
    throw createHttpError(404, 'Email not found in our system', 'EMAIL_NOT_FOUND');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000);

  await database.db('password_resets').where({ user_id: user.id }).del();

  await database.db('password_resets').insert({
    user_id: user.id,
    token: resetToken,
    expires_at: expiresAt
  });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ndu.edu.ng',
    to: user.email,
    subject: 'Password Reset Request - NDU Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.first_name},</p>
        <p>You requested a password reset for your NDU Portal account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>NDU Portal Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[Forgot Password] Reset email sent to:', user.email);
  } catch (emailError) {
    console.error('[Forgot Password] Failed to send email:', emailError.message);
    // Continue with the response even if email fails (for development)
  }

  await AuditLogger.log({
    action: 'password_reset_requested',
    userId: user.id,
    userEmail: user.email,
    userType: user.user_type,
    entityType: 'user',
    entityId: user.id,
    newValues: { email },
    req
  });

  res.json({ success: true, message: 'Password reset link has been sent to your email' });
}));

// Verify reset token
router.get('/verify-reset-token', asyncHandler(async (req, res) => {
  const { token } = req.query;

  const reset = await database.db('password_resets')
    .where({ token })
    .where('expires_at', '>', new Date())
    .whereNull('used_at')
    .first();

  if (!reset) {
    throw createHttpError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  res.json({ success: true, valid: true });
}));

// Reset password
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const reset = await database.db('password_resets')
    .where({ token })
    .where('expires_at', '>', new Date())
    .whereNull('used_at')
    .first();

  if (!reset) {
    throw createHttpError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  const password_hash = await bcrypt.hash(password, 10);

  await database.db('users')
    .where({ id: reset.user_id })
    .update({ password_hash });

  await database.db('password_resets')
    .where({ id: reset.id })
    .update({ used_at: new Date() });

  await AuditLogger.log({
    action: 'password_reset_completed',
    userId: reset.user_id,
    entityType: 'user',
    entityId: reset.user_id,
    newValues: { reset_id: reset.id },
    req
  });

  res.json({ success: true, message: 'Password reset successful' });
}));

module.exports = router;

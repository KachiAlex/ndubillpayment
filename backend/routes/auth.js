const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { db } = require('../utils/database');
const Joi = require('joi');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const router = express.Router();

// Validation schemas
const registerSchema = {
  matric_no: Joi.string().pattern(/^NDU\/\d{4}\/\d{3,4}$/i).required().messages({
    'string.pattern.base': 'Student ID must be in format: NDU/YYYY/XXX (e.g., NDU/2021/001)'
  }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  department: Joi.string().required(),
  session: Joi.string().required()
};

const loginSchema = {
  email: Joi.string().email().required(),
  password: Joi.string().required()
};

// Register new student
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { matric_no, email, password, first_name, last_name, department, session } = req.body;

    // Check if user already exists
    const existingUser = await db('users').where({ email }).orWhere({ matric_no }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or matric number' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [userId] = await db('users').insert({
      matric_no,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      user_type: 'student',
      department,
      session,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create wallet for user
    await db('wallets').insert({
      user_id: userId,
      balance: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Log the registration
    await db('audit_logs').insert({
      user_id: userId,
      action: 'user_registration',
      details: `New student registered: ${first_name} ${last_name}`,
      ip_address: req.ip,
      timestamp: new Date()
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      user_id: userId 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        userType: user.user_type 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log the login
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'user_login',
      details: `User logged in: ${user.email}`,
      ip_address: req.ip,
      timestamp: new Date()
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type,
        department: user.department,
        session: user.session
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup 2FA for admin users
router.post('/2fa/setup', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `NDU Portal (${req.user.email})`,
      issuer: 'NDU Tuition Payment Portal'
    });

    // Save secret to user
    await db('users').where({ id: userId }).update({
      two_factor_secret: secret.base32,
      updated_at: new Date()
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify 2FA token
router.post('/2fa/verify', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;

    // Get user's 2FA secret
    const user = await db('users').where({ id: userId }).first();
    if (!user.two_factor_secret) {
      return res.status(400).json({ error: '2FA not set up for this user' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Log successful 2FA verification
    await db('audit_logs').insert({
      user_id: userId,
      action: '2fa_verification',
      details: '2FA token verified successfully',
      ip_address: req.ip,
      timestamp: new Date()
    });

    res.json({ message: '2FA verification successful' });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

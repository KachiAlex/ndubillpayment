const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const database = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

const registerSchema = Joi.object({
  matric_no: Joi.string().pattern(/^NDU\/\d{4}\/\d{3,4}$/i).required().messages({
    'string.pattern.base': 'Student ID must be in format: NDU/YYYY/XXX'
  }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  department: Joi.string().required(),
  level: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, matric_no: user.matric_no },
    process.env.JWT_SECRET || 'defaultsecret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { matric_no, email, password, first_name, last_name, department, level } = req.body;

    // Check existing user
    const existing = await database.db('users').where({ email }).orWhere({ matric_no }).first();
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email or matric number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await database.db('users').insert({
      matric_no: matric_no.toUpperCase(),
      email: email.toLowerCase(),
      password_hash,
      first_name,
      last_name,
      department,
      level,
      role: 'student'
    }).returning('*');

    // Create wallet
    await database.db('wallets').insert({ user_id: user.id, balance: 0, currency: 'NGN' });

    const token = generateToken(user);
    res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, first_name, last_name, matric_no, role: user.role } });
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await database.db('users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, matric_no: user.matric_no, role: user.role } });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current user
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await database.db('users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, matric_no: user.matric_no, role: user.role, department: user.department, level: user.level } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

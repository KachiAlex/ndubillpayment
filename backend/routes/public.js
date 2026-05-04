const express = require('express');
const database = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Get all unique departments (public - requires login)
router.get('/departments', authenticateJWT, asyncHandler(async (req, res) => {
  const departments = await database.db('users')
    .distinct('department')
    .orderBy('department', 'asc')
    .pluck('department');

  res.json({ success: true, departments });
}));

// Get all unique levels (public - requires login)
router.get('/levels', authenticateJWT, asyncHandler(async (req, res) => {
  const levels = await database.db('users')
    .distinct('level')
    .orderBy('level', 'asc')
    .pluck('level');

  res.json({ success: true, levels });
}));

// Get all unique academic sessions (public - requires login)
router.get('/academic-sessions', authenticateJWT, asyncHandler(async (req, res) => {
  const sessions = await database.db('fees')
    .distinct('academic_session')
    .whereNotNull('academic_session')
    .orderBy('academic_session', 'desc')
    .pluck('academic_session');

  res.json({ success: true, sessions });
}));

module.exports = router;

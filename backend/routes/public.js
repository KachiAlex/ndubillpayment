const express = require('express');
const database = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Get all unique departments (public - requires login)
router.get('/departments', authenticateJWT, async (req, res) => {
  try {
    const departments = await database.db('users')
      .distinct('department')
      .orderBy('department', 'asc')
      .pluck('department');
    
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all unique levels (public - requires login)
router.get('/levels', authenticateJWT, async (req, res) => {
  try {
    const levels = await database.db('users')
      .distinct('level')
      .orderBy('level', 'asc')
      .pluck('level');
    
    res.json({ success: true, levels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all unique academic sessions (public - requires login)
router.get('/academic-sessions', authenticateJWT, async (req, res) => {
  try {
    const sessions = await database.db('fees')
      .distinct('academic_session')
      .whereNotNull('academic_session')
      .orderBy('academic_session', 'desc')
      .pluck('academic_session');
    
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

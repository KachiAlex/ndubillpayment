const express = require('express');
const database = require('../utils/database');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Get all departments
router.get('/departments', asyncHandler(async (req, res) => {
  const departments = await database.db('departments')
    .select('id', 'name')
    .orderBy('name', 'asc');

  res.json({ success: true, departments });
}));

// Get all levels
router.get('/levels', asyncHandler(async (req, res) => {
  const levels = await database.db('levels')
    .select('id', 'name')
    .orderBy('name', 'asc');

  res.json({ success: true, levels });
}));

// Get all academic sessions
router.get('/academic-sessions', asyncHandler(async (req, res) => {
  const sessions = await database.db('sessions')
    .select('id', 'name')
    .orderBy('name', 'desc');

  res.json({ success: true, sessions });
}));

module.exports = router;

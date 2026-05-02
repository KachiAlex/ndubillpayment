const express = require('express');
const database = require('../utils/database');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All admin routes require bursar/admin role
router.use(authenticateJWT, authorizeRoles('bursar', 'admin'));

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [stats] = await database.db.raw(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE user_type = 'student') as total_students,
        (SELECT COUNT(*) FROM transactions WHERE status = 'completed') as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM transactions WHERE status = 'pending') as pending_payments
    `);
    res.json({ success: true, stats: stats.rows ? stats.rows[0] : stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// All transactions with pagination
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const transactions = await database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select('transactions.*', 'users.first_name', 'users.last_name', 'users.matric_number')
      .orderBy('transactions.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalCount = await database.db('transactions').count('* as count').first();
    const totalPages = Math.ceil(totalCount.count / limit);

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// All students
router.get('/students', async (req, res) => {
  try {
    const students = await database.db('users').where({ user_type: 'student' }).select('id', 'matric_number', 'email', 'first_name', 'last_name', 'department', 'level', 'is_verified', 'created_at');
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download receipt
router.get('/receipt/:receipt_number', async (req, res) => {
  try {
    const receipt = await database.db('receipts').where({ receipt_number: req.params.receipt_number }).first();
    if (!receipt || !receipt.pdf_base64) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }
    const pdfBuffer = Buffer.from(receipt.pdf_base64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receipt_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

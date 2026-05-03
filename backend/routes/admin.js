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

// All users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const users = await database.db('users')
      .select('id', 'email', 'first_name', 'last_name', 'matric_number', 'user_type', 'department', 'level', 'is_verified', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalCount = await database.db('users').count('* as count').first();
    const totalPages = Math.ceil(totalCount.count / limit);

    res.json({
      success: true,
      users,
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

// Reports with filters
router.get('/reports', async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_number',
        'users.department',
        'users.level'
      )
      .where('transactions.status', 'completed');

    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    // Calculate summary
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const uniqueStudents = new Set(transactions.map(t => t.user_id)).size;

    res.json({
      success: true,
      summary: {
        total_amount: totalAmount,
        total_transactions: transactions.length,
        unique_students: uniqueStudents
      },
      transactions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all unique departments
router.get('/departments', async (req, res) => {
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

// Get all unique levels
router.get('/levels', async (req, res) => {
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

// Search student payments
router.get('/search-student', async (req, res) => {
  try {
    const { student_id, department } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_number',
        'users.department'
      );

    if (student_id) {
      query = query.where('users.matric_number', 'like', `%${student_id}%`);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    res.json({
      success: true,
      transactions,
      summary: {
        total_amount: totalAmount,
        transaction_count: transactions.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reconcile payments
router.post('/reconcile', async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }

    const transactions = await database.db('transactions')
      .whereBetween('created_at', [start_date, end_date])
      .where('status', 'completed');

    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    res.json({
      success: true,
      total_amount: totalAmount,
      transaction_count: transactions.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export transactions to Excel (placeholder - needs actual Excel library)
router.get('/export/excel', async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_number',
        'users.department',
        'users.level'
      );

    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    // For now, return JSON. Excel export would require a library like exceljs
    res.json({
      success: true,
      transactions,
      message: 'Excel export library not yet implemented'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export transactions to CSV (placeholder)
router.get('/export/csv', async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_number',
        'users.department',
        'users.level'
      );

    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    // For now, return JSON. CSV export would require proper CSV generation
    res.json({
      success: true,
      transactions,
      message: 'CSV export not yet implemented'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export paid students to Excel (placeholder)
router.get('/export/paid-students/excel', async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'users.id',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.level'
      )
      .where('transactions.status', 'completed')
      .groupBy('users.id', 'users.matric_number', 'users.first_name', 'users.last_name', 'users.department', 'users.level');

    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const students = await query;

    res.json({
      success: true,
      students,
      message: 'Excel export library not yet implemented'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export paid students to CSV (placeholder)
router.get('/export/paid-students/csv', async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;
    
    let query = database.db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'users.id',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.level'
      )
      .where('transactions.status', 'completed')
      .groupBy('users.id', 'users.matric_number', 'users.first_name', 'users.last_name', 'users.department', 'users.level');

    if (start_date) {
      query = query.where('transactions.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('transactions.created_at', '<=', end_date);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const students = await query;

    res.json({
      success: true,
      students,
      message: 'CSV export not yet implemented'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

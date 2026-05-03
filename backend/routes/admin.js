const express = require('express');
const database = require('../utils/database');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const ExcelJS = require('exceljs');

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

// Get all unique departments (public)
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

// Create new department
router.post('/departments', async (req, res) => {
  try {
    const { department } = req.body;
    
    if (!department) {
      return res.status(400).json({ success: false, error: 'Department name is required' });
    }

    // Check if department already exists
    const existing = await database.db('users').where({ department }).first();
    if (existing) {
      return res.json({ success: true, department, message: 'Department already exists' });
    }

    // Insert a placeholder user with the new department to make it available
    await database.db('users').insert({
      matric_number: `TEMP_${Date.now()}`,
      email: `temp_${Date.now()}@placeholder.com`,
      password_hash: '$2a$10$placeholder',
      first_name: 'Placeholder',
      last_name: 'User',
      department,
      level: '100',
      user_type: 'student',
      is_verified: false
    });

    res.json({ success: true, department });
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

// Create new level
router.post('/levels', async (req, res) => {
  try {
    const { level } = req.body;
    
    if (!level) {
      return res.status(400).json({ success: false, error: 'Level is required' });
    }

    // Check if level already exists
    const existing = await database.db('users').where({ level }).first();
    if (existing) {
      return res.json({ success: true, level, message: 'Level already exists' });
    }

    // Insert a placeholder user with the new level to make it available
    await database.db('users').insert({
      matric_number: `TEMP_${Date.now()}`,
      email: `temp_${Date.now()}@placeholder.com`,
      password_hash: '$2a$10$placeholder',
      first_name: 'Placeholder',
      last_name: 'User',
      department: 'Computer Science',
      level,
      user_type: 'student',
      is_verified: false
    });

    res.json({ success: true, level });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all unique academic sessions
router.get('/academic-sessions', async (req, res) => {
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

// Create new academic session
router.post('/academic-sessions', async (req, res) => {
  try {
    const { academic_session } = req.body;
    
    if (!academic_session) {
      return res.status(400).json({ success: false, error: 'Academic session is required' });
    }

    // Check if session already exists
    const existing = await database.db('fees').where({ academic_session }).first();
    if (existing) {
      return res.json({ success: true, academic_session, message: 'Academic session already exists' });
    }

    // Insert a placeholder fee with the new session to make it available
    await database.db('fees').insert({
      name: 'Placeholder Fee',
      amount: 0,
      department: 'Computer Science',
      level: '100',
      academic_session,
      is_active: false
    });

    res.json({ success: true, academic_session });
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

// Export transactions to Excel
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Add headers
    worksheet.columns = [
      { header: 'Transaction ID', key: 'id', width: 20 },
      { header: 'Reference', key: 'tx_ref', width: 25 },
      { header: 'Matric Number', key: 'matric_number', width: 20 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Date', key: 'created_at', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Add data
    transactions.forEach(tx => {
      worksheet.addRow({
        id: tx.id,
        tx_ref: tx.tx_ref,
        matric_number: tx.matric_number || 'N/A',
        first_name: tx.first_name,
        last_name: tx.last_name,
        department: tx.department || 'N/A',
        level: tx.level || 'N/A',
        type: tx.type,
        amount: Number(tx.amount).toFixed(2),
        currency: tx.currency,
        status: tx.status,
        payment_method: tx.payment_method || 'N/A',
        description: tx.description || 'N/A',
        created_at: new Date(tx.created_at).toLocaleString()
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.xlsx"`);

    // Send file
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[admin] excel export error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export transactions to CSV
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

    // Create CSV header
    const headers = [
      'Transaction ID',
      'Reference',
      'Matric Number',
      'First Name',
      'Last Name',
      'Department',
      'Level',
      'Type',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Description',
      'Date'
    ];

    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...transactions.map(tx => [
        tx.id,
        tx.tx_ref,
        tx.matric_number || 'N/A',
        tx.first_name,
        tx.last_name,
        tx.department || 'N/A',
        tx.level || 'N/A',
        tx.type,
        Number(tx.amount).toFixed(2),
        tx.currency,
        tx.status,
        tx.payment_method || 'N/A',
        `"${(tx.description || 'N/A').replace(/"/g, '""')}"`,
        new Date(tx.created_at).toLocaleString()
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);

    res.send(csvContent);
  } catch (err) {
    console.error('[admin] csv export error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export paid students to Excel
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paid Students');

    // Add headers
    worksheet.columns = [
      { header: 'Student ID', key: 'id', width: 20 },
      { header: 'Matric Number', key: 'matric_number', width: 20 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Level', key: 'level', width: 10 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Add data
    students.forEach(student => {
      worksheet.addRow({
        id: student.id,
        matric_number: student.matric_number || 'N/A',
        first_name: student.first_name,
        last_name: student.last_name,
        department: student.department || 'N/A',
        level: student.level || 'N/A'
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="paid-students-${Date.now()}.xlsx"`);

    // Send file
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[admin] paid students excel export error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export paid students to CSV
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

    // Create CSV header
    const headers = [
      'Student ID',
      'Matric Number',
      'First Name',
      'Last Name',
      'Department',
      'Level'
    ];

    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...students.map(student => [
        student.id,
        student.matric_number || 'N/A',
        student.first_name,
        student.last_name,
        student.department || 'N/A',
        student.level || 'N/A'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="paid-students-${Date.now()}.csv"`);

    res.send(csvContent);
  } catch (err) {
    console.error('[admin] paid students csv export error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

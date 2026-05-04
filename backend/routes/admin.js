const express = require('express');
const database = require('../utils/database');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');
const ExcelJS = require('exceljs');
const AuditLogger = require('../utils/audit');
const { checkOverduePayments, sendUpcomingReminders } = require('../utils/paymentReminders');
const { createBackup, listBackups } = require('../utils/backup');

const router = express.Router();

// All admin routes require bursar/admin role
router.use(authenticateJWT, authorizeRoles('bursar', 'admin'));

// Dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [stats] = await database.db.raw(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE user_type = 'student') as total_students,
        (SELECT COUNT(*) FROM transactions WHERE status = 'completed') as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM transactions WHERE status = 'pending') as pending_payments
    `);
  res.json({ success: true, stats: stats.rows ? stats.rows[0] : stats });
}));

// All transactions with pagination
router.get('/transactions', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status, type } = req.query;

  let query = database.db('transactions')
    .join('users', 'transactions.user_id', 'users.id')
    .select('transactions.*', 'users.first_name', 'users.last_name', 'users.matric_number');

  if (status) {
    query = query.where('transactions.status', status);
  }
  if (type) {
    query = query.where('transactions.type', type);
  }

  const transactions = await query
    .orderBy('transactions.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  let countQuery = database.db('transactions');
  if (status) {
    countQuery = countQuery.where('status', status);
  }
  if (type) {
    countQuery = countQuery.where('type', type);
  }

  const totalCount = await countQuery.count('* as count').first();
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
}));

// All students
router.get('/students', asyncHandler(async (req, res) => {
  const students = await database.db('users').where({ user_type: 'student' }).select('id', 'matric_number', 'email', 'first_name', 'last_name', 'department', 'level', 'is_verified', 'created_at');
  res.json({ success: true, students });
}));

// All users with pagination
router.get('/users', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { user_type, department, session } = req.query;

  let query = database.db('users')
    .select('id', 'email', 'first_name', 'last_name', 'matric_number', 'user_type', 'department', 'level', 'session', 'is_verified', 'created_at');

  if (user_type) {
    query = query.where('user_type', user_type);
  }
  if (department) {
    query = query.where('department', department);
  }
  if (session) {
    query = query.where('session', session);
  }

  const users = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  let countQuery = database.db('users');
  if (user_type) {
    countQuery = countQuery.where('user_type', user_type);
  }
  if (department) {
    countQuery = countQuery.where('department', department);
  }
  if (session) {
    countQuery = countQuery.where('session', session);
  }

  const totalCount = await countQuery.count('* as count').first();
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
}));

// Reports with filters
router.get('/reports', asyncHandler(async (req, res) => {
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
  if (session) {
    query = query.where('users.session', session);
  }

  const transactions = await query.orderBy('transactions.created_at', 'desc');

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
}));

// Get all unique departments (public)
router.get('/departments', asyncHandler(async (req, res) => {
  const departments = await database.db('departments')
    .select('id', 'name')
    .orderBy('name', 'asc');

  res.json({ success: true, departments });
}));

// Create new department
router.post('/departments', asyncHandler(async (req, res) => {
  const { department } = req.body;

  if (!department) {
    throw createHttpError(400, 'Department name is required', 'VALIDATION_ERROR');
  }

  const existing = await database.db('departments').where({ name: department }).first();
  if (existing) {
    return res.json({ success: true, department, message: 'Department already exists' });
  }

  try {
    await database.db('departments').insert({ name: department });
    console.log('[ADMIN] Department created:', department);
  } catch (err) {
    console.error('[ADMIN] Failed to create department:', err.message);
    throw createHttpError(500, 'Failed to create department', 'DB_ERROR');
  }

  await AuditLogger.log({
    action: 'department_created',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'department',
    newValues: { name: department },
    req
  });

  res.json({ success: true, department });
}));

// Delete department
router.delete('/departments/:id', asyncHandler(async (req, res) => {
  const department = await database.db('departments').where({ id: req.params.id }).first();
  if (!department) {
    throw createHttpError(404, 'Department not found', 'DEPARTMENT_NOT_FOUND');
  }

  await database.db('departments').where({ id: req.params.id }).del();

  await AuditLogger.log({
    action: 'department_deleted',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'department',
    entityId: department.id,
    oldValues: { name: department.name },
    req
  });

  res.json({ success: true, message: 'Department deleted successfully' });
}));

// Get all unique levels
router.get('/levels', asyncHandler(async (req, res) => {
  const levels = await database.db('levels')
    .select('id', 'name')
    .orderBy('name', 'asc');

  res.json({ success: true, levels });
}));

// Create new level
router.post('/levels', asyncHandler(async (req, res) => {
  const { level } = req.body;

  if (!level) {
    throw createHttpError(400, 'Level is required', 'VALIDATION_ERROR');
  }

  const existing = await database.db('levels').where({ name: level }).first();
  if (existing) {
    return res.json({ success: true, level, message: 'Level already exists' });
  }

  try {
    await database.db('levels').insert({ name: level });
    console.log('[ADMIN] Level created:', level);
  } catch (err) {
    console.error('[ADMIN] Failed to create level:', err.message);
    throw createHttpError(500, 'Failed to create level', 'DB_ERROR');
  }

  await AuditLogger.log({
    action: 'level_created',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'level',
    newValues: { name: level },
    req
  });

  res.json({ success: true, level });
}));

// Delete level
router.delete('/levels/:id', asyncHandler(async (req, res) => {
  const level = await database.db('levels').where({ id: req.params.id }).first();
  if (!level) {
    throw createHttpError(404, 'Level not found', 'LEVEL_NOT_FOUND');
  }

  await database.db('levels').where({ id: req.params.id }).del();

  await AuditLogger.log({
    action: 'level_deleted',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'level',
    entityId: level.id,
    oldValues: { name: level.name },
    req
  });

  res.json({ success: true, message: 'Level deleted successfully' });
}));

// Get all unique academic sessions
router.get('/academic-sessions', asyncHandler(async (req, res) => {
  const sessions = await database.db('sessions')
    .select('id', 'name')
    .orderBy('name', 'desc');

  res.json({ success: true, sessions });
}));

// Create new academic session
router.post('/academic-sessions', asyncHandler(async (req, res) => {
  const { academic_session } = req.body;

  if (!academic_session) {
    throw createHttpError(400, 'Academic session is required', 'VALIDATION_ERROR');
  }

  const existing = await database.db('sessions').where({ name: academic_session }).first();
  if (existing) {
    return res.json({ success: true, academic_session, message: 'Academic session already exists' });
  }

  try {
    await database.db('sessions').insert({ name: academic_session });
    console.log('[ADMIN] Academic session created:', academic_session);
  } catch (err) {
    console.error('[ADMIN] Failed to create academic session:', err.message);
    throw createHttpError(500, 'Failed to create academic session', 'DB_ERROR');
  }

  await AuditLogger.log({
    action: 'session_created',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'session',
    newValues: { name: academic_session },
    req
  });

  res.json({ success: true, academic_session });
}));

// Delete academic session
router.delete('/academic-sessions/:id', asyncHandler(async (req, res) => {
  const session = await database.db('sessions').where({ id: req.params.id }).first();
  if (!session) {
    throw createHttpError(404, 'Academic session not found', 'SESSION_NOT_FOUND');
  }

  await database.db('sessions').where({ id: req.params.id }).del();

  await AuditLogger.log({
    action: 'session_deleted',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'session',
    entityId: session.id,
    oldValues: { name: session.name },
    req
  });

  res.json({ success: true, message: 'Academic session deleted successfully' });
}));

// Download receipt
router.get('/receipt/:identifier', asyncHandler(async (req, res) => {
  const identifier = req.params.identifier;
  const receipt = await database.db('receipts')
    .where({ transaction_id: identifier })
    .orWhere({ receipt_number: identifier })
    .first();
  if (!receipt || !receipt.pdf_base64) {
    throw createHttpError(404, 'Receipt not found', 'RECEIPT_NOT_FOUND');
  }
  const pdfBuffer = Buffer.from(receipt.pdf_base64, 'base64');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receipt_number}.pdf"`);
  res.send(pdfBuffer);
}));

// Search student payments
router.get('/search-student', asyncHandler(async (req, res) => {
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
}));

// Reconcile payments
router.post('/reconcile', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.body;
  
  if (!start_date || !end_date) {
    throw createHttpError(400, 'Start date and end date are required', 'VALIDATION_ERROR');
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
}));

// Export transactions to Excel
router.get('/export/excel', asyncHandler(async (req, res) => {
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
    if (session) {
      query = query.where('users.session', session);
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
    throw err;
  }
}));

// Export transactions to CSV
router.get('/export/csv', asyncHandler(async (req, res) => {
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
    if (session) {
      query = query.where('users.session', session);
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
    throw err;
  }
}));

// Export paid students to Excel
router.get('/export/paid-students/excel', asyncHandler(async (req, res) => {
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
    if (session) {
      query = query.where('users.session', session);
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
    throw err;
  }
}));

// Export paid students to CSV
router.get('/export/paid-students/csv', asyncHandler(async (req, res) => {
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
    if (session) {
      query = query.where('users.session', session);
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
    throw err;
  }
}));

// ── BURSAR: View audit logs ──
router.get('/audit-logs', asyncHandler(async (req, res) => {
  try {
    const { action, entity_type, limit = 100, offset = 0 } = req.query;

    let query = database.db('audit_logs')
      .select(
        'audit_logs.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .orderBy('audit_logs.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (action) {
      query = query.where('audit_logs.action', action);
    }
    if (entity_type) {
      query = query.where('audit_logs.entity_type', entity_type);
    }

    const logs = await query;

    res.json({ success: true, logs });
  } catch (err) {
    console.error('[admin] audit logs error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Bulk create students ──
router.post('/students/bulk', asyncHandler(async (req, res) => {
  const trx = await database.db.transaction();
  try {
    const { students } = req.body; // Array of student objects
    
    if (!Array.isArray(students) || students.length === 0) {
      throw createHttpError(400, 'students must be a non-empty array', 'VALIDATION_ERROR');
    }

    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const createdStudents = [];
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      try {
        // Validate required fields
        if (!student.matric_number || !student.email || !student.password || !student.first_name || !student.last_name || !student.department || !student.level || !student.session) {
          errors.push({ index: i, error: 'Missing required fields', student });
          continue;
        }

        // Check for existing user
        const existing = await trx('users').where({ email: student.email.toLowerCase() }).orWhere({ matric_number: student.matric_number.toUpperCase() }).first();
        if (existing) {
          errors.push({ index: i, error: 'Email or matric number already exists', student });
          continue;
        }

        const password_hash = await bcrypt.hash(student.password, 10);

        const [user] = await trx('users').insert({
          matric_number: student.matric_number.toUpperCase(),
          email: student.email.toLowerCase(),
          password_hash,
          first_name: student.first_name,
          last_name: student.last_name,
          department: student.department,
          level: student.level,
          session: student.session,
          user_type: 'student'
        }).returning('*');

        // Create wallet
        await trx('wallets').insert({ user_id: user.id, balance: 0, currency: 'NGN' });

        createdStudents.push({ id: user.id, email: user.email, matric_number: user.matric_number, first_name: user.first_name, last_name: user.last_name });
      } catch (err) {
        errors.push({ index: i, error: err.message, student });
      }
    }

    await trx.commit();

    await AuditLogger.log({
      action: 'bulk_students_created',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'user',
      newValues: { created_count: createdStudents.length, error_count: errors.length },
      req
    });

    res.json({ success: true, created_count: createdStudents.length, created_students: createdStudents, errors });
  } catch (err) {
    await trx.rollback();
    console.error('[admin] bulk student creation error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Bulk update students ──
router.put('/students/bulk', asyncHandler(async (req, res) => {
  try {
    const { student_ids, updates } = req.body; // student_ids: array of IDs, updates: object with fields to update
    
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      throw createHttpError(400, 'student_ids must be a non-empty array', 'VALIDATION_ERROR');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw createHttpError(400, 'No fields to update', 'VALIDATION_ERROR');
    }

    const allowedFields = ['department', 'level', 'session', 'first_name', 'last_name'];
    const updateData = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = updates[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw createHttpError(400, 'No valid fields to update', 'VALIDATION_ERROR');
    }

    const updatedCount = await database.db('users')
      .whereIn('id', student_ids)
      .update(updateData);

    await AuditLogger.log({
      action: 'bulk_students_updated',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'user',
      newValues: { updated_count: updatedCount, updates: updateData },
      req
    });

    res.json({ success: true, updated_count });
  } catch (err) {
    console.error('[admin] bulk student update error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Trigger payment reminders ──
router.post('/payment-reminders/send', asyncHandler(async (req, res) => {
  try {
    await sendUpcomingReminders();
    
    await AuditLogger.log({
      action: 'payment_reminders_sent',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'system',
      newValues: { type: 'upcoming_reminders' },
      req
    });

    res.json({ success: true, message: 'Payment reminders sent successfully' });
  } catch (err) {
    console.error('[admin] payment reminders error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Check overdue payments ──
router.post('/payment-reminders/check-overdue', asyncHandler(async (req, res) => {
  try {
    await checkOverduePayments();
    
    await AuditLogger.log({
      action: 'overdue_payments_checked',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'system',
      newValues: { type: 'late_fee_check' },
      req
    });

    res.json({ success: true, message: 'Overdue payments checked successfully' });
  } catch (err) {
    console.error('[admin] overdue check error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Create database backup ──
router.post('/backup/create', asyncHandler(async (req, res) => {
  try {
    const result = await createBackup();
    
    await AuditLogger.log({
      action: 'backup_created',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'system',
      newValues: { file: result.file },
      req
    });

    res.json({ success: true, message: 'Backup created successfully', file: result.file });
  } catch (err) {
    console.error('[admin] backup create error:', err.message);
    throw err;
  }
}));

// ── BURSAR: List database backups ──
router.get('/backup/list', asyncHandler(async (req, res) => {
  try {
    const result = await listBackups();
    res.json({ success: true, backups: result.backups });
  } catch (err) {
    console.error('[admin] backup list error:', err.message);
    throw err;
  }
}));

module.exports = router;

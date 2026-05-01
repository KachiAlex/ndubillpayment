const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { db } = require('../utils/database');
const { generateReceipt } = require('../utils/receiptGenerator');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const router = express.Router();

// Get admin reports
router.get('/reports', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;

    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session'
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

    // Calculate summary statistics
    const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalTransactions = transactions.length;
    const uniqueStudents = new Set(transactions.map(t => t.user_id)).size;

    res.json({
      transactions,
      summary: {
        total_amount: totalAmount,
        total_transactions: totalTransactions,
        unique_students: uniqueStudents,
        currency: 'NGN'
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { page = 1, limit = 10, user_type, department, session } = req.query;
    const offset = (page - 1) * limit;

    let query = db('users').select('*');

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

    const total = await query.clone().count('* as count').first();

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions
router.get('/transactions', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const offset = (page - 1) * limit;

    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session'
      );

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

    const total = await query.clone().count('* as count').first();

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export transactions to Excel
router.get('/export/excel', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;

    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session'
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Matric No', key: 'matric_no', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Session', key: 'session', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Reference', key: 'reference', width: 25 }
    ];

    // Add data
    transactions.forEach(transaction => {
      worksheet.addRow({
        date: new Date(transaction.created_at).toLocaleDateString(),
        matric_no: transaction.matric_no,
        student_name: `${transaction.first_name} ${transaction.last_name}`,
        department: transaction.department,
        session: transaction.session,
        amount: `₦${transaction.amount}`,
        type: transaction.type,
        status: transaction.status,
        reference: transaction.reference
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export paid students list to Excel
router.get('/export/paid-students/excel', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;

    // Get all students who have made payments
    let query = db('users')
      .join('transactions', 'users.id', 'transactions.user_id')
      .select(
        'users.id',
        'users.matric_no',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.session',
        'users.email',
        db.raw('SUM(transactions.amount) as total_paid'),
        db.raw('COUNT(transactions.id) as payment_count')
      )
      .where('transactions.status', 'completed')
      .groupBy('users.id', 'users.matric_no', 'users.first_name', 'users.last_name', 'users.department', 'users.session', 'users.email');

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

    const paidStudents = await query.orderBy('users.matric_no');

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paid Students');

    // Add headers
    worksheet.columns = [
      { header: 'Student ID', key: 'matric_no', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Session', key: 'session', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Total Paid', key: 'total_paid', width: 15 },
      { header: 'Payment Count', key: 'payment_count', width: 15 }
    ];

    // Add data
    paidStudents.forEach(student => {
      worksheet.addRow({
        matric_no: student.matric_no,
        full_name: `${student.first_name} ${student.last_name}`,
        department: student.department,
        session: student.session,
        email: student.email,
        total_paid: `₦${parseFloat(student.total_paid).toLocaleString()}`,
        payment_count: student.payment_count
      });
    });

    // Add summary row
    const totalAmount = paidStudents.reduce((sum, s) => sum + parseFloat(s.total_paid), 0);
    worksheet.addRow({
      matric_no: 'TOTAL',
      full_name: '',
      department: '',
      session: '',
      email: '',
      total_paid: `₦${totalAmount.toLocaleString()}`,
      payment_count: paidStudents.length
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=paid-students.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export paid students Excel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export paid students list to CSV
router.get('/export/paid-students/csv', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;

    // Get all students who have made payments
    let query = db('users')
      .join('transactions', 'users.id', 'transactions.user_id')
      .select(
        'users.id',
        'users.matric_no',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.session',
        'users.email',
        db.raw('SUM(transactions.amount) as total_paid'),
        db.raw('COUNT(transactions.id) as payment_count')
      )
      .where('transactions.status', 'completed')
      .groupBy('users.id', 'users.matric_no', 'users.first_name', 'users.last_name', 'users.department', 'users.session', 'users.email');

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

    const paidStudents = await query.orderBy('users.matric_no');

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=paid-students.csv');

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: 'paid-students.csv',
      header: [
        { id: 'matric_no', title: 'Student ID' },
        { id: 'full_name', title: 'Full Name' },
        { id: 'department', title: 'Department' },
        { id: 'session', title: 'Session' },
        { id: 'email', title: 'Email' },
        { id: 'total_paid', title: 'Total Paid' },
        { id: 'payment_count', title: 'Payment Count' }
      ]
    });

    // Format data for CSV
    const csvData = paidStudents.map(student => ({
      matric_no: student.matric_no,
      full_name: `${student.first_name} ${student.last_name}`,
      department: student.department,
      session: student.session,
      email: student.email,
      total_paid: `₦${parseFloat(student.total_paid).toLocaleString()}`,
      payment_count: student.payment_count
    }));

    // Add summary row
    const totalAmount = paidStudents.reduce((sum, s) => sum + parseFloat(s.total_paid), 0);
    csvData.push({
      matric_no: 'TOTAL',
      full_name: '',
      department: '',
      session: '',
      email: '',
      total_paid: `₦${totalAmount.toLocaleString()}`,
      payment_count: paidStudents.length
    });

    // Write CSV to response
    await csvWriter.writeRecords(csvData);
    res.end();
  } catch (error) {
    console.error('Export paid students CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export transactions to CSV
router.get('/export/csv', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date, department, session } = req.query;

    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session'
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

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: 'transactions.csv',
      header: [
        { id: 'date', title: 'Date' },
        { id: 'matric_no', title: 'Matric No' },
        { id: 'student_name', title: 'Student Name' },
        { id: 'department', title: 'Department' },
        { id: 'session', title: 'Session' },
        { id: 'amount', title: 'Amount' },
        { id: 'type', title: 'Type' },
        { id: 'status', title: 'Status' },
        { id: 'reference', title: 'Reference' }
      ]
    });

    // Format data for CSV
    const csvData = transactions.map(transaction => ({
      date: new Date(transaction.created_at).toLocaleDateString(),
      matric_no: transaction.matric_no,
      student_name: `${transaction.first_name} ${transaction.last_name}`,
      department: transaction.department,
      session: transaction.session,
      amount: `₦${transaction.amount}`,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference
    }));

    // Write CSV to response
    await csvWriter.writeRecords(csvData);
    res.end();
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search student payments by student ID and department
router.get('/search-student', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { student_id, department } = req.query;

    if (!student_id && !department) {
      return res.status(400).json({ error: 'Student ID or Department is required' });
    }

    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session',
        'users.email'
      )
      .where('transactions.status', 'completed');

    if (student_id) {
      query = query.where('users.matric_no', 'like', `%${student_id}%`);
    }
    if (department) {
      query = query.where('users.department', department);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    res.json({
      transactions,
      summary: {
        total_amount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
        total_transactions: transactions.length,
        currency: 'NGN'
      }
    });
  } catch (error) {
    console.error('Search student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and download receipt for a specific transaction
router.get('/receipt/:transactionId', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Get transaction with user details
    const transaction = await db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.*',
        'users.first_name',
        'users.last_name',
        'users.matric_no',
        'users.department',
        'users.session',
        'users.email'
      )
      .where('transactions.id', transactionId)
      .where('transactions.status', 'completed')
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Generate receipt PDF
    const receiptBuffer = await generateReceipt(transaction);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${transaction.reference}.pdf`);
    res.setHeader('Content-Length', receiptBuffer.length);

    res.send(receiptBuffer);
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reconcile payments
router.post('/reconcile', authenticateJWT, authorizeRoles(['admin', 'bursar']), async (req, res) => {
  try {
    const { start_date, end_date } = req.body;

    // Get all completed transactions in the date range
    const transactions = await db('transactions')
      .where('status', 'completed')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date);

    const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Log reconciliation
    await db('audit_logs').insert({
      user_id: req.user.userId,
      action: 'payment_reconciliation',
      details: `Reconciled payments from ${start_date} to ${end_date}: ₦${totalAmount}`,
      ip_address: req.ip,
      timestamp: new Date()
    });

    res.json({
      message: 'Reconciliation completed',
      total_amount: totalAmount,
      transaction_count: transactions.length,
      date_range: { start_date, end_date }
    });
  } catch (error) {
    console.error('Reconcile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download receipt PDF
router.get('/receipt/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await db('receipts').where({ transaction_id: id }).first();

    if (!receipt || !receipt.receipt_data) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const data = JSON.parse(receipt.receipt_data);
    const buffer = Buffer.from(data.pdf_base64, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${id}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Receipt download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

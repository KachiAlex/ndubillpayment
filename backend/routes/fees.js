const express = require('express');
const database = require('../utils/database');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const AuditLogger = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');

const router = express.Router();

function normalizeOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function hasFeeDeadlinePassed(dueDate) {
  if (!dueDate) return false;
  const deadline = new Date(dueDate);
  if (Number.isNaN(deadline.getTime())) return false;
  deadline.setHours(23, 59, 59, 999);
  return new Date() > deadline;
}

// ── BURSAR: Create a fee ──
router.post('/', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const { name, amount, academic_session, department, level, description, due_date } = req.body;
  if (!name || !amount || !academic_session) {
    throw createHttpError(400, 'name, amount, and academic_session are required', 'VALIDATION_ERROR');
  }

  const normalizedDueDate = normalizeOptionalDate(due_date);
  if (due_date && !normalizedDueDate) {
    throw createHttpError(400, 'Invalid due date format', 'INVALID_DUE_DATE');
  }

  const [fee] = await database.db('fees').insert({
    name,
    amount,
    academic_session,
    department: department === 'ALL' ? null : (department || null),
    level: level || null,
    description: description || null,
    due_date: normalizedDueDate,
    created_by: req.user.id
  }).returning('*');

  await AuditLogger.log({
    action: 'fee_created',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'fee',
    entityId: fee.id,
    newValues: { name, amount, academic_session, department, level, description, due_date: normalizedDueDate },
    req
  });

  res.status(201).json({ success: true, fee });
}));

// ── BURSAR: List all fees ──
router.get('/all', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const fees = await database.db('fees').orderBy('created_at', 'desc');
  res.json({ success: true, fees });
}));

// ── BURSAR: Update a fee ──
router.put('/:id', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const { name, amount, academic_session, department, level, description, is_active, due_date } = req.body;
  const normalizedDueDate = normalizeOptionalDate(due_date);
  if (due_date && !normalizedDueDate) {
    throw createHttpError(400, 'Invalid due date format', 'INVALID_DUE_DATE');
  }
  const [fee] = await database.db('fees')
    .where({ id: req.params.id })
    .update({ 
      name, 
      amount, 
      academic_session, 
      department: department === 'ALL' ? null : (department || null), 
      level: level || null, 
      description: description || null, 
      due_date: normalizedDueDate,
      is_active, 
      updated_at: new Date() 
    })
    .returning('*');
  if (!fee) throw createHttpError(404, 'Fee not found', 'FEE_NOT_FOUND');

  await AuditLogger.log({
    action: 'fee_updated',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'fee',
    entityId: fee.id,
    newValues: { name, amount, academic_session, department, level, description, due_date: normalizedDueDate, is_active },
    req
  });

  res.json({ success: true, fee });
}));

// ── BURSAR: Delete a fee ──
router.delete('/:id', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const deleted = await database.db('fees').where({ id: req.params.id }).del();
  if (!deleted) throw createHttpError(404, 'Fee not found', 'FEE_NOT_FOUND');

  await AuditLogger.log({
    action: 'fee_deleted',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'fee',
    entityId: parseInt(req.params.id),
    req
  });

  res.json({ success: true, message: 'Fee deleted' });
}));

// ── BURSAR: Bulk assign fee to students ──
router.post('/:id/assign', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const { department, level, session } = req.body;
  const feeId = req.params.id;

  const fee = await database.db('fees').where({ id: feeId }).first();
  if (!fee) throw createHttpError(404, 'Fee not found', 'FEE_NOT_FOUND');

  let query = database.db('users').where({ user_type: 'student' });
  
  if (department) query = query.where('department', department);
  if (level) query = query.where('level', level);
  if (session) query = query.where('session', session);

  const students = await query.select('id');
  const studentIds = students.map(s => s.id);

  if (studentIds.length === 0) {
    return res.json({ success: true, message: 'No students match the criteria', assigned_count: 0 });
  }

  const assignedCount = studentIds.length;

  await AuditLogger.log({
    action: 'bulk_fee_assigned',
    userId: req.user.id,
    userEmail: req.user.email,
    userType: req.user.user_type,
    entityType: 'fee',
    entityId: feeId,
    newValues: { fee_id: feeId, department, level, session, student_count: assignedCount },
    req
  });

  res.json({ success: true, message: `Fee assigned to ${assignedCount} students`, assigned_count: assignedCount });
}));

// ── STUDENT: List applicable fees ──
router.get('/', authenticateJWT, authorizeRoles('student'), asyncHandler(async (req, res) => {
  const user = await database.db('users').where({ id: req.user.id }).first();
  if (!user) throw createHttpError(404, 'User not found', 'USER_NOT_FOUND');

  const query = database.db('fees')
    .where({ is_active: true })
    .andWhere(function () {
      this.whereNull('department').orWhere('department', user.department);
    })
    .andWhere(function () {
      this.whereNull('level').orWhere('level', user.level);
    })
    .orderBy('created_at', 'desc');

  const fees = await query;

  // Get payment progress for each fee
  const payments = await database.db('fee_payments')
    .where({ user_id: req.user.id })
    .select('fee_id', 'amount_paid', 'total_amount', 'remaining_balance', 'status');

  const paymentMap = new Map();
  payments.forEach(p => {
    paymentMap.set(p.fee_id, p);
  });

  const enriched = fees.map(f => {
    const payment = paymentMap.get(f.id);
    if (!payment) {
      return {
        ...f,
        amount_paid: 0,
        total_amount: parseFloat(f.amount),
        remaining_balance: parseFloat(f.amount),
        status: 'pending',
        is_paid: false
      };
    }
    return {
      ...f,
      amount_paid: parseFloat(payment.amount_paid),
      total_amount: parseFloat(payment.total_amount) || parseFloat(f.amount),
      remaining_balance: parseFloat(payment.remaining_balance),
      status: payment.status,
      is_paid: payment.status === 'completed'
    };
  });

  res.json({ success: true, fees: enriched });
}));

// ── STUDENT: Pay a fee from wallet (supports partial payments) ──
router.post('/:id/pay', authenticateJWT, authorizeRoles('student'), asyncHandler(async (req, res) => {
  const trx = await database.db.transaction();
  try {
    const { amount } = req.body;
    const paymentAmount = parseFloat(amount) || parseFloat(req.query.amount) || 0;

    const fee = await trx('fees').where({ id: req.params.id, is_active: true }).first();
    if (!fee) {
      throw createHttpError(404, 'Fee not found or inactive', 'FEE_NOT_FOUND');
    }

    if (hasFeeDeadlinePassed(fee.due_date)) {
      throw createHttpError(403, 'The deadline for this fee has passed', 'FEE_DEADLINE_PASSED');
    }

    // Verify student department/level match
    const user = await trx('users').where({ id: req.user.id }).first();
    if (fee.department && fee.department !== user.department) {
      throw createHttpError(403, 'This fee is not applicable to your department', 'FEE_NOT_APPLICABLE');
    }
    if (fee.level && fee.level !== user.level) {
      throw createHttpError(403, 'This fee is not applicable to your level', 'FEE_NOT_APPLICABLE');
    }

    // Check existing payment record
    const existingPayment = await trx('fee_payments')
      .where({ user_id: req.user.id, fee_id: fee.id })
      .first();

    const totalAmount = parseFloat(fee.amount);
    let amountToPay = paymentAmount;

    // If no existing payment, default to full amount
    if (!existingPayment) {
      amountToPay = paymentAmount > 0 ? paymentAmount : totalAmount;
    } else {
      // If existing payment, check remaining balance
      const remaining = parseFloat(existingPayment.remaining_balance);
      if (remaining <= 0) {
        throw createHttpError(400, 'This fee is already fully paid', 'FEE_ALREADY_PAID');
      }
      // Default to remaining balance if no amount specified
      amountToPay = paymentAmount > 0 ? paymentAmount : remaining;
      // Cap at remaining balance
      if (amountToPay > remaining) {
        amountToPay = remaining;
      }
    }

    if (amountToPay <= 0) {
      throw createHttpError(400, 'Invalid payment amount', 'INVALID_PAYMENT_AMOUNT');
    }

    // Check wallet balance
    const wallet = await trx('wallets').where({ user_id: req.user.id }).first();
    if (!wallet) {
      throw createHttpError(404, 'Wallet not found', 'WALLET_NOT_FOUND');
    }
    if (parseFloat(wallet.balance) < amountToPay) {
      throw createHttpError(400, 'Insufficient wallet balance', 'INSUFFICIENT_BALANCE');
    }

    const reference = `FEE-${Date.now()}-${req.user.id.slice(0, 8)}`;

    // Deduct wallet
    const newBalance = parseFloat(wallet.balance) - amountToPay;
    await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });

    // Create transaction record
    const [transaction] = await trx('transactions').insert({
      user_id: req.user.id,
      reference: reference,
      type: 'payment',
      status: 'successful',
      amount: amountToPay,
      currency: 'NGN',
      description: `Payment for ${fee.name} (${fee.academic_session})`,
      payment_method: 'wallet'
    }).returning('*');

    // Create or update fee payment record
    let feePayment;
    if (existingPayment) {
      // Update existing payment
      const newAmountPaid = parseFloat(existingPayment.amount_paid) + amountToPay;
      const newRemaining = totalAmount - newAmountPaid;
      const newStatus = newRemaining <= 0 ? 'completed' : (newAmountPaid > 0 ? 'partial' : 'pending');

      [feePayment] = await trx('fee_payments')
        .where({ id: existingPayment.id })
        .update({
          amount_paid: newAmountPaid,
          remaining_balance: newRemaining,
          status: newStatus
        })
        .returning('*');
    } else {
      // Create new payment record
      const newAmountPaid = amountToPay;
      const newRemaining = totalAmount - newAmountPaid;
      const newStatus = newRemaining <= 0 ? 'completed' : 'partial';

      [feePayment] = await trx('fee_payments').insert({
        id: uuidv4(),
        user_id: req.user.id,
        fee_id: fee.id,
        amount_paid: newAmountPaid,
        total_amount: totalAmount,
        remaining_balance: newRemaining,
        status: newStatus,
        reference
      }).returning('*');
    }

    await trx.commit();

    await AuditLogger.log({
      action: 'payment_processed',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'payment',
      entityId: transaction.id,
      newValues: {
        fee_id: fee.id,
        fee_name: fee.name,
        amount: amountToPay,
        payment_method: 'wallet',
        reference
      },
      req
    });

    res.json({
      success: true,
      message: `Paid ₦${amountToPay} for ${fee.name}`,
      new_balance: newBalance,
      amount_paid: amountToPay,
      total_amount: totalAmount,
      remaining_balance: feePayment.remaining_balance,
      status: feePayment.status,
      transaction,
      fee_payment: feePayment
    });
  } catch (err) {
    await trx.rollback();
    console.error('[fees] pay error:', err.message);
    throw err;
  }
}));

// ── STUDENT: Download receipt for fee payment ──
router.get('/payments/:paymentId/receipt', authenticateJWT, authorizeRoles('student'), asyncHandler(async (req, res) => {
  try {
    const payment = await database.db('fee_payments')
      .join('fees', 'fee_payments.fee_id', 'fees.id')
      .join('users', 'fee_payments.user_id', 'users.id')
      .where('fee_payments.id', req.params.paymentId)
      .where('fee_payments.user_id', req.user.id)
      .select('fee_payments.*', 'fees.name as fee_name', 'fees.academic_session', 'users.first_name', 'users.last_name', 'users.matric_number')
      .first();

    if (!payment) {
      throw createHttpError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    doc.fontSize(20).text('NDU Tuition Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt No: ${payment.reference}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(14).text(`Student: ${payment.first_name} ${payment.last_name}`);
    doc.text(`Matric No: ${payment.matric_number}`);
    doc.moveDown();
    doc.text(`Fee: ${payment.fee_name}`);
    doc.text(`Academic Session: ${payment.academic_session}`);
    doc.moveDown();
    doc.fontSize(14).text(`Amount Paid: ₦${Number(payment.amount_paid).toLocaleString()}`);
    doc.text(`Total Amount: ₦${Number(payment.total_amount).toLocaleString()}`);
    doc.text(`Remaining Balance: ₦${Number(payment.remaining_balance).toLocaleString()}`);
    doc.moveDown();
    doc.text(`Status: ${payment.status.toUpperCase()}`);

    doc.end();

    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.reference}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[fees] receipt error:', err.message);
    throw err;
  }
}));

// ── STUDENT: Get payment history for a specific fee ──
router.get('/:feeId/history', authenticateJWT, authorizeRoles('student'), asyncHandler(async (req, res) => {
  try {
    const transactions = await database.db('transactions')
      .join('fee_payments', 'transactions.id', 'fee_payments.transaction_id')
      .where('fee_payments.fee_id', req.params.feeId)
      .where('fee_payments.user_id', req.user.id)
      .select('transactions.*')
      .orderBy('transactions.created_at', 'desc');

    res.json({ success: true, transactions });
  } catch (err) {
    console.error('[fees] history error:', err.message);
    throw err;
  }
}));

// ── STUDENT: View my fee payment history ──
router.get('/payments', authenticateJWT, authorizeRoles('student'), asyncHandler(async (req, res) => {
  try {
    const payments = await database.db('fee_payments')
      .join('fees', 'fee_payments.fee_id', 'fees.id')
      .where('fee_payments.user_id', req.user.id)
      .select(
        'fee_payments.id',
        'fee_payments.amount_paid',
        'fee_payments.status',
        'fee_payments.reference',
        'fee_payments.created_at',
        'fees.name as fee_name',
        'fees.academic_session'
      )
      .orderBy('fee_payments.created_at', 'desc');
    res.json({ success: true, payments });
  } catch (err) {
    console.error('[fees] payments history error:', err.message);
    throw err;
  }
}));

// ── BURSAR: Request refund for a payment ──
router.post('/payments/:paymentId/refund', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const trx = await database.db.transaction();
  try {
    const { reason } = req.body;
    const paymentId = req.params.paymentId;

    const payment = await trx('fee_payments')
      .where({ id: paymentId })
      .first();

    if (!payment) {
      throw createHttpError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'completed' && payment.status !== 'partial') {
      throw createHttpError(400, 'Cannot refund a payment that is not completed or partial', 'INVALID_REFUND_STATE');
    }

    const existingRefund = await trx('refunds')
      .where({ fee_payment_id: paymentId })
      .whereIn('status', ['pending', 'approved', 'processed'])
      .first();

    if (existingRefund) {
      throw createHttpError(400, 'A refund request already exists for this payment', 'REFUND_ALREADY_EXISTS');
    }

    const transaction = await trx('transactions')
      .where({ user_id: payment.user_id })
      .where('description', 'like', `%${payment.reference}%`)
      .orderBy('created_at', 'desc')
      .first();

    if (!transaction) {
      throw createHttpError(404, 'Associated transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    const [refund] = await trx('refunds').insert({
      user_id: payment.user_id,
      transaction_id: transaction.id,
      fee_payment_id: payment.id,
      amount: payment.amount_paid,
      reason: reason || 'Refund requested by bursar',
      status: 'pending'
    }).returning('*');

    await trx.commit();

    await AuditLogger.log({
      action: 'refund_requested',
      userId: req.user.id,
      userEmail: req.user.email,
      userType: req.user.user_type,
      entityType: 'refund',
      entityId: refund.id,
      newValues: { payment_id: paymentId, amount: payment.amount_paid, reason },
      req
    });

    res.status(201).json({ success: true, refund });
  } catch (err) {
    await trx.rollback();
    console.error('[fees] refund request error:', err.message);
    throw err;
  }
}));

// ── BURSAR: List all refund requests ──
router.get('/refunds', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const refunds = await database.db('refunds')
    .join('users', 'refunds.user_id', 'users.id')
    .join('transactions', 'refunds.transaction_id', 'transactions.id')
    .select(
      'refunds.*',
      'users.first_name',
      'users.last_name',
      'users.email',
      'transactions.reference'
    )
    .orderBy('refunds.created_at', 'desc');
  res.json({ success: true, refunds });
}));

// ── BURSAR: Process refund (approve/reject) ──
router.put('/refunds/:refundId/process', authenticateJWT, authorizeRoles('bursar', 'admin'), asyncHandler(async (req, res) => {
  const trx = await database.db.transaction();
  try {
    const { action } = req.body;
    const refundId = req.params.refundId;

    const refund = await trx('refunds').where({ id: refundId }).first();
    if (!refund) {
      throw createHttpError(404, 'Refund not found', 'REFUND_NOT_FOUND');
    }

    if (refund.status !== 'pending') {
      throw createHttpError(400, 'Refund has already been processed', 'REFUND_ALREADY_PROCESSED');
    }

    if (action === 'reject') {
      await trx('refunds').where({ id: refundId }).update({ status: 'rejected', processed_by: req.user.id, processed_at: new Date() });
      await trx.commit();

      await AuditLogger.log({
        action: 'refund_rejected',
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type,
        entityType: 'refund',
        entityId: parseInt(refundId),
        newValues: { refund_id: refundId, action: 'reject' },
        req
      });

      return res.json({ success: true, message: 'Refund rejected' });
    }

    if (action === 'approve') {
      const wallet = await trx('wallets').where({ user_id: refund.user_id }).first();
      if (!wallet) {
        throw createHttpError(404, 'Wallet not found', 'WALLET_NOT_FOUND');
      }

      const newBalance = parseFloat(wallet.balance) + parseFloat(refund.amount);
      await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });

      const refundRef = `REFUND-${Date.now()}-${refund.user_id.slice(0, 8)}`;
      await trx('transactions').insert({
        user_id: refund.user_id,
        reference: refundRef,
        type: 'refund',
        status: 'successful',
        amount: refund.amount,
        currency: 'NGN',
        description: `Refund: ${refund.reason || 'No reason provided'}`,
        payment_method: 'wallet'
      });

      await trx('refunds').where({ id: refundId }).update({ status: 'processed', processed_by: req.user.id, processed_at: new Date() });

      if (refund.fee_payment_id) {
        const payment = await trx('fee_payments').where({ id: refund.fee_payment_id }).first();
        if (payment) {
          const newAmountPaid = parseFloat(payment.amount_paid) - parseFloat(refund.amount);
          const newRemaining = parseFloat(payment.total_amount) - newAmountPaid;
          const newStatus = newAmountPaid <= 0 ? 'pending' : (newRemaining <= 0 ? 'completed' : 'partial');
          await trx('fee_payments').where({ id: refund.fee_payment_id }).update({
            amount_paid: newAmountPaid,
            remaining_balance: newRemaining,
            status: newStatus
          });
        }
      }

      await trx.commit();

      await AuditLogger.log({
        action: 'refund_approved',
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type,
        entityType: 'refund',
        entityId: parseInt(refundId),
        newValues: { refund_id: refundId, action: 'approve', amount: refund.amount },
        req
      });

      return res.json({ success: true, message: 'Refund processed successfully' });
    }

    await trx.rollback();
    throw createHttpError(400, 'Invalid action. Use "approve" or "reject"', 'INVALID_ACTION');
  } catch (err) {
    await trx.rollback();
    console.error('[fees] refund process error:', err.message);
    throw err;
  }
}));

module.exports = router;

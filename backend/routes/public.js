const express = require('express');
const database = require('../utils/database');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');
const { finalizeSuccessfulPayment } = require('../utils/paymentFinalizer');
const crypto = require('crypto');

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

// Get a student by matric number for public payment flows
router.get('/student/:matricNumber', asyncHandler(async (req, res) => {
  const { matricNumber } = req.params;

  const student = await database.db('users')
    .whereRaw('LOWER(matric_number) = ?', [matricNumber.trim().toLowerCase()])
    .andWhere({ user_type: 'student' })
    .select('id', 'matric_number', 'email', 'first_name', 'last_name', 'department', 'level')
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      code: 'STUDENT_NOT_FOUND'
    });
  }

  res.json({ success: true, student });
}));

// Create a pending payment intent for public QR payment flows
router.post('/payment-intents', asyncHandler(async (req, res) => {
  const { matric_number, amount } = req.body;

  const sanitizedMatricNumber = typeof matric_number === 'string' ? matric_number.trim() : '';
  const numericAmount = Number(amount);

  if (!sanitizedMatricNumber) {
    throw createHttpError(400, 'Matric number is required', 'MATRIC_NUMBER_REQUIRED');
  }

  if (!numericAmount || numericAmount <= 0) {
    throw createHttpError(400, 'Valid amount is required', 'INVALID_AMOUNT');
  }

  const student = await database.db('users')
    .whereRaw('LOWER(matric_number) = ?', [sanitizedMatricNumber.toLowerCase()])
    .andWhere({ user_type: 'student' })
    .first();

  if (!student) {
    throw createHttpError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  }

  const txRef = `QR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  await database.db('transactions').insert({
    user_id: student.id,
    reference: txRef,
    type: 'wallet_funding',
    amount: numericAmount,
    currency: 'NGN',
    status: 'pending',
    payment_method: 'flutterwave',
    description: `Wallet funding for ${student.first_name} ${student.last_name}`
  });

  res.json({
    success: true,
    student: {
      id: student.id,
      matric_number: student.matric_number,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      department: student.department,
      level: student.level
    },
    payment: {
      tx_ref: txRef,
      amount: numericAmount,
      currency: 'NGN'
    }
  });
}));

// Check the status of a public payment intent by tx_ref
router.get('/transactions/:txRef', asyncHandler(async (req, res) => {
  const txRef = typeof req.params.txRef === 'string' ? req.params.txRef.trim() : '';

  if (!txRef) {
    throw createHttpError(400, 'Transaction reference is required', 'TX_REF_REQUIRED');
  }

  const transaction = await database.db('transactions')
    .where({ reference: txRef })
    .select('reference as tx_ref', 'type', 'amount', 'currency', 'status', 'payment_method', 'description', 'created_at', 'updated_at')
    .first();

  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Transaction not found',
      code: 'TRANSACTION_NOT_FOUND'
    });
  }

  res.json({ success: true, transaction });
}));

// Confirm a payment against Flutterwave as a fallback when webhook delivery is delayed
router.post('/transactions/:txRef/confirm', asyncHandler(async (req, res) => {
  const txRef = typeof req.params.txRef === 'string' ? req.params.txRef.trim() : '';
  const transactionIdValue = req.body?.transaction_id ?? req.body?.transactionId ?? req.body?.flutterwave_transaction_id;
  const transactionId = typeof transactionIdValue === 'string' || typeof transactionIdValue === 'number'
    ? String(transactionIdValue).trim()
    : '';

  if (!txRef) {
    throw createHttpError(400, 'Transaction reference is required', 'TX_REF_REQUIRED');
  }

  if (!transactionId) {
    throw createHttpError(400, 'Transaction ID is required', 'TRANSACTION_ID_REQUIRED');
  }

  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    throw createHttpError(500, 'Flutterwave secret key is not configured', 'FLUTTERWAVE_SECRET_NOT_CONFIGURED');
  }

  const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: 'application/json'
    }
  });

  const verifyPayload = await verifyResponse.json().catch(() => null);
  const verifiedTransaction = verifyPayload?.data || {};

  if (!verifyResponse.ok || verifyPayload?.status !== 'success') {
    throw createHttpError(502, 'Unable to verify payment with Flutterwave', 'FLUTTERWAVE_VERIFY_FAILED', {
      status: verifyResponse.status,
      response: verifyPayload
    });
  }

  if (String(verifiedTransaction.tx_ref || '').trim() !== txRef) {
    throw createHttpError(400, 'Transaction reference mismatch', 'TX_REF_MISMATCH', {
      expected: txRef,
      actual: verifiedTransaction.tx_ref || null
    });
  }

  if (String(verifiedTransaction.status || '').toLowerCase() !== 'successful') {
    throw createHttpError(400, 'Transaction is not successful', 'TRANSACTION_NOT_SUCCESSFUL', {
      flutterwave_status: verifiedTransaction.status || null
    });
  }

  const trx = await database.db.transaction();
  try {
    const payment = await trx('transactions').where({ reference: txRef }).forUpdate().first();

    if (!payment) {
      await trx.rollback();
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }

    if (payment.status === 'completed') {
      await trx.commit();
      return res.json({
        success: true,
        verified: true,
        transaction: {
          tx_ref: txRef,
          status: 'completed',
          flutterwave_ref: transactionId
        }
      });
    }

    const localAmount = Number(payment.amount) || 0;
    const verifiedAmount = Number(verifiedTransaction.amount) || 0;

    if (localAmount && verifiedAmount && localAmount !== verifiedAmount) {
      throw createHttpError(400, 'Transaction amount mismatch', 'AMOUNT_MISMATCH', {
        expected: localAmount,
        actual: verifiedAmount
      });
    }

    await finalizeSuccessfulPayment(trx, payment, transactionId);
    await trx.commit();

    res.json({
      success: true,
      verified: true,
      transaction: {
        tx_ref: txRef,
        status: 'completed',
        flutterwave_ref: transactionId,
        amount: localAmount
      }
    });
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}));

module.exports = router;

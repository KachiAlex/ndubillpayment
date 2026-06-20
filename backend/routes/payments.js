const express = require('express');
const crypto = require('crypto');
const database = require('../utils/database');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateJWT } = require('../middleware/auth');
const { createHttpError } = require('../utils/httpError');
const { finalizeSuccessfulPayment } = require('../utils/paymentFinalizer');

const router = express.Router();

const buildPaymentResponse = (payment) => ({
  tx_ref: payment.reference,
  amount: Number(payment.amount) || 0,
  currency: payment.currency || 'NGN',
  status: payment.status,
  type: payment.type,
  payment_method: payment.payment_method,
  description: payment.description || '',
  payment_gateway_response: payment.payment_gateway_response || null
});

const lookupStudent = async (matricNumber) => {
  const sanitizedMatricNumber = typeof matricNumber === 'string' ? matricNumber.trim() : '';

  if (!sanitizedMatricNumber) {
    throw createHttpError(400, 'Matric number is required', 'MATRIC_NUMBER_REQUIRED');
  }

  const student = await database.db('users')
    .whereRaw('LOWER(matric_number) = ?', [sanitizedMatricNumber.toLowerCase()])
    .andWhere({ user_type: 'student' })
    .select('id', 'matric_number', 'email', 'first_name', 'last_name', 'department', 'level')
    .first();

  if (!student) {
    throw createHttpError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  }

  return student;
};

const createTransaction = async ({
  userId,
  txRef,
  amount,
  description,
  metadata
}) => {
  await database.db('transactions').insert({
    user_id: userId,
    reference: txRef,
    type: 'wallet_funding',
    amount,
    currency: 'NGN',
    status: 'pending',
    payment_method: 'custom_test_flow',
    description,
    payment_gateway_response: metadata || {}
  });

  return database.db('transactions').where({ reference: txRef }).first();
};

// Public student lookup for payment checkout flows
router.get('/students/:matricNumber', asyncHandler(async (req, res) => {
  const student = await lookupStudent(req.params.matricNumber);
  res.json({ success: true, student });
}));

// Create a public checkout transaction
router.post('/checkout/public', asyncHandler(async (req, res) => {
  const { matric_number, amount } = req.body;
  const numericAmount = Number(amount);
  const student = await lookupStudent(matric_number);

  if (!numericAmount || numericAmount <= 0) {
    throw createHttpError(400, 'Valid amount is required', 'INVALID_AMOUNT');
  }

  const txRef = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const payment = await createTransaction({
    userId: student.id,
    txRef,
    amount: numericAmount,
    description: `Test checkout for ${student.first_name} ${student.last_name}`,
    metadata: {
      flow: 'public_qr',
      source: 'public_checkout',
      matric_number: student.matric_number
    }
  });

  res.json({
    success: true,
    student,
    payment: buildPaymentResponse(payment)
  });
}));

// Fetch a payment transaction by reference
router.get('/transactions/:txRef', asyncHandler(async (req, res) => {
  const txRef = typeof req.params.txRef === 'string' ? req.params.txRef.trim() : '';

  if (!txRef) {
    throw createHttpError(400, 'Transaction reference is required', 'TX_REF_REQUIRED');
  }

  const transaction = await database.db('transactions')
    .where({ reference: txRef })
    .select('reference as tx_ref', 'type', 'amount', 'currency', 'status', 'payment_method', 'description', 'payment_gateway_response', 'created_at', 'updated_at')
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

// Complete a payment and finalize the wallet credit
router.post('/transactions/:txRef/complete', asyncHandler(async (req, res) => {
  const txRef = typeof req.params.txRef === 'string' ? req.params.txRef.trim() : '';
  const amountValue = req.body?.amount;
  const numericAmount = amountValue === undefined || amountValue === null || amountValue === ''
    ? null
    : Number(amountValue);

  if (!txRef) {
    throw createHttpError(400, 'Transaction reference is required', 'TX_REF_REQUIRED');
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

    if (payment.status === 'successful') {
      await trx.commit();
      return res.json({
        success: true,
        completed: true,
        transaction: {
          tx_ref: txRef,
          status: 'successful',
          amount: Number(payment.amount) || 0
        }
      });
    }

    if (numericAmount !== null && Number(payment.amount) !== numericAmount) {
      throw createHttpError(400, 'Transaction amount mismatch', 'AMOUNT_MISMATCH', {
        expected: Number(payment.amount) || 0,
        actual: numericAmount
      });
    }

    const result = await finalizeSuccessfulPayment(trx, payment, txRef);
    await trx.commit();

    res.json({
      success: true,
      completed: true,
      transaction: {
        tx_ref: txRef,
        status: 'successful',
        amount: Number(payment.amount) || 0
      },
      alreadyCompleted: result.alreadyCompleted || false
    });
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}));

module.exports = router;

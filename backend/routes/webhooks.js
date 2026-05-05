const express = require('express');
const database = require('../utils/database');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');
const { finalizeSuccessfulPayment } = require('../utils/paymentFinalizer');

const router = express.Router();

// Internal test-payment webhook
router.post('/test-payment', asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const status = String(payload.status || payload.data?.status || '').toLowerCase();
  const txRef = String(payload.tx_ref || payload.reference || payload.data?.tx_ref || payload.data?.reference || '').trim();

  if (!txRef) {
    throw createHttpError(400, 'Missing transaction reference', 'MISSING_TX_REF');
  }

  const trx = await database.db.transaction();
  try {
    const payment = await trx('transactions').where({ tx_ref: txRef }).first();

    if (!payment) {
      console.warn('[Webhook] Transaction not found for tx_ref:', txRef);
      await trx.rollback();
      return res.status(200).json({ success: true });
    }

    if (payment.status === 'completed') {
      console.log('[Webhook] Transaction already completed:', txRef);
      await trx.rollback();
      return res.status(200).json({ success: true });
    }

    if (status === 'successful') {
      const result = await finalizeSuccessfulPayment(trx, payment, txRef);
      if (result.completed && !result.alreadyCompleted) {
        console.log('[Webhook] Wallet credited for tx_ref:', txRef, 'amount:', Number(payment.amount) || 0);
      }
    } else {
      await trx('transactions').where({ id: payment.id }).update({
        status: 'failed',
        updated_at: new Date()
      });
    }

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }

  res.status(200).json({ success: true });
}));

module.exports = router;

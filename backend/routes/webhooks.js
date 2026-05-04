const express = require('express');
const database = require('../utils/database');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');

const router = express.Router();

// Flutterwave webhook
router.post('/flutterwave', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_KEY;
  const signature = req.headers['verif-hash'];

  if (secret) {
    if (!signature || String(signature).trim() !== String(secret).trim()) {
      throw createHttpError(401, 'Invalid signature', 'INVALID_SIGNATURE');
    }
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    throw createHttpError(400, 'Invalid webhook payload', 'INVALID_WEBHOOK_PAYLOAD');
  }

  const { status, tx_ref, transaction_id } = payload.data || {};

  if (!tx_ref) {
    throw createHttpError(400, 'Missing transaction reference', 'MISSING_TX_REF');
  }

  const trx = await database.db.transaction();
  try {
    const payment = await trx('transactions').where({ tx_ref }).first();

    if (!payment) {
      console.warn('[Webhook] Transaction not found for tx_ref:', tx_ref);
      await trx.rollback();
      return res.status(200).json({ success: true });
    }

    if (payment.status === 'completed') {
      console.log('[Webhook] Transaction already completed:', tx_ref);
      await trx.rollback();
      return res.status(200).json({ success: true });
    }

    if (status === 'successful') {
      const paymentAmount = Number(payment.amount) || 0;
      const paymentType = payment.type;
      const paymentMetadata = typeof payment.metadata === 'string'
        ? JSON.parse(payment.metadata || '{}')
        : (payment.metadata || {});

      await trx('transactions').where({ id: payment.id }).update({
        status: 'completed',
        flutterwave_ref: String(transaction_id || ''),
        updated_at: new Date()
      });

      if (paymentType === 'wallet_funding' || paymentMetadata?.source === 'public_qr_payment') {
        let wallet = await trx('wallets').where({ user_id: payment.user_id }).first();

        if (!wallet) {
          const [newWallet] = await trx('wallets').insert({
            user_id: payment.user_id,
            balance: paymentAmount,
            currency: payment.currency || 'NGN'
          }).returning('*');
          wallet = newWallet;
        } else {
          await trx('wallets').where({ user_id: payment.user_id }).update({
            balance: trx.raw('balance + ?', [paymentAmount]),
            updated_at: new Date()
          });
        }

        console.log('[Webhook] Wallet credited for tx_ref:', tx_ref, 'amount:', paymentAmount);
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

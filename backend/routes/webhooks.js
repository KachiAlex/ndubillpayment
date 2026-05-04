const express = require('express');
const database = require('../utils/database');
const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');

const router = express.Router();

// Flutterwave webhook
router.post('/flutterwave', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_KEY;
  const signature = req.headers['verif-hash'];

  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (signature !== expected) {
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

  if (status === 'successful') {
    await database.db('transactions').where({ tx_ref }).update({
      status: 'completed',
      flutterwave_ref: String(transaction_id)
    });
  } else {
    await database.db('transactions').where({ tx_ref }).update({ status: 'failed' });
  }

  res.status(200).json({ success: true });
}));

module.exports = router;

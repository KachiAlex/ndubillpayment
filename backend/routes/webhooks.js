const express = require('express');
const database = require('../utils/database');
const crypto = require('crypto');

const router = express.Router();

// Flutterwave webhook
router.post('/flutterwave', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_KEY;
    const signature = req.headers['verif-hash'];

    if (secret && signature) {
      const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
      if (signature !== expected) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
    }

    const payload = JSON.parse(req.body);
    const { status, tx_ref, transaction_id, amount } = payload.data || {};

    if (status === 'successful') {
      await database.db('transactions').where({ tx_ref }).update({
        status: 'completed',
        flutterwave_ref: String(transaction_id)
      });
    } else {
      await database.db('transactions').where({ tx_ref }).update({ status: 'failed' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

const express = require('express');
const { db } = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Get wallet balance
router.get('/balance', authenticateJWT, async (req, res) => {
  try {
    const wallet = await db('wallets').where({ user_id: req.user.id }).first();
    if (!wallet) return res.status(404).json({ success: false, error: 'Wallet not found' });
    res.json({ success: true, balance: wallet.balance, currency: wallet.currency });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get transaction history
router.get('/transactions', authenticateJWT, async (req, res) => {
  try {
    const transactions = await db('transactions').where({ user_id: req.user.id }).orderBy('created_at', 'desc');
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Initiate payment (Flutterwave)
router.post('/pay', authenticateJWT, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const tx_ref = `TXN-${Date.now()}-${req.user.id}`;

    await db('transactions').insert({
      user_id: req.user.id,
      tx_ref,
      type: 'tuition',
      amount,
      currency: 'NGN',
      status: 'pending',
      description
    });

    res.json({ success: true, tx_ref, amount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

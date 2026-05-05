const express = require('express');
const database = require('../utils/database');
const { authenticateJWT } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { createHttpError } = require('../utils/httpError');

const router = express.Router();

// Get wallet balance
router.get('/balance', authenticateJWT, asyncHandler(async (req, res) => {
  const wallet = await database.db('wallets').where({ user_id: req.user.id }).first();
  if (!wallet) throw createHttpError(404, 'Wallet not found', 'WALLET_NOT_FOUND');
  res.json({ success: true, balance: wallet.balance, currency: wallet.currency });
}));

// Get transaction history
router.get('/transactions', authenticateJWT, asyncHandler(async (req, res) => {
  const transactions = await database.db('transactions').where({ user_id: req.user.id }).orderBy('created_at', 'desc');
  res.json({ success: true, transactions });
}));

// Initiate payment (custom test checkout)
router.post('/pay', authenticateJWT, asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  if (!amount || Number(amount) <= 0) throw createHttpError(400, 'Valid amount is required', 'INVALID_AMOUNT');

  const tx_ref = `TXN-${Date.now()}-${req.user.id}`;

  await database.db('transactions').insert({
    user_id: req.user.id,
    reference: tx_ref,
    type: 'wallet_funding',
    amount,
    currency: 'NGN',
    status: 'pending',
    payment_method: 'custom_test_flow',
    description: description || 'Wallet funding',
    payment_gateway_response: {
      source: 'authenticated_test_checkout'
    }
  });

  res.json({ success: true, tx_ref, amount });
}));

module.exports = router;

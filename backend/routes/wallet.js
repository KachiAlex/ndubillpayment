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

module.exports = router;

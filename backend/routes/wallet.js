const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { db } = require('../utils/database');
const Joi = require('joi');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// Validation schemas
const fundWalletSchema = {
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().valid('card', 'bank_transfer').required()
};

// Fund wallet
router.post('/fund', authenticateJWT, authorizeRoles(['student']), validate(fundWalletSchema), async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const userId = req.user.userId;

    // Generate transaction reference
    const reference = `NDU_${Date.now()}_${userId}`;

    // Create transaction record
    const [transactionId] = await db('transactions').insert({
      user_id: userId,
      wallet_id: null, // Will be updated after payment
      amount: amount,
      type: 'credit',
      status: 'pending',
      reference: reference,
      payment_gateway_ref: null,
      description: `Wallet funding via ${payment_method}`,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Initialize Flutterwave transaction
    const flutterwaveResponse = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref: reference,
      amount: amount,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL}/payment-callback`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: req.user.email,
        name: `${req.user.first_name} ${req.user.last_name}`
      },
      customizations: {
        title: 'NDU Tuition Payment',
        description: 'Wallet funding for tuition payment',
        logo: 'https://your-logo-url.com/logo.png'
      },
      meta: {
        user_id: userId,
        transaction_id: transactionId,
        type: 'wallet_funding'
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (flutterwaveResponse.data.status === 'success') {
      // Update transaction with Flutterwave reference
      await db('transactions').where({ id: transactionId }).update({
        payment_gateway_ref: flutterwaveResponse.data.data.tx_ref,
        updated_at: new Date()
      });

      // Log the transaction
      await db('audit_logs').insert({
        user_id: userId,
        action: 'wallet_funding_initiated',
        details: `Wallet funding initiated: ₦${amount} via ${payment_method}`,
        ip_address: req.ip,
        timestamp: new Date()
      });

      res.json({
        message: 'Payment initialized successfully',
        payment_url: flutterwaveResponse.data.data.link,
        reference: reference,
        tx_ref: flutterwaveResponse.data.data.tx_ref
      });
    } else {
      throw new Error('Failed to initialize payment');
    }
  } catch (error) {
    console.error('Fund wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet balance
router.get('/balance', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    const wallet = await db('wallets').where({ user_id: userId }).first();
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      balance: wallet.balance,
      currency: 'NGN'
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction history
router.get('/transactions', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const transactions = await db('transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const total = await db('transactions').where({ user_id: userId }).count('* as count').first();

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt
router.get('/receipt/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const transaction = await db('transactions')
      .where({ id, user_id: userId })
      .first();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const receipt = await db('receipts')
      .where({ transaction_id: id })
      .first();

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receiptData = receipt.receipt_data ? JSON.parse(receipt.receipt_data) : null;
    res.json({
      transaction,
      receipt: receiptData
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

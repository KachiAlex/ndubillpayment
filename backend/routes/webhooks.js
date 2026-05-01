const express = require('express');
const { db } = require('../utils/database');
const crypto = require('crypto');
const { generateReceipt } = require('../utils/receiptGenerator');

const router = express.Router();

// Flutterwave webhook handler
router.post('/flutterwave/callback', async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['verif-hash']) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const { tx_ref, amount, status, customer } = event.data;

      // Find transaction
      const transaction = await db('transactions')
        .where({ reference: tx_ref })
        .first();

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (status === 'success') {
        // Update transaction status
        await db('transactions')
          .where({ id: transaction.id })
          .update({
            status: 'completed',
            updated_at: new Date()
          });

        // Get user's wallet
        const wallet = await db('wallets')
          .where({ user_id: transaction.user_id })
          .first();

        if (wallet) {
          // Update wallet balance
          await db('wallets')
            .where({ id: wallet.id })
            .update({
              balance: wallet.balance + amount, // Flutterwave amount is already in NGN
              updated_at: new Date()
            });

          // Update transaction with wallet_id
          await db('transactions')
            .where({ id: transaction.id })
            .update({
              wallet_id: wallet.id
            });
        }

        // Generate receipt
        const { buffer, transaction: txData } = await generateReceipt(transaction.id);

        // Create receipt record
        await db('receipts').insert({
          transaction_id: transaction.id,
          user_id: transaction.user_id,
          receipt_number: txData.reference,
          file_path: null,
          receipt_data: JSON.stringify({
            reference: txData.reference,
            amount: txData.amount,
            status: txData.status,
            type: txData.type,
            student_name: `${txData.first_name} ${txData.last_name}`,
            matric_no: txData.matric_no,
            department: txData.department,
            session: txData.session,
            created_at: txData.created_at,
            pdf_base64: buffer.toString('base64')
          }),
          created_at: new Date(),
          updated_at: new Date()
        });

        // Log successful payment
        await db('audit_logs').insert({
          user_id: transaction.user_id,
          action: 'payment_successful',
          details: `Payment successful: ₦${amount} - Reference: ${tx_ref}`,
          ip_address: req.ip,
          timestamp: new Date()
        });

        // TODO: Transfer funds to school bank account
        // This would typically involve calling your bank's API
        // or using a service like Flutterwave's transfer API

        res.json({ message: 'Payment processed successfully' });
      } else {
        // Payment failed
        await db('transactions')
          .where({ id: transaction.id })
          .update({
            status: 'failed',
            updated_at: new Date()
          });

        // Log failed payment
        await db('audit_logs').insert({
          user_id: transaction.user_id,
          action: 'payment_failed',
          details: `Payment failed: ₦${amount} - Reference: ${tx_ref}`,
          ip_address: req.ip,
          timestamp: new Date()
        });

        res.json({ message: 'Payment failed' });
      }
    }

    res.json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

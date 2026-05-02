const express = require('express');
const database = require('../utils/database');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── BURSAR: Create a fee ──
router.post('/', authenticateJWT, authorizeRoles('bursar', 'admin'), async (req, res) => {
  try {
    const { name, amount, academic_session, department, level, description } = req.body;
    if (!name || !amount || !academic_session) {
      return res.status(400).json({ success: false, error: 'name, amount, and academic_session are required' });
    }
    const [fee] = await database.db('fees').insert({
      name,
      amount,
      academic_session,
      department: department || null,
      level: level || null,
      description: description || null,
      created_by: req.user.id
    }).returning('*');
    res.status(201).json({ success: true, fee });
  } catch (err) {
    console.error('[fees] create error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BURSAR: List all fees ──
router.get('/all', authenticateJWT, authorizeRoles('bursar', 'admin'), async (req, res) => {
  try {
    const fees = await database.db('fees').orderBy('created_at', 'desc');
    res.json({ success: true, fees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BURSAR: Update a fee ──
router.put('/:id', authenticateJWT, authorizeRoles('bursar', 'admin'), async (req, res) => {
  try {
    const { name, amount, academic_session, department, level, description, is_active } = req.body;
    const [fee] = await database.db('fees')
      .where({ id: req.params.id })
      .update({ name, amount, academic_session, department, level, description, is_active, updated_at: new Date() })
      .returning('*');
    if (!fee) return res.status(404).json({ success: false, error: 'Fee not found' });
    res.json({ success: true, fee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BURSAR: Delete a fee ──
router.delete('/:id', authenticateJWT, authorizeRoles('bursar', 'admin'), async (req, res) => {
  try {
    const deleted = await database.db('fees').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ success: false, error: 'Fee not found' });
    res.json({ success: true, message: 'Fee deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STUDENT: List applicable fees ──
router.get('/', authenticateJWT, authorizeRoles('student'), async (req, res) => {
  try {
    const user = await database.db('users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const query = database.db('fees')
      .where({ is_active: true })
      .andWhere(function () {
        this.whereNull('department').orWhere('department', user.department);
      })
      .andWhere(function () {
        this.whereNull('level').orWhere('level', user.level);
      })
      .orderBy('created_at', 'desc');

    const fees = await query;

    // Get payment progress for each fee
    const payments = await database.db('fee_payments')
      .where({ user_id: req.user.id })
      .select('fee_id', 'amount_paid', 'total_amount', 'remaining_balance', 'status');

    const paymentMap = new Map();
    payments.forEach(p => {
      paymentMap.set(p.fee_id, p);
    });

    const enriched = fees.map(f => {
      const payment = paymentMap.get(f.id);
      if (!payment) {
        return {
          ...f,
          amount_paid: 0,
          total_amount: parseFloat(f.amount),
          remaining_balance: parseFloat(f.amount),
          status: 'pending',
          is_paid: false
        };
      }
      return {
        ...f,
        amount_paid: parseFloat(payment.amount_paid),
        total_amount: parseFloat(payment.total_amount) || parseFloat(f.amount),
        remaining_balance: parseFloat(payment.remaining_balance),
        status: payment.status,
        is_paid: payment.status === 'completed'
      };
    });

    res.json({ success: true, fees: enriched });
  } catch (err) {
    console.error('[fees] list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STUDENT: Pay a fee from wallet (supports partial payments) ──
router.post('/:id/pay', authenticateJWT, authorizeRoles('student'), async (req, res) => {
  const trx = await database.db.transaction();
  try {
    const { amount } = req.body;
    const paymentAmount = parseFloat(amount) || parseFloat(req.query.amount) || 0;

    const fee = await trx('fees').where({ id: req.params.id, is_active: true }).first();
    if (!fee) {
      await trx.rollback();
      return res.status(404).json({ success: false, error: 'Fee not found or inactive' });
    }

    // Verify student department/level match
    const user = await trx('users').where({ id: req.user.id }).first();
    if (fee.department && fee.department !== user.department) {
      await trx.rollback();
      return res.status(403).json({ success: false, error: 'This fee is not applicable to your department' });
    }
    if (fee.level && fee.level !== user.level) {
      await trx.rollback();
      return res.status(403).json({ success: false, error: 'This fee is not applicable to your level' });
    }

    // Check existing payment record
    const existingPayment = await trx('fee_payments')
      .where({ user_id: req.user.id, fee_id: fee.id })
      .first();

    const totalAmount = parseFloat(fee.amount);
    let amountToPay = paymentAmount;

    // If no existing payment, default to full amount
    if (!existingPayment) {
      amountToPay = paymentAmount > 0 ? paymentAmount : totalAmount;
    } else {
      // If existing payment, check remaining balance
      const remaining = parseFloat(existingPayment.remaining_balance);
      if (remaining <= 0) {
        await trx.rollback();
        return res.status(400).json({ success: false, error: 'This fee is already fully paid' });
      }
      // Default to remaining balance if no amount specified
      amountToPay = paymentAmount > 0 ? paymentAmount : remaining;
      // Cap at remaining balance
      if (amountToPay > remaining) {
        amountToPay = remaining;
      }
    }

    if (amountToPay <= 0) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'Invalid payment amount' });
    }

    // Check wallet balance
    const wallet = await trx('wallets').where({ user_id: req.user.id }).first();
    if (!wallet) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'Wallet not found' });
    }
    if (parseFloat(wallet.balance) < amountToPay) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    const reference = `FEE-${Date.now()}-${req.user.id.slice(0, 8)}`;

    // Deduct wallet
    const newBalance = parseFloat(wallet.balance) - amountToPay;
    await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });

    // Create transaction record
    const [transaction] = await trx('transactions').insert({
      user_id: req.user.id,
      tx_ref: reference,
      type: 'payment',
      status: 'completed',
      amount: amountToPay,
      currency: 'NGN',
      description: `Payment for ${fee.name} (${fee.academic_session})`,
      payment_method: 'wallet'
    }).returning('*');

    // Create or update fee payment record
    let feePayment;
    if (existingPayment) {
      // Update existing payment
      const newAmountPaid = parseFloat(existingPayment.amount_paid) + amountToPay;
      const newRemaining = totalAmount - newAmountPaid;
      const newStatus = newRemaining <= 0 ? 'completed' : (newAmountPaid > 0 ? 'partial' : 'pending');

      [feePayment] = await trx('fee_payments')
        .where({ id: existingPayment.id })
        .update({
          amount_paid: newAmountPaid,
          remaining_balance: newRemaining,
          status: newStatus
        })
        .returning('*');
    } else {
      // Create new payment record
      const newAmountPaid = amountToPay;
      const newRemaining = totalAmount - newAmountPaid;
      const newStatus = newRemaining <= 0 ? 'completed' : 'partial';

      [feePayment] = await trx('fee_payments').insert({
        id: uuidv4(),
        user_id: req.user.id,
        fee_id: fee.id,
        amount_paid: newAmountPaid,
        total_amount: totalAmount,
        remaining_balance: newRemaining,
        status: newStatus,
        reference
      }).returning('*');
    }

    await trx.commit();

    res.json({
      success: true,
      message: `Paid ₦${amountToPay} for ${fee.name}`,
      new_balance: newBalance,
      amount_paid: amountToPay,
      total_amount: totalAmount,
      remaining_balance: feePayment.remaining_balance,
      status: feePayment.status,
      transaction,
      fee_payment: feePayment
    });
  } catch (err) {
    await trx.rollback();
    console.error('[fees] pay error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STUDENT: View my fee payment history ──
router.get('/payments', authenticateJWT, authorizeRoles('student'), async (req, res) => {
  try {
    const payments = await database.db('fee_payments')
      .join('fees', 'fee_payments.fee_id', 'fees.id')
      .where('fee_payments.user_id', req.user.id)
      .select(
        'fee_payments.id',
        'fee_payments.amount_paid',
        'fee_payments.status',
        'fee_payments.reference',
        'fee_payments.created_at',
        'fees.name as fee_name',
        'fees.academic_session'
      )
      .orderBy('fee_payments.created_at', 'desc');
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

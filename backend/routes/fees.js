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

    // Check which fees student has already paid
    const paid = await database.db('fee_payments')
      .where({ user_id: req.user.id, status: 'completed' })
      .select('fee_id');
    const paidIds = new Set(paid.map(p => p.fee_id));

    const enriched = fees.map(f => ({
      ...f,
      is_paid: paidIds.has(f.id)
    }));

    res.json({ success: true, fees: enriched });
  } catch (err) {
    console.error('[fees] list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STUDENT: Pay a fee from wallet ──
router.post('/:id/pay', authenticateJWT, authorizeRoles('student'), async (req, res) => {
  const trx = await database.db.transaction();
  try {
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

    // Check wallet balance
    const wallet = await trx('wallets').where({ user_id: req.user.id }).first();
    if (!wallet) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'Wallet not found' });
    }
    if (parseFloat(wallet.balance) < parseFloat(fee.amount)) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    // Check already paid
    const existing = await trx('fee_payments')
      .where({ user_id: req.user.id, fee_id: fee.id, status: 'completed' })
      .first();
    if (existing) {
      await trx.rollback();
      return res.status(400).json({ success: false, error: 'You have already paid this fee' });
    }

    const reference = `FEE-${Date.now()}-${req.user.id.slice(0, 8)}`;

    // Deduct wallet
    const newBalance = parseFloat(wallet.balance) - parseFloat(fee.amount);
    await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });

    // Create transaction record
    const [transaction] = await trx('transactions').insert({
      user_id: req.user.id,
      tx_ref: reference,
      type: 'payment',
      status: 'completed',
      amount: fee.amount,
      currency: 'NGN',
      description: `Payment for ${fee.name} (${fee.academic_session})`,
      payment_method: 'wallet'
    }).returning('*');

    // Create fee payment record
    const [feePayment] = await trx('fee_payments').insert({
      id: uuidv4(),
      user_id: req.user.id,
      fee_id: fee.id,
      amount_paid: fee.amount,
      status: 'completed',
      transaction_id: transaction.id,
      reference
    }).returning('*');

    await trx.commit();

    res.json({
      success: true,
      message: `Paid ₦${fee.amount} for ${fee.name}`,
      new_balance: newBalance,
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

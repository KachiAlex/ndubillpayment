const database = require('./database');
const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Calculate late fee for a payment based on fee configuration
 * @param {number} baseAmount - Original fee amount
 * @param {Date} dueDate - Fee due date
 * @param {number} lateFeePercentage - Late fee percentage (e.g., 5 for 5%)
 * @returns {number} - Late fee amount
 */
function calculateLateFee(baseAmount, dueDate, lateFeePercentage) {
  if (!dueDate || !lateFeePercentage || lateFeePercentage <= 0) {
    return 0;
  }

  const now = new Date();
  const due = new Date(dueDate);
  
  if (now <= due) {
    return 0; // Not overdue
  }

  const daysOverdue = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  const lateFee = (baseAmount * (lateFeePercentage / 100)) * Math.floor(daysOverdue / 30);
  
  return Math.round(lateFee * 100) / 100; // Round to 2 decimal places
}

/**
 * Check for overdue payments and calculate late fees
 */
async function checkOverduePayments() {
  try {
    const fees = await database.db('fees')
      .whereNotNull('due_date')
      .where('late_fee_percentage', '>', 0);

    for (const fee of fees) {
      const payments = await database.db('fee_payments')
        .join('users', 'fee_payments.user_id', 'users.id')
        .where('fee_payments.fee_id', fee.id)
        .where('fee_payments.status', '!=', 'completed')
        .select(
          'fee_payments.id',
          'fee_payments.user_id',
          'fee_payments.total_amount',
          'fee_payments.amount_paid',
          'fee_payments.remaining_balance',
          'users.email',
          'users.first_name',
          'users.last_name'
        );

      for (const payment of payments) {
        const lateFee = calculateLateFee(
          payment.total_amount,
          fee.due_date,
          fee.late_fee_percentage
        );

        if (lateFee > 0) {
          // Send late fee notification email
          await sendLateFeeNotification(payment.email, payment.first_name, fee.name, lateFee, fee.due_date);
        }
      }
    }

    console.log('[Payment Reminders] Checked overdue payments');
  } catch (err) {
    console.error('[Payment Reminders] Error checking overdue payments:', err.message);
  }
}

/**
 * Send reminder emails for payments due soon (within 7 days)
 */
async function sendUpcomingReminders() {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const fees = await database.db('fees')
      .whereNotNull('due_date')
      .where('due_date', '<=', sevenDaysFromNow)
      .where('due_date', '>', new Date())
      .where('is_active', true);

    for (const fee of fees) {
      const payments = await database.db('fee_payments')
        .join('users', 'fee_payments.user_id', 'users.id')
        .where('fee_payments.fee_id', fee.id)
        .where('fee_payments.status', '!=', 'completed')
        .select(
          'fee_payments.user_id',
          'fee_payments.total_amount',
          'fee_payments.remaining_balance',
          'users.email',
          'users.first_name',
          'users.last_name'
        );

      for (const payment of payments) {
        await sendPaymentReminder(
          payment.email,
          payment.first_name,
          fee.name,
          fee.due_date,
          payment.remaining_balance
        );
      }
    }

    console.log('[Payment Reminders] Sent upcoming payment reminders');
  } catch (err) {
    console.error('[Payment Reminders] Error sending reminders:', err.message);
  }
}

/**
 * Send late fee notification email
 */
async function sendLateFeeNotification(email, firstName, feeName, lateFee, dueDate) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ndu.edu.ng',
      to: email,
      subject: `Late Fee Notice - ${feeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Late Fee Notice</h2>
          <p>Hello ${firstName},</p>
          <p>This is to inform you that a late fee of <strong>₦${lateFee}</strong> has been applied to your <strong>${feeName}</strong> payment.</p>
          <p>The payment was due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
          <p>Please complete your payment as soon as possible to avoid additional late fees.</p>
          <p>Best regards,<br>NDU Portal Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Payment Reminders] Error sending late fee notification:', err.message);
  }
}

/**
 * Send payment reminder email
 */
async function sendPaymentReminder(email, firstName, feeName, dueDate, remainingBalance) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ndu.edu.ng',
      to: email,
      subject: `Payment Reminder - ${feeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment Reminder</h2>
          <p>Hello ${firstName},</p>
          <p>This is a friendly reminder that your payment for <strong>${feeName}</strong> is due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
          <p>Remaining balance: <strong>₦${remainingBalance}</strong></p>
          <p>Please ensure your payment is completed before the due date to avoid late fees.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Pay Now</a>
          <p>Best regards,<br>NDU Portal Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Payment Reminders] Error sending reminder:', err.message);
  }
}

module.exports = {
  calculateLateFee,
  checkOverduePayments,
  sendUpcomingReminders
};

const normalizePaymentMetadata = (metadata) => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata || '{}');
    } catch {
      return {};
    }
  }

  if (typeof metadata === 'object') {
    return metadata;
  }

  return {};
};

const finalizeSuccessfulPayment = async (trx, payment, transactionId) => {
  const lockedPayment = await trx('transactions')
    .where({ id: payment.id })
    .forUpdate()
    .first();

  if (!lockedPayment) {
    return { found: false, completed: false, alreadyCompleted: false };
  }

  if (lockedPayment.status === 'completed') {
    return { found: true, completed: true, alreadyCompleted: true, payment: lockedPayment };
  }

  const paymentAmount = Number(lockedPayment.amount) || 0;
  const paymentMetadata = normalizePaymentMetadata(lockedPayment.metadata);

  await trx('transactions').where({ id: lockedPayment.id }).update({
    status: 'completed',
    flutterwave_ref: String(transactionId || ''),
    updated_at: new Date()
  });

  if (lockedPayment.type === 'wallet_funding' || paymentMetadata?.source === 'public_qr_payment') {
    const wallet = await trx('wallets').where({ user_id: lockedPayment.user_id }).first();

    if (!wallet) {
      await trx('wallets').insert({
        user_id: lockedPayment.user_id,
        balance: paymentAmount,
        currency: lockedPayment.currency || 'NGN'
      });
    } else {
      await trx('wallets').where({ user_id: lockedPayment.user_id }).update({
        balance: trx.raw('balance + ?', [paymentAmount]),
        updated_at: new Date()
      });
    }
  }

  return { found: true, completed: true, alreadyCompleted: false, payment: lockedPayment };
};

module.exports = {
  finalizeSuccessfulPayment
};

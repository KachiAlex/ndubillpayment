exports.up = async function (knex) {
  // Backfill transaction_id for existing fee payments by matching with transactions
  // based on the reference field
  const feePayments = await knex('fee_payments')
    .whereNull('transaction_id')
    .select('id', 'reference', 'user_id', 'fee_id');

  for (const feePayment of feePayments) {
    // Find the transaction with matching reference
    const transaction = await knex('transactions')
      .where('reference', feePayment.reference)
      .where('user_id', feePayment.user_id)
      .first();

    if (transaction) {
      await knex('fee_payments')
        .where('id', feePayment.id)
        .update({ transaction_id: transaction.id });
      console.log(`Linked fee payment ${feePayment.id} to transaction ${transaction.id}`);
    }
  }
};

exports.down = async function (knex) {
  // Revert by setting transaction_id back to null
  await knex('fee_payments').update({ transaction_id: null });
};

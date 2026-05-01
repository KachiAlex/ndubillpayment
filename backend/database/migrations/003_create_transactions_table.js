exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('wallet_id').references('id').inTable('wallets').onDelete('CASCADE');
    table.string('reference').unique().notNullable(); // Paystack reference
    table.enum('type', ['deposit', 'transfer_to_school']).notNullable();
    table.enum('status', ['pending', 'successful', 'failed', 'cancelled']).defaultTo('pending');
    table.decimal('amount', 15, 2).notNullable();
    table.decimal('fee', 15, 2).defaultTo(0.00);
    table.string('currency', 3).defaultTo('NGN');
    table.text('description');
    table.json('payment_gateway_response'); // Store full Paystack response
    table.string('payment_method'); // card, bank_transfer, etc.
    table.string('payment_channel'); // card, bank, ussd, etc.
    table.timestamp('paid_at');
    table.timestamp('transferred_to_school_at');
    table.string('school_transfer_reference');
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['wallet_id']);
    table.index(['reference']);
    table.index(['status']);
    table.index(['type']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};

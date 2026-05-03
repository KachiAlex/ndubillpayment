exports.up = function(knex) {
  return knex.schema.createTable('refunds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('transaction_id').notNullable();
    table.uuid('fee_payment_id').nullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('reason').nullable();
    table.string('status').defaultTo('pending'); // pending, approved, rejected, processed
    table.uuid('processed_by').nullable();
    table.timestamp('processed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('transaction_id').references('transactions.id').onDelete('CASCADE');
    table.foreign('fee_payment_id').references('fee_payments.id').onDelete('SET NULL');
    table.foreign('processed_by').references('users.id').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('refunds');
};

exports.up = function (knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('tx_ref', 255).unique().notNullable();
    table.string('provider_reference', 255);
    table.enum('type', ['payment', 'refund', 'wallet_funding', 'tuition']).defaultTo('payment');
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 10).defaultTo('NGN');
    table.enum('status', ['pending', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    table.string('payment_method', 50);
    table.string('description', 500);
    table.json('metadata');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transactions');
};

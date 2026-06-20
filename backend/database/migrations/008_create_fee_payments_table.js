exports.up = function (knex) {
  return knex.schema.createTable('fee_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('fee_id').notNullable();
    table.decimal('amount_paid', 12, 2).notNullable();
    table.text('status').defaultTo('pending');
    table.uuid('transaction_id').nullable();
    table.string('reference', 255).unique().notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fee_payments');
};

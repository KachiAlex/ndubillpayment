exports.up = async function (knex) {
  // Drop and recreate fee_payments with UUID types for user_id and transaction_id
  // since JWT stores UUID for user.id and we need consistency
  await knex.schema.dropTableIfExists('fee_payments');

  await knex.schema.createTable('fee_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();     // UUID to match JWT user.id
    table.uuid('fee_id').notNullable();       // UUID to match fees.id
    table.decimal('amount_paid', 12, 2).notNullable();
    table.text('status').defaultTo('pending');
    table.uuid('transaction_id').nullable(); // UUID for consistency
    table.string('reference', 255).unique().notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('fee_payments');
  
  // Recreate with integer types for rollback
  await knex.schema.createTable('fee_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('user_id').notNullable();
    table.uuid('fee_id').notNullable();
    table.decimal('amount_paid', 12, 2).notNullable();
    table.text('status').defaultTo('pending');
    table.integer('transaction_id').nullable();
    table.string('reference', 255).unique().notNullable();
    table.timestamps(true, true);
  });
};

exports.up = async function (knex) {
  // Drop and recreate fee_payments with correct column types matching existing tables
  await knex.schema.dropTableIfExists('fee_payments');
  
  await knex.schema.createTable('fee_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('user_id').notNullable(); // matches users.id (integer)
    table.uuid('fee_id').notNullable();     // matches fees.id (uuid)
    table.decimal('amount_paid', 12, 2).notNullable();
    table.text('status').defaultTo('pending');
    table.integer('transaction_id').nullable(); // matches transactions.id (integer)
    table.string('reference', 255).unique().notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('fee_payments');
  
  // Recreate with original (incorrect) types for rollback
  await knex.schema.createTable('fee_payments', (table) => {
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

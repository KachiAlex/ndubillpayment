exports.up = function (knex) {
  return knex.schema.createTable('receipts', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().references('id').inTable('transactions').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('receipt_number', 100).unique().notNullable();
    table.json('receipt_data').notNullable();
    table.text('pdf_base64');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('receipts');
};

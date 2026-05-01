exports.up = function(knex) {
  return knex.schema.createTable('receipts', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('receipt_number').unique().notNullable();
    table.string('file_path'); // Path to generated PDF
    table.json('receipt_data'); // Structured data for receipt
    table.boolean('is_printed').defaultTo(false);
    table.timestamp('printed_at');
    table.timestamps(true, true);
    
    table.index(['transaction_id']);
    table.index(['user_id']);
    table.index(['receipt_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('receipts');
};

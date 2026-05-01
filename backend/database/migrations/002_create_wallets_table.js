exports.up = function(knex) {
  return knex.schema.createTable('wallets', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('balance', 15, 2).defaultTo(0.00);
    table.string('currency', 3).defaultTo('NGN');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.unique(['user_id']); // One wallet per user
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('wallets');
};

exports.up = function (knex) {
  return knex.schema.createTable('wallets', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('balance', 12, 2).defaultTo(0.00);
    table.string('currency', 10).defaultTo('NGN');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('wallets');
};

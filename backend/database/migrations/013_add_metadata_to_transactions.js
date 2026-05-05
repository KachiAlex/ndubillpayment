exports.up = function (knex) {
  return knex.schema.table('transactions', (table) => {
    table.json('metadata').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('transactions', (table) => {
    table.dropColumn('metadata');
  });
};

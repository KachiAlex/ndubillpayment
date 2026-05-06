exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('transactions', 'metadata');
  if (!hasColumn) {
    return knex.schema.table('transactions', (table) => {
      table.json('metadata').nullable();
    });
  }
};

exports.down = function (knex) {
  return knex.schema.table('transactions', (table) => {
    table.dropColumn('metadata');
  });
};

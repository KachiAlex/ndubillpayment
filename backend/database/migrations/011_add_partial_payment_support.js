exports.up = async function (knex) {
  await knex.schema.table('fee_payments', (table) => {
    table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    table.decimal('remaining_balance', 12, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.table('fee_payments', (table) => {
    table.dropColumn('total_amount');
    table.dropColumn('remaining_balance');
  });
};

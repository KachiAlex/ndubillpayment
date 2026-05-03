exports.up = function(knex) {
  return knex.schema.table('fees', function(table) {
    table.date('due_date').nullable();
    table.decimal('late_fee_percentage', 5, 2).defaultTo(0); // e.g., 5.00 for 5%
  });
};

exports.down = function(knex) {
  return knex.schema.table('fees', function(table) {
    table.dropColumn('due_date');
    table.dropColumn('late_fee_percentage');
  });
};

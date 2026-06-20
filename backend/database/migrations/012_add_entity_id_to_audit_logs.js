exports.up = function(knex) {
  return knex.schema
    .table('audit_logs', function(table) {
      table.integer('entity_id').unsigned().nullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('audit_logs', function(table) {
      table.dropColumn('entity_id');
    });
};

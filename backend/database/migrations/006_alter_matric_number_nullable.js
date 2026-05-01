exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('matric_number', 20).nullable().alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('matric_number', 20).notNullable().alter();
  });
};

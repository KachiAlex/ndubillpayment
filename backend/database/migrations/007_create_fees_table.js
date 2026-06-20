exports.up = function (knex) {
  return knex.schema.createTable('fees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('academic_session', 50).notNullable();
    table.string('department', 100).nullable();
    table.string('level', 20).nullable();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fees');
};

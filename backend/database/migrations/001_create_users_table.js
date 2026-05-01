exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('matric_no', 20).unique().notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('department', 100).notNullable();
    table.string('level', 20).notNullable();
    table.enum('role', ['student', 'bursar', 'admin']).defaultTo('student');
    table.boolean('is_2fa_enabled').defaultTo(false);
    table.string('two_factor_secret', 255);
    table.boolean('is_verified').defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};

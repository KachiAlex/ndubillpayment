exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('matric_number').unique().notNullable();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('department').notNullable();
    table.string('level').notNullable();
    table.string('session').notNullable();
    table.enum('user_type', ['student', 'bursar', 'admin']).defaultTo('student');
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token');
    table.timestamp('verification_expires');
    table.string('password_reset_token');
    table.timestamp('password_reset_expires');
    table.string('two_factor_secret'); // For bursar 2FA
    table.boolean('two_factor_enabled').defaultTo(false);
    table.timestamp('last_login');
    table.timestamps(true, true);
    
    table.index(['matric_number']);
    table.index(['email']);
    table.index(['user_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};

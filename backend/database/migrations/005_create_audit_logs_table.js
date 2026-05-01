exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable(); // login, payment, transfer, etc.
    table.string('resource_type'); // user, transaction, wallet, etc.
    table.uuid('resource_id'); // ID of the affected resource
    table.json('old_values'); // Previous state
    table.json('new_values'); // New state
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
    table.index(['action']);
    table.index(['resource_type']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('audit_logs');
};

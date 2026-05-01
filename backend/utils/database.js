const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';

let db;
try {
  db = knex(knexConfig[environment]);
} catch (err) {
  console.error('Failed to initialize Knex:', err.message);
  db = null;
}

module.exports = { db };

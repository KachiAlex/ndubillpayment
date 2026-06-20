const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let _db = null;
function getDb() {
  if (!_db) {
    _db = knex(config);
  }
  return _db;
}

module.exports = { get db() { return getDb(); } };

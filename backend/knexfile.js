require('dotenv').config();

function getConnection() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      // channel_binding can hang the pure-JS pg driver in serverless environments
      url.searchParams.delete('channel_binding');
      // Ensure SSL is required for Neon
      if (!url.searchParams.has('sslmode')) {
        url.searchParams.set('sslmode', 'require');
      }
      return url.toString();
    } catch {
      return process.env.DATABASE_URL;
    }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ndu_tuition',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

function validateEnv() {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required in production');
    throw new Error('DATABASE_URL is required');
  }
}

validateEnv();

const poolConfig = {
  min: 0,
  max: 5,
  acquireTimeoutMillis: 8000,
  createTimeoutMillis: 8000,
  idleTimeoutMillis: 30000
};

module.exports = {
  development: {
    client: 'postgresql',
    connection: getConnection(),
    pool: poolConfig,
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  },

  staging: {
    client: 'postgresql',
    connection: getConnection(),
    pool: poolConfig,
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: getConnection(),
    pool: poolConfig,
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  }
};

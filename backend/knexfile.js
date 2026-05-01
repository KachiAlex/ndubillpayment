require('dotenv').config({ path: require('path').join(__dirname, '.env') });
// Load parent .env.local and override any system env vars
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), override: true });

console.log('[knexfile] DATABASE_URL host:', process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'NOT SET');

function getConnection() {
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      // Strip channel_binding which can hang pg in serverless
      parsed.searchParams.delete('channel_binding');
      // Force SSL for Neon
      const sslmode = parsed.searchParams.get('sslmode');

      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.replace(/^\//, ''),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: sslmode === 'require' || sslmode === 'prefer' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000  // TCP connection timeout (fail fast)
      };
    } catch {
      // Fallback: pass as connection string with SSL
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      };
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

const poolConfig = {
  min: 0,
  max: 1,                        // Serverless: only 1 connection per invocation
  acquireTimeoutMillis: 8000,    // Fail fast if pool is exhausted
  createTimeoutMillis: 8000,     // Fail fast if new connection can't be created
  idleTimeoutMillis: 500         // Close idle connections quickly (serverless friendly)
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

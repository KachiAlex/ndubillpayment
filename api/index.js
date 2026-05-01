const serverless = require('serverless-http');
const app = require('../backend/app');

// Log startup for Vercel function diagnostics
console.log('[API] Function cold start');
console.log('[API] NODE_ENV:', process.env.NODE_ENV);
console.log('[API] DATABASE_URL set:', !!process.env.DATABASE_URL);

module.exports = serverless(app);

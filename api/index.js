console.log('[api/index] Module load started');

const serverless = require('serverless-http');
console.log('[api/index] serverless-http loaded');

const app = require('../backend/app');
console.log('[api/index] backend/app loaded');

const handler = serverless(app);
console.log('[api/index] serverless wrapper created');

module.exports = (req, res) => {
  console.log('[api/index] Request received:', req.url);
  return handler(req, res);
};

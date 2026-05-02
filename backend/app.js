const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

console.log('[app] Loading routes...');
const authRoutes = require('./routes/auth');
console.log('[app] auth routes loaded');
const walletRoutes = require('./routes/wallet');
console.log('[app] wallet routes loaded');
const adminRoutes = require('./routes/admin');
console.log('[app] admin routes loaded');
const webhookRoutes = require('./routes/webhooks');
console.log('[app] webhook routes loaded');
const feeRoutes = require('./routes/fees');
console.log('[app] fee routes loaded');
const errorHandler = require('./middleware/errorHandler');
console.log('[app] errorHandler loaded');
const requestLogger = require('./middleware/requestLogger');
console.log('[app] requestLogger loaded');
const { generalLimiter, authLimiter, paymentLimiter } = require('./middleware/rateLimit');
console.log('[app] rate limiters loaded');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
app.use(generalLimiter);

// Parse JSON except for raw webhook body
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/flutterwave') return next();
  express.json({ limit: '10mb' })(req, res, next);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/fees', paymentLimiter, feeRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;

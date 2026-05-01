const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Trust proxy headers in serverless/Vercel so req.ip is populated
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Request path logging (visible in Vercel function logs)
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} ip=${req.ip || 'unknown'}`);
  next();
});

// Rate limiting — configured for serverless (skip strict IP validation)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    ip: false
  },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'global'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

const { db } = require('./utils/database');

// Health check endpoint (match both direct and Vercel-rewritten paths)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    db: db ? 'initialized' : 'not_initialized'
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;

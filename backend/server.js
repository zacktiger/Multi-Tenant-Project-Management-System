const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./src/config/env');
const { pool } = require('./src/config/db');
const { metricsMiddleware, metricsHandler } = require('./src/middlewares/metrics');
const errorHandler = require('./src/middlewares/errorHandler');
const logger = require('./src/utils/logger');

const app = express();

// Core middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Prometheus metrics endpoint
if (!env.METRICS_TOKEN) {
  logger.warn('⚠️  METRICS_TOKEN is not set. /metrics endpoint is publicly accessible.');
}

app.get('/metrics', (req, res, next) => {
  if (!env.METRICS_TOKEN) {
    return metricsHandler(req, res, next);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${env.METRICS_TOKEN}`) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized metrics access',
      code: 'UNAUTHORIZED_METRICS',
    });
  }

  metricsHandler(req, res, next);
});

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: result.rows[0].now,
        environment: env.NODE_ENV,
      },
      message: 'API is running',
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: 'Database connection failed',
      code: 'DB_ERROR',
    });
  }
});

// Routes
app.use('/api/auth', authLimiter, require('./src/routes/auth.routes'));
app.use('/api/orgs', require('./src/routes/org.routes'));
app.use('/api', require('./src/routes/project.routes'));
app.use('/api', require('./src/routes/task.routes'));
 

// /
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Project Manager API is running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Auto-seed for demo if database is empty
    const fs = require('fs');
    const path = require('path');
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(rows[0].count) === 0) {
      logger.info('🌱 Database is empty. Seeding demo data...');
      const seedSql = fs.readFileSync(path.join(__dirname, 'db', 'seed.sql'), 'utf-8');
      await pool.query(seedSql);
      logger.info('✅ Database seeded successfully with demo credentials!');
    }
  } catch (err) {
    logger.warn('⚠️ Could not check/seed database. Tables might not exist yet.', err);
  }

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

startServer();

module.exports = app;

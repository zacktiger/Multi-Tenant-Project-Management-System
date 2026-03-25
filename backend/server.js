const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./src/config/env');
const { pool } = require('./src/config/db');
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
app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/database');
const { runMigrations } = require('./config/migrationRunner');
const { syncDatabase } = require('./models');
const seedProductionDatabase = require('./scripts/seed-production');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet());
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://capletedu.org',
  'https://www.capletedu.org',
  'https://caplet.vercel.app'
]);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server requests and local tooling without Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // Allow localhost dev servers on any port.
    if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview domains for this project.
    if (/^https:\/\/caplet-.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Caplet API Server', 
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes (education only - financial advisor moved to CapletFinancial)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/survey', require('./routes/survey'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api', require('./routes/proxy'));

// Error handling middleware
// eslint-disable-next-line no-unused-vars -- Express error middleware requires 4 args
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // ==============================================================================
    // DATABASE MIGRATIONS PATTERN
    // ==============================================================================
    // Schema changes are now managed via Umzug migrations, not Sequelize's sync().
    // Every schema change (new table, column, index, constraint) must be:
    //
    // 1. Implemented as a new migration file in backend/migrations/NNN-*.js
    // 2. Export `up()` and `down()` functions using queryInterface
    // 3. Create after all existing migrations (increment NNN)
    // 4. Tested locally before deployment
    // 5. Applied automatically on server startup via runMigrations()
    //
    // Benefits:
    // - Safe in production (no destructive ALTER TABLE with { alter: true })
    // - Reversible (down() allows rolling back)
    // - Auditable (git history of all schema changes)
    // - Team-friendly (migrations can be code-reviewed)
    //
    // For new contributors:
    // - Schema changes go in migrations/, NOT models/
    // - Models define structure for ORM, migrations define database reality
    // - Always test migrations in dev before pushing to production
    // ==============================================================================

    // Run database migrations
    await runMigrations();

    // Safe no-op fallback sync (force: false prevents any schema changes)
    await syncDatabase();

    // Seed production database if in production
    if (process.env.NODE_ENV === 'production') {
      await seedProductionDatabase();
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Caplet API Server running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

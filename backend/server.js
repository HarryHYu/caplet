const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/database');
const { runMigrations } = require('./config/migrationRunner');
const { syncDatabase } = require('./models');
const seedProductionDatabase = require('./scripts/seed-production');
const { attachLiveSocket } = require('./realtime/liveSocket');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet());
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://caplet.org',
  'https://www.caplet.org',
  // capletedu.org stays live indefinitely alongside caplet.org — old links (e.g. a VC
  // demo) may still point here. No fixed removal date; drop it once nothing depends on it.
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

// DB health — proves the app can query Postgres (Railway Data tab uses a separate SSH path).
app.get('/health/db', async (req, res) => {
  const { sequelize } = require('./config/database');
  try {
    const [[{ ok }]] = await sequelize.query('SELECT 1 AS ok');
    const [migrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );
    const [legacy] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('financial_plans', 'financial_states', 'check_ins', 'summaries')
    `);
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    res.json({
      status: ok === 1 ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      migrations: migrations.map((row) => row.name),
      legacyFinancialTablesRemaining: legacy.map((row) => row.table_name),
      tableCount: tables.length,
      tables: tables.map((row) => row.table_name),
    });
  } catch (error) {
    console.error('DB health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      message: error.message,
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/survey', require('./routes/survey'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/editor', require('./routes/editor'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/saved-slides', require('./routes/savedSlides'));
app.use('/api/financial-profile', require('./routes/financialProfile'));
app.use('/api/debt-sequencing', require('./routes/debtSequencing'));
app.use('/api/financial-twin', require('./routes/financialTwin'));
app.use('/api/review', require('./routes/review'));
app.use('/api/essays', require('./routes/essays'));
app.use('/api/events', require('./routes/events'));
app.use('/api/live', require('./routes/live'));
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
    // CDR safety gate: refuse to start if real CDR credentials are present
    // without the accreditation flag, so mocked and real Financial Twin modes
    // can never be confused. Throws CdrBootSafetyError → caught below → exit(1).
    const { assertCdrBootSafety } = require('./services/cdr');
    assertCdrBootSafety(process.env);

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
    const server = app.listen(PORT, () => {
      console.log(`🚀 Caplet API Server running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });

    // Railway's reverse proxy idles connections after ~60 s.
    // Setting keepAliveTimeout > 60 s keeps the socket alive through the proxy
    // so long AI generation requests (which can take 60–90 s) don't get cut off.
    server.keepAliveTimeout = 120000; // 2 min
    server.headersTimeout   = 125000; // must be > keepAliveTimeout

    // Live hosted quiz sessions (Kahoot-style) — Socket.IO on the same
    // http.Server/port, under the /live namespace.
    attachLiveSocket(server);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

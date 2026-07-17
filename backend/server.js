require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./config/database');
const { runMigrations } = require('./config/migrationRunner');
const seedProductionDatabase = require('./scripts/seed-production');
const { attachLiveSocket } = require('./realtime/liveSocket');
const { requestContext } = require('./middleware/requestContext');
const { createRateLimiter } = require('./middleware/rateLimit');
const { assertSharedLimiterConfiguration } = require('./services/distributedLimitStore');

const app = express();
const PORT = process.env.PORT || 5002;

// Railway terminates TLS one hop in front of Express. Trust exactly that hop
// in production so IP-based abuse controls distinguish clients without
// accepting an arbitrary forwarded chain.
app.set('trust proxy', process.env.TRUST_PROXY_HOPS
  ? Math.max(0, Number(process.env.TRUST_PROXY_HOPS) || 0)
  : process.env.NODE_ENV === 'production' ? 1 : false);

// Middleware
app.use(helmet());
app.use(requestContext);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = createRateLimiter({ scope: 'auth', windowMs: 15 * 60 * 1000, max: 120 });

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

// Backwards-compatible minimal database probe. Detailed migration and backup
// state is available only through the authenticated /api/ops/admin endpoints.
app.get('/health/db', async (req, res) => {
  const { sequelize } = require('./config/database');
  try {
    const [[{ ok }]] = await sequelize.query('SELECT 1 AS ok');
    res.json({
      status: ok === 1 ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || null,
    });
  } catch (error) {
    console.error('DB health check failed:', error.message);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || null,
    });
  }
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/survey', require('./routes/survey'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/editor', require('./routes/editor'));
app.use('/api/editor', require('./routes/editorQuestions'));
// AI routes apply their own user/workspace-aware quotas after authentication.
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/saved-slides', require('./routes/savedSlides'));
app.use('/api/financial-profile', require('./routes/financialProfile'));
app.use('/api/debt-sequencing', require('./routes/debtSequencing'));
app.use('/api/financial-twin', require('./routes/financialTwin'));
app.use('/api/money', require('./routes/money'));
app.use('/api/review', require('./routes/review'));
app.use('/api/essays', require('./routes/essays'));
app.use('/api/economics-marker', require('./routes/economicsMarker'));
app.use('/api/economics-exams', require('./routes/economicsExams'));
app.use('/api/study-plan', require('./routes/studyPlan'));
app.use('/api/streaks', require('./routes/streaks'));
app.use('/api/events', require('./routes/events'));
app.use('/api/live', require('./routes/live'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/teacher-learning', require('./routes/teacherLearning'));
app.use('/api/feature-flags', require('./routes/featureFlags'));
app.use('/api/ops', require('./routes/operational'));
app.use('/api', require('./routes/learning'));
app.use('/api', require('./routes/proxy'));

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const requestedStatus = Number(err.status || err.statusCode || 500);
  const status = requestedStatus >= 400 && requestedStatus < 600 ? requestedStatus : 500;
  console.error(JSON.stringify({
    event: 'request_error',
    requestId: req.requestId || null,
    status,
    errorType: err.name || 'Error',
    message: status >= 500 ? 'Internal server error' : err.message,
  }));
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong.' : err.message,
    requestId: req.requestId || null,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', requestId: req.requestId || null });
});

// Start server
const startServer = async () => {
  try {
    assertSharedLimiterConfiguration(process.env);

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

    // Register the public ABS/RBA Money series without creating observations.
    // Live ingestion remains an explicit, source-verified job; an empty
    // registry must surface as unavailable rather than fabricated data.
    const { ensureMoneyRegistry } = require('./services/moneyData');
    await ensureMoneyRegistry();
    const { ensureCurriculumEditions } = require('./services/curriculumEdition');
    await ensureCurriculumEditions();

    // Seed production database if in production
    if (process.env.NODE_ENV === 'production') {
      await seedProductionDatabase();
    }

    // Enforce configured retention without delaying boot. Consent records and
    // unresolved safety reports remain auditable; expired AI summaries,
    // optional analytics events and old guardian-request contact details do not.
    const { purgeExpiredData } = require('./services/dataRetention');
    purgeExpiredData().catch((error) => console.error('Data retention sweep error:', error.message));
    const retentionTimer = setInterval(() => {
      purgeExpiredData().catch((error) => console.error('Data retention sweep error:', error.message));
    }, Math.max(1, Number(process.env.DATA_RETENTION_SWEEP_HOURS || 6)) * 60 * 60 * 1000);
    retentionTimer.unref?.();

    // Moderation reports persist notification state before delivery. Failed or
    // interrupted webhook/email attempts are retried with provider idempotency
    // keys, so a provider outage cannot silently drop a safeguarding alert.
    const { retryPendingModerationNotifications } = require('./services/moderationNotifications');
    const retryModerationNotifications = () => retryPendingModerationNotifications()
      .catch((error) => console.error('Moderation notification retry error:', error.message));
    retryModerationNotifications();
    const moderationNotificationTimer = setInterval(
      retryModerationNotifications,
      Math.max(15000, Number(process.env.MODERATION_NOTIFICATION_SWEEP_MS) || 60000),
    );
    moderationNotificationTimer.unref?.();

    // Persist readiness and backup incidents before sending a redacted,
    // idempotent webhook. A failed delivery remains queued for the next sweep.
    const { runOperationalMonitor } = require('./services/operationalAlerts');
    const monitorOperations = () => runOperationalMonitor()
      .catch((error) => console.error(JSON.stringify({
        event: 'operational_monitor_error',
        errorType: error?.name || 'Error',
        message: 'Operational monitoring could not complete',
      })));
    monitorOperations();
    const operationalMonitorTimer = setInterval(
      monitorOperations,
      Math.max(15000, Number(process.env.OPS_MONITOR_INTERVAL_MS) || 60000),
    );
    operationalMonitorTimer.unref?.();

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

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const seedProductionDatabase = require('./seed-production');
const addSummaryColumn = require('./add-summary-column');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://capletedu.org',
    'https://www.capletedu.org',
    'https://caplet.vercel.app',
    'https://caplet-qnstzfq3c-harry-yus-projects-380f9660.vercel.app'
  ],
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

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/survey', require('./routes/survey'));
app.use('/api/financial', require('./routes/financial'));

// Error handling middleware
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
    
    // Sync database models
    await syncDatabase();
    
    // Add summary column if it doesn't exist (migration)
    await addSummaryColumn();
    
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

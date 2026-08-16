const express = require('express');
const { supabase } = require('./supabase');
const config = require('./config');

const app = express();

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// GET /health - Server liveness check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /health/db - Database connectivity check (Read-only)
app.get('/health/db', async (req, res, next) => {
  try {
    // Attempt a basic read-only query on sync_state to verify connectivity
    const { data, error } = await supabase
      .from('sync_state')
      .select('key, value')
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
      checkpoint_present: data && data.length > 0
    });
  } catch (err) {
    console.error('Database connection check failed:', err.message);
    
    // Custom error object sent to handler to avoid leaking internal credential secrets
    const dbError = new Error('Database connection failed');
    dbError.status = 503;
    dbError.details = config.isProduction ? 'Unable to reach backend database' : err.message;
    next(dbError);
  }
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  const response = {
    error: err.status === 503 ? 'Service Unavailable' : 'Internal Server Error',
    message
  };

  if (!config.isProduction && err.details) {
    response.details = err.details;
  }

  res.status(status).json(response);
});

module.exports = app;

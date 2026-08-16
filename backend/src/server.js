const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[${new Date().toISOString()}] Backend server started on port ${config.port}`);
  console.log(`[${new Date().toISOString()}] Environment validation: PASS`);
  console.log(`[${new Date().toISOString()}] Privileged Supabase endpoint: ${config.supabaseUrl}`);
});

// Handle graceful shutdown on SIGINT and SIGTERM
const gracefulShutdown = (signal) => {
  console.log(`\n[${new Date().toISOString()}] Received ${signal}. Initiating graceful shutdown...`);
  
  server.close(() => {
    console.log(`[${new Date().toISOString()}] HTTP server closed.`);
    console.log(`[${new Date().toISOString()}] Graceful shutdown complete. Exiting process.`);
    process.exit(0);
  });

  // Force close after 10 seconds if clean close fails
  setTimeout(() => {
    console.error(`[${new Date().toISOString()}] Graceful shutdown timed out. Force exiting.`);
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;

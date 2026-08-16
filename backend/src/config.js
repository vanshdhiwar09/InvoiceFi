const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// REQUIRED NOW (Phase 5B-1 Foundation):
const requiredNow = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

// REQUIRED LATER (Phase 5B-2 Event Ingestion & RPC Daemon):
// These variables are validated starting with the event-ingestion phase.
const requiredLater = [
  'STELLAR_RPC_URL',
  'INVOICE_CONTRACT_ID',
  'TOKEN_CONTRACT_ID'
];

// Validate variables required NOW for Phase 5B-1 backend startup
const missing = [];
for (const envVar of requiredNow) {
  if (!process.env[envVar]) {
    missing.push(envVar);
  }
}

if (missing.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'ERR: Startup Failed due to missing environment variables:');
  missing.forEach((envVar) => {
    console.error('\x1b[31m%s\x1b[0m', `  - ${envVar}`);
  });
  console.error('\x1b[33m%s\x1b[0m', 'Please ensure you have configured these variables in backend/.env');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stellarRpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  invoiceContractId: process.env.INVOICE_CONTRACT_ID,
  tokenContractId: process.env.TOKEN_CONTRACT_ID,
  isProduction: process.env.NODE_ENV === 'production'
};

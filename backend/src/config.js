const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

if (process.env.TEST_MISSING_ENV === 'true') {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const isProduction = process.env.NODE_ENV === 'production';
const isDaemonEnabled = process.env.ENABLE_BACKGROUND_DAEMON === 'true' || isProduction;

// Validate required environment variables for startup
const requiredNow = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

if (isDaemonEnabled) {
  requiredNow.push('STELLAR_RPC_URL', 'INVOICE_CONTRACT_ID');
}

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
  console.error('\x1b[33m%s\x1b[0m', 'Please ensure you have configured these variables in environment settings or backend/.env');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stellarRpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  invoiceContractId: process.env.INVOICE_CONTRACT_ID || 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR',
  tokenContractId: process.env.TOKEN_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  isProduction
};

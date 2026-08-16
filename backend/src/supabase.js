const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  throw new Error('Supabase configuration missing in supabase.js initialization');
}

// Initialize Supabase Client with service_role key to bypass RLS for off-chain ingestion and metadata access
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = {
  supabase
};

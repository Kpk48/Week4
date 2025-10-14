// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// If Supabase env is missing, don't crash the app at startup.
// Export safe proxy clients that throw helpful errors on first use instead.
if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Supabase-backed routes will be disabled.');
  const noSupabase = new Proxy({}, {
    get() {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.');
    }
  });
  module.exports = { supabase: noSupabase, supabaseAdmin: noSupabase };
} else {
  // Client for regular operations (prefer service role key on server to bypass RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

  // Admin client for operations that bypass RLS (same as above for convenience)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

  module.exports = { supabase, supabaseAdmin };
}
/* ============================================
   NextGen Travel — Supabase Client
   Initializes the Supabase SDK connection
   ============================================ */

// Read credentials from config.js (gitignored, never committed)
const cfg = window.__SUPABASE_CONFIG__;
if (!cfg || cfg.url.includes('YOUR_PROJECT')) {
  console.warn(
    '%c[Supabase]%c Fill in the Supabase credentials in js/config.js.',
    'color:#3ECF8E;font-weight:bold',
    'color:inherit'
  );
}

const SUPABASE_URL = (cfg && cfg.url) || '';
const SUPABASE_ANON_KEY = (cfg && cfg.anonKey) || '';

// Create and expose the Supabase client globally
if (typeof supabase === 'undefined') {
  throw new Error('Supabase SDK failed to load — check that @supabase/supabase-js script is included before this file');
}
const { createClient } = supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

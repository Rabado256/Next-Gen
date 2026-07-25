/* ============================================
   NextGen Travel — Supabase Client
   Initializes the Supabase SDK connection
   ============================================ */

// Read credentials from config.js (gitignored, never committed)
const cfg = window.__SUPABASE_CONFIG__;
if (!cfg || cfg.url.includes('YOUR_PROJECT')) {
  console.warn(
    '%c[Supabase]%c Copy js/config.example.js to js/config.js and fill in your project credentials.',
    'color:#3ECF8E;font-weight:bold',
    'color:inherit'
  );
}

const SUPABASE_URL = (cfg && cfg.url) || '';
const SUPABASE_ANON_KEY = (cfg && cfg.anonKey) || '';

// Create and expose the Supabase client globally
const { createClient } = supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

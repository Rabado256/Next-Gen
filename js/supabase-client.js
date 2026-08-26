/* ============================================
   NextGen Travel — Supabase Client
   Initializes the Supabase Auth + DB connection
   using the Supabase JS SDK loaded from CDN.
   ============================================ */

var cfg = window.__SUPABASE_CONFIG__;
if (!cfg || !cfg.url || cfg.url.includes('YOUR_')) {
  console.warn(
    '%c[Supabase]%c Supabase credentials not loaded — dynamic features disabled.',
    'color:#3ECF8E;font-weight:bold',
    'color:inherit'
  );
  window.supabaseClient = null;
  window.db = null;
  window.auth = {
    onAuthStateChanged: function () { },
    currentUser: null,
    signInWithEmailAndPassword: function () { return Promise.reject(new Error('Supabase not configured')); },
    createUserWithEmailAndPassword: function () { return Promise.reject(new Error('Supabase not configured')); },
    signOut: function () { return Promise.resolve(); }
  };
} else if (typeof supabase !== 'undefined' && supabase.createClient) {
  var client = supabase.createClient(cfg.url, cfg.anonKey);
  window.supabaseClient = client;
  window.db = client;            // alias so downstream code can use db.from(...)
  window.auth = client.auth;     // alias so downstream code can use auth.onAuthStateChanged, etc.
} else {
  console.warn('[Supabase] SDK failed to load from CDN.');
  window.supabaseClient = null;
  window.db = null;
  window.auth = {
    onAuthStateChanged: function () { },
    currentUser: null
  };
}

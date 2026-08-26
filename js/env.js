/* ============================================
   NextGen Travel — Runtime environment bootstrap
   Resolves Supabase config from the serverless
   /api/config endpoint (reads Vercel env vars),
   falling back to the local js/supabase-config.js
   for pure-static local dev.
   Must run AFTER js/supabase-config.js and BEFORE
   js/supabase-client.js.
   ============================================ */
(function () {
  function merge(obj) {
    window.__SUPABASE_CONFIG__ = Object.assign({}, window.__SUPABASE_CONFIG__, obj);
  }
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/config', false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300) {
      var data = JSON.parse(xhr.responseText || '{}');
      var cfg = {};
      if (data.supabase_url) cfg.url = data.supabase_url;
      if (data.supabase_anon_key) cfg.anonKey = data.supabase_anon_key;
      if (data.paystack_public_key) window.__PAYSTACK_PUBLIC_KEY__ = data.paystack_public_key;
      if (Object.keys(cfg).length) merge(cfg);
    }
  } catch (e) {
    // /api/config unavailable (e.g. static-only serve) — js/supabase-config.js wins.
  }
})();

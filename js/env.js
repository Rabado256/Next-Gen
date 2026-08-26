/* ============================================
   NextGen Travel — Runtime environment bootstrap
   Resolves Firebase config from the serverless
   /api/config endpoint (reads Vercel env vars),
   falling back to the local js/firebase-config.js
   for pure-static local dev.
   Must run AFTER js/firebase-config.js and BEFORE
   js/firebase-client.js.
   ============================================ */
(function () {
  function merge(obj) {
    window.__FIREBASE_CONFIG__ = Object.assign({}, window.__FIREBASE_CONFIG__, obj);
  }
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/config', false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300) {
      var data = JSON.parse(xhr.responseText || '{}');
      var cfg = {};
      if (data.firebase_api_key) cfg.apiKey = data.firebase_api_key;
      if (data.firebase_auth_domain) cfg.authDomain = data.firebase_auth_domain;
      if (data.firebase_project_id) cfg.projectId = data.firebase_project_id;
      if (data.firebase_storage_bucket) cfg.storageBucket = data.firebase_storage_bucket;
      if (data.firebase_messaging_sender_id) cfg.messagingSenderId = data.firebase_messaging_sender_id;
      if (data.firebase_app_id) cfg.appId = data.firebase_app_id;
      if (Object.keys(cfg).length) merge(cfg);
    }
  } catch (e) {
    // /api/config unavailable (e.g. static-only serve) — js/firebase-config.js wins.
  }
})();

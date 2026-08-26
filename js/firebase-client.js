/* ============================================
   NextGen Travel — Firebase Client
   Initializes the Firebase Auth + Firestore SDK
   connection (compat build loaded from CDN).
   ============================================ */

// Read credentials from js/firebase-config.js (gitignored) or /api/config (Vercel env vars)
var cfg = window.__FIREBASE_CONFIG__;
if (!cfg || !cfg.apiKey || cfg.apiKey.includes('YOUR_')) {
  console.warn(
    '%c[Firebase]%c Firebase credentials not loaded — dynamic features disabled.',
    'color:#FFA611;font-weight:bold',
    'color:inherit'
  );
  // Set empty stubs so downstream code doesn't crash
  window.auth = { onAuthStateChanged: function(){}, currentUser: null };
  window.db = null;
  window.firebaseClient = null;
} else if (typeof firebase !== 'undefined') {
  window.firebaseApp = firebase.initializeApp(cfg);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.firebaseClient = firebase;
} else {
  console.warn('[Firebase] SDK failed to load from CDN.');
  window.auth = { onAuthStateChanged: function(){}, currentUser: null };
  window.db = null;
  window.firebaseClient = null;
}

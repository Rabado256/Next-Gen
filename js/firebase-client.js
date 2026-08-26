/* ============================================
   NextGen Travel — Firebase Client
   Initializes the Firebase Auth + Firestore SDK
   connection (compat build loaded from CDN).
   ============================================ */

// Read credentials from js/firebase-config.js (gitignored, never committed)
const cfg = window.__FIREBASE_CONFIG__;
if (!cfg || !cfg.apiKey || cfg.apiKey.includes('YOUR_')) {
  console.warn(
    '%c[Firebase]%c Fill in the Firebase credentials in js/firebase-config.js.',
    'color:#FFA611;font-weight:bold',
    'color:inherit'
  );
}

if (typeof firebase === 'undefined') {
  throw new Error('Firebase SDK failed to load — check that the firebase-compat scripts are included before this file');
}

// Create and expose the Firebase app, Auth and Firestore globally
window.firebaseApp = firebase.initializeApp(cfg || {});
window.auth = firebase.auth();
window.db = firebase.firestore();

// Shared globals consumed across the app: window.auth, window.db, window.firebaseApp.
window.firebaseClient = firebase;

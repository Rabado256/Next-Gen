/**
 * NextGen Travel — Admin Login Diagnostic Script
 *
 * Tests whether the admin user already exists in Firebase Auth
 * and attempts various password patterns. Useful for recovering
 * a forgotten admin password.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com node test-login.js
 *
 * Requires Firebase Admin credentials in env (see firebase-admin.js):
 *   FIREBASE_SERVICE_ACCOUNT (JSON), GOOGLE_APPLICATION_CREDENTIALS (path),
 *   or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { getAdmin } = require('./firebase-admin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  console.error('Missing required environment variable: ADMIN_EMAIL');
  console.error('Set it as an env var or add it to a .env file.');
  process.exit(1);
}

async function main() {
  const admin = getAdmin();
  console.log('=== Admin login diagnostic ===\n');
  console.log('Email:', ADMIN_EMAIL, '\n');

  console.log('Checking if the user exists in Firebase Auth...');
  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log('  => User EXISTS (uid: ' + user.uid + ')');
    console.log('  Email verified:', user.emailVerified);
    console.log('  Disabled:', user.disabled);
  } catch (e) {
    console.log('  => User does NOT exist.');
    console.log('  Error:', e.code || e.message);
    console.log('\n  Create them with:');
    console.log('  ADMIN_EMAIL=' + ADMIN_EMAIL + ' ADMIN_PASSWORD=<password> node create-admin.js');
    process.exit(0);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('Firebase Admin can inspect but not test passwords (Firebase never');
  console.log('stores passwords in a recoverable form). To reset:');
  console.log('  Firebase Console > Authentication > Users > find the user >');
  console.log('  "Reset password" (sends a reset email), or delete + recreate');
  console.log('  via create-admin.js.');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

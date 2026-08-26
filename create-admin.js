/**
 * NextGen Travel — Admin User Creator Script
 *
 * CLI tool to create or promote an admin user in Firebase.
 * Creates the user in Firebase Auth (if missing) and sets the
 * `is_admin` flag on their Firestore profile.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node create-admin.js
 *
 * Requires Firebase Admin credentials in env (see firebase-admin.js):
 *   FIREBASE_SERVICE_ACCOUNT (JSON), GOOGLE_APPLICATION_CREDENTIALS (path),
 *   or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { getAdmin, getFirestore } = require('./firebase-admin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables.');
  console.error('Required: ADMIN_EMAIL, ADMIN_PASSWORD');
  console.error('Set them as env vars or add them to a .env file.');
  process.exit(1);
}

async function main() {
  console.log('=== Setting up admin user ===\n');
  const admin = getAdmin();
  const db = getFirestore();

  let uid;
  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    uid = user.uid;
    console.log('User exists:', ADMIN_EMAIL, '(uid ' + uid + ')');
  } catch (e) {
    console.log('Creating user:', ADMIN_EMAIL);
    const created = await admin.auth().createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME
    });
    uid = created.uid;
    console.log('Created with uid:', uid);
  }

  await db.collection('profiles').doc(uid).set({
    id: uid,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    is_admin: true,
    created_at: new Date().toISOString()
  }, { merge: true });
  console.log('Admin status set on Firestore profile.');
  console.log('\nDone. Sign in as ' + ADMIN_EMAIL + ' at the app to manage it.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

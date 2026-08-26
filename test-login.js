/**
 * NextGen Travel — Admin Login Diagnostic Script
 *
 * Tests whether the admin user already exists in Supabase Auth.
 * Useful for recovering a forgotten admin password.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com node test-login.js
 *
 * Requires Supabase Admin credentials in env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { getDb } = require('./supabase-admin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  console.error('Missing required environment variable: ADMIN_EMAIL');
  console.error('Set it as an env var or add it to a .env file.');
  process.exit(1);
}

async function main() {
  const db = getDb();
  console.log('=== Admin login diagnostic ===\n');
  console.log('Email:', ADMIN_EMAIL, '\n');

  console.log('Checking if the user exists in Supabase Auth...');
  try {
    const { data: users } = await db.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === ADMIN_EMAIL);
    if (user) {
      console.log('  => User EXISTS (uid: ' + user.id + ')');
      console.log('  Email confirmed:', !!user.email_confirmed_at);
      console.log('  Last sign in:', user.last_sign_in_at || 'never');
    } else {
      console.log('  => User does NOT exist.');
      console.log('\n  Create them with:');
      console.log('  ADMIN_EMAIL=' + ADMIN_EMAIL + ' ADMIN_PASSWORD=<password> node create-admin.js');
      process.exit(0);
    }
  } catch (e) {
    console.log('  Error:', e.message);
    process.exit(1);
  }

  console.log('\n=== CONCLUSION ===');
  console.log('Supabase Admin can inspect but not test passwords (Supabase never');
  console.log('stores passwords in a recoverable form). To reset:');
  console.log('  Supabase Dashboard > Authentication > Users > find the user >');
  console.log('  "Reset password" (sends a reset email), or delete + recreate');
  console.log('  via create-admin.js.');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

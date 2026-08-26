/**
 * NextGen Travel — Admin User Creator Script
 *
 * CLI tool to create or promote an admin user in Supabase.
 * Creates the user via Supabase Auth Admin API and sets the
 * `is_admin` flag on their profile.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node create-admin.js
 *
 * Requires Supabase Admin credentials in env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { getDb } = require('./supabase-admin');

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
  const db = getDb();

  let uid;
  try {
    // Check if user already exists
    const { data: users } = await db.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === ADMIN_EMAIL);
    if (existing) {
      uid = existing.id;
      console.log('User exists:', ADMIN_EMAIL, '(uid ' + uid + ')');
    } else {
      // Create user via Supabase Auth admin
      const { data, error } = await db.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { name: ADMIN_NAME }
      });
      if (error) throw error;
      uid = data.user.id;
      console.log('Created with uid:', uid);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }

  await db.from('profiles').upsert({
    id: uid,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    is_admin: true,
    created_at: new Date().toISOString()
  }, { onConflict: 'id' });
  console.log('Admin status set on profile.');
  console.log('\nDone. Sign in as ' + ADMIN_EMAIL + ' at the app to manage it.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

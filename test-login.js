/**
 * NextGen Travel — Admin Login Diagnostic Script
 *
 * Tests whether the admin user already exists in Supabase Auth
 * and attempts various password patterns. Useful for recovering
 * a forgotten admin password.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx ADMIN_EMAIL=admin@example.com node test-login.js
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL) {
  console.error('Missing required environment variables.');
  console.error('Required: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_PASSWORDS = ['admin123!', 'password', 'admin123', 'Password123!'];

async function main() {
  console.log('=== Admin login diagnostic ===\n');
  console.log('Email:', ADMIN_EMAIL, '\n');

  console.log('Trying signup to check if user exists...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: TEST_PASSWORDS[0],
    options: { data: { name: 'Admin' } }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists') || signUpError.message.includes('User already')) {
      console.log('  => User already EXISTS in auth.users!');
      console.log('  Error:', signUpError.message);

      for (const pw of TEST_PASSWORDS) {
        console.log(`\nTrying login with "${pw}"...`);
        const { error: e } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pw });
        if (e) {
          console.log(`  FAILED - ${e.message}`);
        } else {
          console.log(`  SUCCESS!`);
          process.exit(0);
        }
      }

      console.log('\n=== CONCLUSION ===');
      console.log('User exists but password is not matching known patterns.');
      console.log('Best approach: go to Supabase Dashboard > Authentication > Users,');
      console.log('find the user, and reset their password or delete and recreate.');
    } else {
      console.log('  Signup error:', signUpError.message);
      console.log('  Full error:', JSON.stringify(signUpError));
    }
  } else {
    console.log('  Signup SUCCEEDED (user was not previously created)');
    console.log('  User:', signUpData.user?.email);
    console.log('  Has session:', signUpData.session ? 'YES' : 'NO');

    if (signUpData.session) {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', signUpData.user.id);

      if (upErr) {
        console.log('  Update admin error:', upErr.message);
        const { error: upsErr } = await supabase
          .from('profiles')
          .upsert({ id: signUpData.user.id, email: ADMIN_EMAIL, is_admin: true, name: 'Admin' });

        if (upsErr) console.log('  Upsert error:', upsErr.message);
        else console.log('  Admin status set via upsert!');
      } else {
        console.log('  Admin status updated!');
      }
    } else {
      console.log('  No session - email confirmation required.');
      console.log('  Run this SQL in Supabase SQL Editor:');
      console.log(`  UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${ADMIN_EMAIL}';`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

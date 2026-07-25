/**
 * NextGen Travel — Admin User Creator Script
 *
 * CLI tool to create or promote an admin user in Supabase.
 * Tries login first; if the user doesn't exist, signs them up
 * and sets the `is_admin` flag on their profile.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node create-admin.js
 *
 * Or create a .env file (gitignored) with these variables.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables.');
  console.error('Required: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  console.error('Set them as env vars or add them to a .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== Setting up admin user ===\n');

  // — Step 1: Try to login first (in case user already exists)
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (loginError) {
    // — Step 2a: Login failed — try signing up a new user
    console.log('Login failed:', loginError.message);
    console.log('Trying signup instead...\n');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: { data: { name: 'Admin' } }
    });

    if (signUpError) {
      console.log('Signup error:', signUpError.message);
      process.exit(1);
    }

    console.log('Signup successful! User:', signUpData.user?.email);

    if (signUpData.session) {
      // — Step 3a: Session obtained — promote to admin via update/upsert
      console.log('Session obtained!');
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', signUpData.user.id);

      if (updateErr) {
        console.log('Update error:', updateErr.message);
        console.log('Trying upsert...');
        const { data: upsertData, error: upsertErr } = await supabase
          .from('profiles')
          .upsert({ id: signUpData.user.id, email: signUpData.user.email, is_admin: true, name: 'Admin' })
          .select().single();

        if (upsertErr) {
          console.log('Upsert error:', upsertErr.message);
          console.log('\nAdmin user created but could not set admin status via anon key.');
          console.log('Please use the Supabase dashboard SQL editor to run:');
          console.log(`UPDATE profiles SET is_admin = true WHERE email = '${ADMIN_EMAIL}';`);
        } else {
          console.log('Admin status set via upsert! Profile:', upsertData);
        }
      } else {
        console.log('Admin status updated!');
      }
    } else {
      // — Step 3b: No session — email confirmation required
      console.log('No session - email confirmation is required.');
      console.log('Please either:');
      console.log('1. Disable email confirmation in Supabase Auth settings, OR');
      console.log('2. Use the Supabase SQL editor to run:');
      console.log(`   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${ADMIN_EMAIL}';`);
      console.log(`   UPDATE profiles SET is_admin = true WHERE email = '${ADMIN_EMAIL}';`);
    }

    process.exit(0);
  }

  // — Step 2b: Login succeeded — promote existing user to admin
  console.log('Login successful!');
  console.log('User:', loginData.user?.email);
  console.log('Session token:', loginData.session?.access_token?.substring(0, 20) + '...');

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', loginData.user.id);

  if (updateError) {
    console.log('Update error:', updateError.message);

    // Fallback to upsert
    const { data: upsertData, error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: loginData.user.id, email: loginData.user.email, is_admin: true, name: 'Admin' })
      .select().single();

    if (upsertErr) {
      console.log('Upsert error:', upsertErr.message);
      console.log('\nCould not set admin status. Please run in SQL editor:');
      console.log(`UPDATE profiles SET is_admin = true WHERE email = '${ADMIN_EMAIL}';`);
    } else {
      console.log('Admin status set via upsert!');
      console.log('Profile:', JSON.stringify(upsertData, null, 2));
    }
  } else {
    console.log('Admin status updated successfully!');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

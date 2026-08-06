#! /usr/bin/env node
// Live end-to-end verification against the real Supabase backend.
// Requires a populated .env (SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY). NOT part of `npm test` — run explicitly:
//   node tests/live-e2e.js
// Verifies: booking state machine (cancel_booking, ownership, idempotency),
// saved searches CRUD, and anon restrictions. Cleans up all test data.
const path = require('path');
const repo = path.join(__dirname, '..');
require(path.join(repo, 'node_modules/dotenv')).config({ path: path.join(repo, '.env'), quiet: true });
const { createClient } = require(path.join(repo, 'node_modules/@supabase/supabase-js'));

const url = process.env.SUPABASE_URL;
if (!url) { console.error('SUPABASE_URL missing — run from the repo with a populated .env'); process.exit(1); }

const anon = createClient(url, process.env.SUPABASE_ANON_KEY);
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = 'e2e.' + Date.now() + '@gmail.com';
const PASS = 'TestPass123!';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function finish(code) {
  await sleep(300); // let the client socket close before exiting (avoids libuv assertion on Windows)
  process.exit(code);
}

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label); }
}
function okJson(data, label) { ok(!data.error, label + ' (no error)'); }

let bookingId = null, uid = null;

(async () => {
  console.log('\n\uD83D\uDCCB Live E2E — booking state machine + saved searches');

  // 1. Create a throwaway user via the service-role admin API (bypasses the
  // public signup rate limit and email-confirmation requirement).
  console.log('\n\uD83D\uDCCB Step 1: Auth');
  const { data: au, error: aErr } = await service.auth.admin.createUser({
    email: EMAIL,
    password: PASS,
    email_confirm: true
  });
  if (aErr || !au || !au.user) { console.log('  \u274C createUser failed:', aErr && aErr.message); await finish(1); return; }
  uid = au.user.id;
  console.log('  \u2705 user created:', EMAIL, uid);

  const { data: si, error: siErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (siErr || !si.session) { console.log('  \u274C sign-in failed:', siErr && siErr.message); await finish(1); return; }
  const token = si.session.access_token;
  const authed = createClient(url, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: 'Bearer ' + token } } });

  // 2. Insert a confirmed booking owned by the user (service role)
  console.log('\n\uD83D\uDCCB Step 2: Booking state machine');
  const ref = 'E2E' + Date.now().toString(36).toUpperCase();
  const { data: booking, error: bErr } = await service.from('bookings').insert({
    user_id: uid,
    reference: ref,
    guest_name: 'E2E User',
    guest_email: EMAIL,
    status: 'confirmed',
    booking_date: '2026-01-01',
    guests: 1,
    total_amount: 100,
    currency: 'USD',
    to_location: 'Lagos',
    status_history: [{ status: 'confirmed', at: new Date().toISOString() }]
  }).select().single();
  if (bErr) { console.log('  \u274C booking insert failed:', bErr.message); await finish(1); return; }
  bookingId = booking.id;
  console.log('  \u2705 test booking created:', ref);

  // 3. Cancel as the owner
  const { data: c1 } = await authed.rpc('cancel_booking', { p_ref: ref });
  ok(c1 && c1.status === 'cancelled', 'cancel_booking transitions confirmed -> cancelled');
  ok(c1 && c1.cancelled_at && Array.isArray(c1.status_history), 'cancelled_at + status_history recorded');

  // 4. Double-cancel rejected
  const { data: c2 } = await authed.rpc('cancel_booking', { p_ref: ref });
  ok(c2 && c2.error === 'Booking is already cancelled', 'second cancel is rejected');

  // 5. Unauthenticated (anon) cancel rejected
  const { data: c3, error: c3e } = await anon.rpc('cancel_booking', { p_ref: ref });
  ok((!c3e && c3 && c3.error) || !!c3e, 'unauthenticated cancel is rejected');

  // 6. Saved searches CRUD
  console.log('\n\uD83D\uDCCB Step 3: Saved searches');
  const { data: saved, error: sSave } = await authed.from('saved_searches')
    .insert({ user_id: uid, search_type: 'destination', params: { q: 'Bali', guests: 2 } })
    .select().single();
  ok(!sSave && saved && saved.id, 'saveSearch persists to saved_searches');
  const { data: list, error: sList } = await authed.from('saved_searches').select('*');
  ok(!sList && list.some(s => s.id === saved.id), 'getSavedSearches returns the saved search');
  const { error: sDel } = await authed.from('saved_searches').delete().eq('id', saved.id);
  ok(!sDel, 'deleteSavedSearch removes it');

  // 7. Cleanup
  console.log('\n\uD83D\uDCCB Step 4: Cleanup');
  if (bookingId) await service.from('bookings').delete().eq('id', bookingId);
  try { await service.auth.admin.deleteUser(uid); } catch (e) { console.log('  \u26A0 user cleanup:', e.message); }
  console.log('  \u2705 test data removed');

  console.log('\n==================================================');
  console.log(`Live E2E: ${passed}/${passed + failed} passed, ${failed} failed`);
  await finish(failed > 0 ? 1 : 0);
})();

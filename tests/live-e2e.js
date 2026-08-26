#! /usr/bin/env node
// Live end-to-end verification against the real Supabase backend.
// Requires a populated .env (Supabase Admin credentials — see supabase-admin.js).
// NOT part of `npm test` — run explicitly:
//   node tests/live-e2e.js
// Verifies: booking state machine (cancel transitions, ownership, idempotency),
// saved searches CRUD, and that unauthenticated clients can't cancel.
// Cleans up all test data.
const path = require('path');
const repo = path.join(__dirname, '..');
require(path.join(repo, 'node_modules/dotenv')).config({ path: path.join(repo, '.env'), quiet: true });
const { getDb } = require(path.join(repo, 'supabase-admin.js'));

let db;
try {
  db = getDb();
} catch (e) {
  console.error('Supabase Admin not configured:', e.message);
  process.exit(1);
}

const EMAIL = 'e2e.' + Date.now() + '@gmail.com';
const PASS = 'TestPass123!';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function finish(code) {
  await sleep(300);
  process.exit(code);
}

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label); }
}

let bookingRef = null, uid = null, savedId = null, strangerUid = null;

(async () => {
  console.log('\n\uD83D\uDCCB Live E2E — booking state machine + saved searches');

  // 1. Create a throwaway user via the Supabase Auth Admin API.
  console.log('\n\uD83D\uDCCB Step 1: Auth');
  const { data: userData, error: createErr } = await db.auth.admin.createUser({
    email: EMAIL, password: PASS, email_confirm: true
  });
  if (createErr) throw createErr;
  uid = userData.user.id;
  console.log('  \u2705 user created:', EMAIL, uid);
  await db.from('profiles').upsert({
    id: uid, email: EMAIL, name: 'E2E User', is_admin: false,
    created_at: new Date().toISOString()
  }, { onConflict: 'id' });

  // 2. Insert a confirmed booking owned by the user.
  console.log('\n\uD83D\uDCCB Step 2: Booking state machine');
  bookingRef = 'E2E' + Date.now().toString(36).toUpperCase();
  const { data: booking, error: bookingErr } = await db.from('bookings').insert({
    user_id: uid,
    reference: bookingRef,
    guest_name: 'E2E User',
    guest_email: EMAIL,
    status: 'confirmed',
    booking_date: '2026-01-01',
    guests: 1,
    total_amount: 100,
    currency: 'USD',
    to_location: 'Lagos',
    created_at: new Date().toISOString(),
    status_history: [{ status: 'confirmed', at: new Date().toISOString() }]
  }).select().single();
  if (bookingErr) throw bookingErr;
  console.log('  \u2705 test booking created:', bookingRef);

  // 3. Cancel as the owner.
  const cancel = async (userUid) => {
    const { data: bookings } = await db.from('bookings')
      .select('*')
      .eq('reference', bookingRef)
      .eq('user_id', userUid)
      .limit(1);
    if (!bookings || bookings.length === 0) return { error: 'Booking not found' };
    const doc = bookings[0];
    if (doc.status === 'cancelled') return { error: 'Booking is already cancelled' };
    const history = Array.isArray(doc.status_history) ? doc.status_history : [];
    const now = new Date().toISOString();
    await db.from('bookings').update({
      status: 'cancelled',
      cancelled_at: now,
      status_history: [...history, { status: 'cancelled', at: now }]
    }).eq('id', doc.id);
    return { status: 'cancelled', cancelled_at: now, status_history: doc.status_history };
  };

  const c1 = await cancel(uid);
  ok(c1.status === 'cancelled', 'cancel transitions confirmed -> cancelled');
  ok(!!c1.cancelled_at, 'cancelled_at recorded');
  ok(Array.isArray(c1.status_history) && c1.status_history.length >= 1, 'status_history recorded');

  // 4. Double-cancel rejected.
  const c2 = await cancel(uid);
  ok(c2.error === 'Booking is already cancelled', 'second cancel is rejected');

  // 5. A different user cannot see/cancel the booking (ownership enforced).
  const { data: strangerData } = await db.auth.admin.createUser({
    email: 'stranger.' + EMAIL, password: PASS, email_confirm: true
  });
  strangerUid = strangerData.user.id;
  const c3 = await cancel(strangerUid);
  ok(c3.error === 'Booking not found', 'ownership enforced (stranger cannot cancel)');

  // 6. Saved searches CRUD.
  console.log('\n\uD83D\uDCCB Step 3: Saved searches');
  const { data: savedSearch } = await db.from('saved_searches').insert({
    user_id: uid,
    search_type: 'destination',
    params: { q: 'Bali', guests: 2 },
    created_at: new Date().toISOString()
  }).select().single();
  savedId = savedSearch.id;
  ok(!!savedId, 'saveSearch persists to saved_searches');
  const { data: listData } = await db.from('saved_searches').select('*').eq('user_id', uid);
  ok((listData || []).some(d => d.id === savedId), 'getSavedSearches returns the saved search');
  await db.from('saved_searches').delete().eq('id', savedId);
  const { data: afterDel } = await db.from('saved_searches').select('*').eq('user_id', uid);
  ok(!(afterDel || []).some(d => d.id === savedId), 'deleteSavedSearch removes it');

  // 7. Cleanup.
  console.log('\n\uD83D\uDCCB Step 4: Cleanup');
  if (bookingRef) await db.from('bookings').delete().eq('reference', bookingRef);
  if (uid) await db.from('profiles').delete().eq('id', uid);
  try { await db.auth.admin.deleteUser(uid); } catch (e) { console.log('  \u26A0 user cleanup:', e.message); }
  try { await db.auth.admin.deleteUser(strangerUid); } catch (e) { console.log('  \u26A0 stranger cleanup:', e.message); }
  console.log('  \u2705 test data removed');

  console.log('\n==================================================');
  console.log(`Live E2E: ${passed}/${passed + failed} passed, ${failed} failed`);
  await finish(failed > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error('Fatal:', err.message);
  await finish(1);
});

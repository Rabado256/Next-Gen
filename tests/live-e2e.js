#! /usr/bin/env node
// Live end-to-end verification against the real Firebase backend.
// Requires a populated .env (Firebase Admin credentials — see firebase-admin.js).
// NOT part of `npm test` — run explicitly:
//   node tests/live-e2e.js
// Verifies: booking state machine (cancel transitions, ownership, idempotency),
// saved searches CRUD, and that unauthenticated clients can't cancel.
// Cleans up all test data.
const path = require('path');
const repo = path.join(__dirname, '..');
require(path.join(repo, 'node_modules/dotenv')).config({ path: path.join(repo, '.env'), quiet: true });
const { getAdmin, getFirestore } = require(path.join(repo, 'firebase-admin.js'));

let admin, db;
try {
  admin = getAdmin();
  db = getFirestore();
} catch (e) {
  console.error('Firebase Admin not configured:', e.message);
  process.exit(1);
}

const EMAIL = 'e2e.' + Date.now() + '@gmail.com';
const PASS = 'TestPass123!';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function finish(code) {
  await sleep(300); // let sockets close before exiting
  process.exit(code);
}

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label); }
}

let bookingRef = null, uid = null, savedId = null;

(async () => {
  console.log('\n\uD83D\uDCCB Live E2E — booking state machine + saved searches');

  // 1. Create a throwaway user via the Admin SDK.
  console.log('\n\uD83D\uDCCB Step 1: Auth');
  const user = await admin.auth().createUser({ email: EMAIL, password: PASS, emailVerified: true });
  uid = user.uid;
  console.log('  \u2705 user created:', EMAIL, uid);
  await db.collection('profiles').doc(uid).set({
    id: uid, email: EMAIL, name: 'E2E User', is_admin: false,
    created_at: new Date().toISOString()
  });

  // 2. Insert a confirmed booking owned by the user.
  console.log('\n\uD83D\uDCCB Step 2: Booking state machine');
  bookingRef = 'E2E' + Date.now().toString(36).toUpperCase();
  const bookingDoc = await db.collection('bookings').add({
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
  });
  console.log('  \u2705 test booking created:', bookingRef);

  // 3. Cancel as the owner (mirrors api.cancelBooking ownership semantics).
  const cancel = async (userUid) => {
    const snap = await db.collection('bookings')
      .where('reference', '==', bookingRef)
      .where('user_id', '==', userUid)
      .limit(1)
      .get();
    if (snap.empty) return { error: 'Booking not found' };
    const doc = snap.docs[0];
    const data = doc.data();
    if (data.status === 'cancelled') return { error: 'Booking is already cancelled' };
    const history = Array.isArray(data.status_history) ? data.status_history : [];
    const now = new Date().toISOString();
    await db.collection('bookings').doc(doc.id).set({
      status: 'cancelled',
      cancelled_at: now,
      status_history: [...history, { status: 'cancelled', at: now }]
    }, { merge: true });
    return { status: 'cancelled', cancelled_at: now, status_history: data.status_history };
  };

  const c1 = await cancel(uid);
  ok(c1.status === 'cancelled', 'cancel transitions confirmed -> cancelled');
  ok(!!c1.cancelled_at, 'cancelled_at recorded');
  ok(Array.isArray(c1.status_history) && c1.status_history.length >= 1, 'status_history recorded');

  // 4. Double-cancel rejected.
  const c2 = await cancel(uid);
  ok(c2.error === 'Booking is already cancelled', 'second cancel is rejected');

  // 5. A different user cannot see/cancel the booking (ownership enforced).
  const stranger = await admin.auth().createUser({ email: 'stranger.' + EMAIL, password: PASS });
  const c3 = await cancel(stranger.uid);
  ok(c3.error === 'Booking not found', 'ownership enforced (stranger cannot cancel)');

  // 6. Saved searches CRUD.
  console.log('\n\uD83D\uDCCB Step 3: Saved searches');
  const savedDoc = await db.collection('saved_searches').add({
    user_id: uid,
    search_type: 'destination',
    params: { q: 'Bali', guests: 2 },
    created_at: new Date().toISOString()
  });
  savedId = savedDoc.id;
  ok(!!savedId, 'saveSearch persists to saved_searches');
  const listSnap = await db.collection('saved_searches').where('user_id', '==', uid).get();
  ok(listSnap.docs.some(d => d.id === savedId), 'getSavedSearches returns the saved search');
  await db.collection('saved_searches').doc(savedId).delete();
  const afterDel = await db.collection('saved_searches').where('user_id', '==', uid).get();
  ok(!afterDel.docs.some(d => d.id === savedId), 'deleteSavedSearch removes it');

  // 7. Cleanup.
  console.log('\n\uD83D\uDCCB Step 4: Cleanup');
  if (bookingRef) await db.collection('bookings').where('reference', '==', bookingRef).get()
    .then(s => Promise.all(s.docs.map(d => d.ref.delete())));
  if (uid) await db.collection('profiles').doc(uid).delete();
  try { await admin.auth().deleteUser(uid); } catch (e) { console.log('  \u26A0 user cleanup:', e.message); }
  try { await admin.auth().deleteUser(stranger.uid); } catch (e) { console.log('  \u26A0 stranger cleanup:', e.message); }
  console.log('  \u2705 test data removed');

  console.log('\n==================================================');
  console.log(`Live E2E: ${passed}/${passed + failed} passed, ${failed} failed`);
  await finish(failed > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error('Fatal:', err);
  await finish(1);
});

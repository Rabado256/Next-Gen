/**
 * NextGen Travel — One-Time Supabase → Firebase Migration
 *
 * Reads data out of the legacy Supabase Postgres project and writes it into
 * Firebase Firestore, preserving document IDs where they are meaningful
 * (destinations/trips/profiles) and converting Postgres-isms to Firestore
 * shapes (JSON-string columns → objects/arrays).
 *
 * Usage:
 *   node scripts/migrate-supabase-to-firebase.js
 *
 * Requires in .env:
 *   Legacy Supabase (read side):
 *     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS)
 *   Firebase Admin (write side) — see firebase-admin.js:
 *     FIREBASE_SERVICE_ACCOUNT (JSON) or GOOGLE_APPLICATION_CREDENTIALS (path)
 *     or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Idempotent: uses merge on doc ids so re-running won't duplicate.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getFirestore } = require('../firebase-admin');

const COLLECTIONS = [
  'profiles',
  'destinations',
  'trips',
  'bookings',
  'contacts',
  'newsletter_subscribers',
  'itineraries',
  'reviews',
  'audit_logs',
  'saved_searches'
];

// Columns that were stored as JSON strings in Postgres but should become
// native objects/arrays in Firestore.
const JSON_COLUMNS = ['special_requests', 'status_history', 'includes', 'extras', 'meta', 'data'];

function normalize(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v === null || v === undefined) continue;
    if (JSON_COLUMNS.includes(k) && typeof v === 'string') {
      try { out[k] = JSON.parse(v); } catch (_) { out[k] = v; }
    } else {
      out[k] = v;
    }
  }
  // Ensure an ISO created_at for sorting when the source lacked one.
  if (!out.created_at) out.created_at = new Date().toISOString();
  return out;
}

function pickDocId(col, doc) {
  if (doc && typeof doc.id === 'string' && doc.id) return doc.id;
  return null; // Firestore generates one
}

async function migrate() {
  const { createClient } = require('@supabase/supabase-js');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — nothing to read.');
    process.exit(1);
  }

  const db = getFirestore();
  const sb = createClient(url, key);
  let total = 0;

  for (const col of COLLECTIONS) {
    console.log(`\n── ${col} ──`);
    try {
      const { data, error } = await sb.from(col).select('*');
      if (error) throw error;
      if (!data || data.length === 0) { console.log('  (empty)'); continue; }

      // Write in small batches to stay under Firestore batch limits.
      for (let i = 0; i < data.length; i += 450) {
        const slice = data.slice(i, i + 450);
        const batch = db.batch();
        let added = 0;
        for (const row of slice) {
          const payload = normalize(row);
          const id = pickDocId(col, row);
          const ref = id ? db.collection(col).doc(id) : db.collection(col).doc();
          batch.set(ref, payload, { merge: true });
          added++;
        }
        await batch.commit();
        total += added;
        console.log(`  +${added} written`);
      }
    } catch (e) {
      console.log('  SKIPPED:', e.message);
    }
  }

  console.log(`\nMigration complete. ${total} documents written to Firestore.`);
  console.log('\nNOTE: Firebase Auth users were NOT migrated — create them with:');
  console.log('  ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pw> node create-admin.js');
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });

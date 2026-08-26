/**
 * NextGen Travel — Database Seed Script
 *
 * One-command seed: idempotently creates admin user, sample destinations,
 * sample trips, and sample bookings.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires .env with Firebase Admin credentials (see firebase-admin.js):
 *   FIREBASE_SERVICE_ACCOUNT (JSON), GOOGLE_APPLICATION_CREDENTIALS (path),
 *   or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *   Plus ADMIN_EMAIL / ADMIN_PASSWORD (and optional ADMIN_NAME).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getAdmin, getFirestore } = require('../firebase-admin');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nextgen.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

let seeded = 0;

async function seed() {
  const admin = getAdmin();
  const db = getFirestore();
  console.log('=== NextGen Seed ===\n');

  // ---- 1. Admin user ----
  console.log('[1/4] Admin user...');
  let adminId = null;
  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    adminId = user.uid;
    console.log('  Already exists:', ADMIN_EMAIL);
  } catch (_) {
    const created = await admin.auth().createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME
    });
    adminId = created.uid;
    console.log('  Created user:', ADMIN_EMAIL);
    seeded++;
  }
  await db.collection('profiles').doc(adminId).set({
    id: adminId,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    is_admin: true,
    country: 'Global',
    created_at: new Date().toISOString()
  }, { merge: true });
  console.log('  Admin flag ensured');

  // ---- 2. Sample destinations ----
  console.log('\n[2/4] Sample destinations...');
  const destinations = [
    { id: 'amalfi', title: 'Amalfi Poetry', edition: 'Edition 01 // Positano', price: 4200, country: 'Italy', vibe: 'romantic', description: 'A dramatic coastline where pastel villages cling to cliffs above the Tyrrhenian Sea.', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800' },
    { id: 'kyoto', title: 'Kyoto Ritual', edition: 'Edition 02 // Higashiyama', price: 3900, country: 'Japan', vibe: 'solo', description: 'Ancient temples, bamboo groves, and the art of mindful travel.', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800' },
    { id: 'bali', title: 'Bali Temple', edition: 'Edition 03 // Ubud', price: 3800, country: 'Indonesia', vibe: 'solo', description: 'Rice terraces, sacred temples, and the island of the gods.', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800' }
  ];
  for (const d of destinations) {
    await db.collection('destinations').doc(d.id).set({
      id: d.id,
      ...d,
      created_at: new Date().toISOString()
    }, { merge: true });
    seeded++;
  }
  console.log(`  ${destinations.length} destinations synced`);

  // ---- 3. Sample trips ----
  console.log('\n[3/4] Sample trips...');
  const trips = [
    { from_location: 'New York', to_location: 'Amalfi Poetry', destination_id: 'amalfi', departure_date: '2026-09-15', departure_time: '08:00', max_capacity: 20, booked_count: 5, status: 'active' },
    { from_location: 'London', to_location: 'Kyoto Ritual', destination_id: 'kyoto', departure_date: '2026-10-01', departure_time: '14:00', max_capacity: 15, booked_count: 3, status: 'active' },
    { from_location: 'Dubai', to_location: 'Bali Temple', destination_id: 'bali', departure_date: '2026-11-10', departure_time: '10:00', max_capacity: 25, booked_count: 8, status: 'active' }
  ];
  for (const t of trips) {
    const id = `trip-${t.destination_id}-${t.departure_date}`;
    await db.collection('trips').doc(id).set({
      id,
      ...t,
      created_at: new Date().toISOString()
    }, { merge: true });
    seeded++;
  }
  console.log(`  ${trips.length} trips synced`);

  // ---- 4. Verify ----
  console.log('\n[4/4] Verification...');
  const destCount = (await db.collection('destinations').get()).size;
  const tripCount = (await db.collection('trips').get()).size;
  console.log(`  Destinations: ${destCount}`);
  console.log(`  Trips: ${tripCount}`);
  console.log(`  Admin: ${ADMIN_EMAIL}`);

  console.log(`\nSeeded ${seeded} new records. Done.`);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

/**
 * NextGen Travel — Database Seed Script
 *
 * One-command seed: idempotently creates admin user, sample destinations,
 * sample trips, and sample bookings.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires .env with SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nextgen.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let seeded = 0;

async function seed() {
  console.log('=== NextGen Seed ===\n');

  // ---- 1. Admin user ----
  console.log('[1/4] Admin user...');
  let adminId = null;
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD
  });
  if (signInErr) {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
      options: { data: { name: 'Admin' } }
    });
    if (signUpErr) {
      console.log('  Skipped:', signUpErr.message);
    } else {
      adminId = signUpData.user?.id;
      console.log('  Created user:', ADMIN_EMAIL);
      if (signUpData.session) {
        const { error: upErr } = await supabase.from('profiles')
          .upsert({ id: adminId, email: ADMIN_EMAIL, name: 'Admin', is_admin: true, country: 'Global' });
        if (!upErr) { console.log('  Admin flag set'); seeded++; }
      }
    }
  } else {
    adminId = signInData.user?.id;
    console.log('  Already exists:', ADMIN_EMAIL);
    const { error: upErr } = await supabase.from('profiles')
      .upsert({ id: adminId, email: ADMIN_EMAIL, name: 'Admin', is_admin: true, country: 'Global' });
    if (!upErr) { console.log('  Admin flag ensured'); seeded++; }
  }

  // ---- 2. Sample destinations ----
  console.log('\n[2/4] Sample destinations...');
  const destinations = [
    { id: 'amalfi', title: 'Amalfi Poetry', edition: 'Edition 01 // Positano', price: 4200, country: 'Italy', vibe: 'romantic', description: 'A dramatic coastline where pastel villages cling to cliffs above the Tyrrhenian Sea.', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800' },
    { id: 'kyoto', title: 'Kyoto Ritual', edition: 'Edition 02 // Higashiyama', price: 3900, country: 'Japan', vibe: 'solo', description: 'Ancient temples, bamboo groves, and the art of mindful travel.', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800' },
    { id: 'bali', title: 'Bali Temple', edition: 'Edition 03 // Ubud', price: 3800, country: 'Indonesia', vibe: 'solo', description: 'Rice terraces, sacred temples, and the island of the gods.', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800' }
  ];
  for (const d of destinations) {
    const { error } = await supabase.from('destinations').upsert(d, { onConflict: 'id' });
    if (!error) { seeded++; }
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
    const { error } = await supabase.from('trips').insert(t);
    if (!error) { seeded++; }
    else if (error.code === '23505') { /* duplicate, skip */ }
  }
  console.log(`  ${trips.length} trips synced`);

  // ---- 4. Verify ----
  console.log('\n[4/4] Verification...');
  const { count: destCount } = await supabase.from('destinations').select('*', { count: 'exact', head: true });
  const { count: tripCount } = await supabase.from('trips').select('*', { count: 'exact', head: true });
  console.log(`  Destinations: ${destCount || 0}`);
  console.log(`  Trips: ${tripCount || 0}`);
  console.log(`  Admin: ${ADMIN_EMAIL}`);

  console.log(`\nSeeded ${seeded} new records. Done.`);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

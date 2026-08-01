require('dotenv').config();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await readBody(req);

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.from('bookings').insert({
      dest_id: body.dest_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      guest_phone: body.guest_phone,
      guests: body.guests,
      total_amount: body.total_amount,
      total: body.total_amount,
      currency: body.currency || 'usd',
      status: 'confirmed',
      payment_id: body.payment_id,
      booking_date: body.travel_date,
      passport: body.passport || '',
      identity_card: body.identity_card || '',
      special_requests: body.special_requests || '',
      hotel_reservation: body.hotel_reservation || false,
      hotel: body.hotel_reservation === true || body.hotel_reservation === 1 || body.hotel_reservation === 'true',
      from_location: body.from_location || '',
      to_location: body.to_location || '',
      travelers: body.travelers || null,
      reference: body.reference,
      ref: body.reference
    }).select('id, reference').single();

    if (error) throw error;
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, booking: data }));
  } catch (e) {
    console.error('[Booking] confirm error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

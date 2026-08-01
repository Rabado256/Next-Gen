require('dotenv').config();

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
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
    const ref = String(body.reference || '').trim().toUpperCase();
    if (!ref || ref.length < 3) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Please enter a valid reference code' }));
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      // Service role bypasses RLS so guest bookings (no user_id) are findable
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Reference + optional email check so a booking can't be pulled by an
    // unguessable code alone when an email is supplied
    let query = supabase.from('bookings').select('*').eq('reference', ref);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Booking not found. Please check your reference code.' }));
      return;
    }
    if (body.email) {
      const guestEmail = String(data.guest_email || '').trim().toLowerCase();
      const providedEmail = String(body.email).trim().toLowerCase();
      if (guestEmail && guestEmail !== providedEmail) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Booking not found for this email.' }));
        return;
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, booking: data }));
  } catch (e) {
    console.error('[Booking] lookup error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

require('dotenv').config();
const { getFirestore, userIdFromRequest } = require('../firebase-admin');

function readBody(req) {
  // Support a pre-parsed body (e.g. when invoked from server.js in dev)
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

// Best-effort confirmation email via Resend's REST API. No-op unless
// RESEND_API_KEY is configured, so the booking is never blocked by email.
async function sendConfirmationEmail(booking) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'NextGen Travel <bookings@nextgentravel.com>';
  if (!apiKey || !booking || !booking.guest_email) return;

  const dest = booking.to_location || booking.dest_id || 'your destination';
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">' +
    '<h2 style="color:#1a2b3c;">Booking Confirmed — NextGen Travel</h2>' +
    '<p>Hi ' + escapeHtml(booking.guest_name || 'traveler') + ',</p>' +
    '<p>Your journey to <strong>' + escapeHtml(dest) + '</strong> has been received.</p>' +
    '<p style="background:#f7f5ed;border:1px solid #e5e0d3;padding:14px;">' +
    '<strong>Booking Reference:</strong> ' + escapeHtml(booking.reference || '') + '<br>' +
    '<strong>Guests:</strong> ' + (booking.guests || 1) + '<br>' +
    '<strong>Total:</strong> $' + Number(booking.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) +
    '</p>' +
    '<p>Our travel team will reach out shortly to finalize the details of your trip.</p>' +
    '<p style="color:#777;font-size:12px;">NextGen Travel • Curated journeys beyond the ordinary</p></div>';

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        from,
        to: booking.guest_email,
        subject: 'Your NextGen Travel booking is confirmed (' + (booking.reference || '') + ')',
        html
      })
    });
    if (!resp.ok) console.warn('[Email] Resend returned ' + resp.status);
  } catch (e) {
    console.warn('[Email] send failed:', e.message);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function buildBookingRow(type, b) {
  const amount = parseFloat(b.total_amount) || parseFloat(b.total) || 0;
  const nowIso = new Date().toISOString();
  const base = {
    dest_id: b.dest_id || '',
    guest_name: b.guest_name || '',
    guest_email: b.guest_email || '',
    guest_phone: b.guest_phone || '',
    booking_date: b.travel_date || b.booking_date || b.check_in || new Date().toISOString().split('T')[0],
    guests: parseInt(b.guests) || 1,
    total: amount,
    total_amount: amount,
    currency: b.currency || 'usd',
    status: 'confirmed',
    // State machine: every booking starts confirmed (it was created after
    // payment or as a valid booking).
    confirmed_at: nowIso,
    status_history: [{ status: 'confirmed', at: nowIso }],
    payment_id: b.payment_id || b.payment_intent || '',
    from_location: b.from_location || '',
    to_location: b.to_location || b.dest_id || '',
    reference: b.reference || b.ref || 'NXG-' + Date.now().toString(36).toUpperCase(),
    doc_type: type,
    created_at: nowIso
  };
  base.ref = base.reference;

  switch (type) {
    case 'flight':
      base.dest_id = b.airline || 'Flight';
      base.to_location = b.to_location || b.flight_number || '';
      base.special_requests = {
        flight_number: b.flight_number || '',
        departure_time: b.departure_time || '',
        arrival_time: b.arrival_time || '',
        duration: b.duration || '',
        offer_id: b.offer_id || '',
        payment_intent: b.payment_intent || '',
        duffel_order_id: b.duffel_order_id || '',
        ...(b.extras ? { extras: b.extras } : {})
      };
      break;

    case 'hotel':
      base.dest_id = b.hotel_name || 'Hotel';
      base.to_location = b.hotel_name || b.hotel_city || '';
      base.special_requests = {
        hotel_name: b.hotel_name || '',
        hotel_city: b.hotel_city || '',
        hotel_country: b.hotel_country || '',
        room_type: b.room_type || '',
        nights: b.nights || 1,
        rooms: b.rooms || 1,
        check_in: b.check_in || '',
        check_out: b.check_out || '',
        payment_intent: b.payment_intent || '',
        ...(b.extras ? { extras: b.extras } : {})
      };
      break;

    case 'package':
      base.dest_id = b.package_name || 'Package';
      base.to_location = b.package_dest || '';
      base.special_requests = {
        package_id: b.package_id || '',
        package_dest: b.package_dest || '',
        package_country: b.package_country || '',
        duration: b.duration || 0,
        nights: b.nights || 0,
        hotel: b.hotel || '',
        room_type: b.room_type || '',
        includes: b.includes || [],
        payment_intent: b.payment_intent || '',
        ...(b.extras ? { extras: b.extras } : {})
      };
      break;

    case 'visa':
      base.dest_id = 'Visa';
      base.special_requests = {
        visa_type: b.visa_type || '',
        visa_label: b.visa_label || '',
        payment_intent: b.payment_intent || '',
        ...(b.extras ? { extras: b.extras } : {})
      };
      break;

    case 'general':
    default:
      base.passport = b.passport || '';
      base.identity_card = b.identity_card || '';
      base.special_requests = b.special_requests || '';
      base.hotel = b.hotel_reservation === true || b.hotel_reservation === 1 || b.hotel_reservation === 'true';
      base.hotel_reservation = base.hotel;
      base.travelers = b.travelers || null;
      if (b.extras) {
        const existing = base.special_requests ? base.special_requests + '\n' : '';
        base.special_requests = existing + 'Extras: ' + JSON.stringify(b.extras);
      }
      break;
  }
  return base;
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
    const db = getFirestore();

    const user_id = await userIdFromRequest(req);

    const bookingType = ['flight', 'hotel', 'package', 'visa'].includes(body.booking_type) ? body.booking_type : 'general';
    const row = buildBookingRow(bookingType, body);
    if (user_id) row.user_id = user_id;

    const ref = await db.collection('bookings').add(row);
    const saved = Object.assign({ id: ref.id }, row);

    // Fire-and-forget confirmation email (no-op unless RESEND_API_KEY is set)
    sendConfirmationEmail(saved);

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, booking: saved }));
  } catch (e) {
    console.error('[Booking] confirm error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

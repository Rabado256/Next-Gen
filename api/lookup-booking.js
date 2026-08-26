require('dotenv').config();

// Mask sensitive PII so a booking can't be pulled in full by a reference code
// alone. Only a supplied matching email unlocks the raw values.
function maskValue(v) {
  const s = String(v || '');
  if (!s) return '';
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2);
}
function maskEmail(e) {
  const s = String(e || '').trim();
  const at = s.indexOf('@');
  if (at <= 0) return maskValue(s);
  const local = s.slice(0, at);
  const shown = local.length <= 2 ? local.charAt(0) : local.slice(0, 2);
  return shown + '***' + s.slice(at);
}

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Public endpoint keyed by booking reference — rate limit to blunt brute-force.
  const { allow } = require('./_rate-limit');
  const { allowed, retryAfter } = allow(req);
  if (!allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(retryAfter));
    res.end(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }));
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

    const db = require('../firebase-admin').getFirestore();

    // Reference + optional email check so a booking can't be pulled by an
    // unguessable code alone when an email is supplied
    const snap = await db.collection('bookings')
      .where('reference', '==', ref)
      .limit(1)
      .get();
    if (snap.empty) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Booking not found. Please check your reference code.' }));
      return;
    }
    const data = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
    if (body.email) {
      const guestEmail = String(data.guest_email || '').trim().toLowerCase();
      const providedEmail = String(body.email).trim().toLowerCase();
      if (guestEmail && guestEmail !== providedEmail) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Booking not found for this email.' }));
        return;
      }
    }

    // Full PII only when the caller proves ownership by supplying the matching
    // booking email. Otherwise mask passport, ID card, phone and email.
    const isOwner = !!(body.email && data.guest_email &&
      String(data.guest_email).trim().toLowerCase() === String(body.email).trim().toLowerCase());
    const booking = isOwner ? data : {
      ...data,
      guest_email: maskEmail(data.guest_email),
      guest_phone: maskValue(data.guest_phone),
      passport: maskValue(data.passport),
      identity_card: maskValue(data.identity_card)
    };

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, booking }));
  } catch (e) {
    console.error('[Booking] lookup error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

module.exports.maskValue = maskValue;
module.exports.maskEmail = maskEmail;

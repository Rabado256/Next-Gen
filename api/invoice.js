require('dotenv').config();
const { getDb } = require('../supabase-admin');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function queryParams(req) {
  const url = req.url || '';
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return {};
  const params = {};
  new URLSearchParams(url.slice(qIdx + 1)).forEach((v, k) => { params[k] = v; });
  return params;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function parseSpecialRequests(b) {
  try {
    if (typeof b.special_requests === 'string') return JSON.parse(b.special_requests || '{}');
    return b.special_requests || {};
  } catch (_) { return {}; }
}

function renderReceipt(b) {
  const currency = (b.currency || 'usd').toUpperCase();
  const amount = Number(b.total_amount || b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
  const sr = parseSpecialRequests(b);
  const date = b.booking_date || (b.created_at ? String(b.created_at).slice(0, 10) : '—');
  const status = (b.status || 'confirmed').toLowerCase();
  const statusColor = status === 'confirmed' ? '#155724' : status === 'pending' ? '#856404' : status === 'cancelled' ? '#721c24' : '#0f5132';
  const statusBg = status === 'confirmed' ? '#d4edda' : status === 'pending' ? '#fff3cd' : status === 'cancelled' ? '#f8d7da' : '#cfe2ff';
  const paid = b.payment_id ? true : false;

  const lines = [];
  if (b.doc_type === 'flight') {
    lines.push([escapeHtml(sr.airline || b.dest_id || 'Airline'), escapeHtml((sr.flight_number || ''))]);
    lines.push(['Route', `${escapeHtml(b.from_location || '')} → ${escapeHtml(b.to_location || '')}`]);
    if (sr.departure_time) lines.push(['Departure', escapeHtml(sr.departure_time)]);
    if (sr.arrival_time) lines.push(['Arrival', escapeHtml(sr.arrival_time)]);
    if (sr.duration) lines.push(['Duration', escapeHtml(sr.duration)]);
    if (sr.duffel_order_id) lines.push(['Duffel Ref', escapeHtml(sr.duffel_order_id)]);
  } else if (b.doc_type === 'hotel') {
    lines.push([escapeHtml(sr.hotel_name || b.to_location || 'Hotel'), escapeHtml(sr.hotel_city || '')]);
    if (sr.room_type) lines.push(['Room', escapeHtml(sr.room_type)]);
    if (sr.nights) lines.push(['Nights', escapeHtml(String(sr.nights))]);
    if (sr.check_in) lines.push(['Check-in', escapeHtml(sr.check_in)]);
    if (sr.check_out) lines.push(['Check-out', escapeHtml(sr.check_out)]);
  } else if (b.doc_type === 'package') {
    lines.push([escapeHtml(sr.package_name || b.to_location || 'Package'), escapeHtml(sr.package_dest || '')]);
    if (sr.duration) lines.push(['Duration', escapeHtml(String(sr.duration)) + ' days']);
    if (sr.nights) lines.push(['Nights', escapeHtml(String(sr.nights))]);
    if (sr.hotel) lines.push(['Hotel', escapeHtml(sr.hotel)]);
  } else if (b.doc_type === 'visa') {
    lines.push(['Visa Processing', escapeHtml(sr.visa_label || '')]);
    lines.push(['Destination', escapeHtml(b.to_location || '')]);
  } else {
    lines.push(['Destination', escapeHtml(b.to_location || b.dest_id || '')]);
    if (sr.extras && Array.isArray(sr.extras) && sr.extras.length) {
      lines.push(['Extras', escapeHtml(sr.extras.map(e => e.name || e.id).join(', '))]);
    }
  }

  const serviceRows = lines.map(([k, v]) =>
    v ? `<tr><td style="padding:6px 0;color:#666;width:35%;">${k}</td><td style="padding:6px 0;text-align:right;">${v}</td></tr>` : ''
  ).join('');

  const now = new Date();
  const issued = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt ${escapeHtml(b.reference || '')} | NextGen Travel</title>
<style>
  body { margin:0; padding:32px 16px; background:#f2f0ea; font-family:'Courier New',Courier,monospace; color:#1a1a1a; }
  .sheet { max-width:720px; margin:0 auto; background:#fff; border:1px solid #e0dccf; padding:48px 56px; }
  .print-bar { max-width:720px; margin:0 auto 16px; text-align:right; }
  .print-bar button { font-family:'Courier New',monospace; background:#1a1a1a; color:#fff; border:0; padding:10px 22px; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; font-size:12px; }
  .masthead { border-bottom:2px solid #1a1a1a; padding-bottom:18px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
  .brand { font-size:26px; font-weight:700; letter-spacing:.12em; }
  .brand small { display:block; font-size:10px; letter-spacing:.3em; font-weight:400; opacity:.5; margin-top:4px; }
  h1 { font-size:20px; letter-spacing:.25em; text-transform:uppercase; margin:0; }
  .ref { font-size:22px; font-weight:700; letter-spacing:.14em; margin:14px 0 4px; }
  .meta { font-size:12px; color:#666; }
  .badge { display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:${statusColor}; background:${statusBg}; margin-top:8px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  .details { margin:26px 0; }
  .details td { border-top:1px solid #eee; }
  .line { border-top:1px solid #d8d4c8; margin:26px 0; }
  .totals td { padding:8px 0; }
  .grand { font-size:16px; font-weight:700; border-top:2px solid #1a1a1a !important; }
  .muted { color:#999; font-size:11px; }
  .footer { margin-top:34px; padding-top:14px; border-top:1px solid #eee; font-size:11px; color:#777; text-align:center; }
  @media print {
    body { background:#fff; padding:0; }
    .print-bar { display:none; }
    .sheet { border:0; padding:24px; max-width:100%; }
  }
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">Print / Save PDF</button></div>
  <div class="sheet">
    <div class="masthead">
      <div class="brand">NEXTGEN<small>TRAVEL AGENCY</small></div>
      <div>
        <h1>Receipt / Confirmation</h1>
        <div class="meta">Issued ${issued}</div>
      </div>
    </div>

    <div class="ref">${escapeHtml(b.reference || 'NXG-')}</div>
    <div class="meta">${escapeHtml(b.guest_name || 'Guest')} &nbsp;•&nbsp; ${escapeHtml(b.guest_email || '')}</div>
    <div><span class="badge">${escapeHtml(status)}</span> ${!paid ? '<span class="muted">&nbsp;(no live charge — test mode)</span>' : ''}</div>

    <table class="details">
      ${serviceRows}
      <tr><td style="padding:6px 0;color:#666;">Travel Date</td><td style="padding:6px 0;text-align:right;">${escapeHtml(date)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Guests</td><td style="padding:6px 0;text-align:right;">${escapeHtml(String(b.guests || 1))}</td></tr>
    </table>

    <div class="line"></div>
    <table class="totals">
      <tr class="grand"><td>Total Paid</td><td style="text-align:right;">${currency} ${amount}</td></tr>
    </table>

    <p class="muted">Thank you for travelling with NextGen. A confirmation was sent to ${escapeHtml(b.guest_email || 'your email')}. For any changes, contact 24/7 support at curated@nextgentravel.com.</p>
    <div class="footer">&copy; 2026 NextGen Travel. All rights reserved.</div>
  </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const { allow } = require('./_rate-limit');
  const { allowed, retryAfter } = allow(req);
  if (!allowed) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 429;
    res.setHeader('Retry-After', String(retryAfter));
    res.end(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }));
    return;
  }

  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const query = queryParams(req);
    const ref = String(body.reference || query.reference || '').trim().toUpperCase();
    const email = String(body.email || query.email || '').trim().toLowerCase();

    if (!ref || ref.length < 3) {
      res.statusCode = 400;
      res.end('Missing or invalid booking reference');
      return;
    }

    const db = getDb();
    const { data: bookings, error } = await db.from('bookings').select('*').eq('reference', ref).limit(1);
    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      res.statusCode = 404;
      res.end('Booking not found for that reference code.');
      return;
    }
    const booking = bookings[0];
    if (email) {
      const guestEmail = String(booking.guest_email || '').trim().toLowerCase();
      if (guestEmail && guestEmail !== email) {
        res.statusCode = 404;
        res.end('Booking not found for that email.');
        return;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderReceipt(booking));
  } catch (e) {
    console.error('[Invoice] error:', e.message);
    res.statusCode = 500;
    res.end('Could not generate the receipt. Please try again.');
  }
};

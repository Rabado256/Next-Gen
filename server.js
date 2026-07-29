require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const supabaseJs = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

async function handleAPI(req, res) {
  const url = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // POST /api/create-payment-intent
  if (url === '/api/create-payment-intent' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { amount, currency, metadata } = body;

      if (!amount || amount <= 0) {
        return json(res, 400, { error: 'Invalid amount' });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return json(res, 503, { error: 'Stripe not configured. Add your STRIPE_SECRET_KEY to .env' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: currency || 'usd',
        metadata: metadata || {},
        automatic_payment_methods: { enabled: true }
      });

      json(res, 200, {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });
    } catch (e) {
      console.error('[Stripe] createPaymentIntent error:', e.message);
      json(res, 500, { error: e.message });
    }
    return true;
  }

  // POST /api/confirm-booking — saves booking to Supabase after payment
  if (url === '/api/confirm-booking' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { createClient } = supabaseJs;
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
        currency: body.currency || 'usd',
        status: 'confirmed',
        payment_id: body.payment_id,
        booking_date: body.travel_date,
        passport: body.passport || '',
        identity_card: body.identity_card || '',
        special_requests: body.special_requests || '',
        hotel_reservation: body.hotel_reservation || false,
        from_location: body.from_location || '',
        to_location: body.to_location || '',
        travelers: body.travelers || null,
        reference: body.reference
      }).select('id, reference').single();

      if (error) throw error;
      json(res, 200, { success: true, booking: data });
    } catch (e) {
      console.error('[Booking] confirm error:', e.message);
      json(res, 500, { error: e.message });
    }
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  // Handle API routes first
  const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
  if (cleanUrl.startsWith('/api/')) {
    const handled = await handleAPI(req, res);
    if (handled) return;
  }

  // Static file serving
  let filePath = path.join(ROOT, cleanUrl === '/' ? 'index.html' : cleanUrl);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoints: POST /api/create-payment-intent, POST /api/confirm-booking`);
});

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getFirestore } = require('./firebase-admin');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── Auto-seed on first launch ─────────────────────────────────
(async () => {
  try {
    const db = getFirestore();
    const snap = await db.collection('destinations').get();
    if (snap.empty) {
      console.log('[Seed] No destinations found — running seed...');
      require('./scripts/seed');
    } else {
      console.log(`[Seed] ${snap.size} destinations already present, skipping.`);
    }
  } catch (e) {
    console.log('[Seed] Skipped (Firebase Admin not configured or offline):', e.message);
  }
})();
// ──────────────────────────────────────────────────────────────

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

  // GET /api/config — expose public configuration to the client
  if (url === '/api/config' && req.method === 'GET') {
    json(res, 200, {
      paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || '',
      firebase_api_key: process.env.FIREBASE_API_KEY || '',
      firebase_auth_domain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
      firebase_storage_bucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebase_messaging_sender_id: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebase_app_id: process.env.FIREBASE_APP_ID || ''
    });
    return true;
  }

  // POST /api/paystack-verify — verify a Paystack transaction by reference
  if (url === '/api/paystack-verify' && req.method === 'POST') {
    return invokeServerless('paystack-verify.js', 'Paystack', req, res);
  }

  // POST /api/confirm-booking — saves booking to Firestore after payment
  if (url === '/api/confirm-booking' && req.method === 'POST') {
    return invokeServerless('confirm-booking.js', 'Booking', req, res);
  }

  // POST /api/lookup-booking — public booking lookup by reference (guest-safe)
  if (url === '/api/lookup-booking' && req.method === 'POST') {
    return invokeServerless('lookup-booking.js', 'Booking', req, res);
  }

  // POST /api/export-data — admin-only full data export (service-account fetch)
  if (url === '/api/export-data' && req.method === 'POST') {
    return invokeServerless('export-data.js', 'Export', req, res);
  }

  // POST /api/complete-bookings — auto-complete bookings past their travel date
  if (url === '/api/complete-bookings' && req.method === 'POST') {
    return invokeServerless('complete-bookings.js', 'Complete', req, res);
  }

  // GET|POST /api/invoice — printable receipt/confirmation page for a booking
  if (url === '/api/invoice' && (req.method === 'GET' || req.method === 'POST')) {
    return invokeServerless('invoice.js', 'Invoice', req, res);
  }

  // POST /api/admin-verify — server-side admin authorization check
  if (url === '/api/admin-verify' && req.method === 'POST') {
    return invokeServerless('admin-verify.js', 'AdminVerify', req, res);
  }

  return false;
}

// Shared loader for the Vercel-style serverless handlers in /api
async function invokeServerless(file, tag, req, res) {
  try {
    const body = await parseBody(req);
    delete require.cache[require.resolve('./api/' + file)];
    const handler = require('./api/' + file);
    const { IncomingMessage } = require('http');
    const mockReq = Object.assign(Object.create(IncomingMessage.prototype), {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
      socket: { remoteAddress: (req.socket && req.socket.remoteAddress) || '127.0.0.1' },
      async on() { return this; }
    });
    await handler(mockReq, res);
  } catch (e) {
    console.error('[' + tag + '] ' + file + ' error:', e.message);
    json(res, 500, { error: e.message });
  }
  return true;
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
  console.log(`API endpoints: POST /api/paystack-verify, POST /api/confirm-booking`);
});

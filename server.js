require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const supabaseJs = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── Auto-seed on first launch ─────────────────────────────────
(async () => {
  try {
    const { createClient } = supabaseJs;
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { count } = await sb.from('destinations').select('*', { count: 'exact', head: true });
    if (count === 0 || count === null) {
      console.log('[Seed] No destinations found — running seed...');
      require('./scripts/seed');
    } else {
      console.log(`[Seed] ${count} destinations already present, skipping.`);
    }
  } catch (e) {
    console.log('[Seed] Skipped (offline or first run):', e.message);
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
      supabase_url: process.env.SUPABASE_URL || ''
    });
    return true;
  }

  // POST /api/paystack-verify — verify a Paystack transaction by reference
  if (url === '/api/paystack-verify' && req.method === 'POST') {
    return invokeServerless('paystack-verify.js', 'Paystack', req, res);
  }

  // POST /api/confirm-booking — saves booking to Supabase after payment
  if (url === '/api/confirm-booking' && req.method === 'POST') {
    return invokeServerless('confirm-booking.js', 'Booking', req, res);
  }

  // POST /api/lookup-booking — public booking lookup by reference (guest-safe)
  if (url === '/api/lookup-booking' && req.method === 'POST') {
    return invokeServerless('lookup-booking.js', 'Booking', req, res);
  }

  // POST /api/export-data — admin-only full data export (service-role fetch)
  if (url === '/api/export-data' && req.method === 'POST') {
    return invokeServerless('export-data.js', 'Export', req, res);
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

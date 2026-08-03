require('dotenv').config();

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

// Decode the `sub` (user id) from a Supabase access token JWT without verifying
// the signature — used to attribute the request to an account for the admin check.
function jwtSub(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4 !== 0) payload += '=';
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return data && data.sub ? data.sub : null;
  } catch (_) {
    return null;
  }
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
    await readBody(req);
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const sub = jwtSub(token);

    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    if (!url) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Supabase URL not configured' }));
      return;
    }

    // Verify the caller is an admin using their own JWT — RLS (is_admin())
    // gates the profiles read, so only admins pass this check.
    if (!sub) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }
    const authClient = createClient(url, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: 'Bearer ' + token } }
    });
    const { data: profile, error: profileErr } = await authClient
      .from('profiles')
      .select('is_admin')
      .eq('id', sub)
      .maybeSingle();
    if (profileErr || !profile || profile.is_admin !== true) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    // Service-role client bypasses RLS so every table can be exported,
    // including itineraries (which have no public/admin select policy).
    const sb = createClient(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    const fetchAll = async (table, order) => {
      try {
        const q = sb.from(table).select('*');
        if (order) q.order(order.column, { ascending: order.ascending });
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn('[Export] ' + table + ' fetch failed:', e.message);
        return [];
      }
    };

    const [bookings, users, destinations, trips, contacts, reviews, newsletter, logs, itineraries] = await Promise.all([
      fetchAll('bookings', { column: 'created_at', ascending: false }),
      fetchAll('profiles', { column: 'created_at', ascending: false }),
      fetchAll('destinations', { column: 'created_at', ascending: true }),
      fetchAll('trips', { column: 'departure_date', ascending: true }),
      fetchAll('contacts', { column: 'created_at', ascending: false }),
      fetchAll('reviews', { column: 'created_at', ascending: false }),
      fetchAll('newsletter_subscribers', { column: 'created_at', ascending: false }),
      fetchAll('audit_logs', { column: 'created_at', ascending: false }).then(list => list.slice(0, 100)),
      fetchAll('itineraries', { column: 'created_at', ascending: false })
    ]);

    res.statusCode = 200;
    res.end(JSON.stringify({ bookings, users, destinations, trips, contacts, reviews, newsletter, logs, itineraries }));
  } catch (e) {
    console.error('[Export] error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

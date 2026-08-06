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

// Decode the `sub` (user id) from a Supabase access token JWT without
// verifying the signature — the signature is verified by Supabase when the
// token is presented as the Authorization header of the anon-key client below.
// Authorization (is_admin) is enforced by RLS, never by this decode.
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

/**
 * POST /api/complete-bookings
 * Marks confirmed bookings whose travel date has passed as "completed",
 * appending to their status_history. Requires an admin JWT (verified via RLS);
 * the transition itself is guarded by the complete_expired_bookings()
 * SECURITY DEFINER function.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    if (!url) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Supabase URL not configured' }));
      return;
    }

    // Only admins may run the auto-complete job. RLS (is_admin()) gates the
    // profiles read off auth.uid() from the verified JWT, so a forged token
    // or spoofed `sub` is rejected.
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user_id = jwtSub(token);
    if (!user_id) {
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
      .eq('id', user_id)
      .maybeSingle();
    if (profileErr || !profile || profile.is_admin !== true) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const supabase = createClient(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.rpc('complete_expired_bookings');
    if (error) {
      // Function not deployed yet — degrade gracefully rather than failing
      // the bookings page.
      console.warn('[Complete] RPC not available:', error.message);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, completed: 0, skipped: error.message }));
      return;
    }

    const completed = Number(data) || 0;
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, completed }));
  } catch (e) {
    console.error('[Complete] error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

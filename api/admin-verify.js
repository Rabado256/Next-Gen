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
// Authorization (is_admin) is enforced by RLS (auth.uid() from the verified
// token), never by this decode, so a forged token can't grant admin access.
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
 * POST /api/admin-verify
 * Verifies that the authenticated user (from the Authorization JWT) is an
 * admin in the database. Returns { is_admin, user } — used by admin.html to
 * gate access server-side instead of trusting localStorage.
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

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user_id = jwtSub(token);
    if (!user_id) {
      res.statusCode = 200;
      res.end(JSON.stringify({ is_admin: false, error: 'Not authenticated' }));
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    if (!url) {
      res.statusCode = 200;
      res.end(JSON.stringify({ is_admin: false, error: 'Not configured' }));
      return;
    }

    // Verify admin status using the caller's own token with the anon key —
    // RLS (profiles_select_own / is_admin()) gates the read off auth.uid(),
    // which Supabase derives from the VERIFIED token. A forged token yields
    // no matching profile and is_admin: false, even if `sub` is faked.
    const authClient = createClient(url, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: 'Bearer ' + token } }
    });

    const { data: profile, error } = await authClient
      .from('profiles')
      .select('id, name, email, is_admin')
      .eq('id', user_id)
      .maybeSingle();
    if (error || !profile) {
      res.statusCode = 200;
      res.end(JSON.stringify({ is_admin: false, error: (error && error.message) || 'Not authenticated' }));
      return;
    }

    const isAdmin = !!(profile && profile.is_admin);
    res.statusCode = 200;
    res.end(JSON.stringify({
      is_admin: isAdmin,
      user: isAdmin ? { id: profile.id, name: profile.name, email: profile.email } : null
    }));
  } catch (e) {
    console.error('[AdminVerify] error:', e.message);
    res.statusCode = 200;
    res.end(JSON.stringify({ is_admin: false, error: e.message }));
  }
};

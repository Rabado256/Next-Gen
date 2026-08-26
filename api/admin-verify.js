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

/**
 * POST /api/admin-verify
 * Verifies that the authenticated user (from the Authorization Firebase ID
 * token) is an admin in Firestore. Returns { is_admin, user } — used by
 * admin.html to gate access server-side instead of trusting localStorage.
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

    const admin = require('../firebase-admin');
    const decoded = await admin.verifyToken(req);
    if (!decoded) {
      res.statusCode = 200;
      res.end(JSON.stringify({ is_admin: false, error: 'Not authenticated' }));
      return;
    }

    const db = admin.getFirestore();
    const doc = await db.collection('profiles').doc(decoded.uid).get();
    if (!doc.exists) {
      res.statusCode = 200;
      res.end(JSON.stringify({ is_admin: false, error: 'Not authenticated' }));
      return;
    }

    const profile = Object.assign({ id: doc.id }, doc.data());
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

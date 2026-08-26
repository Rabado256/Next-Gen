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

    const admin = require('../firebase-admin');
    const decoded = await admin.verifyToken(req);
    if (!decoded) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }

    const db = admin.getFirestore();
    const profileDoc = await db.collection('profiles').doc(decoded.uid).get();
    if (!profileDoc.exists || profileDoc.data().is_admin !== true) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    // Service account bypasses security rules so every collection can be exported.
    const fetchAll = async (col) => {
      try {
        const qs = await db.collection(col).get();
        return qs.docs.map(d => Object.assign({ id: d.id }, d.data()));
      } catch (e) {
        console.warn('[Export] ' + col + ' fetch failed:', e.message);
        return [];
      }
    };

    const [bookings, users, destinations, trips, contacts, reviews, newsletter, logs, itineraries] = await Promise.all([
      fetchAll('bookings'),
      fetchAll('profiles'),
      fetchAll('destinations'),
      fetchAll('trips'),
      fetchAll('contacts'),
      fetchAll('reviews'),
      fetchAll('newsletter_subscribers'),
      fetchAll('audit_logs').then(list => list.slice(0, 100)),
      fetchAll('itineraries')
    ]);

    res.statusCode = 200;
    res.end(JSON.stringify({ bookings, users, destinations, trips, contacts, reviews, newsletter, logs, itineraries }));
  } catch (e) {
    console.error('[Export] error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

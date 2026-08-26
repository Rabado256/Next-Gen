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
 * POST /api/complete-bookings
 * Marks confirmed bookings whose travel date has passed as "completed",
 * appending to their status_history. Requires an admin Firebase ID token
 * (verified server-side).
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

    // Auto-complete bookings whose travel date is in the past.
    const nowIso = new Date().toISOString();
    const snap = await db.collection('bookings')
      .where('status', '==', 'confirmed')
      .get();

    const batch = db.batch();
    let completed = 0;
    const today = nowIso.split('T')[0];

    snap.forEach((doc) => {
      const b = doc.data();
      const travelDate = String(b.booking_date || b.travel_date || '').slice(0, 10);
      if (travelDate && travelDate < today) {
        const history = Array.isArray(b.status_history) ? b.status_history : [];
        batch.update(doc.ref, {
          status: 'completed',
          completed_at: nowIso,
          status_history: [...history, { status: 'completed', at: nowIso }]
        });
        completed++;
      }
    });

    if (completed > 0) await batch.commit();

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, completed }));
  } catch (e) {
    console.error('[Complete] error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

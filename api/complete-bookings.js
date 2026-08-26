require('dotenv').config();
const { getDb, verifyToken, fetchById } = require('../supabase-admin');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }

  try {
    await readBody(req);

    const user = await verifyToken(req);
    if (!user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }

    const db = getDb();
    const profile = await fetchById('profiles', user.id);
    if (!profile || profile.is_admin !== true) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const { data: bookings } = await db.from('bookings').select('*').eq('status', 'confirmed');

    let completed = 0;
    for (const b of (bookings || [])) {
      const travelDate = String(b.booking_date || b.travel_date || '').slice(0, 10);
      if (travelDate && travelDate < today) {
        const history = Array.isArray(b.status_history) ? b.status_history : [];
        await db.from('bookings').update({
          status: 'completed',
          completed_at: nowIso,
          status_history: [...history, { status: 'completed', at: nowIso }]
        }).eq('id', b.id);
        completed++;
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, completed }));
  } catch (e) {
    console.error('[Complete] error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

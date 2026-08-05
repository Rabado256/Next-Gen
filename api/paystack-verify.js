require('dotenv').config();

function readBody(req) {
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
    const body = await readBody(req);
    const reference = String(body.reference || '').trim();
    if (!reference) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing payment reference' }));
      return;
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Paystack not configured. Add your PAYSTACK_SECRET_KEY to environment variables.' }));
      return;
    }

    // Verify the transaction on Paystack's side using the secret key
    const verifyRes = await fetch(
      'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok || !data.status) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'Paystack verification failed' }));
      return;
    }

    const tx = data.data || {};
    res.statusCode = 200;
    res.end(JSON.stringify({
      reference: tx.reference || reference,
      status: tx.status || 'failed',
      amount: tx.amount || 0,       // in kobo (NGN / 100)
      currency: tx.currency || 'NGN',
      paid_at: tx.paid_at || null,
      customer_email: (tx.customer && tx.customer.email) || '',
      verified: tx.status === 'success'
    }));
  } catch (e) {
    console.error('[Paystack] verify error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

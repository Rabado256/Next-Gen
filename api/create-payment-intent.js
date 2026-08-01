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

    const { amount, currency, metadata } = body;

    if (!amount || amount <= 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid amount' }));
      return;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Stripe not configured. Add your STRIPE_SECRET_KEY to Vercel environment variables.' }));
      return;
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency || 'usd',
      metadata: metadata || {},
      automatic_payment_methods: { enabled: true }
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    }));
  } catch (e) {
    console.error('[Stripe] createPaymentIntent error:', e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};

require('dotenv').config();

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = 200;
  res.end(JSON.stringify({
    stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
    supabase_url: process.env.SUPABASE_URL || ''
  }));
};

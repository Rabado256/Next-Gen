require('dotenv').config();

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = 200;
  res.end(JSON.stringify({
    paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || '',
    firebase_api_key: process.env.FIREBASE_API_KEY || '',
    firebase_auth_domain: process.env.FIREBASE_AUTH_DOMAIN || '',
    firebase_project_id: process.env.FIREBASE_PROJECT_ID || '',
    firebase_storage_bucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    firebase_messaging_sender_id: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    firebase_app_id: process.env.FIREBASE_APP_ID || ''
  }));
};

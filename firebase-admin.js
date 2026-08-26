require('dotenv').config();

let _admin = null;

// Build a Firebase Admin app from the environment. Supports three sources:
//   1. FIREBASE_SERVICE_ACCOUNT  — a JSON string of the service-account file
//   2. GOOGLE_APPLICATION_CREDENTIALS — path to a service-account JSON file
//   3. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
function getAdmin() {
  if (_admin) return _admin;

  let serviceAccount = null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fs = require('fs');
    serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    };
  }

  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT (JSON) ' +
      'or GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_PROJECT_ID / ' +
      'FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.'
    );
  }

  const admin = require('firebase-admin');
  _admin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: undefined
  });
  return _admin;
}

function getFirestore() {
  return getAdmin().firestore();
}

function getAuth() {
  return getAdmin().auth();
}

// Verify a Firebase ID token from the Authorization header.
// Returns the decoded token payload, or null when missing/invalid.
async function verifyToken(req) {
  const header = (req && req.headers && req.headers.authorization) || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    return await getAuth().verifyIdToken(token);
  } catch (e) {
    return null;
  }
}

// Returns the Firebase uid for a request (null for guests).
async function userIdFromRequest(req) {
  const decoded = await verifyToken(req);
  return decoded ? decoded.uid : null;
}

// Ensure a doc is written even when the collection does not exist yet.
async function setDoc(db, col, id, data, merge) {
  const ref = db.collection(col).doc(id);
  await ref.set(data, merge ? { merge: true } : undefined);
  return ref;
}

module.exports = { getAdmin, getFirestore, getAuth, verifyToken, userIdFromRequest, setDoc };

/**
 * NextGen Travel — Supabase Admin (Server-Side)
 * Uses the Supabase service-role key to bypass RLS.
 * Replaces the old firebase-admin.js.
 *
 * Requires in .env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let _admin = null;

function getAdmin() {
  if (_admin) return _admin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase Admin not configured. Set SUPABASE_URL and ' +
      'SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _admin;
}

function getDb() {
  return getAdmin();
}

/**
 * Verify a Supabase JWT from the Authorization header.
 * Returns the decoded user payload, or null when missing/invalid.
 */
async function verifyToken(req) {
  const header = (req && req.headers && req.headers.authorization) || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { data, error } = await getAdmin().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

/**
 * Returns the Supabase user ID for a request (null for guests).
 */
async function userIdFromRequest(req) {
  const user = await verifyToken(req);
  return user ? user.id : null;
}

/**
 * Insert a row into a table.
 */
async function insertRow(table, data) {
  const { data: result, error } = await getDb().from(table).insert(data).select().single();
  if (error) throw error;
  return result;
}

/**
 * Upsert a row into a table (insert or update on conflict).
 */
async function upsertRow(table, data, onConflict) {
  const opts = onConflict ? { onConflict } : {};
  const { data: result, error } = await getDb().from(table).upsert(data, opts).select().single();
  if (error) throw error;
  return result;
}

/**
 * Fetch all rows from a table with optional filters.
 */
async function fetchAll(table, filters = {}) {
  let query = getDb().from(table).select('*');
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null) {
      query = query.eq(key, val);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single row by id.
 */
async function fetchById(table, id) {
  const { data, error } = await getDb().from(table).select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

module.exports = { getAdmin, getDb, verifyToken, userIdFromRequest, insertRow, upsertRow, fetchAll, fetchById };

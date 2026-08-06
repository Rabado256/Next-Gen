#! /usr/bin/env node
// Security regression tests: rate limiter + booking PII masking.
// Pure/unit-level (no live Supabase calls) so `npm test` stays offline.
const path = require('path');
let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label); }
}
function assertEqual(a, e, label) {
  if (a === e) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label, `\u2014 expected "${e}", got "${a}"`); }
}
function assertMatch(a, re, label) {
  if (re.test(a)) { passed++; console.log('  \u2705', label); }
  else { failed++; console.log('  \u274C', label, `\u2014 "${a}" does not match ${re}`); }
}

const apiDir = path.join(__dirname, '..', 'api');

// ─────────────────────────────────────────────────────────────
// Suite 1: Rate limiter
// ─────────────────────────────────────────────────────────────
console.log('\n\uD83D\uDCCB Suite 1: Rate limiter');
process.env.RATE_LIMIT_MAX = '5';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
delete require.cache[require.resolve(path.join(apiDir, '_rate-limit.js'))];
const rl = require(path.join(apiDir, '_rate-limit.js'));
assertEqual(rl.LIMIT, 5, 'Env RATE_LIMIT_MAX respected');
assertEqual(rl.WINDOW_MS, 60000, 'Env RATE_LIMIT_WINDOW_MS respected');

const mkReq = (ip, headers) => ({ headers: headers || {}, socket: { remoteAddress: ip } });
const r1 = mkReq('1.2.3.4');
let ok = true, sawBlock = false;
for (let i = 0; i < 6; i++) {
  const r = rl.allow(r1);
  if (i < 5 && !r.allowed) ok = false;
  if (i === 5) { sawBlock = !r.allowed; assert(r.retryAfter > 0, 'Blocked request has Retry-After > 0'); }
}
assert(ok, '5 requests under limit allowed');
assert(sawBlock, '6th request blocked');

const r2 = mkReq('9.9.9.9');
let freshAllowed = true;
for (let i = 0; i < 5; i++) { if (!rl.allow(r2).allowed) freshAllowed = false; }
assert(freshAllowed, 'Different IP gets a fresh bucket');

const r3 = mkReq('10.0.0.1', { 'x-forwarded-for': '203.0.113.7' });
assert(rl.allow(r3).remaining === rl.LIMIT - 1, 'x-forwarded-for takes precedence over socket IP');

delete process.env.RATE_LIMIT_MAX;
delete process.env.RATE_LIMIT_WINDOW_MS;
delete require.cache[require.resolve(path.join(apiDir, '_rate-limit.js'))];

// ─────────────────────────────────────────────────────────────
// Suite 2: Booking lookup PII masking
// ─────────────────────────────────────────────────────────────
console.log('\n\uD83D\uDCCB Suite 2: Booking PII masking');
const lookup = require(path.join(apiDir, 'lookup-booking.js'));
assertEqual(typeof lookup.maskValue, 'function', 'maskValue exported');
assertEqual(typeof lookup.maskEmail, 'function', 'maskEmail exported');

assertEqual(lookup.maskValue('A12345678'), 'A1*****78', 'Passport masked (keep first 2 + last 2)');
assertEqual(lookup.maskValue('ab'), '****', 'Very short value fully masked');
assertEqual(lookup.maskValue(''), '', 'Empty stays empty');
assertEqual(lookup.maskValue(null), '', 'Null stays empty');
assertEqual(lookup.maskValue('+2348012345678'), '+2**********78', 'Phone masked');
assertMatch(lookup.maskEmail('curated@nextgen.com'), /^cu\*\*\*@nextgen\.com$/, 'Email local part masked, domain intact');
assertMatch(lookup.maskEmail('ab@x.io'), /^a\*\*\*@x\.io$/, 'Short local part keeps one char');
assertEqual(lookup.maskEmail('nope'), '****', 'Invalid email masked as value');

// ─────────────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`Security: ${passed}/${passed + failed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

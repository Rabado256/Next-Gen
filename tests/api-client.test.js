#! /usr/bin/env node
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

console.log('\n\uD83D\uDCCB Suite 1: Reference generation');
const ref1 = 'NXG-' + Date.now().toString(36).toUpperCase();
const ref2 = 'FL-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
assertMatch(ref1, /^NXG-[A-Z0-9]+$/, 'Destination ref format');
assertMatch(ref2, /^FL-[A-Z0-9]+[A-Za-z0-9]{4}$/, 'Flight ref format');

console.log('\n\uD83D\uDCCB Suite 2: escapeHtml');
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}
assertEqual(escapeHtml('<script>'), '&lt;script&gt;', 'Escapes < >');
assertEqual(escapeHtml('"&\''), '&quot;&amp;&#39;', 'Escapes quotes & amp');
assertEqual(escapeHtml('hello'), 'hello', 'Safe string unchanged');
assertEqual(escapeHtml(''), '', 'Empty string');
assertEqual(escapeHtml(null), '', 'Null returns empty');

console.log('\n\uD83D\uDCCB Suite 3: Price formatting logic');
function formatPrice(amount, currency) {
  if (currency === 'EUR') return '\u20AC' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
assertEqual(formatPrice(2450, 'USD'), '$2,450.00', 'USD format');
assertEqual(formatPrice(1234567.89, 'EUR'), '\u20AC1,234,567.89', 'EUR format');
assertEqual(formatPrice(0, 'USD'), '$0.00', 'Zero');

console.log('\n\uD83D\uDCCB Suite 4: Booking reference uniqueness');
const refs = new Set();
for (let i = 0; i < 100; i++) {
  refs.add('NG' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase());
}
assert(refs.size === 100, '100 generated refs are unique');

console.log('\n\uD83D\uDCCB Suite 5: Traveler count validation');
function validateGuests(count) {
  const n = parseInt(count) || 1;
  return Math.max(1, Math.min(20, n));
}
assertEqual(validateGuests(1), 1, '1 guest');
assertEqual(validateGuests(5), 5, '5 guests');
assertEqual(validateGuests(0), 1, '0 defaults to 1');
assertEqual(validateGuests(-1), 1, 'Negative defaults to 1');
assertEqual(validateGuests(100), 20, '100 capped at 20');
assertEqual(validateGuests('abc'), 1, 'NaN defaults to 1');

console.log('\n\uD83D\uDCCB Suite 6: Trip availability logic');
function calcAvailableSpots(max, booked) {
  return Math.max(0, (max || 0) - (booked || 0));
}
assertEqual(calcAvailableSpots(20, 5), 15, '20 - 5 = 15');
assertEqual(calcAvailableSpots(20, 20), 0, 'Fully booked = 0');
assertEqual(calcAvailableSpots(20, 25), 0, 'Overbooked clamped to 0');
assertEqual(calcAvailableSpots(0, 0), 0, 'Zero capacity');

console.log('\n\uD83D\uDCCB Suite 7: Duffel formatDuration');
function formatDuration(isoDuration) {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  if (hours > 0 && minutes > 0) return hours + 'h ' + minutes + 'm';
  if (hours > 0) return hours + 'h';
  if (minutes > 0) return minutes + 'm';
  return '';
}
assertEqual(formatDuration('PT1H30M'), '1h 30m', '1h30m');
assertEqual(formatDuration('PT2H'), '2h', '2h');
assertEqual(formatDuration('PT45M'), '45m', '45m');
assertEqual(formatDuration(null), '', 'Null');
assertEqual(formatDuration(''), '', 'Empty');

console.log('\n\uD83D\uDCCB Suite 8: Duffel formatOfferForDisplay');
function formatOfferForDisplay(offer) {
  const segments = offer.slices?.flatMap(s => s.segments) || [];
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  return {
    id: offer.id,
    price: parseFloat(offer.total_amount),
    currency: offer.total_currency,
    airline: firstSegment?.operating_carrier?.name || 'Unknown Airline',
    departure: firstSegment?.departure?.time || '',
    departureAirport: firstSegment?.departure?.airport?.iata_code || '',
    arrival: lastSegment?.arrival?.time || '',
    arrivalAirport: lastSegment?.arrival?.airport?.iata_code || '',
    stops: (offer.slices?.[0]?.segments?.length || 1) - 1,
    stopsText: (offer.slices?.[0]?.segments?.length || 1) - 1 === 0 ? 'Direct' : ((offer.slices?.[0]?.segments?.length || 1) - 1) + ' stop(s)',
    cabinClass: offer.cabin_class
  };
}
const mockOffer = {
  id: 'off_123',
  total_amount: '450.00',
  total_currency: 'USD',
  cabin_class: 'economy',
  slices: [{
    segments: [
      { operating_carrier: { name: 'Test Airways' }, departure: { time: '06:00', airport: { iata_code: 'JFK' } }, arrival: { time: '09:00', airport: { iata_code: 'LHR' } } }
    ]
  }]
};
const formatted = formatOfferForDisplay(mockOffer);
assertEqual(formatted.id, 'off_123', 'Offer ID preserved');
assertEqual(formatted.price, 450, 'Price parsed');
assertEqual(formatted.airline, 'Test Airways', 'Airline name');
assertEqual(formatted.departureAirport, 'JFK', 'Departure airport');
assertEqual(formatted.arrivalAirport, 'LHR', 'Arrival airport');
assertEqual(formatted.stops, 0, 'Direct flight');
assertEqual(formatted.stopsText, 'Direct', 'Stops text direct');

const total = passed + failed;
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
else console.log('All tests passed! \u2705');

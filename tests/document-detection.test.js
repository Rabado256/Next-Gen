#! /usr/bin/env node
/**
 * Unit Tests — Smart Document Detection
 *
 * Tests the core extractCountry functions used across:
 * - checkout.html   → extractCountry()
 * - itinerary-builder.html → extractCountryFrom()
 * - search-results.html → srExtractCountry()
 * - destination.html → updateDestDocBadge() (via DEST_COUNTRIES + user country)
 *
 * Run with: node tests/document-detection.test.js
 */

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log('  ✅', label);
  } else {
    failed++;
    console.log('  ❌', label);
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
    console.log('  ✅', label);
  } else {
    failed++;
    console.log('  ❌', label, `— expected "${expected}", got "${actual}"`);
  }
}

// ============================================================
// Setup: Mock the lookup data structures
// Mirrors the real data in checkout.html / itinerary-builder.html
// ============================================================

const _countryNames = new Set([
  'USA', 'UK', 'United States', 'United Kingdom', 'UAE', 'U.S.A', 'England', 'Britain', 'America',
  'Nigeria', 'South Africa', 'India', 'China', 'Italy', 'Canada', 'Australia',
  'Ghana', 'Kenya', 'France', 'Spain', 'Germany', 'Japan', 'Thailand',
  'Indonesia', 'Maldives', 'Greece', 'Morocco', 'Iceland', 'New Zealand',
  'Argentina', 'Chile', 'Peru', 'Brazil', 'Mexico', 'Costa Rica',
  'Norway', 'Portugal', 'Egypt', 'Tanzania', 'Mauritius', 'Fiji',
  'French Polynesia', 'Antarctica', 'Netherlands', 'Sweden', 'Denmark', 'Ireland', 'Turkey',
  'Switzerland', 'UAE', 'Singapore', 'Malaysia', 'Trinidad and Tobago', 'Poland'
]);

const _cityToCountry = {
  'abuja': 'Nigeria', 'kano': 'Nigeria', 'lagos': 'Nigeria',
  'mumbai': 'India', 'delhi': 'India', 'bangalore': 'India',
  'milan': 'Italy', 'naples': 'Italy', 'florence': 'Italy',
  'rome': 'Italy', 'madrid': 'Spain', 'london': 'United Kingdom',
  'osaka': 'Japan',
  'los angeles': 'United States', 'chicago': 'United States', 'miami': 'United States',
  'new york': 'United States',
  'toronto': 'Canada', 'vancouver': 'Canada', 'montreal': 'Canada',
  'melbourne': 'Australia', 'sydney': 'Australia',
  'nairobi': 'Kenya', 'dubai': 'UAE', 'singapore': 'Singapore',
  'johannesburg': 'South Africa', 'durban': 'South Africa'
};

const _destToCountry = {
  'amalfi poetry': 'Italy', 'amalfi': 'Italy', 'alpine silence': 'Switzerland',
  'swiss alps': 'Switzerland', 'alps': 'Switzerland', 'kyoto ritual': 'Japan',
  'kyoto': 'Japan', 'dolomites dawn': 'Italy', 'dolomites': 'Italy',
  'santorini horizon': 'Greece', 'santorini': 'Greece', 'icelandic element': 'Iceland',
  'iceland': 'Iceland', 'marrakech mystique': 'Morocco', 'marrakech': 'Morocco',
  'banff solitude': 'Canada', 'banff': 'Canada', 'patagonia frontier': 'Argentina',
  'patagonia': 'Argentina', 'queenstown aether': 'New Zealand', 'queenstown': 'New Zealand',
  'bali temple': 'Indonesia', 'bali': 'Indonesia', 'provence golden': 'France',
  'provence': 'France', 'maldives azure': 'Maldives', 'maldives': 'Maldives',
  'tuscany golden': 'Italy', 'tuscany': 'Italy', 'seychelles dream': 'Seychelles',
  'seychelles': 'Seychelles', 'paris eternal': 'France', 'paris': 'France',
  'venice timeless': 'Italy', 'venice': 'Italy', 'costa rica wild': 'Costa Rica',
  'costa rica': 'Costa Rica', 'nepal ascent': 'Nepal', 'nepal': 'Nepal',
  'mozambique shore': 'Mozambique', 'mozambique': 'Mozambique', 'big sur': 'United States',
  'sedona vortex': 'United States', 'sedona': 'United States', 'norwegian fjords': 'Norway',
  'norway': 'Norway', 'sri lanka spice': 'Sri Lanka', 'sri lanka': 'Sri Lanka',
  'azores mystic': 'Portugal', 'azores': 'Portugal', 'orlando wonder': 'United States',
  'orlando': 'United States', 'tokyo boundless': 'Japan', 'tokyo': 'Japan',
  'dubai spectacle': 'UAE', 'dubai': 'UAE', 'barcelona vibe': 'Spain',
  'barcelona': 'Spain', 'cancun paradise': 'Mexico', 'cancun': 'Mexico',
  'greek islands sun': 'Greece', 'greek islands': 'Greece',
  'mauritius haven': 'Mauritius', 'mauritius': 'Mauritius',
  'cape town': 'South Africa', 'zanzibar': 'Tanzania',
  'egypt': 'Egypt', 'bangkok': 'Thailand', 'phuket': 'Thailand',
  'seville': 'Spain', 'tulum': 'Mexico',
  'rio de janeiro': 'Brazil', 'rio': 'Brazil', 'cusco': 'Peru',
  'buenos aires': 'Argentina', 'amazon': 'Brazil', 'sydney': 'Australia',
  'bora bora': 'French Polynesia', 'great barrier reef': 'Australia', 'fiji': 'Fiji',
  'antarctica': 'Antarctica', 'nairobi-kenya': 'Kenya'
};

const _srDestToCountry = Object.assign({}, _destToCountry);
const _srCountryNames = new Set(_countryNames);
Object.values(_srDestToCountry).forEach(function(c) { _srCountryNames.add(c); });

const _srCityToCountry = Object.assign({}, _cityToCountry);

// ============================================================
// Helper: extractCountry (checkout.html version)
// ============================================================
function extractCountry(str) {
  if (!str) return null;
  const s = str.trim();
  if (!s) return null;
  // 1. Exact case-insensitive match
  for (const country of _countryNames) {
    if (s.toLowerCase() === country.toLowerCase()) return country;
  }
  // 2. Comma-separated "City, Country"
  const commaIdx = s.lastIndexOf(',');
  if (commaIdx > -1) {
    const afterComma = s.substring(commaIdx + 1).trim();
    for (const country of _countryNames) {
      if (afterComma.toLowerCase() === country.toLowerCase()) return country;
    }
  }
  // 3. City-to-country mapping
  const lower = s.toLowerCase();
  if (_cityToCountry[lower]) return _cityToCountry[lower];
  // 4. Word-boundary regex (case-insensitive fallback)
  for (const country of _countryNames) {
    var safe = country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('\\b' + safe + '\\b', 'i');
    if (re.test(s)) return country;
  }
  // 5. Destination title mapping
  if (_destToCountry[lower]) return _destToCountry[lower];
  return null;
}

// ============================================================
// Helper: srExtractCountry (search-results.html version)
// ============================================================
function srExtractCountry(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  if (!s) return null;
  for (const c of _srCountryNames) { if (s === c.toLowerCase()) return c; }
  const ci = s.lastIndexOf(',');
  if (ci > -1) {
    const ac = s.substring(ci + 1).trim();
    for (const c of _srCountryNames) { if (ac === c.toLowerCase()) return c; }
  }
  if (_srCityToCountry[s]) return _srCityToCountry[s];
  if (_srDestToCountry[s]) return _srDestToCountry[s];
  return null;
}

// ============================================================
// DEST_COUNTRIES (destination.html version)
// ============================================================
const DEST_COUNTRIES = {
  amalfi:'Italy', alps:'Switzerland', kyoto:'Japan', dolomites:'Italy',
  santorini:'Greece', iceland:'Iceland', marrakech:'Morocco', banff:'Canada',
  patagonia:'Argentina', queenstown:'New Zealand', bali:'Indonesia',
  provence:'France', maldives:'Maldives', tuscany:'Italy', seychelles:'Seychelles',
  paris:'France', venice:'Italy', 'costa-rica':'Costa Rica', nepal:'Nepal',
  mozambique:'Mozambique', 'big-sur':'United States', sedona:'United States',
  norway:'Norway', 'sri-lanka':'Sri Lanka', azores:'Portugal', orlando:'United States',
  tokyo:'Japan', dubai:'UAE', barcelona:'Spain', cancun:'Mexico',
  'greek-islands':'Greece', mauritius:'Mauritius', 'cape-town':'South Africa',
  zanzibar:'Tanzania', 'nairobi-kenya':'Kenya', egypt:'Egypt', bangkok:'Thailand',
  phuket:'Thailand', jaipur:'India', seville:'Spain', 'new-york':'United States',
  tulum:'Mexico', 'rio-de-janeiro':'Brazil', cusco:'Peru',
  'buenos-aires':'Argentina', amazon:'Brazil', sydney:'Australia',
  'bora-bora':'French Polynesia', 'great-barrier-reef':'Australia', fiji:'Fiji',
  antarctica:'Antarctica'
};

// ============================================================
// Test Suite 1: extractCountry — Exact country name match
// ============================================================
console.log('\n📋 Suite 1: extractCountry — Exact country name match');
assertEqual(extractCountry('Nigeria'), 'Nigeria', '"Nigeria" → Nigeria');
assertEqual(extractCountry('Italy'), 'Italy', '"Italy" → Italy');
assertEqual(extractCountry('spain'), 'Spain', '"spain" (lowercase) → Spain (regex is case-insensitive)');
assertEqual(extractCountry('Spain'), 'Spain', '"Spain" → Spain');

// ============================================================
// Test Suite 2: extractCountry — Comma-separated format
// ============================================================
console.log('\n📋 Suite 2: extractCountry — Comma-separated "City, Country"');
assertEqual(extractCountry('Kano, Nigeria'), 'Nigeria', '"Kano, Nigeria" → Nigeria');
assertEqual(extractCountry('Lagos, Nigeria'), 'Nigeria', '"Lagos, Nigeria" → Nigeria');
assertEqual(extractCountry('Paris, France'), 'France', '"Paris, France" → France');
assertEqual(extractCountry('New York, United States'), 'United States', '"New York, United States" → United States');

// ============================================================
// Test Suite 3: extractCountry — City-to-country mapping
// ============================================================
console.log('\n📋 Suite 3: extractCountry — City-to-country mapping');
assertEqual(extractCountry('Kano'), 'Nigeria', '"Kano" → Nigeria');
assertEqual(extractCountry('Abuja'), 'Nigeria', '"Abuja" → Nigeria');
assertEqual(extractCountry('Lagos'), 'Nigeria', '"Lagos" → Nigeria');
assertEqual(extractCountry('Mumbai'), 'India', '"Mumbai" → India');
assertEqual(extractCountry('Milan'), 'Italy', '"Milan" → Italy');
assertEqual(extractCountry('Toronto'), 'Canada', '"Toronto" → Canada');
assertEqual(extractCountry('Dubai'), 'UAE', '"Dubai" → UAE');

// ============================================================
// Test Suite 4: extractCountry — Destination title matching
// ============================================================
console.log('\n📋 Suite 4: extractCountry — Destination title matching');
assertEqual(extractCountry('Amalfi Poetry'), 'Italy', '"Amalfi Poetry" → Italy');
assertEqual(extractCountry('Bali Temple'), 'Indonesia', '"Bali Temple" → Indonesia');
assertEqual(extractCountry('Kyoto'), 'Japan', '"Kyoto" → Japan');
assertEqual(extractCountry('Barcelona Vibe'), 'Spain', '"Barcelona Vibe" → Spain');

// ============================================================
// Test Suite 5: extractCountry — Word-boundary regex & false positives
// ============================================================
console.log('\n📋 Suite 5: extractCountry — Word-boundary and false positives');
// "Port of Spain, Trinidad and Tobago" - comma check finds Trinidad and Tobago first
assertEqual(extractCountry('Port of Spain, Trinidad and Tobago'), 'Trinidad and Tobago',
  '"Port of Spain, Trinidad and Tobago" → Trinidad and Tobago (via comma check)');
// "Spain" alone anywhere → matches Spain via word-boundary regex
assertEqual(extractCountry('I live in Spain'), 'Spain', '"I live in Spain" → Spain (word-boundary regex)');
assertEqual(extractCountry('Visit Spain in summer'), 'Spain', '"Visit Spain in summer" → Spain');

// ============================================================
// Test Suite 6: extractCountry — Null/edge cases
// ============================================================
console.log('\n📋 Suite 6: extractCountry — Edge cases');
assert(extractCountry('') === null, 'Empty string returns null');
assert(extractCountry(null) === null, 'Null returns null');
assert(extractCountry('   ') === null, 'Whitespace-only returns null');
assert(extractCountry('Atlantis') === null, 'Unknown location returns null');

// ============================================================
// Test Suite 7: srExtractCountry (search-results version)
// ============================================================
console.log('\n📋 Suite 7: srExtractCountry — Search results version');
assertEqual(srExtractCountry('Italy'), 'Italy', '"Italy" → Italy');
assertEqual(srExtractCountry('Kano, Nigeria'), 'Nigeria', '"Kano, Nigeria" → Nigeria');
assertEqual(srExtractCountry('Kano'), 'Nigeria', '"Kano" via city map → Nigeria');
assertEqual(srExtractCountry('amalfi poetry'), 'Italy', '"amalfi poetry" via dest map → Italy');
assertEqual(srExtractCountry('bali'), 'Indonesia', '"bali" → Indonesia');

// ============================================================
// Test Suite 8: DEST_COUNTRIES lookup (destination page)
// ============================================================
console.log('\n📋 Suite 8: DEST_COUNTRIES — Destination page country lookup');
assertEqual(DEST_COUNTRIES['amalfi'], 'Italy', 'amalfi → Italy');
assertEqual(DEST_COUNTRIES['bali'], 'Indonesia', 'bali → Indonesia');
assertEqual(DEST_COUNTRIES['kyoto'], 'Japan', 'kyoto → Japan');
assertEqual(DEST_COUNTRIES['barcelona'], 'Spain', 'barcelona → Spain');
assertEqual(DEST_COUNTRIES['cancun'], 'Mexico', 'cancun → Mexico');
assertEqual(DEST_COUNTRIES['tokyo'], 'Japan', 'tokyo → Japan');
assertEqual(DEST_COUNTRIES['dubai'], 'UAE', 'dubai → UAE');
assertEqual(DEST_COUNTRIES['new-york'], 'United States', 'new-york → United States');
assertEqual(DEST_COUNTRIES['rio-de-janeiro'], 'Brazil', 'rio-de-janeiro → Brazil');
assertEqual(DEST_COUNTRIES['antarctica'], 'Antarctica', 'antarctica → Antarctica');

const allDestKeys = Object.keys(DEST_COUNTRIES);
assert(allDestKeys.length >= 50, 'DEST_COUNTRIES has at least 50 destinations');

// ============================================================
// Test Suite 9: Domestic vs International classification
// ============================================================
console.log('\n📋 Suite 9: Domestic vs International classification');

function classifyTrip(fromStr, toStr) {
  var fromC = extractCountry(fromStr);
  var toC = extractCountry(toStr);
  if (fromC && toC && fromC.toLowerCase() === toC.toLowerCase()) return 'domestic';
  if (fromC && toC && fromC.toLowerCase() !== toC.toLowerCase()) return 'international';
  return 'unknown';
}

assertEqual(classifyTrip('Kano', 'Abuja'), 'domestic', 'Kano→Abuja (both Nigeria) → domestic');
assertEqual(classifyTrip('Lagos', 'New York'), 'international', 'Lagos→New York → international');
assertEqual(classifyTrip('Barcelona', 'Madrid'), 'domestic', 'Barcelona→Madrid (both Spain) → domestic');
assertEqual(classifyTrip('Milan', 'Rome'), 'domestic', 'Milan→Rome (both Italy) → domestic');
assertEqual(classifyTrip('New York', 'London'), 'international', 'New York→London → international');
assertEqual(classifyTrip('Tokyo', 'Osaka'), 'domestic', 'Tokyo→Osaka (both Japan) → domestic');
assertEqual(classifyTrip('', 'Spain'), 'unknown', 'Empty from → unknown');
assertEqual(classifyTrip('France', ''), 'unknown', 'Empty to → unknown');

// ============================================================
// Test Suite 10: Profile country fallback
// ============================================================
console.log('\n📋 Suite 10: Profile country fallback');

function classifyWithFallback(fromStr, toStr, profileCountry) {
  if (!fromStr && profileCountry) fromStr = profileCountry;
  return classifyTrip(fromStr, toStr);
}
assertEqual(classifyWithFallback('', 'Lagos', 'Nigeria'), 'domestic', 'Empty from + profile Nigeria → domestic');
assertEqual(classifyWithFallback('', 'Paris', 'Nigeria'), 'international', 'Empty from + profile Nigeria → international');
assertEqual(classifyWithFallback('', '', 'Nigeria'), 'unknown', 'Empty both + profile → unknown');

// ============================================================
// Summary
// ============================================================
console.log('\n' + '='.repeat(50));
const total = passed + failed;
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed! ✅');
}

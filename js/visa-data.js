/* ============================================
   NextGen Travel — Visa Requirements Dataset
   Preview / demo dataset. Always verify with
   official embassy sources before travel.
   ============================================ */

const VISA_INFO = {
  // Visa type constants
  VISA_FREE: { label: 'Visa-Free', badge: 'bg-success', desc: 'No visa required' },
  VISA_ON_ARRIVAL: { label: 'Visa on Arrival', badge: 'bg-info', desc: 'Obtain visa upon arrival' },
  E_VISA: { label: 'E-Visa', badge: 'bg-primary', desc: 'Apply online before travel' },
  VISA_REQUIRED: { label: 'Visa Required', badge: 'bg-danger', desc: 'Apply at embassy in advance' },
  ETA: { label: 'ETA', badge: 'bg-secondary', desc: 'Electronic Travel Authorization required' },
};

// Key: "nationalityCountry_lower:destinationCountry_lower"
const VISA_REQUIREMENTS = {};

function setVisa(nationality, dest, type, duration, notes) {
  const key = nationality.toLowerCase() + ':' + dest.toLowerCase();
  VISA_REQUIREMENTS[key] = { type, duration: duration || null, notes: notes || null };
}

// ============ UNITED STATES ============
setVisa('United States', 'Italy', 'VISA_FREE', '90 days', 'Schengen area — 90 days within 180-day window');
setVisa('United States', 'Japan', 'VISA_FREE', '90 days', 'Tourist visa exemption');
setVisa('United States', 'Maldives', 'VISA_FREE', '30 days', 'Free visa on arrival');
setVisa('United States', 'France', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Switzerland', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Greece', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Iceland', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Morocco', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Canada', 'VISA_FREE', '180 days', null);
setVisa('United States', 'Argentina', 'VISA_FREE', '90 days', null);
setVisa('United States', 'New Zealand', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Indonesia', 'VISA_FREE', '30 days', null);
setVisa('United States', 'Spain', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Mexico', 'VISA_FREE', '180 days', null);
setVisa('United States', 'Costa Rica', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Norway', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Portugal', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'South Africa', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Tanzania', 'VISA_ON_ARRIVAL', '90 days', '$50 USD visa on arrival');
setVisa('United States', 'Kenya', 'ETA', '90 days', 'ETA required — $30 USD');
setVisa('United States', 'Egypt', 'VISA_ON_ARRIVAL', '30 days', '$25 USD visa on arrival');
setVisa('United States', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('United States', 'India', 'E_VISA', '60 days', 'E-Visa available — $10–$100 USD');
setVisa('United States', 'Brazil', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Peru', 'VISA_FREE', '183 days', null);
setVisa('United States', 'Chile', 'VISA_FREE', '90 days', null);
setVisa('United States', 'UAE', 'VISA_FREE', '30 days', null);
setVisa('United States', 'Seychelles', 'VISA_FREE', '90 days', 'Visitor permit on arrival');
setVisa('United States', 'Mauritius', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Fiji', 'VISA_FREE', '120 days', null);
setVisa('United States', 'French Polynesia', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Nepal', 'VISA_ON_ARRIVAL', '90 days', 'Visa on arrival at airport');
setVisa('United States', 'Mozambique', 'VISA_ON_ARRIVAL', '30 days', null);
setVisa('United States', 'Sri Lanka', 'ETA', '60 days', 'ETA required — $20 USD');
setVisa('United States', 'Singapore', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Malaysia', 'VISA_FREE', '90 days', null);
setVisa('United States', 'Turkey', 'E_VISA', '90 days', 'E-Visa — $50 USD');
setVisa('United States', 'Netherlands', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United States', 'Antarctica', 'VISA_REQUIRED', null, 'Special permit required via tour operator');

// ============ UNITED KINGDOM ============
setVisa('United Kingdom', 'Italy', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Japan', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'Maldives', 'VISA_FREE', '30 days', 'Free visa on arrival');
setVisa('United Kingdom', 'France', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Switzerland', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Greece', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Iceland', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Morocco', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'Canada', 'VISA_FREE', '180 days', 'ETA required for air travel');
setVisa('United Kingdom', 'Argentina', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'New Zealand', 'VISA_FREE', '180 days', null);
setVisa('United Kingdom', 'Indonesia', 'VISA_FREE', '30 days', null);
setVisa('United Kingdom', 'Spain', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Mexico', 'VISA_FREE', '180 days', null);
setVisa('United Kingdom', 'India', 'E_VISA', '60 days', 'E-Visa available');
setVisa('United Kingdom', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('United Kingdom', 'South Africa', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'Kenya', 'ETA', '90 days', 'ETA required');
setVisa('United Kingdom', 'Egypt', 'VISA_ON_ARRIVAL', '30 days', '$25 USD');
setVisa('United Kingdom', 'Tanzania', 'VISA_ON_ARRIVAL', '90 days', '$50 USD');
setVisa('United Kingdom', 'UAE', 'VISA_FREE', '30 days', null);
setVisa('United Kingdom', 'Turkey', 'E_VISA', '90 days', 'E-Visa available');
setVisa('United Kingdom', 'Brazil', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'Sri Lanka', 'ETA', '60 days', 'ETA required');
setVisa('United Kingdom', 'Nepal', 'VISA_ON_ARRIVAL', '90 days', null);
setVisa('United Kingdom', 'Australia', 'ETA', '90 days', 'ETA required');
setVisa('United Kingdom', 'Norway', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Singapore', 'VISA_FREE', '90 days', null);
setVisa('United Kingdom', 'Portugal', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('United Kingdom', 'Netherlands', 'VISA_FREE', '90 days', 'Schengen area');

// ============ INDIA ============
setVisa('India', 'Italy', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('India', 'Japan', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Maldives', 'VISA_FREE', '90 days', null);
setVisa('India', 'France', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('India', 'Switzerland', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('India', 'Greece', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('India', 'Iceland', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('India', 'Morocco', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Indonesia', 'VISA_FREE', '30 days', null);
setVisa('India', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('India', 'Nepal', 'VISA_FREE', null, 'Open border — no visa required');
setVisa('India', 'Sri Lanka', 'ETA', '60 days', 'ETA required');
setVisa('India', 'Maldives', 'VISA_FREE', '90 days', null);
setVisa('India', 'Kenya', 'ETA', '90 days', 'ETA required');
setVisa('India', 'Egypt', 'VISA_ON_ARRIVAL', '30 days', '$25 USD');
setVisa('India', 'UAE', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Singapore', 'VISA_FREE', '30 days', null);
setVisa('India', 'Malaysia', 'VISA_FREE', '30 days', null);
setVisa('India', 'Mauritius', 'VISA_FREE', '90 days', null);
setVisa('India', 'Seychelles', 'VISA_FREE', '90 days', 'Visitor permit on arrival');
setVisa('India', 'South Africa', 'E_VISA', null, 'E-Visa available');
setVisa('India', 'Tanzania', 'VISA_ON_ARRIVAL', '90 days', '$50 USD');
setVisa('India', 'Brazil', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Turkey', 'E_VISA', '30 days', 'E-Visa available');
setVisa('India', 'Canada', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Australia', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'New Zealand', 'VISA_REQUIRED', null, 'Visa required');
setVisa('India', 'Spain', 'VISA_REQUIRED', '90 days', 'Schengen visa required');

// ============ NIGERIA ============
setVisa('Nigeria', 'Italy', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('Nigeria', 'Japan', 'VISA_REQUIRED', null, 'Visa required');
setVisa('Nigeria', 'Maldives', 'VISA_ON_ARRIVAL', '30 days', 'Free visa on arrival');
setVisa('Nigeria', 'France', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('Nigeria', 'Switzerland', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('Nigeria', 'Greece', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('Nigeria', 'Iceland', 'VISA_REQUIRED', '90 days', 'Schengen visa required');
setVisa('Nigeria', 'Morocco', 'VISA_FREE', '90 days', null);
setVisa('Nigeria', 'Canada', 'VISA_REQUIRED', null, 'Visa required');
setVisa('Nigeria', 'Kenya', 'ETA', '90 days', 'ETA required');
setVisa('Nigeria', 'Ghana', 'VISA_FREE', '90 days', 'ECOWAS member');
setVisa('Nigeria', 'South Africa', 'VISA_FREE', '90 days', null);
setVisa('Nigeria', 'India', 'E_VISA', '60 days', 'E-Visa available');
setVisa('Nigeria', 'Egypt', 'VISA_ON_ARRIVAL', '30 days', '$25 USD');
setVisa('Nigeria', 'UAE', 'VISA_REQUIRED', null, 'Visa required');
setVisa('Nigeria', 'Indonesia', 'VISA_FREE', '30 days', null);
setVisa('Nigeria', 'Thailand', 'VISA_ON_ARRIVAL', '15 days', 'Visa on arrival $60 USD');
setVisa('Nigeria', 'Turkey', 'E_VISA', '30 days', 'E-Visa available');
setVisa('Nigeria', 'Tanzania', 'VISA_ON_ARRIVAL', '90 days', '$50 USD');
setVisa('Nigeria', 'Brazil', 'VISA_REQUIRED', null, 'Visa required');
setVisa('Nigeria', 'Spain', 'VISA_REQUIRED', '90 days', 'Schengen visa required');

// ============ CANADA ============
setVisa('Canada', 'Italy', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('Canada', 'Japan', 'VISA_FREE', '90 days', null);
setVisa('Canada', 'Maldives', 'VISA_FREE', '30 days', 'Free visa on arrival');
setVisa('Canada', 'India', 'E_VISA', '60 days', 'E-Visa available');
setVisa('Canada', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('Canada', 'Mexico', 'VISA_FREE', '180 days', null);
setVisa('Canada', 'Costa Rica', 'VISA_FREE', '90 days', null);
setVisa('Canada', 'Kenya', 'ETA', '90 days', 'ETA required');
setVisa('Canada', 'South Africa', 'VISA_FREE', '90 days', null);
setVisa('Canada', 'UAE', 'VISA_FREE', '30 days', null);
setVisa('Canada', 'Turkey', 'E_VISA', '90 days', 'E-Visa available');
setVisa('Canada', 'Brazil', 'VISA_FREE', '90 days', null);
setVisa('Canada', 'Argentina', 'VISA_FREE', '90 days', null);
setVisa('Canada', 'Australia', 'ETA', '90 days', 'ETA required');

// ============ AUSTRALIA ============
setVisa('Australia', 'Italy', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('Australia', 'Japan', 'VISA_FREE', '90 days', null);
setVisa('Australia', 'Maldives', 'VISA_FREE', '30 days', 'Free visa on arrival');
setVisa('Australia', 'India', 'E_VISA', '60 days', 'E-Visa available');
setVisa('Australia', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('Australia', 'Indonesia', 'VISA_FREE', '30 days', null);
setVisa('Australia', 'UAE', 'VISA_FREE', '30 days', null);
setVisa('Australia', 'Kenya', 'ETA', '90 days', 'ETA required');
setVisa('Australia', 'Turkey', 'E_VISA', '90 days', 'E-Visa available');
setVisa('Australia', 'New Zealand', 'VISA_FREE', '90 days', 'Special Category Visa on arrival');
setVisa('Australia', 'South Africa', 'VISA_FREE', '90 days', null);
setVisa('Australia', 'Singapore', 'VISA_FREE', '90 days', null);
setVisa('Australia', 'United States', 'VISA_FREE', '90 days', 'ESTA required');

// ============ SOUTH AFRICA ============
setVisa('South Africa', 'Italy', 'VISA_FREE', '90 days', 'Schengen area');
setVisa('South Africa', 'Japan', 'VISA_FREE', '90 days', null);
setVisa('South Africa', 'Maldives', 'VISA_FREE', '30 days', 'Free visa on arrival');
setVisa('South Africa', 'Kenya', 'VISA_FREE', '90 days', null);
setVisa('South Africa', 'India', 'E_VISA', '60 days', 'E-Visa available');
setVisa('South Africa', 'Thailand', 'VISA_FREE', '60 days', null);
setVisa('South Africa', 'Egypt', 'VISA_ON_ARRIVAL', '30 days', '$25 USD');
setVisa('South Africa', 'Turkey', 'E_VISA', '90 days', 'E-Visa available');
setVisa('South Africa', 'Brazil', 'VISA_FREE', '90 days', null);
setVisa('South Africa', 'Singapore', 'VISA_FREE', '30 days', null);
setVisa('South Africa', 'UAE', 'VISA_FREE', '30 days', null);

// ============ DOMESTIC (same country) ============
['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Nigeria',
 'South Africa', 'Italy', 'France', 'Spain', 'Germany', 'Japan', 'Brazil',
 'Mexico', 'Argentina', 'China', 'Kenya', 'Ghana', 'Thailand', 'Indonesia',
 'New Zealand', 'Norway', 'Switzerland', 'Netherlands', 'Portugal', 'Greece',
 'Turkey', 'Egypt', 'Morocco', 'Chile', 'Peru', 'Costa Rica', 'Iceland',
 'UAE', 'Singapore', 'Malaysia', 'Mauritius', 'Fiji', 'Maldives'].forEach(c => {
  setVisa(c, c, 'VISA_FREE', null, 'Domestic travel — no visa required');
});

function checkVisa(nationality, destination) {
  if (!nationality || !destination) return null;
  const key = nationality.toLowerCase() + ':' + destination.toLowerCase();
  let result = VISA_REQUIREMENTS[key];
  if (result) return { from: nationality, to: destination, ...result };

  // Try reverse lookup for edge cases
  const revKey = destination.toLowerCase() + ':' + nationality.toLowerCase();
  result = VISA_REQUIREMENTS[revKey];
  if (result) return { from: nationality, to: destination, ...result };

  return null;
}

function getVisaTypeInfo(typeKey) {
  return VISA_INFO[typeKey] || { label: 'Unknown', badge: 'bg-secondary', desc: 'Check with embassy' };
}

function getTypeColor(type) {
  var colors = {
    VISA_FREE: '#16a34a',
    VISA_ON_ARRIVAL: '#0891b2',
    E_VISA: '#2563eb',
    VISA_REQUIRED: '#dc2626',
    ETA: '#6b7280'
  };
  return colors[type] || '#6b7280';
}

function getVisaFeeByType(type) {
  var fees = {
    VISA_FREE: 30,
    VISA_ON_ARRIVAL: 75,
    E_VISA: 100,
    VISA_REQUIRED: 150,
    ETA: 60
  };
  return fees[type] || 0;
}

var VISA_REGIONS = {
  'United States': 'north-america', 'Canada': 'north-america', 'Mexico': 'north-america', 'Costa Rica': 'north-america',
  'Brazil': 'south-america', 'Argentina': 'south-america', 'Chile': 'south-america', 'Peru': 'south-america',
  'United Kingdom': 'europe', 'Italy': 'europe', 'France': 'europe', 'Spain': 'europe', 'Germany': 'europe',
  'Switzerland': 'europe', 'Netherlands': 'europe', 'Portugal': 'europe', 'Greece': 'europe', 'Iceland': 'europe', 'Norway': 'europe',
  'Nigeria': 'africa', 'South Africa': 'africa', 'Kenya': 'africa', 'Ghana': 'africa', 'Egypt': 'africa',
  'Morocco': 'africa', 'Mauritius': 'africa', 'Seychelles': 'africa', 'Tanzania': 'africa', 'Mozambique': 'africa',
  'India': 'asia', 'Japan': 'asia', 'China': 'asia', 'Thailand': 'asia', 'Indonesia': 'asia', 'Singapore': 'asia',
  'Malaysia': 'asia', 'Maldives': 'asia', 'Nepal': 'asia', 'Sri Lanka': 'asia',
  'UAE': 'middle-east', 'Turkey': 'middle-east',
  'Australia': 'oceania', 'New Zealand': 'oceania', 'Fiji': 'oceania', 'French Polynesia': 'oceania',
  'Antarctica': 'antarctica'
};

function getNearbyVisaDestinations(nationality, destination) {
  var region = VISA_REGIONS[destination] || '';
  var results = [];
  var prefix = (nationality || '').toLowerCase() + ':';
  for (var key in VISA_REQUIREMENTS) {
    if (!key.startsWith(prefix)) continue;
    var destName = key.substring(prefix.length);
    var proper = destName.charAt(0).toUpperCase() + destName.slice(1);
    if (proper.toLowerCase() === (destination || '').toLowerCase()) continue;
    if (region && VISA_REGIONS[proper] === region) results.push(proper);
  }
  return results.sort();
}

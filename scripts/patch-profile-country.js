const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

let changes = 0;

// 1. Add country field after emergency contact fields
const LINE = '\r\n';
const SP = '                                ';

const emergMarker = [
  '<input type="text" id="profile-emergency-name" class="form-control border-white border-opacity-25 bg-transparent text-white rounded-0" placeholder="Contact person">',
  SP + '</div>',
  '',
  SP + '<!-- Global Preferences -->'
].join(LINE);

const countryField = [
  '<input type="text" id="profile-emergency-name" class="form-control border-white border-opacity-25 bg-transparent text-white rounded-0" placeholder="Contact person">',
  SP + '</div>',
  SP + '<div class="row g-3 mb-3">',
  SP + '    <div class="col-md-12">',
  SP + '        <label class="extra-small tracking-widest mb-2 opacity-50">Your Country</label>',
  SP + '        <input type="text" id="profile-country" class="form-control border-white border-opacity-25 bg-transparent text-white rounded-0" list="global-countries" placeholder="e.g. United States, Nigeria, Japan">',
  SP + '    </div>',
  SP + '</div>',
  '',
  SP + '<!-- Global Preferences -->'
].join(LINE);

if (html.includes(emergMarker)) {
  html = html.replace(emergMarker, countryField);
  console.log('✓ Country field added');
  changes++;
} else {
  console.log('✗ Country field: FAILED - marker not found');
  // Debug: show what's around that area
  const idx = html.indexOf('profile-emergency-name');
  if (idx > -1) {
    console.log('  Found profile-emergency-name at', idx);
    console.log('  Context:', JSON.stringify(html.substring(idx, idx + 250)));
  }
}

// 2. Add global-countries datalist after airport-list
const airportClose = '</datalist>\n\n            <!-- Pill Tabs -->';
const datalistHtml = '</datalist>\n\n            <datalist id="global-countries"></datalist>\n\n            <!-- Pill Tabs -->';

if (html.includes(airportClose)) {
  html = html.replace(airportClose, datalistHtml);
  console.log('✓ Datalist added');
  changes++;
} else {
  console.log('✗ Datalist: FAILED - marker not found');
  // Try with \r\n
  const altMarker = '</datalist>\r\n\r\n            <!-- Pill Tabs -->';
  const altReplace = '</datalist>\r\n\r\n            <datalist id="global-countries"></datalist>\r\n\r\n            <!-- Pill Tabs -->';
  if (html.includes(altMarker)) {
    html = html.replace(altMarker, altReplace);
    console.log('✓ Datalist added (with \\r\\n)');
    changes++;
  } else {
    console.log('  Airport list not found at expected location');
    const idx2 = html.indexOf('airport-list');
    if (idx2 > -1) {
      console.log('  Found airport-list at', idx2);
      console.log('  Context:', JSON.stringify(html.substring(idx2 - 50, idx2 + 200)));
    }
  }
}

// 3. Add population script after main.js
const scriptMarker = '<script src="js/main.js"></script>';
const popScript = [
  '<script src="js/main.js"></script>',
  '    <script>',
  '    document.addEventListener("DOMContentLoaded", function() {',
  '      var dl = document.getElementById("global-countries");',
  '      if (dl) {',
  '        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")',
  '          .then(function(r) { return r.json(); })',
  '          .then(function(data) {',
  '            var names = data.map(function(c) { return c.name.common; });',
  '            names.sort();',
  '            names.forEach(function(n) {',
  '              var opt = document.createElement("option");',
  '              opt.value = n;',
  '              dl.appendChild(opt);',
  '            });',
  '          })',
  '          .catch(function() { /* silently ignore */ });',
  '      }',
  '    });',
  '    </script>'
].join('\n');

if (html.includes(scriptMarker)) {
  html = html.replace(scriptMarker, popScript);
  console.log('✓ Population script added');
  changes++;
} else {
  console.log('✗ Population script: FAILED - marker not found');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('\n' + changes + '/3 changes applied');

/**
 * Mock Flight Generator
 * Produces realistic Duffel-shaped flight offers so the flight search
 * path feels complete even without a live Duffel API token.
 * Offers are shaped to pass through DuffelAPI.formatOfferForDisplay()
 * unchanged — search-results.html and checkout.html need no special cases.
 */

const MockFlights = (() => {
    // [code, city, country]
    const AIRPORTS = [
        ['LOS', 'Lagos', 'Nigeria'], ['ABV', 'Abuja', 'Nigeria'], ['PHC', 'Port Harcourt', 'Nigeria'],
        ['CPT', 'Cape Town', 'South Africa'], ['JNB', 'Johannesburg', 'South Africa'], ['DUR', 'Durban', 'South Africa'],
        ['NBO', 'Nairobi', 'Kenya'], ['MBA', 'Mombasa', 'Kenya'], ['EBB', 'Kampala', 'Uganda'], ['KGL', 'Kigali', 'Rwanda'],
        ['ACC', 'Accra', 'Ghana'], ['CMN', 'Casablanca', 'Morocco'], ['CAI', 'Cairo', 'Egypt'], ['TUN', 'Tunis', 'Tunisia'],
        ['ADD', 'Addis Ababa', 'Ethiopia'], ['DAR', 'Dar es Salaam', 'Tanzania'], ['LAD', 'Luanda', 'Angola'],
        ['MPM', 'Maputo', 'Mozambique'], ['HRE', 'Harare', 'Zimbabwe'], ['LUN', 'Lusaka', 'Zambia'],
        ['LHR', 'London', 'United Kingdom'], ['LGW', 'London', 'United Kingdom'], ['MAN', 'Manchester', 'United Kingdom'],
        ['EDI', 'Edinburgh', 'United Kingdom'], ['CDG', 'Paris', 'France'], ['NCE', 'Nice', 'France'],
        ['FRA', 'Frankfurt', 'Germany'], ['MUC', 'Munich', 'Germany'], ['BER', 'Berlin', 'Germany'], ['HAM', 'Hamburg', 'Germany'],
        ['AMS', 'Amsterdam', 'Netherlands'], ['BRU', 'Brussels', 'Belgium'], ['ZRH', 'Zurich', 'Switzerland'], ['GVA', 'Geneva', 'Switzerland'],
        ['VIE', 'Vienna', 'Austria'], ['PRG', 'Prague', 'Czech Republic'], ['BUD', 'Budapest', 'Hungary'], ['WAW', 'Warsaw', 'Poland'],
        ['MAD', 'Madrid', 'Spain'], ['BCN', 'Barcelona', 'Spain'], ['SVQ', 'Seville', 'Spain'],
        ['FCO', 'Rome', 'Italy'], ['VCE', 'Venice', 'Italy'], ['FLR', 'Florence', 'Italy'],
        ['ATH', 'Athens', 'Greece'], ['LIS', 'Lisbon', 'Portugal'], ['DUB', 'Dublin', 'Ireland'],
        ['ARN', 'Stockholm', 'Sweden'], ['CPH', 'Copenhagen', 'Denmark'], ['OSL', 'Oslo', 'Norway'],
        ['HEL', 'Helsinki', 'Finland'], ['KEF', 'Reykjavik', 'Iceland'], ['SVO', 'Moscow', 'Russia'], ['LED', 'Saint Petersburg', 'Russia'],
        ['IST', 'Istanbul', 'Turkey'], ['AYT', 'Antalya', 'Turkey'], ['TLV', 'Tel Aviv', 'Israel'],
        ['JFK', 'New York', 'United States'], ['EWR', 'New York', 'United States'], ['LAX', 'Los Angeles', 'United States'],
        ['SFO', 'San Francisco', 'United States'], ['MIA', 'Miami', 'United States'], ['ORD', 'Chicago', 'United States'],
        ['ATL', 'Atlanta', 'United States'], ['BOS', 'Boston', 'United States'], ['DFW', 'Dallas', 'United States'],
        ['IAD', 'Washington', 'United States'], ['SEA', 'Seattle', 'United States'], ['YYZ', 'Toronto', 'Canada'],
        ['YVR', 'Vancouver', 'Canada'], ['YUL', 'Montreal', 'Canada'], ['MEX', 'Mexico City', 'Mexico'], ['CUN', 'Cancun', 'Mexico'],
        ['GIG', 'Rio de Janeiro', 'Brazil'], ['GRU', 'Sao Paulo', 'Brazil'], ['EZE', 'Buenos Aires', 'Argentina'],
        ['SCL', 'Santiago', 'Chile'], ['LIM', 'Lima', 'Peru'], ['CUZ', 'Cusco', 'Peru'],
        ['BOG', 'Bogota', 'Colombia'], ['UIO', 'Quito', 'Ecuador'], ['MVD', 'Montevideo', 'Uruguay'],
        ['PTY', 'Panama City', 'Panama'], ['SJO', 'San Jose', 'Costa Rica'], ['NAS', 'Nassau', 'Bahamas'],
        ['KIN', 'Kingston', 'Jamaica'], ['POS', 'Port of Spain', 'Trinidad'], ['SDQ', 'Santo Domingo', 'Dominican Republic'],
        ['DXB', 'Dubai', 'UAE'], ['AUH', 'Abu Dhabi', 'UAE'], ['DOH', 'Doha', 'Qatar'],
        ['KWI', 'Kuwait City', 'Kuwait'], ['MCT', 'Muscat', 'Oman'], ['BAH', 'Bahrain', 'Bahrain'],
        ['RUH', 'Riyadh', 'Saudi Arabia'], ['JED', 'Jeddah', 'Saudi Arabia'], ['AMM', 'Amman', 'Jordan'], ['BEY', 'Beirut', 'Lebanon'],
        ['DEL', 'Delhi', 'India'], ['BOM', 'Mumbai', 'India'], ['BLR', 'Bangalore', 'India'],
        ['MAA', 'Chennai', 'India'], ['CCU', 'Kolkata', 'India'], ['HYD', 'Hyderabad', 'India'], ['GOI', 'Goa', 'India'],
        ['KTM', 'Kathmandu', 'Nepal'], ['DAC', 'Dhaka', 'Bangladesh'], ['CMB', 'Colombo', 'Sri Lanka'],
        ['NRT', 'Tokyo', 'Japan'], ['KIX', 'Osaka', 'Japan'], ['ICN', 'Seoul', 'South Korea'],
        ['HKG', 'Hong Kong', 'China'], ['PVG', 'Shanghai', 'China'], ['PEK', 'Beijing', 'China'], ['CAN', 'Guangzhou', 'China'],
        ['TPE', 'Taipei', 'Taiwan'], ['SIN', 'Singapore', 'Singapore'], ['KUL', 'Kuala Lumpur', 'Malaysia'],
        ['CGK', 'Jakarta', 'Indonesia'], ['DPS', 'Bali', 'Indonesia'], ['BKK', 'Bangkok', 'Thailand'],
        ['HKT', 'Phuket', 'Thailand'], ['MNL', 'Manila', 'Philippines'], ['SGN', 'Ho Chi Minh City', 'Vietnam'], ['HAN', 'Hanoi', 'Vietnam'],
        ['SYD', 'Sydney', 'Australia'], ['MEL', 'Melbourne', 'Australia'], ['CNS', 'Cairns', 'Australia'],
        ['AKL', 'Auckland', 'New Zealand'], ['NAN', 'Nadi', 'Fiji']
    ];

    const AIRLINES = [
        { name: 'Emirates', iata: 'EK' },
        { name: 'Qatar Airways', iata: 'QR' },
        { name: 'British Airways', iata: 'BA' },
        { name: 'Air France', iata: 'AF' },
        { name: 'KLM', iata: 'KL' },
        { name: 'Lufthansa', iata: 'LH' },
        { name: 'Singapore Airlines', iata: 'SQ' },
        { name: 'Turkish Airlines', iata: 'TK' },
        { name: 'Delta Air Lines', iata: 'DL' },
        { name: 'United Airlines', iata: 'UA' },
        { name: 'American Airlines', iata: 'AA' },
        { name: 'Air Canada', iata: 'AC' },
        { name: 'Qantas', iata: 'QF' },
        { name: 'Ethiopian Airlines', iata: 'ET' },
        { name: 'South African Airways', iata: 'SA' },
        { name: 'Air India', iata: 'AI' },
        { name: 'Etihad Airways', iata: 'EY' },
        { name: 'Finnair', iata: 'AY' },
        { name: 'Iberia', iata: 'IB' },
        { name: 'ITA Airways', iata: 'AZ' },
        { name: 'Swiss International', iata: 'LX' },
        { name: 'Austrian Airlines', iata: 'OS' },
        { name: 'SAS', iata: 'SK' },
        { name: 'TAP Air Portugal', iata: 'TP' },
        { name: 'Aer Lingus', iata: 'EI' },
        { name: 'Brussels Airlines', iata: 'SN' },
        { name: 'LOT Polish Airlines', iata: 'LO' },
        { name: 'Icelandair', iata: 'FI' },
        { name: 'Royal Air Maroc', iata: 'AT' },
        { name: 'EgyptAir', iata: 'MS' },
        { name: 'Royal Jordanian', iata: 'RJ' },
        { name: 'Saudia', iata: 'SV' },
        { name: 'Gulf Air', iata: 'GF' },
        { name: 'Kuwait Airways', iata: 'KU' },
        { name: 'Middle East Airlines', iata: 'ME' },
        { name: 'Oman Air', iata: 'WY' },
        { name: 'Korean Air', iata: 'KE' },
        { name: 'Asiana Airlines', iata: 'OZ' },
        { name: 'ANA', iata: 'NH' },
        { name: 'Japan Airlines', iata: 'JL' },
        { name: 'Cathay Pacific', iata: 'CX' },
        { name: 'Malaysia Airlines', iata: 'MH' },
        { name: 'Thai Airways', iata: 'TG' },
        { name: 'Vietnam Airlines', iata: 'VN' },
        { name: 'Garuda Indonesia', iata: 'GA' },
        { name: 'Philippine Airlines', iata: 'PR' },
        { name: 'China Airlines', iata: 'CI' },
        { name: 'EVA Air', iata: 'BR' },
        { name: 'Air China', iata: 'CA' },
        { name: 'China Eastern', iata: 'MU' },
        { name: 'China Southern', iata: 'CZ' },
        { name: 'Hainan Airlines', iata: 'HU' },
        { name: 'Xiamen Airlines', iata: 'MF' },
        { name: 'Sichuan Airlines', iata: '3U' },
        { name: 'IndiGo', iata: '6E' },
        { name: 'Vistara', iata: 'UK' },
        { name: 'Air India Express', iata: 'IX' },
        { name: 'Air Astana', iata: 'KC' },
        { name: 'Aeroflot', iata: 'SU' },
        { name: 'flydubai', iata: 'FZ' },
        { name: 'Air Arabia', iata: 'G9' },
        { name: 'Wizz Air', iata: 'W6' },
        { name: 'Ryanair', iata: 'FR' },
        { name: 'easyJet', iata: 'U2' },
        { name: 'Vueling', iata: 'VY' },
        { name: 'JetBlue', iata: 'B6' },
        { name: 'Southwest Airlines', iata: 'WN' },
        { name: 'Alaska Airlines', iata: 'AS' },
        { name: 'Hawaiian Airlines', iata: 'HA' },
        { name: 'Spirit Airlines', iata: 'NK' },
        { name: 'Frontier Airlines', iata: 'F9' },
        { name: 'Virgin Australia', iata: 'VA' },
        { name: 'Air New Zealand', iata: 'NZ' },
        { name: 'Fiji Airways', iata: 'FJ' },
        { name: 'Air Seychelles', iata: 'HM' },
        { name: 'Air Mauritius', iata: 'MK' },
        { name: 'Kenya Airways', iata: 'KQ' },
        { name: 'Aeromexico', iata: 'AM' },
        { name: 'Copa Airlines', iata: 'CM' },
        { name: 'LATAM Airlines', iata: 'LA' },
        { name: 'Avianca', iata: 'AV' },
        { name: 'Aerolineas Argentinas', iata: 'AR' },
        { name: 'Gol', iata: 'G3' },
        { name: 'Azul', iata: 'AD' },
        { name: 'WestJet', iata: 'WS' },
        { name: 'VivaAerobus', iata: 'VB' },
        { name: 'Volaris', iata: 'Y4' },
        { name: 'Condor', iata: 'DE' },
        { name: 'Eurowings', iata: 'EW' },
        { name: 'S7 Airlines', iata: 'S7' },
        { name: 'Cebu Pacific', iata: '5J' },
        { name: 'Scoot', iata: 'TR' },
        { name: 'Thai Lion Air', iata: 'SL' },
        { name: 'Jetstar', iata: 'JQ' },
        { name: 'Jetstar Asia', iata: '3K' },
        { name: 'Air Algerie', iata: 'AH' },
        { name: 'Tunisair', iata: 'TU' },
        { name: 'Jazeera Airways', iata: 'J9' }
    ];

    const HUBS = ['LHR', 'AMS', 'DXB', 'IST', 'CDG', 'FRA', 'DOH'];

    function hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmtTime(d) {
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function iso(d) {
        return d.toISOString().split('.')[0] + '+00:00';
    }

    function isoDate(d) {
        return d.toISOString().split('T')[0];
    }

    function defaultDate(daysFromNow) {
        const d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        return isoDate(d);
    }

    /**
     * Resolve a user-typed location string to an airport.
     * Handles "Lagos (LOS) - Nigeria", "LOS", "New York", "Lagos, Nigeria", "Nigeria".
     */
    function normCountry(c) {
        c = (c || '').toLowerCase();
        const aliases = {
            'uk': 'united kingdom', 'england': 'united kingdom', 'britain': 'united kingdom', 'great britain': 'united kingdom',
            'usa': 'united states', 'us': 'united states', 'america': 'united states', 'u.s.a': 'united states', 'u.s': 'united states',
            'uae': 'united arab emirates', 'u.a.e': 'united arab emirates'
        };
        return aliases[c] || c;
    }

    function resolveAirport(input) {
        const s = (input || '').trim();
        if (!s) return { code: 'AAA', city: 'Unknown', country: '' };

        const paren = s.match(/\(([A-Z]{3})\)/);
        if (paren) {
            const hit = AIRPORTS.find(a => a[0] === paren[1]);
            if (hit) return { code: hit[0], city: hit[1], country: hit[2] };
        }

        if (/^[A-Z]{3}$/.test(s)) {
            const hit = AIRPORTS.find(a => a[0] === s);
            if (hit) return { code: hit[0], city: hit[1], country: hit[2] };
        }

        const tokens = s.split(/[,\/;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
        const cityTok = tokens[0] || '';
        const countryTok = tokens.length > 1 ? tokens[tokens.length - 1] : '';
        const hasCountry = countryTok && countryTok !== cityTok;

        const matchesCity = a => {
            const c = a[1].toLowerCase();
            if (c === cityTok) return true;
            if (cityTok.length >= 3 && c.startsWith(cityTok)) return true;
            if (cityTok.length >= 3) {
                const words = c.split(/[-\s]+/);
                return words.some(w => w.startsWith(cityTok));
            }
            return false;
        };
        const matchesCountry = a => {
            const co = a[2].toLowerCase();
            const nTok = normCountry(countryTok);
            return co === nTok || co.includes(nTok) || (nTok.length > 3 && nTok.includes(co));
        };

        let match;
        if (hasCountry) {
            match = AIRPORTS.find(a => matchesCity(a) && matchesCountry(a));
            if (!match) match = AIRPORTS.find(a => matchesCountry(a));
        } else {
            match = AIRPORTS.find(a => matchesCity(a));
            if (!match) {
                const nTok = normCountry(cityTok);
                match = AIRPORTS.find(a => {
                    const co = a[2].toLowerCase();
                    return co === nTok || co.includes(nTok) || (nTok.length > 3 && nTok.includes(co));
                });
            }
        }
        if (!match) {
            const lower = s.toLowerCase();
            match = AIRPORTS.find(a => a[0].toLowerCase() === lower) ||
                    AIRPORTS.find(a => a[1].toLowerCase() === lower) ||
                    AIRPORTS.find(a => a[2].toLowerCase() === lower);
        }
        if (match) return { code: match[0], city: match[1], country: match[2] };

        const letters = s.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
        return { code: letters.padEnd(3, 'X'), city: s, country: '' };
    }

    function buildSegment(airline, flightNum, from, to, depAt, durMin) {
        const arrAt = new Date(depAt.getTime() + durMin * 60000);
        return {
            operating_carrier: { name: airline.name, iata_code: airline.iata },
            marketing_carrier: { iata_code: airline.iata },
            flight_number: String(flightNum),
            departure: { at: iso(depAt), time: fmtTime(depAt), airport: { iata_code: from.code, city: from.city } },
            arrival: { at: iso(arrAt), time: fmtTime(arrAt), airport: { iata_code: to.code, city: to.city } }
        };
    }

    function buildSlice(from, to, date, depH, durH, durM, stops, airline, seed) {
        const depAt = new Date(`${date}T${pad(depH)}:00:00`);
        const segments = [];
        segments.push(buildSegment(airline, 100 + (seed * 47) % 900, from, to, depAt, durH * 60 + durM));

        if (stops) {
            const layover = 55 + (seed % 3) * 45;
            const conDep = new Date(segments[0].arrival.at ? new Date(segments[0].arrival.at) : depAt);
            const partner = AIRLINES[(AIRLINES.indexOf(airline) + 2 + seed) % AIRLINES.length];
            const hubs = HUBS.filter(h => h !== from.code && h !== to.code);
            const hub = { code: hubs[seed % hubs.length], city: hubs[seed % hubs.length], country: '' };
            const conDepAt = new Date(conDep.getTime() + layover * 60000);
            segments.push(buildSegment(partner, 100 + (seed * 47 + 21) % 900, hub, to, conDepAt, (durH - 1) * 60 + durM));
        }

        return {
            duration: `PT${durH}H${durM > 0 ? durM + 'M' : ''}`,
            segments
        };
    }

    /**
     * Generate mock Duffel-shaped offers for a route.
     * @param {Object} params - { from, to, depart, ret, travelers, cabinClass, trip }
     * @returns {Array} Array of offers compatible with DuffelAPI.formatOfferForDisplay
     */
    function generateOffers(params = {}) {
        const {
            from = '',
            to = '',
            depart = '',
            ret = '',
            cabinClass = 'economy',
            trip = 'roundtrip'
        } = params;

        const origin = resolveAirport(from);
        const dest = resolveAirport(to);
        const outDate = depart || defaultDate(7);
        const retDate = (trip === 'roundtrip' && ret) ? ret : (trip === 'roundtrip' ? defaultDate(12) : null);

        const seed = hash((from + '→' + to).toLowerCase()) || 7;
        const count = 10 + (seed % 7); // 10-16 offers
        const classMult = cabinClass === 'business' ? 2.8 : cabinClass === 'first' ? 4.2 : 1;

        const offers = [];
        for (let i = 0; i < count; i++) {
            const airline = AIRLINES[(seed + i * 3) % AIRLINES.length];
            const stops = (seed + i * 2) % 4 === 0 ? 1 : 0;
            const basePrice = 140 + ((seed * 37 + i * 191) % 760);
            const price = Math.round(basePrice * classMult);
            const depH = 6 + ((seed + i * 5) % 14);
            const durH = stops ? 3 + ((seed + i * 7) % 9) : 2 + ((seed + i) % 6);
            const durM = ((seed + i * 3) % 4) * 15;

            const outSlice = buildSlice(origin, dest, outDate, depH, durH, durM, stops, airline, seed + i);
            const slices = [outSlice];

            if (retDate) {
                const retH = 6 + ((seed + i * 3 + 2) % 13);
                const retSlice = buildSlice(dest, origin, retDate, retH, durH, durM, stops, airline, seed + i + 13);
                slices.push(retSlice);
            }

            offers.push({
                id: `mock_${seed}_${i}_${Date.now()}`,
                total_amount: price.toString(),
                total_currency: 'USD',
                cabin_class: cabinClass,
                passenger_baggage: [{ cabin_bag: { name: 'Carry-on', size: '56x36x23cm', weight_kg: 7 } }],
                co2_emissions: [{ weight: Math.round(60 + (seed % 140) * (stops + 1)) }],
                slices
            });
        }

        return offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
    }

    return {
        generateOffers,
        resolveAirport
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockFlights;
}

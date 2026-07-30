const PackageDB = (() => {
  const packages = [
    { id: 'lagos-dubai-shopping', name: 'Dubai Shopping Extravaganza', type: 'shopping',
      dest: 'Dubai', destId: 'dubai', country: 'UAE', duration: 7, nights: 6,
      hotelId: 'ritz-dubai', hotelName: 'Ritz-Carlton Dubai', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Dubai Mall tour', 'Desert safari', 'Burj Khalifa tickets', 'Gold Souk visit'],
      highlights: ['Shop at Dubai Mall', 'Desert dune bashing', 'At.mosphere dinner'],
      basePrice: 2899, discount: 22, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.6, reviews: 2847, flightsFrom: 'Lagos (LOS)' },
    { id: 'nairobi-safari-adventure', name: 'Kenya Safari Adventure', type: 'safari',
      dest: 'Masai Mara', destId: 'masai-mara', country: 'Kenya', duration: 9, nights: 8,
      hotelId: 'mara-serengeti-lodge', hotelName: 'Mara Serengeti Lodge', roomType: 'Tent',
      includes: ['Return flights (NBO)', '4×4 safari jeep', 'Full-board meals', 'Park fees', 'Guide & ranger', 'Masai village visit', 'Game drives × 6'],
      highlights: ['Great Migration viewing', 'Big Five safari', 'Masai cultural visit'],
      basePrice: 4599, discount: 15, image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.9, reviews: 1892, flightsFrom: 'Lagos (LOS)' },
    { id: 'cape-town-wine-country', name: 'Cape Town & Winelands', type: 'romance',
      dest: 'Cape Town', destId: 'cape-town', country: 'South Africa', duration: 8, nights: 7,
      hotelId: 'table-bay-cape-town', hotelName: 'Table Bay Hotel', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Wine tour (Stellenbosch)', 'Table Mountain cableway', 'Cape Point tour', 'Robben Island ferry'],
      highlights: ['Table Mountain sunrise', 'Stellenbosch wine tasting', 'Boulder\'s penguins'],
      basePrice: 3299, discount: 18, image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.7, reviews: 3210, flightsFrom: 'Lagos (LOS)' },
    { id: 'zanzibar-beach-escape', name: 'Zanzibar Beach Escape', type: 'beach',
      dest: 'Zanzibar', destId: 'zanzibar', country: 'Tanzania', duration: 7, nights: 6,
      hotelId: 'zanzi-white', hotelName: 'Zanzi White Hotel', roomType: 'Ocean Suite',
      includes: ['Return flights', 'Speedboat transfer', 'Half-board meals', 'Spice tour', 'Prison Island trip', 'Snorkeling gear', 'Sunset dhow cruise'],
      highlights: ['Pristine white beaches', 'Stone Town walking tour', 'Spice plantation visit'],
      basePrice: 2499, discount: 20, image: 'https://images.unsplash.com/photo-1585468274952-66591eb14165?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.5, reviews: 2134, flightsFrom: 'Lagos (LOS)' },
    { id: 'marrakech-medina-magic', name: 'Marrakech Medina Magic', type: 'cultural',
      dest: 'Marrakech', destId: 'marrakech', country: 'Morocco', duration: 6, nights: 5,
      hotelId: 'la-mamounia-marrakech', hotelName: 'La Mamounia Marrakech', roomType: 'Classic',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast & dinner', 'Jemaa el-Fnaa tour', 'Atlas Mountains day trip', 'Hammam & spa', 'Cooking class'],
      highlights: ['Jemaa el-Fnaa square', 'Majorelle Garden', 'Atlas Mountains trek'],
      basePrice: 3899, discount: 12, image: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.8, reviews: 1567, flightsFrom: 'Lagos (LOS)' },
    { id: 'accra-cultural-fusion', name: 'Accra Cultural Fusion', type: 'cultural',
      dest: 'Accra', destId: 'accra', country: 'Ghana', duration: 6, nights: 5,
      hotelId: 'kempinski-accra', hotelName: 'Kempinski Hotel Gold Coast City', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Cape Coast Castle tour', 'Kakum canopy walk', 'Kwame Nkrumah tour', 'Jazz night'],
      highlights: ['Cape Coast Castle', 'Kakum canopy walkway', 'Kwame Nkrumah Mausoleum'],
      basePrice: 2199, discount: 15, image: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.3, reviews: 1876, flightsFrom: 'Lagos (LOS)' },
    { id: 'victoria-falls-adventure', name: 'Victoria Falls Adventure', type: 'adventure',
      dest: 'Victoria Falls', destId: 'victoria-falls', country: 'Zimbabwe', duration: 6, nights: 5,
      hotelId: 'victoria-falls-hotel', hotelName: 'Victoria Falls Hotel', roomType: 'Standard',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Falls guided tour', 'Zambezi sunset cruise', 'White-water rafting', 'Bungee jump option'],
      highlights: ['Mosi-oa-Tunya falls', 'Zambezi sunset', 'Bungee at Vic Falls bridge'],
      basePrice: 3199, discount: 10, image: 'https://images.unsplash.com/photo-1565022536048-0e9fd26ac8b4?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.6, reviews: 2345, flightsFrom: 'Lagos (LOS)' },
    { id: 'paris-romantic-getaway', name: 'Paris Romantic Getaway', type: 'romance',
      dest: 'Paris', destId: 'paris', country: 'France', duration: 5, nights: 4,
      hotelId: 'hilton-paris-opera', hotelName: 'Hilton Paris Opéra', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Eiffel Tower summit', 'Seine river cruise', 'Louvre skip-the-line', 'Montmartre tour'],
      highlights: ['Eiffel Tower dinner', 'Seine sunset cruise', 'Louvre masterpieces'],
      basePrice: 2799, discount: 10, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.7, reviews: 4567, flightsFrom: 'Lagos (LOS)' },
    { id: 'london-historic-tour', name: 'London Historic Tour', type: 'cultural',
      dest: 'London', destId: 'london', country: 'UK', duration: 7, nights: 6,
      hotelId: 'savoy-london', hotelName: 'The Savoy London', roomType: 'Classic',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'London Eye ticket', 'Tower of London tour', 'West End show', 'Thames river bus'],
      highlights: ['West End theatre', 'Tower of London jewels', 'Changing of the Guard'],
      basePrice: 3599, discount: 8, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.5, reviews: 5432, flightsFrom: 'Lagos (LOS)' },
    { id: 'dubai-family-fun', name: 'Dubai Family Fun', type: 'family',
      dest: 'Dubai', destId: 'dubai', country: 'UAE', duration: 9, nights: 8,
      hotelId: 'marriott-dubai', hotelName: 'Marriott Hotel Dubai', roomType: 'Standard',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Atlantis Aquaventure', 'IMG World of Adventures', 'Dubai Frame', 'Miracle Garden'],
      highlights: ['Aquaventure waterpark', 'Desert safari BBQ', 'Dubai Mall fountain show'],
      basePrice: 3499, discount: 25, image: 'https://images.unsplash.com/photo-1582672060674-bc2bd8082d5f?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.4, reviews: 3789, flightsFrom: 'Lagos (LOS)' },
    { id: 'maldives-overwater-paradise', name: 'Maldives Overwater Paradise', type: 'beach',
      dest: 'Maldives', destId: 'maldives', country: 'Maldives', duration: 7, nights: 6,
      hotelId: 'soneva-fushi', hotelName: 'Soneva Fushi Resort', roomType: 'Overwater Villa',
      includes: ['Return flights', 'Seaplane transfer', 'Full-board', 'Snorkeling', 'Sunset fishing', 'Private dinner on sandbank', 'Spa treatment'],
      highlights: ['Overwater villa', 'Manta ray snorkeling', 'Sandbank dinner'],
      basePrice: 5999, discount: 15, image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.9, reviews: 2987, flightsFrom: 'Lagos (LOS)' },
    { id: 'serengeti-great-migration', name: 'Serengeti Great Migration Safari', type: 'safari',
      dest: 'Serengeti', destId: 'serengeti', country: 'Tanzania', duration: 11, nights: 10,
      hotelId: 'mkuti-ngorongoro', hotelName: 'Mkuti Ngorongoro Camp', roomType: 'Tent',
      includes: ['Return flights (JRO)', 'Domestic flight to Serengeti', 'Full-board', 'Park fees', 'Game drives × 8', 'Ngorongoro crater tour', 'Balloon safari'],
      highlights: ['Great Migration crossing', 'Ngorongoro Crater', 'Balloon safari'],
      basePrice: 6999, discount: 12, image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.9, reviews: 1456, flightsFrom: 'Lagos (LOS)' },
    { id: 'tokyo-cultural-odyssey', name: 'Tokyo Cultural Odyssey', type: 'cultural',
      dest: 'Tokyo', destId: 'tokyo', country: 'Japan', duration: 10, nights: 9,
      hotelId: 'tokyo-shinjuku-granbell', hotelName: 'Granbell Hotel Shinjuku', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Bullet train to Kyoto', 'Mt Fuji day trip', 'Sushi masterclass', 'Robot Restaurant'],
      highlights: ['Shibuya crossing', 'Fushimi Inari shrine', 'Tsukiji fish market'],
      basePrice: 4599, discount: 18, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?photo=format&fit=crop&q=80&w=800&h=500',
      rating: 4.7, reviews: 2341, flightsFrom: 'Lagos (LOS)' },
    { id: 'new-york-city-break', name: 'New York City Break', type: 'city',
      dest: 'New York', destId: 'new-york', country: 'USA', duration: 6, nights: 5,
      hotelId: 'new-york-marriott-marquis', hotelName: 'New York Marriott Marquis', roomType: 'Standard',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Statue of Liberty cruise', 'Broadway show', 'Empire State Building', 'Central Park bike tour'],
      highlights: ['Broadway theatre', 'Statue of Liberty', 'Central Park skyline'],
      basePrice: 3999, discount: 10, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.4, reviews: 6789, flightsFrom: 'Lagos (LOS)' },
    { id: 'santorini-honeymoon', name: 'Santorini Honeymoon Bliss', type: 'romance',
      dest: 'Santorini', destId: 'santorini', country: 'Greece', duration: 6, nights: 5,
      hotelId: 'santorini-mystique', hotelName: 'Mystique Santorini', roomType: 'Suite',
      includes: ['Return flights', 'Airport transfers', 'Half-board', 'Sunset cruise', 'Wine tasting', 'Cooking class', 'Spa couple treatment'],
      highlights: ['Oia sunset', 'Caldera views', 'Blue-domed churches'],
      basePrice: 4299, discount: 8, image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.8, reviews: 3456, flightsFrom: 'Lagos (LOS)' },
    { id: 'kigali-gorilla-trek', name: 'Rwanda Gorilla Trekking', type: 'adventure',
      dest: 'Kigali', destId: 'kigali', country: 'Rwanda', duration: 5, nights: 4,
      hotelId: 'radisson-blu-kigali', hotelName: 'Radisson Blu Kigali', roomType: 'Standard',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Gorilla permits', 'Volcanoes NP hike', 'Kigali genocide memorial', 'Lake Kivu day trip'],
      highlights: ['Mountain gorilla encounter', 'Volcanoes National Park', 'Kigali hills'],
      basePrice: 5499, discount: 5, image: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.9, reviews: 1234, flightsFrom: 'Lagos (LOS)' },
    { id: 'bali-wellness-retreat', name: 'Bali Wellness Retreat', type: 'wellness',
      dest: 'Bali', destId: 'bali', country: 'Indonesia', duration: 10, nights: 9,
      hotelId: 'bal-ayana-resort', hotelName: 'Ayana Resort Bali', roomType: 'Ocean View',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Yoga × 6 sessions', 'Spa package', 'Rice terrace tour', 'Temple visit'],
      highlights: ['Ubud rice terraces', 'Temple sunrise', 'Balinese massage'],
      basePrice: 3799, discount: 20, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.6, reviews: 2987, flightsFrom: 'Lagos (LOS)' },
    { id: 'lagos-nightlife-experience', name: 'Lagos Nightlife & Culture', type: 'entertainment',
      dest: 'Lagos', destId: 'lagos', country: 'Nigeria', duration: 4, nights: 3,
      hotelId: 'eko-lagos', hotelName: 'Eko Hotels & Suites', roomType: 'Deluxe',
      includes: ['Domestic flights', 'Airport transfers', 'Daily breakfast', 'Afrobeat night', 'Lekki Conservation tour', 'Nike Art Gallery', 'Jazz club evening'],
      highlights: ['Afrobeat live music', 'Nike Art Gallery', 'Lagos lagoon cruise'],
      basePrice: 1499, discount: 15, image: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.2, reviews: 1567, flightsFrom: 'Within Nigeria' },
    { id: 'abuja-capital-getaway', name: 'Abuja Capital Getaway', type: 'city',
      dest: 'Abuja', destId: 'abuja', country: 'Nigeria', duration: 4, nights: 3,
      hotelId: 'transcorp-hilton-abuja', hotelName: 'Transcorp Hilton Abuja', roomType: 'Executive',
      includes: ['Domestic flights', 'Airport transfers', 'Daily breakfast', 'Aso Rock tour', 'Millennium Park', 'Arts & Crafts village', 'Zuma Rock day trip'],
      highlights: ['Aso Rock', 'Zuma Rock', 'Nigerian National Mosque'],
      basePrice: 1299, discount: 10, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.1, reviews: 987, flightsFrom: 'Within Nigeria' },
    { id: 'dubai-new-year-spectacular', name: 'Dubai NYE Spectacular', type: 'entertainment',
      dest: 'Dubai', destId: 'dubai', country: 'UAE', duration: 5, nights: 4,
      hotelId: 'ritz-dubai', hotelName: 'Ritz-Carlton Dubai', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'NYE gala dinner', 'Burj Khalifa fireworks', 'Helicopter tour', 'Yacht party'],
      highlights: ['Burj Khalifa fireworks', 'NYE gala dinner', 'Helicopter skyline tour'],
      basePrice: 5499, discount: 5, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.7, reviews: 2134, flightsFrom: 'Lagos (LOS)' },
    { id: 'seychelles-island-escape', name: 'Seychelles Island Escape', type: 'beach',
      dest: 'Seychelles', destId: 'seychelles', country: 'Seychelles', duration: 9, nights: 8,
      hotelId: 'four-seasons-seychelles', hotelName: 'Four Seasons Seychelles', roomType: 'Ocean View',
      includes: ['Return flights', 'Airport transfers', 'Half-board', 'Island hopping', 'Snorkeling gear', 'Nature reserve tour', 'Creole cooking class'],
      highlights: ['Anse Lazio beach', 'Vallee de Mai nature reserve', 'Creole cuisine'],
      basePrice: 5299, discount: 18, image: 'https://images.unsplash.com/photo-1582769645277-3c0f3c62f155?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.8, reviews: 1890, flightsFrom: 'Lagos (LOS)' },
    { id: 'egypt-historical-wonders', name: 'Egypt Historical Wonders', type: 'cultural',
      dest: 'Cairo', destId: 'cairo', country: 'Egypt', duration: 7, nights: 6,
      hotelId: 'four-seasons-cairo', hotelName: 'Four Seasons Cairo', roomType: 'Deluxe',
      includes: ['Return flights', 'Airport transfers', 'Daily breakfast', 'Giza pyramids tour', 'Nile cruise', 'Valley of the Kings', 'Egyptian Museum'],
      highlights: ['Great Pyramids of Giza', 'Nile felucca ride', 'Valley of the Kings'],
      basePrice: 2999, discount: 20, image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&q=80&w=800&h=500',
      rating: 4.5, reviews: 3456, flightsFrom: 'Lagos (LOS)' },
  ];

  function search(q) {
    if (!q || q.length < 2) return packages;
    const lower = q.toLowerCase();
    return packages.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.dest.toLowerCase().includes(lower) ||
      p.country.toLowerCase().includes(lower) ||
      p.type.toLowerCase().includes(lower)
    );
  }

  function filter(results, filters = {}) {
    let r = [...results];
    if (filters.type) r = r.filter(p => p.type === filters.type);
    if (filters.maxBudget) r = r.filter(p => (p.basePrice * (1 - p.discount / 100)) <= filters.maxBudget);
    if (filters.minBudget) r = r.filter(p => (p.basePrice * (1 - p.discount / 100)) >= filters.minBudget);
    if (filters.maxDuration) r = r.filter(p => p.duration <= filters.maxDuration);
    if (filters.minDuration) r = r.filter(p => p.duration >= filters.minDuration);
    return r;
  }

  function sort(results, by = 'popular') {
    const r = [...results];
    if (by === 'price-asc') r.sort((a, b) => (a.basePrice * (1 - a.discount / 100)) - (b.basePrice * (1 - b.discount / 100)));
    else if (by === 'price-desc') r.sort((a, b) => (b.basePrice * (1 - b.discount / 100)) - (a.basePrice * (1 - a.discount / 100)));
    else if (by === 'duration') r.sort((a, b) => a.duration - b.duration);
    else r.sort((a, b) => b.rating - a.rating);
    return r;
  }

  function getById(id) {
    return packages.find(p => p.id === id) || null;
  }

  function getDiscountedPrice(pkg) {
    return Math.round(pkg.basePrice * (1 - pkg.discount / 100));
  }

  function getTypes() {
    return [...new Set(packages.map(p => p.type))];
  }

  function getDestinations() {
    return [...new Set(packages.map(p => p.dest))];
  }

  return { packages, search, filter, sort, getById, getDiscountedPrice, getTypes, getDestinations };
})();

if (typeof module !== 'undefined') module.exports = { PackageDB };
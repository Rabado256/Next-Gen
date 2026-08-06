/**
 * Duffel API Client
 * Documentation: https://duffel.com/docs/api
 * 
 * IMPORTANT: This file uses test mode by default.
 * For production, change DUFFEL_BASE_URL to https://api.duffel.com
 */

const DuffelAPI = (() => {
    const DUFFEL_BASE_URL = 'https://api.duffel.com';
    const DUFFEL_VERSION = 'v2';
    
    // Test mode token - replace with your actual token
    // Get your token at: https://app.duffel.com → Developers → Access Tokens
    let accessToken = localStorage.getItem('duffel_access_token') || '';
    
    /**
     * Set the API access token
     */
    function setAccessToken(token) {
        accessToken = token;
        localStorage.setItem('duffel_access_token', token);
    }
    
    /**
     * Get the current access token
     */
    function getAccessToken() {
        return accessToken;
    }
    
    /**
     * Check if API is configured
     */
    function isConfigured() {
        return accessToken.length > 0;
    }
    
    /**
     * Make authenticated request to Duffel API
     */
    async function request(endpoint, options = {}) {
        if (!accessToken) {
            throw new Error('Duffel API not configured. Please set your access token.');
        }
        
        const url = `${DUFFEL_BASE_URL}${endpoint}`;
        
        const headers = {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'Content-Type': 'application/json',
            'Duffel-Version': DUFFEL_VERSION,
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.message || `Duffel API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Duffel API request failed:', error);
            throw error;
        }
    }
    
    /**
     * ── Flight search cache ─────────────────────────────────────────────
     * Cache live offer responses in Supabase (flight_caches) keyed by a hash
     * of the search params, so repeat searches skip the Duffel API. A small
     * in-memory cache avoids duplicate fetches within the same session.
     */
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const memoryCache = {};

    function flightCacheKey(searchParams) {
        const {
            slices,
            passengers = [{ type: 'adult' }],
            cabinClass = 'economy',
            maxConnections = 1
        } = searchParams;
        return 'duffel:' + JSON.stringify({
            slices: (slices || []).map(s => [s.origin, s.destination, s.departureDate]),
            passengers,
            cabinClass,
            maxConnections
        });
    }

    function cacheDb() {
        return (typeof window !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null;
    }

    async function readCache(key, ttlMs) {
        const mem = memoryCache[key];
        if (mem && (Date.now() - mem.at) < ttlMs) return mem.payload;

        try {
            const sb = cacheDb();
            if (!sb) return null;
            const cutoff = new Date(Date.now() - ttlMs).toISOString();
            const { data, error } = await sb.from('flight_caches')
                .select('payload')
                .eq('cache_key', key)
                .gte('created_at', cutoff)
                .maybeSingle();
            if (error) {
                console.warn('[Duffel] cache read failed:', error.message);
                return null;
            }
            if (data && data.payload) {
                memoryCache[key] = { at: Date.now(), payload: data.payload };
                return data.payload;
            }
        } catch (_) { }
        return null;
    }

    async function writeCache(key, payload) {
        memoryCache[key] = { at: Date.now(), payload };
        try {
            const sb = cacheDb();
            if (!sb) return;
            await sb.from('flight_caches').upsert(
                { cache_key: key, payload, created_at: new Date().toISOString() },
                { onConflict: 'cache_key' }
            );
        } catch (e) {
            console.warn('[Duffel] cache write failed:', e.message);
        }
    }

    /**
     * Search for flights
     * @param {Object} searchParams - Search parameters
     * @param {Array} searchParams.slices - Flight slices (origin, destination, date)
     * @param {Array} searchParams.passengers - Passenger types
     * @param {string} searchParams.cabinClass - Cabin class (economy, business, etc.)
     * @param {number} searchParams.maxConnections - Max connections (0 = direct)
     * @returns {Promise} Duffel response with a `cached` flag attached
     */
    async function searchFlights(searchParams) {
        const key = flightCacheKey(searchParams);

        try {
            const cached = await readCache(key, CACHE_TTL_MS);
            if (cached) return Object.assign({ cached: true, cache_key: key }, JSON.parse(JSON.stringify(cached)));
        } catch (_) { }

        const {
            slices,
            passengers = [{ type: 'adult' }],
            cabinClass = 'economy',
            maxConnections = 1
        } = searchParams;

        const body = {
            data: {
                slices: slices.map(slice => ({
                    origin: slice.origin,
                    destination: slice.destination,
                    departure_date: slice.departureDate
                })),
                passengers: passengers.map(p => ({
                    type: p.type || 'adult',
                    ...(p.age && { age: p.age })
                })),
                cabin_class: cabinClass,
                max_connections: maxConnections
            }
        };

        let result;
        try {
            result = await request('/air/offer_requests?return_offers=true', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        } catch (liveErr) {
            // Live call failed — fall back to any cached copy, even stale
            try {
                const stale = await readCache(key, Number.MAX_SAFE_INTEGER);
                if (stale) return Object.assign({ cached: true, cache_key: key }, JSON.parse(JSON.stringify(stale)));
            } catch (_) { }
            throw liveErr;
        }

        writeCache(key, result);
        return Object.assign({ cached: false, cache_key: key }, result);
    }
    
    /**
     * Get a single offer by ID (refreshes price)
     */
    async function getOffer(offerId) {
        return await request(`/air/offers/${offerId}`);
    }
    
    /**
     * Get seat map for an offer
     */
    async function getSeatMap(offerId) {
        return await request(`/air/seat_maps?offer_id=${offerId}`);
    }
    
    /**
     * Create an order (booking)
     */
    async function createOrder(orderData) {
        return await request('/air/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }
    
    /**
     * Get an order by ID
     */
    async function getOrder(orderId) {
        return await request(`/air/orders/${orderId}`);
    }
    
    /**
     * List orders
     */
    async function listOrders(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await request(`/air/orders?${query}`);
    }
    
    /**
     * Cancel an order
     */
    async function cancelOrder(orderId) {
        return await request(`/air/order_cancellations`, {
            method: 'POST',
            body: JSON.stringify({ data: { order_id: orderId } })
        });
    }
    
    /**
     * Search for places (airports/cities)
     * @param {string} query - Search query (city name, airport code, etc.)
     */
    async function searchPlaces(query) {
        return await request(`/air/places?query=${encodeURIComponent(query)}`);
    }
    
    /**
     * Get airport suggestions for autocomplete
     */
    async function getPlaceSuggestions(query) {
        if (!query || query.length < 2) return { data: [] };
        
        try {
            const result = await searchPlaces(query);
            return result;
        } catch (error) {
            console.error('Place search failed:', error);
            return { data: [] };
        }
    }
    
    /**
     * Search for flights with flexible dates (±3 days)
     */
    async function searchFlightsFlexible(searchParams) {
        const {
            origin,
            destination,
            departureDate,
            returnDate,
            passengers = [{ type: 'adult' }],
            cabinClass = 'economy'
        } = searchParams;
        
        const slices = [
            {
                origin,
                destination,
                departureDate
            }
        ];
        
        if (returnDate) {
            slices.push({
                origin: destination,
                destination: origin,
                departureDate: returnDate
            });
        }
        
        return await searchFlights({
            slices,
            passengers,
            cabinClass
        });
    }
    
    /**
     * Format offer for display
     * Converts Duffel API response to a simpler format for the UI
     */
    function formatOfferForDisplay(offer) {
        const segments = offer.slices?.flatMap(slice => slice.segments) || [];
        const outboundSegments = offer.slices?.[0]?.segments || [];
        const firstSegment = outboundSegments[0] || segments[0];
        const lastSegment = outboundSegments[outboundSegments.length - 1] || segments[segments.length - 1];
        
        return {
            id: offer.id,
            price: parseFloat(offer.total_amount),
            currency: offer.total_currency,
            airline: firstSegment?.operating_carrier?.name || 'Unknown Airline',
            airlineLogo: firstSegment?.operating_carrier?.iata_code || '',
            flightNumber: segments.map(s => `${s.marketing_carrier?.iata_code || ''}${s.flight_number || ''}`).join(', '),
            departure: firstSegment?.departure?.time || '',
            departureAirport: firstSegment?.departure?.airport?.iata_code || '',
            arrival: lastSegment?.arrival?.time || '',
            arrivalAirport: lastSegment?.arrival?.airport?.iata_code || '',
            duration: formatDuration(offer.slices?.[0]?.duration),
            stops: (offer.slices?.[0]?.segments?.length || 1) - 1,
            stopsText: (offer.slices?.[0]?.segments?.length || 1) - 1 === 0 ? 'Direct' : `${(offer.slices?.[0]?.segments?.length || 1) - 1} stop(s)`,
            cabinClass: offer.cabin_class,
            departureDate: firstSegment?.departure?.at?.split('T')[0] || '',
            returnDate: offer.slices?.[1]?.segments?.[0]?.departure?.at?.split('T')[0] || null,
            baggage: offer.passenger_baggage?.[0]?.cabin_bag || null,
            co2: offer.co2_emissions?.[0]?.weight || null,
            raw: offer
        };
    }
    
    /**
     * Format duration from ISO 8601 to readable format
     */
    function formatDuration(isoDuration) {
        if (!isoDuration) return '';
        
        // Parse ISO 8601 duration (PT1H30M)
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (!match) return isoDuration;
        
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return '';
    }
    
    /**
     * Get common airport codes for popular destinations
     */
    function getPopularAirports() {
        return [
            { code: 'DEL', name: 'Delhi', city: 'New Delhi', country: 'India' },
            { code: 'BOM', name: 'Mumbai', city: 'Mumbai', country: 'India' },
            { code: 'BLR', name: 'Bangalore', city: 'Bangalore', country: 'India' },
            { code: 'MAA', name: 'Chennai', city: 'Chennai', country: 'India' },
            { code: 'CCU', name: 'Kolkata', city: 'Kolkata', country: 'India' },
            { code: 'HYD', name: 'Hyderabad', city: 'Hyderabad', country: 'India' },
            { code: 'GOI', name: 'Goa', city: 'Goa', country: 'India' },
            { code: 'COK', name: 'Kochi', city: 'Kochi', country: 'India' },
            { code: 'DXB', name: 'Dubai', city: 'Dubai', country: 'UAE' },
            { code: 'SIN', name: 'Singapore', city: 'Singapore', country: 'Singapore' },
            { code: 'BKK', name: 'Bangkok', city: 'Bangkok', country: 'Thailand' },
            { code: 'LON', name: 'London', city: 'London', country: 'UK' },
            { code: 'NYC', name: 'New York', city: 'New York', country: 'USA' },
            { code: 'PAR', name: 'Paris', city: 'Paris', country: 'France' },
            { code: 'TYO', name: 'Tokyo', city: 'Tokyo', country: 'Japan' },
            { code: 'SFO', name: 'San Francisco', city: 'San Francisco', country: 'USA' },
            { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'USA' },
            { code: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'Turkey' },
            { code: 'KUL', name: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia' },
            { code: 'SYD', name: 'Sydney', city: 'Sydney', country: 'Australia' }
        ];
    }
    
    // Public API
    return {
        setAccessToken,
        getAccessToken,
        isConfigured,
        searchFlights,
        searchFlightsFlexible,
        getOffer,
        getSeatMap,
        createOrder,
        getOrder,
        listOrders,
        cancelOrder,
        searchPlaces,
        getPlaceSuggestions,
        formatOfferForDisplay,
        getPopularAirports,
        formatDuration
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DuffelAPI;
}

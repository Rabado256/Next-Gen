/* ============================================
   NextGen Travel — API Client (Supabase)
   Centralized data access layer for all
   database operations and authentication
   ============================================ */

// Reference to globally initialized Supabase client
const SB = window.supabaseClient;

// HTML-escape a string to prevent XSS injection
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// Core API object wrapping all Supabase interactions
const api = {
  // --- Token management (localStorage-based session) ---
  getToken() { return localStorage.getItem('nextgen_token'); },
  setToken(token) { localStorage.setItem('nextgen_token', token); },
  clearToken() { localStorage.removeItem('nextgen_token'); },

  // Build headers with auth token if available
  headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  },

  // Generic HTTP request helper (used for custom endpoints)
  async request(method, path, body) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(path, opts);
      let data;
      try { data = await res.json(); } catch (_) { data = {}; }
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server.');
      }
      throw err;
    }
  },

  // Shorthand HTTP method helpers
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ==================== AUTHENTICATION ====================

  // Restore session on page load — checks Supabase for existing session
  async syncSession() {
    const { data: { session } } = await SB.auth.getSession();
    if (session) {
      this.setToken(session.access_token);
      const { data: { user }, error: getUserErr } = await SB.auth.getUser();
      if (user && !getUserErr) {
        let userData;
        try {
          // Fetch user profile from the profiles table
          const { data: profile } = await SB.from('profiles').select('*').eq('id', user.id).maybeSingle();
          userData = profile || { id: user.id, email: user.email, name: user.user_metadata?.name || '' };
        } catch (_) {
          // Fallback: keep existing localStorage data if query fails
          userData = JSON.parse(localStorage.getItem('nextgen_user') || 'null') || { id: user.id, email: user.email, name: user.user_metadata?.name || '' };
        }
        localStorage.setItem('nextgen_user', JSON.stringify(userData));
        return { user: userData, token: session.access_token };
      } else {
        // getUser failed — clear stale cached session data
        this.clearToken();
        localStorage.removeItem('nextgen_user');
      }
    }
    return null;
  },

  // Register a new user via Supabase Auth
  async signup(name, email, password) {
    const { data, error } = await SB.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      // Store initial user data locally
      const userData = {
        id: data.user.id,
        name,
        email,
        is_admin: false,
        passport: '',
        identity_card: '',
        emergency: '',
        emergency_name: '',
        pref_hotel: false,
        pref_food: 'none',
        avatar_url: ''
      };
      localStorage.setItem('nextgen_user', JSON.stringify(userData));
      if (data.session?.access_token) {
        this.setToken(data.session.access_token);
      }
      return { user: userData, token: data.session?.access_token || null };
    }
    throw new Error('Signup failed. Check if email confirmation is required.');
  },

  // Authenticate existing user with email/password
  async login(email, password) {
    const { data, error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.user) {
      let userData;
      try {
        // Try to fetch full profile from database
        const { data: profile } = await SB.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (profile) {
          userData = profile;
        } else {
          // Profile doesn't exist yet — create it via upsert
          const { data: newProfile } = await SB.from('profiles').upsert({
            id: data.user.id,
            email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            is_admin: false
          }).select().single().catch(() => ({ data: null }));
          userData = newProfile || { id: data.user.id, email };
        }
      } catch (_) {
        // Fallback to auth metadata
        userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || email.split('@')[0],
          is_admin: data.user.user_metadata?.is_admin === true
        };
      }
      localStorage.setItem('nextgen_user', JSON.stringify(userData));
      if (data.session?.access_token) {
        this.setToken(data.session.access_token);
      }
      return { user: userData, token: data.session?.access_token };
    }
    throw new Error('Login failed');
  },

  // Sign out — clears Supabase session and local data
  async logout() {
    await SB.auth.signOut().catch(() => {});
    this.clearToken();
    localStorage.removeItem('nextgen_user');
    localStorage.removeItem('nextgen_activities');
    localStorage.removeItem('nextgen_wishlist');
  },

  // Fetch full profile from database and update local cache
  async getProfile() {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    try {
      const { data: profile } = await SB.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) {
        localStorage.setItem('nextgen_user', JSON.stringify(profile));
        return profile;
      }
      return user;
    } catch (_) {
      return JSON.parse(localStorage.getItem('nextgen_user') || 'null') || user;
    }
  },

  // Update profile fields (only provided fields are changed)
  async updateProfile(profile) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Build update object with only the fields that were provided
    const updates = {};
    if (profile.name !== undefined) updates.name = profile.name;
    if (profile.passport !== undefined) updates.passport = profile.passport;
    if (profile.identity_card !== undefined) updates.identity_card = profile.identity_card;
    if (profile.emergency !== undefined) updates.emergency = profile.emergency;
    if (profile.emergency_name !== undefined) updates.emergency_name = profile.emergency_name;
    if (profile.country !== undefined) updates.country = profile.country;
    if (profile.pref_hotel !== undefined) updates.pref_hotel = profile.pref_hotel;
    if (profile.pref_food !== undefined) updates.pref_food = profile.pref_food;
    if (profile.avatar !== undefined) updates.avatar_url = profile.avatar;
    if (Object.keys(updates).length === 0) return {};

    // Upsert to create or update the profile row
    const { data, error } = await SB.from('profiles').upsert({
      id: user.id,
      email: user.email,
      ...updates
    }).select().single();
    if (error) throw new Error(error.message);
    // Merge updated data with local cache
    const current = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
    const merged = { ...current, ...data };
    localStorage.setItem('nextgen_user', JSON.stringify(merged));
    return data;
  },

  // ==================== DESTINATIONS ====================

  // Fetch all active destinations
  async getDestinations() {
    const { data, error } = await SB.from('destinations').select('*').eq('is_active', true).order('created_at');
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Fetch a single destination by ID (slug)
  async getDestination(id) {
    const { data, error } = await SB.from('destinations').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Create a new destination (admin only via RLS)
  async createDestination(destData) {
    const { data, error } = await SB.from('destinations').insert({
      id: destData.id,
      title: destData.title,
      edition: destData.edition || '',
      description: destData.desc || destData.description || '',
      price: destData.price || 0,
      country: destData.country || '',
      vibe: destData.vibe || 'romantic',
      img: destData.img || '',
      steps: destData.steps || [],
      is_active: true
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Update an existing destination (admin only via RLS)
  async updateDestination(id, destData) {
    const { data, error } = await SB.from('destinations').update({
      title: destData.title,
      edition: destData.edition || '',
      description: destData.desc || destData.description || '',
      price: destData.price || 0,
      country: destData.country || '',
      vibe: destData.vibe || 'romantic',
      img: destData.img || '',
      steps: destData.steps || []
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Delete a destination (admin only via RLS)
  async deleteDestination(id) {
    const { error } = await SB.from('destinations').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ==================== BOOKINGS ====================

  // Get all bookings for the currently authenticated user
  async getMyBookings() {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await SB.from('bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Create a new booking with auto-generated reference code
  async createBooking(bookingData) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Generate unique reference: NXG-<timestamp in base36>
    const ref = 'NXG-' + Date.now().toString(36).toUpperCase();
    const { data, error } = await SB.from('bookings').insert({
      user_id: user.id,
      dest_id: bookingData.dest_id || '',
      guest_name: bookingData.name || user.email,
      guest_email: bookingData.email || '',
      booking_date: bookingData.date || '',
      guests: parseInt(bookingData.guests) || 1,
      total: parseFloat(bookingData.total) || 0,
      total_amount: parseFloat(bookingData.total) || 0,
      currency: 'usd',
      hotel: bookingData.hotel === 'Yes' || bookingData.hotel === true,
      hotel_reservation: bookingData.hotel === 'Yes' || bookingData.hotel === true,
      status: 'confirmed',
      ref,
      reference: ref,
      from_location: bookingData.from_location || '',
      to_location: bookingData.to_location || '',
      doc_type: bookingData.doc_type || 'unknown'
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Create a flight booking (separate from destination bookings)
  async createFlightBooking(data) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ref = data.reference || 'FL-' + Date.now().toString(36).toUpperCase();
    const { data: result, error } = await SB.from('bookings').insert({
      user_id: user.id,
      guest_name: data.guest_name || '',
      guest_email: data.guest_email || '',
      guest_phone: data.guest_phone || '',
      booking_date: data.booking_date || new Date().toISOString().split('T')[0],
      guests: parseInt(data.guests) || 1,
      total: parseFloat(data.total) || 0,
      total_amount: parseFloat(data.total) || 0,
      currency: data.currency || 'usd',
      status: 'confirmed',
      ref,
      reference: ref,
      from_location: data.from_location || '',
      to_location: data.to_location || '',
      dest_id: data.airline || 'Flight',
      doc_type: 'flight',
      special_requests: JSON.stringify({
        flight_number: data.flight_number || '',
        departure_time: data.departure_time || '',
        arrival_time: data.arrival_time || '',
        duration: data.duration || '',
        offer_id: data.offer_id || '',
        payment_intent: data.payment_intent || '',
        duffel_order_id: data.duffel_order_id || '',
        ...(data.extras ? { extras: data.extras } : {})
      })
    }).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  async createHotelBooking(data) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ref = data.reference || 'HT-' + Date.now().toString(36).toUpperCase();
    const { data: result, error } = await SB.from('bookings').insert({
      user_id: user.id,
      guest_name: data.guest_name || '',
      guest_email: data.guest_email || '',
      guest_phone: data.guest_phone || '',
      booking_date: data.booking_date || new Date().toISOString().split('T')[0],
      guests: parseInt(data.guests) || 1,
      total: parseFloat(data.total) || 0,
      total_amount: parseFloat(data.total) || 0,
      currency: data.currency || 'usd',
      status: 'confirmed',
      ref,
      reference: ref,
      from_location: data.hotel_city || '',
      to_location: data.hotel_name || '',
      dest_id: data.hotel_name || 'Hotel',
      doc_type: 'hotel',
      special_requests: JSON.stringify({
        hotel_city: data.hotel_city || '',
        hotel_country: data.hotel_country || '',
        room_type: data.room_type || '',
        ...(data.extras ? { extras: data.extras } : {}),
        nights: data.nights || 0,
        rooms: data.rooms || 1,
        check_in: data.check_in || '',
        check_out: data.check_out || '',
        payment_intent: data.payment_intent || ''
      })
    }).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  // Stub: get booking invoice URL
  getBookingInvoice(id) { return '/api/bookings/' + id + '/invoice'; },
  // Stub: download booking invoice as blob
  async downloadInvoice(id) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch('/api/bookings/' + id + '/invoice', { headers });
    if (!res.ok) throw new Error('Invoice download failed');
    return res.blob();
  },

  // ==================== REVIEWS ====================

  // Get all reviews for a destination
  async getReviews(destId) {
    const { data, error } = await SB.from('reviews').select('*').eq('dest_id', destId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Submit a review for a destination (requires authentication)
  async submitReview(destId, rating, comment) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await SB.from('reviews').insert({
      dest_id: destId,
      user_id: user.id,
      rating,
      comment
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async createPackageBooking(data) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ref = data.reference || 'PK-' + Date.now().toString(36).toUpperCase();
    const { data: result, error } = await SB.from('bookings').insert({
      user_id: user.id,
      guest_name: data.guest_name || '',
      guest_email: data.guest_email || '',
      guest_phone: data.guest_phone || '',
      booking_date: data.booking_date || new Date().toISOString().split('T')[0],
      guests: parseInt(data.guests) || 1,
      total: parseFloat(data.total) || 0,
      total_amount: parseFloat(data.total) || 0,
      currency: data.currency || 'usd',
      status: 'confirmed',
      ref,
      reference: ref,
      from_location: data.package_dest || '',
      to_location: data.package_name || '',
      dest_id: data.package_name || 'Package',
      doc_type: 'package',
      special_requests: JSON.stringify({
        package_id: data.package_id || '',
        package_dest: data.package_dest || '',
        package_country: data.package_country || '',
        duration: data.duration || 0,
        nights: data.nights || 0,
        hotel: data.hotel || '',
        room_type: data.room_type || '',
        includes: data.includes || [],
        payment_intent: data.payment_intent || '',
        ...(data.extras ? { extras: data.extras } : {})
      })
    }).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  async createVisaBooking(data) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ref = data.reference || 'VS-' + Date.now().toString(36).toUpperCase();
    const { data: result, error } = await SB.from('bookings').insert({
      user_id: user.id,
      guest_name: data.guest_name || '',
      guest_email: data.guest_email || '',
      guest_phone: data.guest_phone || '',
      booking_date: data.booking_date || new Date().toISOString().split('T')[0],
      guests: parseInt(data.guests) || 1,
      total: parseFloat(data.total) || 0,
      total_amount: parseFloat(data.total) || 0,
      currency: data.currency || 'usd',
      status: 'confirmed',
      ref,
      reference: ref,
      from_location: data.from_location || '',
      to_location: data.to_location || '',
      dest_id: 'Visa',
      doc_type: 'visa',
      special_requests: JSON.stringify({
        visa_type: data.visa_type || '',
        visa_label: data.visa_label || '',
        payment_intent: data.payment_intent || '',
        ...(data.extras ? { extras: data.extras } : {})
      })
    }).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  // ==================== CONTACT FORM ====================

  // Submit a contact form message
  async submitContact(name, email, subject, message) {
    const { error } = await SB.from('contacts').insert({ name, email, subject, message });
    if (error) throw new Error(error.message);
  },

  // Get all contact submissions (admin only)
  async getContacts() {
    const { data, error } = await SB.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Get a single contact message by ID
  async getContact(id) {
    const { data, error } = await SB.from('contacts').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Mark a contact message as read
  async markContactRead(id) {
    const { error } = await SB.from('contacts').update({ is_read: true }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Delete a contact message
  async deleteContact(id) {
    const { error } = await SB.from('contacts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ==================== NEWSLETTER ====================

  // Subscribe an email to the newsletter (duplicate emails are silently ignored — code 23505)
  async subscribe(email) {
    const { error } = await SB.from('newsletter_subscribers').insert({ email });
    if (error && error.code === '23505') return; // Unique violation = already subscribed
    if (error) throw new Error(error.message);
  },

  // Get all newsletter subscribers (admin only)
  async getNewsletterSubscribers() {
    const { data, error } = await SB.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // ==================== CUSTOM ITINERARIES ====================

  // Get all itineraries for the current user
  async getItineraries() {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) return [];
    const { data, error } = await SB.from('itineraries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Create a new custom itinerary with day-by-day activities
  async createItinerary(data) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: result, error } = await SB.from('itineraries').insert({
      user_id: user.id,
      title: data.title || '',
      description: data.description || '',
      days: data.days || []
    }).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  // Update an existing itinerary
  async updateItinerary(id, data) {
    const { error } = await SB.from('itineraries').update({
      title: data.title,
      description: data.description,
      days: data.days
    }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Delete an itinerary
  async deleteItinerary(id) {
    const { error } = await SB.from('itineraries').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ==================== PAYMENTS (stub) ====================

  // Create a Stripe PaymentIntent via our server
  async createPaymentIntent(data) {
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round((parseFloat(String(data.total_amount).replace(/[^0-9.]/g, '')) || 0) * 100),
        currency: data.currency || 'usd',
        metadata: {
          dest_id: data.destination_id,
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guests: String(data.guests || 1)
        }
      })
    });
    if (!res.ok) throw new Error('Payment intent creation failed');
    return res.json();
  },

  // Confirm booking in Supabase after Stripe payment succeeds
  async confirmPayment(data) {
    const ref = data.reference || 'NG' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    const res = await fetch('/api/confirm-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dest_id: data.dest_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email || '',
        guest_phone: data.guest_phone || '',
        guests: data.guests,
        total_amount: data.total,
        currency: 'usd',
        payment_id: data.payment_intent || '',
        travel_date: data.travel_date,
        passport: data.passport || '',
        identity_card: data.identity_card || '',
        special_requests: data.special_requests || '',
        extras: data.extras || null,
        hotel_reservation: data.hotel || false,
        from_location: data.from_location || '',
        to_location: data.to_location || '',
        travelers: data.travelers || null,
        reference: ref
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Booking confirmation failed');
    }
    const result = await res.json();
    return { ref: result.booking?.reference || ref, ...result };
  },

  // Cancel a booking by reference — updates status to 'cancelled'
  async cancelBooking(ref) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await SB.from('bookings')
      .update({ status: 'cancelled' })
      .eq('reference', ref)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Booking not found');
    return data;
  },

  // Fetch a single booking by its reference code (public lookup)
  async getBookingByRef(ref) {
    if (!ref || ref.trim().length < 3) throw new Error('Invalid reference code');
    const { data, error } = await SB.from('bookings')
      .select('*')
      .eq('reference', ref.trim().toUpperCase())
      .single();
    if (error) throw new Error('Booking not found. Please check your reference code.');
    return data;
  },

  // Update booking date (modify flow)
  async updateBookingDate(ref, newDate) {
    const { data: { user } } = await SB.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await SB.from('bookings')
      .update({ booking_date: newDate })
      .eq('reference', ref)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Booking not found');
    return data;
  },

  // ==================== AVAILABILITY ====================

  // Get bookings for the current user
  async getUserBookings() {
    const user = JSON.parse(localStorage.getItem('nextgen_user'));
    if (!user) return [];
    const { data, error } = await SB.from('bookings')
      .select('*')
      .or(`guest_email.eq.${user.email},user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  // Get booked dates for a destination (aggregated guest counts)
  async getAvailability(destId) {
    const { data, error } = await SB.from('bookings').select('booking_date, guests').eq('dest_id', destId).eq('status', 'confirmed');
    if (error) return { dates: [] };
    const grouped = {};
    (data || []).forEach(b => {
      if (b.booking_date) {
        grouped[b.booking_date] = (grouped[b.booking_date] || 0) + (b.guests || 1);
      }
    });
    return {
      dates: Object.entries(grouped).map(([date, count]) => ({ date, booked: count }))
    };
  },

  // ==================== TRIPS ====================

  // Get all scheduled trips
  async getTrips() {
    const { data, error } = await SB.from('trips').select('*').order('departure_date');
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Get a single trip by ID
  async getTrip(id) {
    const { data, error } = await SB.from('trips').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Check trip availability for a route — queries active trips matching from/to locations
  // Returns trips with calculated available_spots (max_capacity - booked_count)
  async checkTripAvailability(fromLocation, toLocation, date) {
    try {
      let query = SB.from('trips')
        .select('*')
        .eq('status', 'active');

      if (fromLocation) {
        query = query.ilike('from_location', `%${fromLocation}%`);
      }
      if (toLocation) {
        query = query.ilike('to_location', `%${toLocation}%`);
      }
      if (date) {
        query = query.eq('departure_date', date);
      }

      const { data, error } = await query.order('departure_date');
      if (error) throw new Error(error.message);

      // Calculate remaining spots and filter out fully booked trips
      const tripsWithSpots = (data || [])
        .map(t => ({
          ...t,
          available_spots: Math.max(0, (t.max_capacity || 0) - (t.booked_count || 0))
        }))
        .filter(t => t.available_spots > 0);

      return tripsWithSpots;
    } catch (err) {
      console.warn('[NextGen] checkTripAvailability failed:', err.message);
      return [];
    }
  },

  // Create a new trip schedule (admin only)
  async createTrip(tripData) {
    const capacity = Math.max(1, parseInt(tripData.max_capacity) || 20);
    const { data, error } = await SB.from('trips').insert({
      from_location: tripData.from_location,
      to_location: tripData.to_location,
      destination_id: tripData.destination_id || '',
      departure_date: tripData.departure_date || '',
      departure_time: tripData.departure_time || '',
      max_capacity: capacity,
      booked_count: tripData.booked_count || 0,
      status: 'active'
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Update an existing trip (admin only)
  async updateTrip(id, tripData) {
    // Check capacity if max_capacity is being reduced
    if (tripData.max_capacity !== undefined) {
      const { data: current } = await SB.from('trips')
        .select('booked_count')
        .eq('id', id)
        .single();
      if (current && tripData.max_capacity < (current.booked_count || 0)) {
        throw new Error(`Capacity cannot be less than ${current.booked_count} existing booking(s)`);
      }
    }
    const updates = {};
    if (tripData.from_location !== undefined) updates.from_location = tripData.from_location;
    if (tripData.to_location !== undefined) updates.to_location = tripData.to_location;
    if (tripData.destination_id !== undefined) updates.destination_id = tripData.destination_id;
    if (tripData.departure_date !== undefined) updates.departure_date = tripData.departure_date;
    if (tripData.departure_time !== undefined) updates.departure_time = tripData.departure_time;
    if (tripData.max_capacity !== undefined) updates.max_capacity = Math.max(1, tripData.max_capacity);
    if (tripData.booked_count !== undefined) updates.booked_count = tripData.booked_count;
    if (tripData.status !== undefined) updates.status = tripData.status;
    const { error } = await SB.from('trips').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Book a seat on a trip — validates capacity before incrementing booked_count
  async bookTrip(tripId, seatsToBook = 1) {
    // Fetch current trip state to check capacity
    const { data: trip, error: fetchErr } = await SB.from('trips')
      .select('max_capacity, booked_count, status')
      .eq('id', tripId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'active') throw new Error('Trip is not active');

    const available = (trip.max_capacity || 0) - (trip.booked_count || 0);
    if (available < seatsToBook) {
      throw new Error(`Only ${available} seat${available !== 1 ? 's' : ''} available on this trip`);
    }

    // Atomically increment booked_count only if capacity allows
    const { error: updateErr } = await SB.from('trips')
      .update({ booked_count: (trip.booked_count || 0) + seatsToBook })
      .eq('id', tripId)
      .lte('booked_count', trip.max_capacity - seatsToBook);
    if (updateErr) throw new Error('Trip is now fully booked. Please choose another trip.');
    return true;
  },

  // Release seats on a trip (e.g. on booking cancellation)
  async releaseTripSeats(tripId, seatsToRelease = 1) {
    const { data: trip, error: fetchErr } = await SB.from('trips')
      .select('booked_count')
      .eq('id', tripId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!trip) throw new Error('Trip not found');

    const newCount = Math.max(0, (trip.booked_count || 0) - seatsToRelease);
    const { error } = await SB.from('trips')
      .update({ booked_count: newCount })
      .eq('id', tripId);
    if (error) throw new Error(error.message);
    return true;
  },

  // Delete a trip (admin only)
  async deleteTrip(id) {
    const { error } = await SB.from('trips').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ==================== ADMIN DASHBOARD ====================

  // Get aggregate statistics for the admin dashboard
  async getAdminStats() {
    try {
      const { count: total_bookings } = await SB.from('bookings').select('*', { count: 'exact', head: true });
      let total_users = 0;
      try {
        const result = await SB.from('profiles').select('id', { count: 'exact', head: true });
        total_users = result.count || 0;
      } catch (_) {
        total_users = 1;
      }
      const { count: total_contacts } = await SB.from('contacts').select('*', { count: 'exact', head: true });
      const { count: total_reviews } = await SB.from('reviews').select('*', { count: 'exact', head: true });
      const { count: total_newsletter } = await SB.from('newsletter_subscribers').select('*', { count: 'exact', head: true });
      const { data: revenueData } = await SB.from('bookings').select('total');
      const total_revenue = (revenueData || []).reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
      return {
        total_bookings: total_bookings || 0,
        total_users,
        total_contacts: total_contacts || 0,
        total_reviews: total_reviews || 0,
        total_newsletter: total_newsletter || 0,
        total_revenue
      };
    } catch (_) {
      return {
        total_bookings: 0, total_users: 1, total_contacts: 0,
        total_reviews: 0, total_newsletter: 0, total_revenue: 0
      };
    }
  },

  // Get the 10 most recent bookings for the dashboard
  async getAdminRecentBookings() {
    const { data, error } = await SB.from('bookings').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) return [];
    return data || [];
  },

  // Get the 10 most recent contact submissions for the dashboard
  async getAdminRecentContacts() {
    const { data, error } = await SB.from('contacts').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) return [];
    return data || [];
  },

  // Get all bookings (admin only)
  async getAllBookings() {
    const { data, error } = await SB.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Update the status of a booking (confirmed / pending / cancelled)
  async updateBookingStatus(id, status) {
    const { error } = await SB.from('bookings').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Delete a booking (admin only)
  async deleteBooking(id) {
    const { error } = await SB.from('bookings').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Get all registered users/profiles (admin only)
  async getAllUsers() {
    try {
      const { data, error } = await SB.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    } catch (_) {
      return [];
    }
  },

  // Get all audit log entries (admin only)
  async getAuditLogs() {
    try {
      const { data, error } = await SB.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return data || [];
    } catch (_) {
      return [];
    }
  },

};

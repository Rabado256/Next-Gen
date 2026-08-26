/* ============================================
   NextGen Travel — API Client (Supabase)
   Centralized data access layer for all
   database operations (Supabase Postgres) and
   authentication (Supabase Auth)
   ============================================ */

const db = window.db;
const auth = window.auth;

// HTML-escape a string to prevent XSS injection
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// ---- Supabase helpers ----------------------------------------------------

const nowIso = () => new Date().toISOString();

// Map Supabase Auth error codes to friendly messages
function friendlyAuthError(err) {
  const msg = (err && err.message) || String(err);
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be at least')) return 'Password should be at least 6 characters.';
  if (msg.includes('Unable to validate email address')) return 'Please enter a valid email address.';
  if (msg.includes('Email rate limit exceeded')) return 'Too many attempts. Please try again later.';
  if (msg.includes('signup is disabled')) return 'Sign-ups are currently disabled.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (msg.includes('Invalid character')) return 'Password contains invalid characters.';
  return msg || 'Authentication failed';
}

// Build a normalized user object from a Supabase user + profiles row
async function buildUserData(user) {
  if (!user) return null;
  const fallback = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.email?.split('@')[0] || '',
    is_admin: false,
    email_verified: !!user.email_confirmed_at
  };
  if (!db) return fallback;
  try {
    const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
    if (profile) return Object.assign({}, fallback, profile, { id: user.id, email: user.email || profile.email || '' });
  } catch (_) { /* profile read failure falls back to auth metadata */ }
  return fallback;
}

// Core API object wrapping all Supabase interactions
const api = {
  // --- Token management (Supabase JWT, mirrored to localStorage) ---
  getToken() { return localStorage.getItem('nextgen_token'); },
  setToken(token) { localStorage.setItem('nextgen_token', token); },
  clearToken() { localStorage.removeItem('nextgen_token'); },

  // Refresh the stored session token from the current Supabase session
  async refreshToken() {
    if (!auth || !auth.getSession) return null;
    try {
      const { data } = await auth.getSession();
      const token = data?.session?.access_token;
      if (token) this.setToken(token);
      return token;
    } catch (_) { return null; }
  },

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

  // Restore session on page load — checks Supabase for the current user
  async syncSession() {
    if (!auth || !auth.getSession) return null;
    try {
      const { data: { session } } = await auth.getSession();
      if (session?.user) {
        const token = session.access_token;
        if (token) this.setToken(token);
        const userData = await buildUserData(session.user);
        if (userData) {
          localStorage.setItem('nextgen_user', JSON.stringify(userData));
          return { user: userData, token };
        }
        this.clearToken();
        localStorage.removeItem('nextgen_user');
      }
    } catch (_) {}
    return null;
  },

  // Register a new user via Supabase Auth
  async signup(name, email, password) {
    if (!auth) throw new Error('Supabase not configured');
    let result;
    try {
      result = await auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
    const user = result?.data?.user;
    if (!user) throw new Error('Signup failed. Check if email confirmation is required.');

    const userData = {
      id: user.id,
      name,
      email,
      is_admin: false,
      email_verified: !!user.email_confirmed_at,
      passport: '',
      identity_card: '',
      emergency: '',
      emergency_name: '',
      pref_hotel: false,
      pref_food: 'none',
      avatar_url: ''
    };
    // Persist initial profile in Supabase (the trigger auto-creates one, but we merge extras)
    try {
      await db.from('profiles').upsert({
        id: user.id,
        email,
        name,
        is_admin: false,
        passport: '',
        identity_card: '',
        emergency: '',
        emergency_name: '',
        pref_hotel: false,
        pref_food: 'none',
        avatar_url: '',
        created_at: nowIso()
      }, { onConflict: 'id' });
    } catch (_) { /* profile write is best-effort */ }

    localStorage.setItem('nextgen_user', JSON.stringify(userData));
    const token = result?.data?.session?.access_token;
    if (token) this.setToken(token);
    return { user: userData, token };
  },

  // Authenticate existing user with email/password
  async login(email, password) {
    if (!auth) throw new Error('Supabase not configured');
    let result;
    try {
      result = await auth.signInWithPassword({ email, password });
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
    const user = result?.data?.user;
    if (!user) throw new Error('Login failed');

    let userData = await buildUserData(user);
    if (userData && !userData.created_at) {
      // No profile yet — create one on first login
      try {
        const row = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          is_admin: false,
          created_at: nowIso()
        };
        await db.from('profiles').upsert(row, { onConflict: 'id' });
        userData = Object.assign({}, userData, row);
      } catch (_) { /* fall through to auth metadata */ }
    }
    localStorage.setItem('nextgen_user', JSON.stringify(userData));
    const token = result?.data?.session?.access_token;
    if (token) this.setToken(token);
    return { user: userData, token };
  },

  // Sign out — clears Supabase session and local data
  async logout() {
    if (auth && auth.signOut) {
      await auth.signOut().catch(() => {});
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key === 'nextgen_token')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem('nextgen_user');
    localStorage.removeItem('nextgen_activities');
    localStorage.removeItem('nextgen_wishlist');
  },

  // Fetch full profile from Supabase and update local cache
  async getProfile() {
    const userStr = localStorage.getItem('nextgen_user');
    if (!userStr) throw new Error('Not authenticated');
    const cached = JSON.parse(userStr);
    try {
      const { data: profile } = await db.from('profiles').select('*').eq('id', cached.id).single();
      if (profile) {
        localStorage.setItem('nextgen_user', JSON.stringify({ ...cached, ...profile }));
        return { ...cached, ...profile };
      }
    } catch (_) {}
    return cached;
  },

  // Update profile fields (only provided fields are changed)
  async updateProfile(profile) {
    const userStr = localStorage.getItem('nextgen_user');
    if (!userStr) throw new Error('Not authenticated');
    const cached = JSON.parse(userStr);
    const updates = { id: cached.id };
    if (profile.name !== undefined) updates.name = profile.name;
    if (profile.passport !== undefined) updates.passport = profile.passport;
    if (profile.identity_card !== undefined) updates.identity_card = profile.identity_card;
    if (profile.emergency !== undefined) updates.emergency = profile.emergency;
    if (profile.emergency_name !== undefined) updates.emergency_name = profile.emergency_name;
    if (profile.country !== undefined) updates.country = profile.country;
    if (profile.phone !== undefined) updates.phone = profile.phone;
    if (profile.pref_hotel !== undefined) updates.pref_hotel = profile.pref_hotel;
    if (profile.pref_food !== undefined) updates.pref_food = profile.pref_food;
    if (profile.avatar !== undefined) updates.avatar_url = profile.avatar;
    if (Object.keys(updates).length <= 1) return {};

    await db.from('profiles').upsert(updates, { onConflict: 'id' });
    const merged = { ...cached, ...updates };
    localStorage.setItem('nextgen_user', JSON.stringify(merged));
    return merged;
  },

  // ==================== DESTINATIONS ====================

  // Fetch all active destinations
  async getDestinations() {
    if (!db) return [];
    const { data } = await db.from('destinations').select('*').eq('is_active', true);
    return (data || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  // Fetch a single destination by ID (slug)
  async getDestination(id) {
    if (!db) return null;
    const { data } = await db.from('destinations').select('*').eq('id', id).single();
    return data || null;
  },

  // Create a new destination (admin only)
  async createDestination(destData) {
    const data = {
      id: destData.id,
      title: destData.title,
      edition: destData.edition || '',
      description: destData.desc || destData.description || '',
      price: destData.price || 0,
      country: destData.country || '',
      vibe: destData.vibe || 'romantic',
      img: destData.img || '',
      steps: destData.steps || [],
      is_active: true,
      created_at: nowIso()
    };
    await db.from('destinations').upsert(data, { onConflict: 'id' });
    return data;
  },

  // Update an existing destination (admin only)
  async updateDestination(id, destData) {
    const data = {
      id,
      title: destData.title,
      edition: destData.edition || '',
      description: destData.desc || destData.description || '',
      price: destData.price || 0,
      country: destData.country || '',
      vibe: destData.vibe || 'romantic',
      img: destData.img || '',
      steps: destData.steps || []
    };
    await db.from('destinations').upsert(data, { onConflict: 'id' });
    return data;
  },

  // Delete a destination (admin only)
  async deleteDestination(id) {
    await db.from('destinations').delete().eq('id', id);
  },

  // ==================== SAVED SEARCHES ====================

  // Save the current search criteria for the signed-in user
  async saveSearch(searchType, params) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Please sign in to save a search');
    const { data } = await db.from('saved_searches').insert({
      user_id: user.id,
      search_type: searchType,
      params: params || {},
      created_at: nowIso()
    }).select().single();
    return data;
  },

  // List the signed-in user's saved searches, newest first
  async getSavedSearches() {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data } = await db.from('saved_searches').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
  },

  // Remove a saved search by id (RLS ensures ownership)
  async deleteSavedSearch(id) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await db.from('saved_searches').delete().eq('id', id);
  },

  // ==================== BOOKINGS ====================

  // Get all bookings for the currently authenticated user
  async getMyBookings() {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data } = await db.from('bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
  },

  // Save a booking via the serverless endpoint. Guest-safe: works with or
  // without a session (Supabase service role bypasses RLS) and attributes
  // the booking to a signed-in user via the Supabase JWT when present.
  async saveBooking(bookingType, data) {
    await this.refreshToken();
    const res = await fetch('/api/confirm-booking', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ booking_type: bookingType, ...data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Booking confirmation failed');
    }
    const result = await res.json();
    return result.booking || result;
  },

  // Create a new booking with auto-generated reference code
  async createBooking(bookingData) {
    const { data: { user } } = await auth.getUser().catch(() => ({ data: { user: null } }));
    return this.saveBooking('general', {
      dest_id: bookingData.dest_id || '',
      guest_name: bookingData.name || (user ? user.email : ''),
      guest_email: bookingData.email || '',
      guest_phone: bookingData.phone || '',
      travel_date: bookingData.date || '',
      guests: parseInt(bookingData.guests) || 1,
      total_amount: parseFloat(bookingData.total) || 0,
      hotel_reservation: bookingData.hotel === 'Yes' || bookingData.hotel === true,
      from_location: bookingData.from_location || '',
      to_location: bookingData.to_location || '',
      doc_type: bookingData.doc_type || 'unknown'
    });
  },

  // Create a flight booking (separate from destination bookings)
  async createFlightBooking(data) {
    return this.saveBooking('flight', data);
  },

  // Create a hotel booking (separate from destination bookings)
  async createHotelBooking(data) {
    return this.saveBooking('hotel', data);
  },

  // Stub: get booking invoice URL (printable receipt page)
  getBookingInvoice(ref) { return '/api/invoice?reference=' + encodeURIComponent(ref); },
  invoiceUrl(ref) { return this.getBookingInvoice(ref); },
  // Download the booking receipt by opening the printable page (save-as-PDF)
  async downloadInvoice(ref) {
    window.open(this.getBookingInvoice(ref), '_blank');
    return null;
  },

  // ==================== REVIEWS ====================

  // Get all reviews for a destination
  async getReviews(destId) {
    if (!db) return [];
    const { data } = await db.from('reviews').select('*').eq('dest_id', destId).order('created_at', { ascending: false });
    return data || [];
  },

  // Submit a review for a destination (requires authentication)
  async submitReview(destId, rating, comment) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data } = await db.from('reviews').insert({
      dest_id: destId,
      user_id: user.id,
      rating,
      comment,
      created_at: nowIso()
    }).select().single();
    return data;
  },

  async createPackageBooking(data) {
    return this.saveBooking('package', data);
  },

  async createVisaBooking(data) {
    return this.saveBooking('visa', data);
  },

  // ==================== CONTACT FORM ====================

  // Submit a contact form message
  async submitContact(name, email, subject, message) {
    await db.from('contacts').insert({
      name, email, subject, message,
      is_read: false,
      created_at: nowIso()
    });
  },

  // Get all contact submissions (admin only)
  async getContacts() {
    const { data } = await db.from('contacts').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Get a single contact message by ID
  async getContact(id) {
    const { data } = await db.from('contacts').select('*').eq('id', id).single();
    return data || null;
  },

  // Mark a contact message as read
  async markContactRead(id) {
    await db.from('contacts').update({ is_read: true }).eq('id', id);
  },

  // Delete a contact message
  async deleteContact(id) {
    await db.from('contacts').delete().eq('id', id);
  },

  // ==================== NEWSLETTER ====================

  // Subscribe an email to the newsletter (duplicate emails are silently ignored)
  async subscribe(email) {
    const { data: existing } = await db.from('newsletter_subscribers')
      .select('id').eq('email', email.trim().toLowerCase()).limit(1);
    if (existing && existing.length > 0) return; // Already subscribed
    await db.from('newsletter_subscribers').insert({
      email: email.trim().toLowerCase(),
      created_at: nowIso()
    });
  },

  // Get all newsletter subscribers (admin only)
  async getNewsletterSubscribers() {
    const { data } = await db.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // ==================== CUSTOM ITINERARIES ====================

  // Get all itineraries for the current user
  async getItineraries() {
    const { data: { user } } = await auth.getUser().catch(() => ({ data: { user: null } }));
    if (!user) return [];
    const { data } = await db.from('itineraries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
  },

  // Create a new custom itinerary with day-by-day activities
  async createItinerary(data) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: result } = await db.from('itineraries').insert({
      user_id: user.id,
      title: data.title || '',
      description: data.description || '',
      days: data.days || [],
      created_at: nowIso()
    }).select().single();
    return result;
  },

  // Update an existing itinerary
  async updateItinerary(id, data) {
    await db.from('itineraries').update({
      title: data.title,
      description: data.description,
      days: data.days
    }).eq('id', id);
  },

  // Delete an itinerary
  async deleteItinerary(id) {
    await db.from('itineraries').delete().eq('id', id);
  },

  // ==================== PAYMENTS (Paystack) ====================

  // Verify a Paystack transaction by its reference (server-side, secret key)
  async paystackVerify(reference) {
    const res = await fetch('/api/paystack-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed');
    }
    return res.json();
  },

  // Confirm booking in Supabase after Paystack payment succeeds
  async confirmPayment(data) {
    const booking = await this.saveBooking('general', {
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
      reference: data.reference || ''
    });
    return { ref: booking.reference, ...booking };
  },

  // Cancel a booking by reference — updates status to 'cancelled'
  async cancelBooking(ref) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: bookings } = await db.from('bookings')
      .select('*')
      .eq('reference', ref)
      .eq('user_id', user.id)
      .limit(1);
    if (!bookings || bookings.length === 0) throw new Error('Booking not found');
    const doc = bookings[0];
    if (doc.status === 'cancelled') throw new Error('Booking is already cancelled');
    const history = Array.isArray(doc.status_history) ? doc.status_history : [];
    const now = nowIso();
    await db.from('bookings').update({
      status: 'cancelled',
      cancelled_at: now,
      status_history: [...history, { status: 'cancelled', at: now }]
    }).eq('id', doc.id);
    return Object.assign({}, doc, { status: 'cancelled', cancelled_at: now });
  },

  // Fetch a single booking by its reference code (public lookup).
  // Uses the serverless endpoint so guest bookings (no user_id) are findable.
  async getBookingByRef(ref, email) {
    if (!ref || ref.trim().length < 3) throw new Error('Invalid reference code');
    const res = await fetch('/api/lookup-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: ref.trim().toUpperCase(), email: email || '' })
    });
    let data;
    try { data = await res.json(); } catch (_) { data = {}; }
    if (!res.ok) throw new Error(data.error || 'Booking not found. Please check your reference code.');
    return data.booking;
  },

  // Update booking date (modify flow)
  async updateBookingDate(ref, newDate) {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: bookings } = await db.from('bookings')
      .select('*')
      .eq('reference', ref)
      .eq('user_id', user.id)
      .limit(1);
    if (!bookings || bookings.length === 0) throw new Error('Booking not found');
    const doc = bookings[0];
    await db.from('bookings').update({ booking_date: newDate }).eq('id', doc.id);
    return Object.assign({}, doc, { booking_date: newDate });
  },

  // ==================== AVAILABILITY ====================

  // Get bookings for the current user (by email OR user id)
  async getUserBookings() {
    const user = JSON.parse(localStorage.getItem('nextgen_user') || 'null');
    if (!user) return [];
    try {
      let results = [];
      if (user.email) {
        const { data: byEmail } = await db.from('bookings').select('*').eq('guest_email', user.email);
        if (byEmail) results = results.concat(byEmail);
      }
      if (user.id) {
        const { data: byUid } = await db.from('bookings').select('*').eq('user_id', user.id);
        if (byUid) results = results.concat(byUid);
      }
      const seen = new Set();
      const deduped = results.filter(b => {
        const key = b.id || b.reference;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    } catch (_) {
      return [];
    }
  },

  // Get booked dates for a destination (aggregated guest counts)
  async getAvailability(destId) {
    try {
      const { data: bookings } = await db.from('bookings')
        .select('*')
        .eq('dest_id', destId)
        .eq('status', 'confirmed');
      const grouped = {};
      (bookings || []).forEach(b => {
        if (b.booking_date) {
          grouped[b.booking_date] = (grouped[b.booking_date] || 0) + (b.guests || 1);
        }
      });
      return {
        dates: Object.entries(grouped).map(([date, count]) => ({ date, booked: count }))
      };
    } catch (_) {
      return { dates: [] };
    }
  },

  // ==================== TRIPS ====================

  // Get all scheduled trips
  async getTrips() {
    const { data } = await db.from('trips').select('*').order('departure_date', { ascending: false });
    return data || [];
  },

  // Get a single trip by ID
  async getTrip(id) {
    const { data } = await db.from('trips').select('*').eq('id', id).single();
    return data || null;
  },

  // Check trip availability for a route — returns trips with calculated
  // available_spots (max_capacity - booked_count), excluding fully booked ones
  async checkTripAvailability(fromLocation, toLocation, date) {
    try {
      let query = db.from('trips').select('*').eq('status', 'active');
      const { data: trips } = await query;
      let filtered = trips || [];

      if (fromLocation) {
        const needle = String(fromLocation).toLowerCase();
        filtered = filtered.filter(t => String(t.from_location || '').toLowerCase().includes(needle));
      }
      if (toLocation) {
        const needle = String(toLocation).toLowerCase();
        filtered = filtered.filter(t => String(t.to_location || '').toLowerCase().includes(needle));
      }
      if (date) {
        filtered = filtered.filter(t => t.departure_date === date);
      }

      const tripsWithSpots = filtered
        .map(t => ({
          ...t,
          available_spots: Math.max(0, (t.max_capacity || 0) - (t.booked_count || 0))
        }))
        .filter(t => t.available_spots > 0);

      return tripsWithSpots.sort((a, b) => (a.departure_date || '').localeCompare(b.departure_date || ''));
    } catch (err) {
      console.warn('[NextGen] checkTripAvailability failed:', err.message);
      return [];
    }
  },

  // Create a new trip schedule (admin only)
  async createTrip(tripData) {
    const capacity = Math.max(1, parseInt(tripData.max_capacity) || 20);
    const { data } = await db.from('trips').insert({
      from_location: tripData.from_location,
      to_location: tripData.to_location,
      destination_id: tripData.destination_id || '',
      departure_date: tripData.departure_date || '',
      departure_time: tripData.departure_time || '',
      max_capacity: capacity,
      booked_count: tripData.booked_count || 0,
      status: 'active',
      created_at: nowIso()
    }).select().single();
    return data;
  },

  // Update an existing trip (admin only)
  async updateTrip(id, tripData) {
    if (tripData.max_capacity !== undefined) {
      const current = await this.getTrip(id);
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
    await db.from('trips').update(updates).eq('id', id);
  },

  // Book a seat on a trip — uses RPC for atomic capacity check + increment
  async bookTrip(tripId, seatsToBook = 1) {
    try {
      const { data, error } = await db.rpc('book_trip', {
        p_trip_id: tripId,
        p_seats: seatsToBook
      });
      if (error) throw error;
      if (data === false || data === null) {
        // Fallback: manual check if RPC not created
        const trip = await this.getTrip(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.status !== 'active') throw new Error('Trip is not active');
        const available = (trip.max_capacity || 0) - (trip.booked_count || 0);
        if (available < seatsToBook) throw new Error(`Only ${available} seat${available !== 1 ? 's' : ''} available on this trip`);
        await db.from('trips').update({ booked_count: (trip.booked_count || 0) + seatsToBook }).eq('id', tripId);
      }
    } catch (err) {
      if (err && err.message && String(err.message).indexOf('Trip') !== -1) throw err;
      if (err && err.message && String(err.message).indexOf('seat') !== -1) throw err;
      // Final fallback: direct read + update (not atomic but functional)
      const trip = await this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (trip.status !== 'active') throw new Error('Trip is not active');
      const available = (trip.max_capacity || 0) - (trip.booked_count || 0);
      if (available < seatsToBook) throw new Error(`Only ${available} seat${available !== 1 ? 's' : ''} available on this trip`);
      await db.from('trips').update({ booked_count: (trip.booked_count || 0) + seatsToBook }).eq('id', tripId);
    }
    return true;
  },

  // Release seats on a trip (e.g. on booking cancellation)
  async releaseTripSeats(tripId, seatsToRelease = 1) {
    try {
      const trip = await this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      const newCount = Math.max(0, (trip.booked_count || 0) - seatsToRelease);
      await db.from('trips').update({ booked_count: newCount }).eq('id', tripId);
    } catch (err) {
      if (err && err.message && String(err.message).indexOf('Trip') !== -1) throw err;
      throw new Error('Could not release seats');
    }
    return true;
  },

  // Delete a trip (admin only)
  async deleteTrip(id) {
    await db.from('trips').delete().eq('id', id);
  },

  // ==================== ADMIN DASHBOARD ====================

  // Get aggregate statistics for the admin dashboard
  async getAdminStats() {
    try {
      const [bookings, users, contacts, reviews, newsletter] = await Promise.all([
        db.from('bookings').select('id, total, total_amount'),
        db.from('profiles').select('id'),
        db.from('contacts').select('id'),
        db.from('reviews').select('id'),
        db.from('newsletter_subscribers').select('id')
      ]);
      const bookingList = bookings.data || [];
      const total_revenue = bookingList.reduce((sum, b) => sum + parseFloat(b.total || b.total_amount || 0), 0);
      return {
        total_bookings: bookingList.length,
        total_users: (users.data || []).length,
        total_contacts: (contacts.data || []).length,
        total_reviews: (reviews.data || []).length,
        total_newsletter: (newsletter.data || []).length,
        total_revenue
      };
    } catch (_) {
      return {
        total_bookings: 0, total_users: 0, total_contacts: 0,
        total_reviews: 0, total_newsletter: 0, total_revenue: 0
      };
    }
  },

  // Get the 10 most recent bookings for the dashboard
  async getAdminRecentBookings() {
    try {
      const { data } = await db.from('bookings').select('*').order('created_at', { ascending: false }).limit(10);
      return data || [];
    } catch (_) {
      return [];
    }
  },

  // Get the 10 most recent contact submissions for the dashboard
  async getAdminRecentContacts() {
    try {
      const { data } = await db.from('contacts').select('*').order('created_at', { ascending: false }).limit(10);
      return data || [];
    } catch (_) {
      return [];
    }
  },

  // Get all bookings (admin only)
  async getAllBookings() {
    const { data } = await db.from('bookings').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Update the status of a booking (confirmed / pending / cancelled / completed)
  async updateBookingStatus(id, status) {
    const { data: doc } = await db.from('bookings').select('*').eq('id', id).single();
    const current = doc || {};
    const updates = { status };
    if (status === 'confirmed') updates.confirmed_at = nowIso();
    if (status === 'completed') updates.completed_at = nowIso();
    if (status === 'cancelled') updates.cancelled_at = nowIso();
    const history = Array.isArray(current.status_history) ? current.status_history : [];
    updates.status_history = [...history, { status, at: nowIso() }];
    await db.from('bookings').update(updates).eq('id', id);
  },

  // Server-side admin verification — Supabase is the source of truth for is_admin
  async adminVerify() {
    await this.refreshToken();
    const res = await fetch('/api/admin-verify', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({})
    });
    let data;
    try { data = await res.json(); } catch (_) { data = {}; }
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
  },

  // Auto-complete bookings whose travel date has passed (server-side transition)
  async completeExpiredBookings() {
    try {
      await this.refreshToken();
      const res = await fetch('/api/complete-bookings', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.completed || 0;
    } catch (_) {
      return 0;
    }
  },

  // Delete a booking (admin only)
  async deleteBooking(id) {
    await db.from('bookings').delete().eq('id', id);
  },

  // Get all registered users/profiles (admin only)
  async getAllUsers() {
    try {
      const { data } = await db.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    } catch (_) {
      return [];
    }
  },

  // Get all audit log entries (admin only)
  async getAuditLogs() {
    try {
      const { data } = await db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    } catch (_) {
      return [];
    }
  },

  // Get ALL destinations including inactive ones (admin only)
  async getAdminDestinations() {
    const { data } = await db.from('destinations').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Get all reviews (admin only)
  async getAllReviews() {
    const { data } = await db.from('reviews').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  // Get a single booking by id
  async getBooking(id) {
    const { data } = await db.from('bookings').select('*').eq('id', id).single();
    return data || null;
  },

  // Get a single profile by id (admin only)
  async getProfileById(id) {
    const { data } = await db.from('profiles').select('*').eq('id', id).single();
    return data || null;
  },

  // Update a profile by id (admin only)
  async updateProfileById(id, updates) {
    await db.from('profiles').update(updates).eq('id', id);
  },

  // Get all custom itineraries (admin only)
  async getAllItineraries() {
    const { data } = await db.from('itineraries').select('*').order('created_at', { ascending: false });
    return data || [];
  },

};

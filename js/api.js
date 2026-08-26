/* ============================================
   NextGen Travel — API Client (Firebase)
   Centralized data access layer for all
   database operations (Firestore) and
   authentication (Firebase Auth)
   ============================================ */

// References to the globally initialized Firebase clients
const auth = window.auth;
const db = window.db;
const fbReady = !!db && !!auth && typeof auth.onAuthStateChanged === 'function' && auth.onAuthStateChanged !== Function.prototype.onAuthStateChanged;

// HTML-escape a string to prevent XSS injection
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// ---- Firestore helpers ----------------------------------------------------

// Convert a DocumentSnapshot into a plain object with `id` preserved
function docToObj(doc) {
  if (!doc || !doc.exists) return null;
  return Object.assign({}, doc.data() || {}, { id: doc.id });
}

// Convert a QuerySnapshot into an array of plain objects
function qsToArray(qs) {
  return qs.docs.map(docToObj).filter(Boolean);
}

// Sort an array of objects by a field (Firestore-compatible value ordering)
function sortBy(arr, field, descending) {
  return arr.slice().sort((a, b) => {
    const av = a ? a[field] : '';
    const bv = b ? b[field] : '';
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return descending ? -cmp : cmp;
  });
}

const nowIso = () => new Date().toISOString();

// Map Firebase Auth error codes to friendly messages
function friendlyAuthError(err) {
  const code = err && err.code;
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-login-credentials': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before finishing.',
    'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.',
    'auth/unauthorized-domain': 'This domain is not authorized. Add it in Firebase Console → Authentication → Authorized domains.'
  };
  return map[code] || (err && err.message) || 'Authentication failed';
}

// Build a normalized user object from a Firebase user + Firestore profile
async function buildUserData(user) {
  if (!user) return null;
  const fallback = {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || (user.email ? user.email.split('@')[0] : ''),
    is_admin: false,
    email_verified: !!user.emailVerified
  };
  if (!db) return fallback;
  try {
    const doc = await db.collection('profiles').doc(user.uid).get();
    const profile = docToObj(doc);
    if (profile) return Object.assign({}, fallback, profile, { id: user.uid, email: user.email || profile.email || '' });
  } catch (_) { /* profile read failure falls back to auth metadata */ }
  return fallback;
}

// Core API object wrapping all Firebase interactions
const api = {
  // --- Token management (Firebase ID token, mirrored to localStorage) ---
  getToken() { return localStorage.getItem('nextgen_token'); },
  setToken(token) { localStorage.setItem('nextgen_token', token); },
  clearToken() { localStorage.removeItem('nextgen_token'); },

  // Refresh the stored ID token from the current Firebase user (if signed in)
  async refreshToken() {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken().catch(() => null);
    if (token) this.setToken(token);
    return token;
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

  // Restore session on page load — checks Firebase for the current user
  async syncSession() {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken().catch(() => null);
      if (token) this.setToken(token);
      const userData = await buildUserData(user);
      if (userData) {
        localStorage.setItem('nextgen_user', JSON.stringify(userData));
        return { user: userData, token };
      }
      // buildUserData returned null only for a missing user
      this.clearToken();
      localStorage.removeItem('nextgen_user');
    }
    return null;
  },

  // Register a new user via Firebase Auth
  async signup(name, email, password) {
    let user;
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      user = cred.user;
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
    if (!user) throw new Error('Signup failed. Check if email confirmation is required.');
    if (name) {
      try { await user.updateProfile({ displayName: name }); } catch (_) { /* best-effort */ }
    }
    // Send verification email (best-effort — never blocks signup)
    try { await user.sendEmailVerification(); } catch (_) { /* verification disabled */ }

    const userData = {
      id: user.uid,
      name,
      email,
      is_admin: false,
      email_verified: !!user.emailVerified,
      passport: '',
      identity_card: '',
      emergency: '',
      emergency_name: '',
      pref_hotel: false,
      pref_food: 'none',
      avatar_url: ''
    };
    // Persist initial profile in Firestore
    try {
      await db.collection('profiles').doc(user.uid).set(Object.assign({}, userData, { created_at: nowIso() }), { merge: true });
    } catch (_) { /* profile write is best-effort */ }
    localStorage.setItem('nextgen_user', JSON.stringify(userData));
    const token = await user.getIdToken().catch(() => null);
    if (token) this.setToken(token);
    return { user: userData, token };
  },

  // Authenticate existing user with email/password
  async login(email, password) {
    let user;
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      user = cred.user;
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
    if (!user) throw new Error('Login failed');

    let userData = await buildUserData(user);
    if (userData && !userData.created_at) {
      // No profile yet — create one on first login
      try {
        const row = {
          id: user.uid,
          email: user.email,
          name: user.displayName || (user.email ? user.email.split('@')[0] : ''),
          is_admin: false,
          created_at: nowIso()
        };
        await db.collection('profiles').doc(user.uid).set(row, { merge: true });
        userData = Object.assign({}, userData, row);
      } catch (_) { /* fall through to auth metadata */ }
    }
    localStorage.setItem('nextgen_user', JSON.stringify(userData));
    const token = await user.getIdToken().catch(() => null);
    if (token) this.setToken(token);
    return { user: userData, token };
  },

  // Sign out — clears Firebase session and local data
  async logout() {
    await auth.signOut().catch(() => {});
    // Belt-and-braces: wipe any Firebase-persisted session tokens so a page
    // reload immediately after logout can't silently restore the session.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:') || key === 'nextgen_token')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem('nextgen_user');
    localStorage.removeItem('nextgen_activities');
    localStorage.removeItem('nextgen_wishlist');
  },

  // Fetch full profile from Firestore and update local cache
  async getProfile() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const profile = await buildUserData(user);
    if (profile) localStorage.setItem('nextgen_user', JSON.stringify(profile));
    return profile || user;
  },

  // Update profile fields (only provided fields are changed)
  async updateProfile(profile) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const updates = {};
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
    if (Object.keys(updates).length === 0) return {};

    // Merge into the profile document (creates it on first save)
    await db.collection('profiles').doc(user.uid).set(updates, { merge: true });
    // Merge updated data with local cache
    const current = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
    const merged = { ...current, ...updates };
    localStorage.setItem('nextgen_user', JSON.stringify(merged));
    return merged;
  },

  // ==================== DESTINATIONS ====================

  // Fetch all active destinations
  async getDestinations() {
    if (!db) return [];
    const qs = await db.collection('destinations').where('is_active', '==', true).get();
    return sortBy(qsToArray(qs), 'created_at', false);
  },

  // Fetch a single destination by ID (slug)
  async getDestination(id) {
    if (!db) return null;
    const doc = await db.collection('destinations').doc(id).get();
    return docToObj(doc);
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
    await db.collection('destinations').doc(data.id).set(data, { merge: true });
    return data;
  },

  // Update an existing destination (admin only)
  async updateDestination(id, destData) {
    const data = {
      title: destData.title,
      edition: destData.edition || '',
      description: destData.desc || destData.description || '',
      price: destData.price || 0,
      country: destData.country || '',
      vibe: destData.vibe || 'romantic',
      img: destData.img || '',
      steps: destData.steps || []
    };
    await db.collection('destinations').doc(id).set(data, { merge: true });
    return Object.assign({ id }, data);
  },

  // Delete a destination (admin only)
  async deleteDestination(id) {
    await db.collection('destinations').doc(id).delete();
  },

  // ==================== SAVED SEARCHES ====================

  // Save the current search criteria for the signed-in user
  async saveSearch(searchType, params) {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to save a search');
    const ref = await db.collection('saved_searches').add({
      user_id: user.uid,
      search_type: searchType,
      params: params || {},
      created_at: nowIso()
    });
    const doc = await ref.get();
    return docToObj(doc);
  },

  // List the signed-in user's saved searches, newest first
  async getSavedSearches() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const qs = await db.collection('saved_searches').where('user_id', '==', user.uid).get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Remove a saved search by id (security rules ensure ownership)
  async deleteSavedSearch(id) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await db.collection('saved_searches').doc(id).delete();
  },

  // ==================== BOOKINGS ====================

  // Get all bookings for the currently authenticated user
  async getMyBookings() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const qs = await db.collection('bookings').where('user_id', '==', user.uid).get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Save a booking via the serverless endpoint. Guest-safe: works with or
  // without a session (Firebase Admin bypasses security rules) and attributes
  // the booking to a signed-in user via the Firebase ID token when present.
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
    const user = auth.currentUser;
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
    const qs = await db.collection('reviews').where('dest_id', '==', destId).get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Submit a review for a destination (requires authentication)
  async submitReview(destId, rating, comment) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const ref = await db.collection('reviews').add({
      dest_id: destId,
      user_id: user.uid,
      rating,
      comment,
      created_at: nowIso()
    });
    const doc = await ref.get();
    return docToObj(doc);
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
    await db.collection('contacts').add({
      name, email, subject, message,
      is_read: false,
      created_at: nowIso()
    });
  },

  // Get all contact submissions (admin only)
  async getContacts() {
    const qs = await db.collection('contacts').get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Get a single contact message by ID
  async getContact(id) {
    const doc = await db.collection('contacts').doc(id).get();
    return docToObj(doc);
  },

  // Mark a contact message as read
  async markContactRead(id) {
    await db.collection('contacts').doc(id).set({ is_read: true }, { merge: true });
  },

  // Delete a contact message
  async deleteContact(id) {
    await db.collection('contacts').doc(id).delete();
  },

  // ==================== NEWSLETTER ====================

  // Subscribe an email to the newsletter (duplicate emails are silently ignored)
  async subscribe(email) {
    const existing = await db.collection('newsletter_subscribers')
      .where('email', '==', email.trim().toLowerCase()).limit(1).get();
    if (!existing.empty) return; // Already subscribed
    await db.collection('newsletter_subscribers').add({
      email: email.trim().toLowerCase(),
      created_at: nowIso()
    });
  },

  // Get all newsletter subscribers (admin only)
  async getNewsletterSubscribers() {
    const qs = await db.collection('newsletter_subscribers').get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // ==================== CUSTOM ITINERARIES ====================

  // Get all itineraries for the current user
  async getItineraries() {
    const user = auth.currentUser;
    if (!user) return [];
    const qs = await db.collection('itineraries').where('user_id', '==', user.uid).get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Create a new custom itinerary with day-by-day activities
  async createItinerary(data) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const ref = await db.collection('itineraries').add({
      user_id: user.uid,
      title: data.title || '',
      description: data.description || '',
      days: data.days || [],
      created_at: nowIso()
    });
    const doc = await ref.get();
    return docToObj(doc);
  },

  // Update an existing itinerary
  async updateItinerary(id, data) {
    await db.collection('itineraries').doc(id).set({
      title: data.title,
      description: data.description,
      days: data.days
    }, { merge: true });
  },

  // Delete an itinerary
  async deleteItinerary(id) {
    await db.collection('itineraries').doc(id).delete();
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

  // Confirm booking in Firestore after Paystack payment succeeds
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
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const qs = await db.collection('bookings')
      .where('reference', '==', ref)
      .where('user_id', '==', user.uid)
      .limit(1)
      .get();
    if (qs.empty) throw new Error('Booking not found');
    const doc = qs.docs[0];
    const data = docToObj(doc);
    if (data.status === 'cancelled') throw new Error('Booking is already cancelled');
    const history = Array.isArray(data.status_history) ? data.status_history : [];
    const now = nowIso();
    await db.collection('bookings').doc(doc.id).set({
      status: 'cancelled',
      cancelled_at: now,
      status_history: [...history, { status: 'cancelled', at: now }]
    }, { merge: true });
    return Object.assign({}, data, { status: 'cancelled', cancelled_at: now });
  },

  // Fetch a single booking by its reference code (public lookup).
  // Uses the service-role endpoint so guest bookings (no user_id) are findable.
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
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const qs = await db.collection('bookings')
      .where('reference', '==', ref)
      .where('user_id', '==', user.uid)
      .limit(1)
      .get();
    if (qs.empty) throw new Error('Booking not found');
    const doc = qs.docs[0];
    await db.collection('bookings').doc(doc.id).set({ booking_date: newDate }, { merge: true });
    return Object.assign({ id: doc.id }, doc.data(), { booking_date: newDate });
  },

  // ==================== AVAILABILITY ====================

  // Get bookings for the current user (by email OR user id)
  async getUserBookings() {
    const user = JSON.parse(localStorage.getItem('nextgen_user') || 'null');
    if (!user) return [];
    try {
      let results = [];
      if (user.email) {
        const byEmail = await db.collection('bookings').where('guest_email', '==', user.email).get();
        results = results.concat(qsToArray(byEmail));
      }
      if (user.id) {
        const byUid = await db.collection('bookings').where('user_id', '==', user.id).get();
        results = results.concat(qsToArray(byUid));
      }
      const seen = new Set();
      const deduped = results.filter(b => {
        const key = b.id || b.reference;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return sortBy(deduped, 'created_at', true);
    } catch (_) {
      return [];
    }
  },

  // Get booked dates for a destination (aggregated guest counts)
  async getAvailability(destId) {
    try {
      const qs = await db.collection('bookings')
        .where('dest_id', '==', destId)
        .where('status', '==', 'confirmed')
        .get();
      const grouped = {};
      qsToArray(qs).forEach(b => {
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
    const qs = await db.collection('trips').get();
    return sortBy(qsToArray(qs), 'departure_date', false);
  },

  // Get a single trip by ID
  async getTrip(id) {
    const doc = await db.collection('trips').doc(id).get();
    return docToObj(doc);
  },

  // Check trip availability for a route — returns trips with calculated
  // available_spots (max_capacity - booked_count), excluding fully booked ones
  async checkTripAvailability(fromLocation, toLocation, date) {
    try {
      const qs = await db.collection('trips').where('status', '==', 'active').get();
      let trips = qsToArray(qs);

      if (fromLocation) {
        const needle = String(fromLocation).toLowerCase();
        trips = trips.filter(t => String(t.from_location || '').toLowerCase().includes(needle));
      }
      if (toLocation) {
        const needle = String(toLocation).toLowerCase();
        trips = trips.filter(t => String(t.to_location || '').toLowerCase().includes(needle));
      }
      if (date) {
        trips = trips.filter(t => t.departure_date === date);
      }

      const tripsWithSpots = trips
        .map(t => ({
          ...t,
          available_spots: Math.max(0, (t.max_capacity || 0) - (t.booked_count || 0))
        }))
        .filter(t => t.available_spots > 0);

      return sortBy(tripsWithSpots, 'departure_date', false);
    } catch (err) {
      console.warn('[NextGen] checkTripAvailability failed:', err.message);
      return [];
    }
  },

  // Create a new trip schedule (admin only)
  async createTrip(tripData) {
    const capacity = Math.max(1, parseInt(tripData.max_capacity) || 20);
    const ref = await db.collection('trips').add({
      from_location: tripData.from_location,
      to_location: tripData.to_location,
      destination_id: tripData.destination_id || '',
      departure_date: tripData.departure_date || '',
      departure_time: tripData.departure_time || '',
      max_capacity: capacity,
      booked_count: tripData.booked_count || 0,
      status: 'active',
      created_at: nowIso()
    });
    const doc = await ref.get();
    return docToObj(doc);
  },

  // Update an existing trip (admin only)
  async updateTrip(id, tripData) {
    // Check capacity if max_capacity is being reduced
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
    await db.collection('trips').doc(id).set(updates, { merge: true });
  },

  // Book a seat on a trip — transactionally validates capacity before incrementing
  async bookTrip(tripId, seatsToBook = 1) {
    const ref = db.collection('trips').doc(tripId);
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) throw new Error('Trip not found');
        const trip = snap.data();
        if (trip.status !== 'active') throw new Error('Trip is not active');
        const available = (trip.max_capacity || 0) - (trip.booked_count || 0);
        if (available < seatsToBook) {
          throw new Error(`Only ${available} seat${available !== 1 ? 's' : ''} available on this trip`);
        }
        t.update(ref, { booked_count: (trip.booked_count || 0) + seatsToBook });
      });
    } catch (err) {
      if (err && err.message && String(err.message).indexOf('Trip') !== -1) throw err;
      throw new Error('Trip is now fully booked. Please choose another trip.');
    }
    return true;
  },

  // Release seats on a trip (e.g. on booking cancellation)
  async releaseTripSeats(tripId, seatsToRelease = 1) {
    const ref = db.collection('trips').doc(tripId);
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) throw new Error('Trip not found');
        const trip = snap.data();
        const newCount = Math.max(0, (trip.booked_count || 0) - seatsToRelease);
        t.update(ref, { booked_count: newCount });
      });
    } catch (err) {
      if (err && err.message && String(err.message).indexOf('Trip') !== -1) throw err;
      throw new Error('Could not release seats');
    }
    return true;
  },

  // Delete a trip (admin only)
  async deleteTrip(id) {
    await db.collection('trips').doc(id).delete();
  },

  // ==================== ADMIN DASHBOARD ====================

  // Get aggregate statistics for the admin dashboard
  async getAdminStats() {
    try {
      const [bookings, users, contacts, reviews, newsletter] = await Promise.all([
        db.collection('bookings').get(),
        db.collection('profiles').get(),
        db.collection('contacts').get(),
        db.collection('reviews').get(),
        db.collection('newsletter_subscribers').get()
      ]);
      const bookingList = qsToArray(bookings);
      const total_revenue = bookingList.reduce((sum, b) => sum + parseFloat(b.total || b.total_amount || 0), 0);
      return {
        total_bookings: bookings.size || 0,
        total_users: users.size || 0,
        total_contacts: contacts.size || 0,
        total_reviews: reviews.size || 0,
        total_newsletter: newsletter.size || 0,
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
      const qs = await db.collection('bookings').get();
      return sortBy(qsToArray(qs), 'created_at', true).slice(0, 10);
    } catch (_) {
      return [];
    }
  },

  // Get the 10 most recent contact submissions for the dashboard
  async getAdminRecentContacts() {
    try {
      const qs = await db.collection('contacts').get();
      return sortBy(qsToArray(qs), 'created_at', true).slice(0, 10);
    } catch (_) {
      return [];
    }
  },

  // Get all bookings (admin only)
  async getAllBookings() {
    const qs = await db.collection('bookings').get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Update the status of a booking (confirmed / pending / cancelled / completed)
  // Records the transition in status_history and stamps the matching timestamp.
  async updateBookingStatus(id, status) {
    const doc = await db.collection('bookings').doc(id).get();
    const current = docToObj(doc) || {};
    const updates = { status };
    if (status === 'confirmed') updates.confirmed_at = nowIso();
    if (status === 'completed') updates.completed_at = nowIso();
    if (status === 'cancelled') updates.cancelled_at = nowIso();
    const history = Array.isArray(current.status_history) ? current.status_history : [];
    updates.status_history = [...history, { status, at: nowIso() }];
    await db.collection('bookings').doc(id).set(updates, { merge: true });
  },

  // Server-side admin verification — Firestore is the source of truth for is_admin
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
    await db.collection('bookings').doc(id).delete();
  },

  // Get all registered users/profiles (admin only)
  async getAllUsers() {
    try {
      const qs = await db.collection('profiles').get();
      return sortBy(qsToArray(qs), 'created_at', true);
    } catch (_) {
      return [];
    }
  },

  // Get all audit log entries (admin only)
  async getAuditLogs() {
    try {
      const qs = await db.collection('audit_logs').get();
      return sortBy(qsToArray(qs), 'created_at', true).slice(0, 100);
    } catch (_) {
      return [];
    }
  },

  // Get ALL destinations including inactive ones (admin only)
  async getAdminDestinations() {
    const qs = await db.collection('destinations').get();
    return sortBy(qsToArray(qs), 'created_at', false);
  },

  // Get all reviews (admin only)
  async getAllReviews() {
    const qs = await db.collection('reviews').get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

  // Get a single booking by id
  async getBooking(id) {
    const doc = await db.collection('bookings').doc(id).get();
    return docToObj(doc);
  },

  // Get a single profile by id (admin only)
  async getProfileById(id) {
    const doc = await db.collection('profiles').doc(id).get();
    return docToObj(doc);
  },

  // Update a profile by id (admin only)
  async updateProfileById(id, updates) {
    await db.collection('profiles').doc(id).set(updates, { merge: true });
  },

  // Get all custom itineraries (admin only)
  async getAllItineraries() {
    const qs = await db.collection('itineraries').get();
    return sortBy(qsToArray(qs), 'created_at', true);
  },

};

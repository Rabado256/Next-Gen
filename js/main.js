/* ============================================
   NextGen Travel — Main Application Script
   Handles: navbar, animations, auth UI, map,
   filters, newsletter, contact form, currency
   ============================================ */

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.warn('[NextGen] Unhandled error:', e.reason?.message || e.reason);
});

// Initialize everything once the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Restore Supabase auth session from localStorage
    await api.syncSession();

    // ==========================================
    // LIQUID GLASS — Click-point ripple tracker
    // Sets --ripple-x / --ripple-y so the ::before
    // pseudo-element expands from exact touch point
    // ==========================================
    document.addEventListener('click', (e) => {
        const el = e.target.closest('.glass, .btn-discovery, .btn-noir, .vibe-btn, .dest-card, .inspire-card, .about-card, .footer-social a, .booking-confirm, .auth-form .btn-outline-light, .capsule-search-btn, .btn-explore-sm, .search-btn, .btn-contact, .whatsapp-btn, .btn-accent, .btn-submit, .admin-login-btn');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--ripple-x', x + 'px');
        el.style.setProperty('--ripple-y', y + 'px');
    });

    // ==========================================
    // 0. NAVBAR — Hide/Show on Scroll Direction
    // ==========================================
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavbar = () => {
            const currentScrollY = window.scrollY;

            // Add background once scrolled past hero section
            if (currentScrollY > 100) {
                navbar.classList.add('nav-scrolled');
            } else {
                navbar.classList.remove('nav-scrolled');
            }

            // Hide navbar when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.classList.add('nav-hidden');
            } else {
                navbar.classList.remove('nav-hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        // Throttle scroll events using requestAnimationFrame for performance
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        });
    }

    // ==========================================
    // 1. SCROLL REVEAL ANIMATIONS
    //    Uses IntersectionObserver for lazy reveal
    // ==========================================
    const snapObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    // Observe all elements with reveal classes
    document.querySelectorAll('.reveal-snap').forEach(el => snapObserver.observe(el));
    document.querySelectorAll('.reveal-up').forEach(el => snapObserver.observe(el));

    // ==========================================
    // VIBE & CONTINENT FILTERING
    //    Filter destination cards by mood/region
    // ==========================================
    const vibeBtns = document.querySelectorAll('.vibe-filters .vibe-btn');
    const destCards = document.querySelectorAll('.dest-card');
    const destTrack = document.getElementById('dest-track');

    // Filter cards based on active vibe selection
    function filterCards() {
      const activeVibe = document.querySelector('.vibe-filters .vibe-btn.active')?.dataset.vibe || 'all';
      destCards.forEach(card => {
        const matchesVibe = activeVibe === 'all' || card.dataset.vibe === activeVibe;
        if (matchesVibe) {
          card.style.display = 'block';
          setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => { card.style.display = 'none'; }, 300);
        }
      });
    }

    // Set up vibe filter button click handlers
    if (vibeBtns.length && destCards.length) {
        vibeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                vibeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterCards();
            });
        });
    }

    // ==========================================
    // CONCIERGE BUTTON — Simulated WhatsApp
    // ==========================================
    const conciergeBtn = document.getElementById('concierge-btn');
    if (conciergeBtn) {
        conciergeBtn.addEventListener('click', () => {
            const waNumber = '2347064777029';
            const waMessage = 'Hi! I just checked out your travel agency site and I\'d love some help planning my trip.';
            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`, '_blank', 'noopener');
        });
    }

    // ==========================================
    // 2. INTERACTIVE WORLD MAP (Leaflet.js)
    //    Shows all destinations with popup markers
    // ==========================================
    const mapEl = document.getElementById('world-map');
    if (mapEl && typeof L !== 'undefined') {
        const map = L.map('world-map', {
            center: [9.0820, 8.6753],  // Centered on Africa for global view
            zoom: 3,
            zoomControl: false,
            scrollWheelZoom: true
        });

        // Esri street map tile layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, TomTom, USGS',
            maxZoom: 19
        }).addTo(map);

        // GPS coordinates for all 50+ destinations across 7 continents
        const FALLBACK_COORDS = {
            amalfi: [40.6333, 14.6000], alps: [46.5369, 7.9621], kyoto: [35.0116, 135.7681],
            dolomites: [46.4983, 11.3548], santorini: [36.3932, 25.4615], iceland: [64.1466, -21.9426],
            marrakech: [31.6295, -7.9811], banff: [51.4968, -115.9281], patagonia: [-50.3365, -72.2668],
            queenstown: [-45.0312, 168.6626], bali: [-8.3405, 115.0920], provence: [43.9493, 5.1627],
            maldives: [3.2028, 73.2207], tuscany: [43.7696, 11.2558], seychelles: [-4.6796, 55.4920],
            paris: [48.8566, 2.3522], venice: [45.4408, 12.3155], 'costa-rica': [9.7489, -83.7534],
            nepal: [27.7172, 85.3240], mozambique: [-19.4306, 35.1170], 'big-sur': [36.2700, -121.8082],
            sedona: [34.8697, -111.7610], norway: [62.0073, 6.3105], 'sri-lanka': [7.8731, 80.7718],
            azores: [37.7412, -25.6756], orlando: [28.5383, -81.3792], tokyo: [35.6762, 139.6503],
            dubai: [25.2048, 55.2708], barcelona: [41.3874, 2.1686], cancun: [21.1619, -86.8515],
            'greek-islands': [37.0775, 25.3745], mauritius: [-20.3484, 57.5522],
            'cape-town': [-33.9249, 18.4241], zanzibar: [-6.1659, 39.2026], 'nairobi-kenya': [-1.2921, 36.8219],
            egypt: [29.9792, 31.1342], bangkok: [13.7563, 100.5018], phuket: [7.8804, 98.3923],
            jaipur: [26.9124, 75.7873], seville: [37.3891, -5.9845], 'new-york': [40.7128, -74.0060],
            tulum: [20.2114, -87.4654], 'rio-de-janeiro': [-22.9068, -43.1729], cusco: [-13.5320, -71.9675],
            'buenos-aires': [-34.6037, -58.3816], amazon: [-3.4653, -62.2159], sydney: [-33.8688, 151.2093],
            'bora-bora': [-16.5004, -151.7415], 'great-barrier-reef': [-18.2871, 147.6992], fiji: [-17.7134, 178.0650],
            antarctica: [-64.7740, -64.0480]
        };

        // Try API data first; fall back to hardcoded list if unavailable
        (async () => {
            let apiDests;
            try { apiDests = await api.getDestinations(); } catch (_) { apiDests = null; }
            const coordsMap = FALLBACK_COORDS;

            if (apiDests && apiDests.length > 0) {
                // Use destinations from Supabase database
                apiDests.filter(d => coordsMap[d.id]).forEach(d => {
                    const coords = coordsMap[d.id];
                    const name = d.title || d.id;
                    const vibe = d.vibe || 'general';
                    const country = d.country || '';
                    L.marker(coords).addTo(map)
                        .bindPopup(`<b>${escapeHtml(name)}</b><br>${escapeHtml(country)} // ${escapeHtml(vibe)}`);
                });
            } else {
                // Fallback hardcoded list when API is unavailable
                const fallbackList = [
                    { id: 'amalfi', name: 'Amalfi Poetry', desc: 'Italy // romantic' },
                    { id: 'alps', name: 'Swiss Alps', desc: 'Alps // solo' },
                    { id: 'kyoto', name: 'Kyoto Ritual', desc: 'Japan // solo' },
                    { id: 'dolomites', name: 'Dolomites Dawn', desc: 'Italy // adventure' },
                    { id: 'santorini', name: 'Santorini Dream', desc: 'Greece // romantic' },
                    { id: 'iceland', name: 'Iceland Element', desc: 'Iceland // adventure' },
                    { id: 'marrakech', name: 'Marrakech Mystique', desc: 'Morocco // family' },
                    { id: 'banff', name: 'Banff Solitude', desc: 'Canada // adventure' },
                    { id: 'patagonia', name: 'Patagonia Frontier', desc: 'Argentina // adventure' },
                    { id: 'queenstown', name: 'Queenstown Aether', desc: 'New Zealand // adventure' },
                    { id: 'bali', name: 'Bali Temple', desc: 'Indonesia // solo' },
                    { id: 'provence', name: 'Provence Golden', desc: 'France // romantic' },
                    { id: 'maldives', name: 'Maldives Azure', desc: 'Maldives // romantic' },
                    { id: 'tuscany', name: 'Tuscany Golden', desc: 'Italy // romantic' },
                    { id: 'seychelles', name: 'Seychelles Dream', desc: 'Seychelles // romantic' },
                    { id: 'paris', name: 'Paris Eternal', desc: 'France // romantic' },
                    { id: 'venice', name: 'Venice Timeless', desc: 'Italy // romantic' },
                    { id: 'costa-rica', name: 'Costa Rica Wild', desc: 'Costa Rica // adventure' },
                    { id: 'nepal', name: 'Nepal Ascent', desc: 'Nepal // adventure' },
                    { id: 'mozambique', name: 'Mozambique Shore', desc: 'Mozambique // adventure' },
                    { id: 'big-sur', name: 'Big Sur Solitude', desc: 'USA // solo' },
                    { id: 'sedona', name: 'Sedona Vortex', desc: 'USA // solo' },
                    { id: 'norway', name: 'Norwegian Fjords', desc: 'Norway // solo' },
                    { id: 'sri-lanka', name: 'Sri Lanka Spice', desc: 'Sri Lanka // solo' },
                    { id: 'azores', name: 'Azores Mystic', desc: 'Portugal // solo' },
                    { id: 'orlando', name: 'Orlando Wonder', desc: 'USA // family' },
                    { id: 'tokyo', name: 'Tokyo Boundless', desc: 'Japan // family' },
                    { id: 'dubai', name: 'Dubai Spectacle', desc: 'UAE // family' },
                    { id: 'barcelona', name: 'Barcelona Vibe', desc: 'Spain // family' },
                    { id: 'cancun', name: 'Cancun Paradise', desc: 'Mexico // family' },
                    { id: 'greek-islands', name: 'Greek Islands Sun', desc: 'Greece // family' },
                    { id: 'mauritius', name: 'Mauritius Haven', desc: 'Mauritius // family' }
                ];
                fallbackList.forEach(d => {
                    const coords = coordsMap[d.id];
                    if (coords) {
                        L.marker(coords).addTo(map)
                            .bindPopup(`<b>${d.name}</b><br>${d.desc}`);
                    }
                });
            }
        })();
    }

    // ==========================================
    // 3. PARALLAX SCROLL — About Section
    //    Moves background image based on scroll
    // ==========================================
    const aboutSection = document.querySelector('.about-section');
    const aboutBg = document.querySelector('.about-bg');
    if (aboutSection && aboutBg) {
        window.addEventListener('scroll', () => {
            const rect = aboutSection.getBoundingClientRect();
            const scrollProgress = 1 - (rect.top / window.innerHeight);
            if (scrollProgress >= -0.5 && scrollProgress <= 1.5) {
                const offset = scrollProgress * 120;
                aboutBg.style.transform = `translateY(${offset}px)`;
            }
        }, { passive: true });
    }

    // ==========================================
    // 5. AUTH MODAL & USER SESSION UI
    //    Handles login/signup modal, profile
    //    center, and persistent session state
    // ==========================================
    const authLogin = document.getElementById('auth-login');
    const authSignup = document.getElementById('auth-signup');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authButton = document.querySelector('[data-bs-target="#auth-modal"]');
    const navbarNav = document.querySelector('.ms-auto.d-flex');

    // Track wrapper so we can remove on logout
    let profileWrapper = null;

    // Update navbar auth button based on login state
    const updateAuthUI = () => {
        const token = api.getToken();
        const user = JSON.parse(localStorage.getItem('nextgen_user'));
        if (token && user && authButton) {
            const avatarSrc = user.avatar_url || user.avatar || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23d4a373%22/%3E%3Ccircle cx=%2250%22 cy=%2235%22 r=%2215%22 fill=%22%23fff%22/%3E%3Cpath d=%22M20 80 Q50 55 80 80%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%226%22/%3E%3C/svg%3E';

            // Build wrapper: avatar on top, greeting below
            authButton.innerHTML = '<div class="user-avatar-circle"><img src="' + escapeHtml(avatarSrc) + '" alt="Profile"></div>';
            authButton.removeAttribute('data-bs-toggle');
            authButton.removeAttribute('data-bs-target');
            authButton.classList.remove('user-profile-btn');
            authButton.style.border = 'none';
            authButton.style.background = 'transparent';

            if (!profileWrapper || !profileWrapper.parentNode) {
                profileWrapper = document.createElement('div');
                profileWrapper.className = 'd-flex flex-column align-items-center';
                authButton.parentNode.replaceChild(profileWrapper, authButton);
                profileWrapper.appendChild(authButton);
                const greet = document.createElement('span');
                greet.className = 'text-white fw-medium';
                greet.style.fontSize = '0.6rem';
                greet.style.lineHeight = '1.1';
                greet.id = 'nav-greeting';
                profileWrapper.appendChild(greet);
            }
            document.getElementById('nav-greeting').textContent = 'Howdy, ' + escapeHtml(user.name.split(' ')[0]);

            // Click opens the Profile Center modal
            if (!authButton._hasProfileListener) {
                authButton._hasProfileListener = true;
                authButton.addEventListener('click', async () => {
                    const el = document.getElementById('profile-modal');
                    if (!el) return;
                    const profileModal = new bootstrap.Modal(el);
                    await renderProfileCenter();
                    profileModal.show();
                });
            }

            // Remove old logout button from navbar (now inside profile center)
            const oldLogout = document.getElementById('logout-btn');
            if (oldLogout) oldLogout.remove();
        } else if (!token && authButton) {
            // Show person icon when logged out
            authButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            authButton.setAttribute('data-bs-toggle', 'modal');
            authButton.setAttribute('data-bs-target', '#auth-modal');
            authButton.classList.remove('user-profile-btn');
            authButton.style.border = '';
            authButton.style.background = '';
            // Remove wrapper and re-insert bare button
            if (profileWrapper && profileWrapper.parentNode) {
                profileWrapper.parentNode.replaceChild(authButton, profileWrapper);
            }
            profileWrapper = null;
        }
    };

    // Populate the Profile Center modal with user data
    const renderProfileCenter = async () => {
        try {
            const fresh = await api.getProfile();
            if (fresh) {
                const current = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
                localStorage.setItem('nextgen_user', JSON.stringify({ ...current, ...fresh }));
            }
        } catch (_) {}

        const user = JSON.parse(localStorage.getItem('nextgen_user'));
        if (!user) return;

        document.getElementById('pfl-name').value = user.name || '';
        document.getElementById('pfl-email').value = user.email || '';
        document.getElementById('pfl-country').value = user.country || '';
        document.getElementById('pfl-phone').value = user.phone || '';
        document.getElementById('pfl-passport').value = user.passport || '';
        document.getElementById('pfl-idcard').value = user.identity_card || '';
        document.getElementById('pfl-emergency').value = user.emergency || '';
        document.getElementById('pfl-emergency-name').value = user.emergency_name || '';

        document.getElementById('pfl-hotel').checked = user.pref_hotel == 1 || user.pref_hotel === true;
        document.getElementById('pfl-food').value = user.pref_food || '';

        const name = user.name || 'Guest';
        document.getElementById('pfl-name-display').textContent = name;
        document.getElementById('pfl-email-display').textContent = user.email || '';
        document.getElementById('pfl-avatar-img').src = user.avatar_url || user.avatar || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23d4a373%22/%3E%3Ccircle cx=%2250%22 cy=%2235%22 r=%2215%22 fill=%22%23fff%22/%3E%3Cpath d=%22M20 80 Q50 55 80 80%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%226%22/%3E%3C/svg%3E';

        try {
            const bookings = await api.getUserBookings();
            document.getElementById('pfl-stat-bookings').textContent = bookings.length;
            const countries = new Set(bookings.map(b => b.to_location).filter(Boolean));
            document.getElementById('pfl-stat-countries').textContent = countries.size;
        } catch (_) {}
        const wishlist = JSON.parse(localStorage.getItem('nextgen_wishlist') || '[]');
        document.getElementById('pfl-stat-wishlist').textContent = wishlist.length;
    };

    function showPflAlert(msg, type) {
        const a = document.getElementById('pfl-alert');
        if (!a) return;
        a.textContent = msg;
        a.style.background = type === 'error' ? '#f8d7da' : '#d4edda';
        a.style.color = type === 'error' ? '#721c24' : '#155724';
        a.style.display = 'block';
        setTimeout(() => { a.style.display = 'none'; }, 4000);
    }

    // Personal Information save
    document.getElementById('pfl-save-personal')?.addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
        user.name = document.getElementById('pfl-name').value;
        user.country = document.getElementById('pfl-country').value;
        user.phone = document.getElementById('pfl-phone').value;
        localStorage.setItem('nextgen_user', JSON.stringify(user));
        document.getElementById('pfl-name-display').textContent = user.name || 'My Profile';
        updateAuthUI();
        try {
            await api.updateProfile({ name: user.name, country: user.country, phone: user.phone });
            showPflAlert('Profile updated successfully');
        } catch (_) { showPflAlert('Saved locally', 'error'); }
    });

    // Travel Documents save
    document.getElementById('pfl-save-docs')?.addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
        const passport = document.getElementById('pfl-passport').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const idcard = document.getElementById('pfl-idcard').value.trim().toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
        document.getElementById('pfl-passport').value = passport;
        document.getElementById('pfl-idcard').value = idcard;
        user.passport = passport;
        user.identity_card = idcard;
        user.emergency = document.getElementById('pfl-emergency').value;
        user.emergency_name = document.getElementById('pfl-emergency-name').value;
        localStorage.setItem('nextgen_user', JSON.stringify(user));
        try {
            await api.updateProfile({ passport, identity_card: idcard, emergency: user.emergency, emergency_name: user.emergency_name });
            showPflAlert('Documents saved successfully');
        } catch (_) { showPflAlert('Saved locally', 'error'); }
    });

    // Preferences save
    document.getElementById('pfl-save-prefs')?.addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem('nextgen_user') || '{}');
        user.pref_hotel = document.getElementById('pfl-hotel').checked ? 1 : 0;
        user.pref_food = document.getElementById('pfl-food').value;
        localStorage.setItem('nextgen_user', JSON.stringify(user));
        try {
            await api.updateProfile({ pref_hotel: document.getElementById('pfl-hotel').checked, pref_food: user.pref_food });
            showPflAlert('Preferences saved');
        } catch (_) { showPflAlert('Saved locally', 'error'); }
    });

    // Avatar upload
    document.getElementById('pfl-avatar-input')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const user = JSON.parse(localStorage.getItem('nextgen_user'));
                user.avatar = event.target.result;
                user.avatar_url = event.target.result;
                localStorage.setItem('nextgen_user', JSON.stringify(user));
                document.getElementById('pfl-avatar-img').src = user.avatar;
                updateAuthUI();
                try { await api.updateProfile({ avatar: user.avatar }); } catch (_) {}
            };
            reader.readAsDataURL(file);
        }
    });

    // Change password
    document.getElementById('pfl-btn-password')?.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('password-modal')).show();
    });

    document.getElementById('pfl-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('pfl-password-error');
        errEl.style.display = 'none';
        const newPass = document.getElementById('pfl-new-password').value;
        const confirmPass = document.getElementById('pfl-confirm-password').value;
        if (newPass !== confirmPass) {
            errEl.textContent = 'Passwords do not match';
            errEl.style.display = 'block';
            return;
        }
        try {
            const { data: { user }, error: authErr } = await SB.auth.getUser();
            if (authErr) throw authErr;
            const currentPass = document.getElementById('pfl-current-password').value;
            const { error: loginErr } = await SB.auth.signInWithPassword({ email: user.email, password: currentPass });
            if (loginErr) {
                errEl.textContent = 'Current password is incorrect';
                errEl.style.display = 'block';
                return;
            }
            const { error: updateErr } = await SB.auth.updateUser({ password: newPass });
            if (updateErr) throw updateErr;
            bootstrap.Modal.getInstance(document.getElementById('password-modal')).hide();
            document.getElementById('pfl-password-form').reset();
            showPflAlert('Password updated successfully');
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
        }
    });

    // Logout — await the session teardown before leaving the page, otherwise
    // the reload can race ahead of Supabase clearing its persisted session and
    // the user gets logged straight back in.
    document.getElementById('pfl-btn-logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing out...';
        try {
            await api.logout();
        } catch (_) { /* session teardown is best-effort; local storage is cleared regardless */ }
        window.location.href = 'index.html';
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    });

    // Auth tab switching (Login / Signup)
    if (authTabs.length) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
                document.getElementById('auth-' + tab.dataset.auth).style.display = 'block';
            });
        });
    }

    // Helper: show inline error message on auth forms
    function showAuthError(form, message) {
        let errEl = form.querySelector('.auth-error');
        if (!errEl) {
            errEl = document.createElement('p');
            errEl.className = 'auth-error small text-danger mt-2 mb-0 text-center';
            form.querySelector('button[type="submit"]').insertAdjacentElement('afterend', errEl);
        }
        errEl.textContent = message;
        setTimeout(() => { errEl.textContent = ''; }, 5000);
    }

    // Signup form submission
    if (authSignup) {
        authSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = authSignup.querySelector('button[type="submit"]');
            const name = authSignup.querySelector('input[placeholder="Your full name"]')?.value || authSignup.querySelector('input[type="text"]')?.value || '';
            const email = authSignup.querySelector('input[type="email"]').value;
            const passwords = authSignup.querySelectorAll('input[type="password"]');
            const password = passwords[0]?.value;
            const confirmPassword = passwords[1]?.value;
            if (password !== confirmPassword) {
                showAuthError(authSignup, 'Passwords do not match');
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Creating...';
            showAuthError(authSignup, '');
            try {
                await api.signup(name, email, password);
                const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
                if (modal) modal.hide();
                authSignup.reset();
                updateAuthUI();
            } catch (err) {
                showAuthError(authSignup, err.message);
            }
            btn.disabled = false;
            btn.textContent = 'Create Account';
        });
    }

    // Login form submission
    if (authLogin) {
        authLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = authLogin.querySelector('button[type="submit"]');
            const email = authLogin.querySelector('input[type="email"]').value;
            const password = authLogin.querySelector('input[type="password"]').value;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Signing in...';
            showAuthError(authLogin, '');
            try {
                await api.login(email, password);
                const modal = bootstrap.Modal.getInstance(document.getElementById('auth-modal'));
                if (modal) modal.hide();
                authLogin.reset();
                updateAuthUI();
            } catch (err) {
                showAuthError(authLogin, err.message);
            }
            btn.disabled = false;
            btn.textContent = 'Login';
        });
    }

    // Google OAuth sign-in
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            googleLoginBtn.disabled = true;
            googleLoginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Connecting...';
            try {
                const { error } = await SB.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + window.location.pathname }
                });
                if (error) throw error;
            } catch (err) {
                showAuthError(authLogin, err.message || 'Google sign-in failed');
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg> Continue with Google';
            }
        });
    }

    // ==========================================
    // FUNCTIONAL WIDGETS
    // ==========================================

    // ---- 1. Newsletter Subscription ----
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            if (!email) return;
            const btn = newsletterForm.querySelector('button[type="submit"]');
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending...';
            try {
                await api.subscribe(email);
            } catch (_) {
                // Fallback: save to localStorage if server unavailable
                const subs = JSON.parse(localStorage.getItem('nextgen_newsletter') || '[]');
                if (!subs.find(s => s.email === email)) {
                    subs.push({ email, date: new Date().toLocaleDateString() });
                    localStorage.setItem('nextgen_newsletter', JSON.stringify(subs));
                }
            }
            btn.textContent = 'Subscribed!';
            emailInput.value = '';
            setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 3000);
        });
    }

    // ---- 2. Contact Form ----
    const contactForm = document.querySelector('section.contact-section form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = contactForm.querySelector('input[placeholder="Your Name"]')?.value || '';
            const email = contactForm.querySelector('input[type="email"]')?.value || '';
            const subject = contactForm.querySelector('input[placeholder="How can we help?"]')?.value || '';
            const message = contactForm.querySelector('textarea')?.value || '';
            const btn = contactForm.querySelector('button[type="submit"]');
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending...';
            try {
                await api.submitContact(name, email, subject, message);
            } catch (_) {
                const contacts = JSON.parse(localStorage.getItem('nextgen_contacts') || '[]');
                contacts.push({ name, email, subject, message, date: new Date().toLocaleDateString(), read: false });
                localStorage.setItem('nextgen_contacts', JSON.stringify(contacts));
            }
            btn.textContent = 'Message Sent!';
            btn.style.background = 'var(--comptoir-ochre)';
            contactForm.reset();
            setTimeout(() => { btn.disabled = false; btn.textContent = origText; btn.style.background = ''; }, 3000);
        });
    }

    // ---- 3. Currency Switcher (footer selector) ----
    const currencyToggle = document.querySelector('.footer-currency');
    if (currencyToggle && typeof CURRENCY !== 'undefined') {
        currencyToggle.innerHTML = '';
        currencyToggle.style.color = 'rgba(255,255,255,0.85)';
        currencyToggle.appendChild(CURRENCY.renderSelector());
        CURRENCY.updateDisplay();
    }

    // ---- 4. Currency change — refresh every price site-wide immediately ----
    if (typeof CURRENCY !== 'undefined' && typeof CURRENCY.onChange === 'function') {
        CURRENCY.onChange(() => CURRENCY.updateDisplay());
    }

    // Initial UI sync based on stored session
    updateAuthUI();
});

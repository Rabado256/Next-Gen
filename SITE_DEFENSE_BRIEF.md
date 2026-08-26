# NextGen Travel — Site Defense Brief

Complete explanation of the site so you can defend any decision with specifics.

---

## 1. The Elevator Pitch

NextGen Travel is a **premium travel booking platform** — a client project, not a portfolio piece. It's a full ecosystem: a curated visual homepage, multi-mode search (flights / hotels / packages / destinations), a multi-step checkout with real Paystack payments, full user accounts, a "track your booking" lookup, an admin dashboard, and a custom itinerary builder. The design philosophy is **"zero noise"** — no pop-ups, no countdown timers, no hidden fees — replacing booking anxiety with calm, editorial, image-led design.

**Tech stack:** Vanilla JS (ES6+) + Bootstrap 5.3 + CSS custom properties, **Supabase** (Postgres, Auth, RLS) as the backend, **Paystack** for payments (NGN pop-up), **Leaflet.js** for the world map, **Vercel serverless functions** for anything that needs a secret key. No build system, no framework — deliberately kept simple.

---

## 2. Architecture (how the pieces talk)

```
Browser (static HTML + JS)
   │
   ├──→ Supabase JS client (anon key) ──→ PostgreSQL via RLS
   │        auth, destinations, bookings, reviews, itineraries,
   │        trips, contacts, newsletter, profiles, audit_logs
   │
   ├──→ /api/paystack-verify         (Vercel fn, uses PAYSTACK_SECRET_KEY)
   ├──→ /api/confirm-booking         (Vercel fn, uses SUPABASE_SERVICE_ROLE_KEY)
   └──→ /api/lookup-booking          (Vercel fn, service-role lookup)
```

The key design decision: **the browser never touches any secret key.** Everything secret lives in `api/*.js` serverless functions (deployed on Vercel, see `vercel.json`), which read from `.env`. The frontend only has the Supabase **anon** key and the Paystack **public** key — both are safe to expose by design.

Two dev modes:
- `npm start` → `server.js` (Node http server that serves static files AND proxies the same `/api/*` serverless handlers locally)
- `npm run dev` → `npx serve .` (pure static; API endpoints still work on Vercel)
- Deployed via Vercel with `vercel.json` outputting the repo root.

---

## 3. Database — 9 tables (`supabase-schema.sql`)

| Table | Purpose |
|---|---|
| `profiles` | extends `auth.users`: name, passport, ID card, emergency contact, country, phone, preferences, **`is_admin`** |
| `destinations` | curated packages: title, edition, price, country, vibe, image, itinerary steps (JSONB) |
| `bookings` | every booking type: flight/hotel/package/visa/general, status, reference, payment_id, travelers (JSONB) |
| `contacts` | contact-form messages |
| `reviews` | ratings 1–5 tied to destination + user |
| `itineraries` | user-built custom trips (days as JSONB) |
| `trips` | scheduled departures with `max_capacity` / `booked_count` for availability |
| `newsletter_subscribers` | unique email constraint |
| `audit_logs` | admin action trail (who did what, IP) |

**RLS (Row Level Security)** is the security backbone:
- Public can *read* destinations and *insert* contacts/newsletter.
- Users can only read/update **their own** profile and bookings.
- **Admin-only** writes are gated by the `public.is_admin()` SECURITY DEFINER function (`profiles.is_admin = true`).
- A database trigger auto-creates a profile row on signup.

---

## 4. Key Flows — how to defend each

### a) Search (`search-results.html`)
URL params drive everything: `?from&to&depart&ret&trip&cabin&search_type`. Three result modes:
- **Flights** → `MockFlights.generateOffers()` (`js/mock-flights.js`) produces realistic Duffel-shaped offers (150+ airports, 100 airlines, 10–16 offers per search, deterministic pricing via a hash of the route) when no live Duffel token is set; if the user drops a real Duffel token in localStorage (`js/duffel.js`), it calls the real Duffel API and the mock output is shape-compatible so the UI needs zero special-casing.
- **Hotels** → `HotelDB.search()` from `js/hotels.js` (~270KB dataset).
- **Packages** → `PackageDB.search()/filter()/sort()` from `js/packages.js` (curated all-inclusive packages).

### b) Smart Document Detection (the "visa logic")
A pure-logic classifier shared across 4 pages, with a **unit test suite** (`tests/document-detection.test.js`, run via `npm test`). It extracts a country from free text in priority order: exact country match → "City, Country" comma split → city→country map → word-boundary regex → destination-title map. Then: same country on both ends = **domestic → ID card**, different = **international → passport**. If origin is empty, it falls back to the signed-in user's profile country. Visa requirements come from `js/visa-data.js`.

### c) Checkout & Payments (`checkout.html`)
Two-step flow: traveler details → Paystack pop-up. On submit:
1. `resolvePaystackKey()` fetches `/api/config` (falls back to the hardcoded public key in `js/firebase-config.js`).
2. The USD order total is converted to NGN via live rates (`usdToNgnKobo()`), then `PaystackPop.setup({ key, email, amount, currency: 'NGN', ref })` opens the Paystack pop-up (amount in kobo).
3. On success Paystack returns a reference; `api.paystackVerify(reference)` → `/api/paystack-verify` (Vercel fn) re-verifies the charge server-side with the **secret** key before any booking is saved.
4. On success, one of **five** booking branches runs (flight / hotel / package / visa / destination), each generating its own reference prefix (`FL-`, `HT-`, `PK-`, `VS-`, `NG-`).
5. Booking is persisted via `/api/confirm-booking`, then `showSuccess()` shows the confirmation with the reference code.

**Resilience you can defend:** if Paystack isn't configured it shows a clear notice and falls back to saving an offline booking reference (the `// Fallback: Paystack not configured` block). If the DB save fails after a successful payment, the user still gets their reference plus a visible warning banner (`db-save-warning`) — a charge is never silently lost. A `pk_test_` key triggers a visible **TEST MODE banner** so no one mistakes test payments for real ones.

### d) Guest-safe bookings (the newest piece)
`/api/confirm-booking` uses the **service-role key** (server-only), so *guests* can book without an account — bookings are attributed by `guest_email`, and a signed-in user's `sub` is decoded from their JWT (signature deliberately *not* verified, since Supabase issued it — this only affects attribution, not authorization). `lookup-booking.js` lets anyone look up a booking by reference **+ optional email check** so a random code alone can't pull someone's booking. There's also a schema-diff tolerance loop: if the live DB is missing a column, it strips it and retries rather than losing the booking.

### e) Auth (`main.js` + `js/api.js`)
Email/password + Google OAuth via Supabase. Session persisted to localStorage, auto-restored with `syncSession()` on every page load. Profile center has password change (re-verifies current password first), avatar upload (base64), travel docs, preferences. Guest-first design means you can do almost everything without an account.

### f) Admin dashboard (`admin.html` + `js/admin.js`)
Gate = `profiles.is_admin` (checked via the auth session, backed by RLS so the anon key can't fake it). Sections: overview stats + charts, destinations CRUD, bookings (searchable, status changes, delete), trips CRUD with capacity enforcement, users, contacts inbox, newsletter, audit logs, documents. Admin actions write to `audit_logs`.

### g) Homepage extras you should mention
- **Leaflet world map** with 50+ GPS markers; tries Supabase data, falls back to hardcoded coordinates.
- **Availability gate** before every booking: `checkTripAvailability()` queries active `trips` matching from/to/date, computes `available_spots = max_capacity − booked_count`. Seats are incremented *atomically* (`bookTrip` uses a `.lte('booked_count', …)` guard so you can't oversell).
- WhatsApp concierge (`wa.me` deep link), newsletter, currency switcher (USD/EUR/GBP/NGN/KES/GHS/ZAR/MAD with live Frankfurter rates and offline fallback rates).

---

## 5. Common "gotcha" questions — ready answers

- **"Is this real or a mock?"** — The booking, auth, payment (Paystack test mode), and DB layers are real and production-wired. Flight *search* is deterministic mock data by design (free tier), with a real Duffel API client ready if a token is supplied. Hotel and package data are curated static datasets. This is a defensible MVP scope choice, not an accident.
- **"Why expose the anon key?"** — The Supabase anon key is meant to be public; it's locked down by RLS. The *service-role* key (which bypasses RLS) never leaves the serverless functions.
- **"Why mock flights instead of live?"** — Duffel's free tier is limited and token-gated; mocks keep the entire flow (search → select → checkout → pay → book → email) testable end-to-end without burning API quota.
- **"Is the admin safe?"** — Yes, two layers: client checks `is_admin`, server enforces it via RLS policies (`is_admin()` SECURITY DEFINER). An attacker with the anon key still can't insert/modify destinations or read other users' data.
- **"Can a guest really book?"** — Yes, deliberately — guest checkout via the service-role endpoint, tracked by email, findable later via the Track Booking lookup. This maximizes conversion (the PRD's KPIs are about *time-to-book* and form completion).

---

## 6. Known weak spots (be honest, have a plan)

- The `admin.html` gate relies on the Firebase ID token belonging to a user whose Firestore profile has `is_admin: true`; the check is re-verified server-side (`/api/admin-verify`) — never trust the client copy in localStorage.
- Firebase ID tokens are verified with the Admin SDK (`verifyIdToken`) on every sensitive endpoint — no unverified JWT decoding remains.
- Mock flight prices are deterministic, not live market prices.
- `js/firebase-config.js` contains the web config (public) but is gitignored; the real secret — the service account — lives only in server env vars. If this repo ever goes public, regenerate the service account in Firebase Console.
- Flight search requires the airport to resolve in the mock's airport table; unknown routes still produce a result via a fallback code path.

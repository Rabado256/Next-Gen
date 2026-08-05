# Product Requirement Document (PRD)

## Project Name: NextGen Travel Agency
**Status:** Prototype Complete — Feature-Rich  
**Last Updated:** July 29, 2026

---

## 1. Executive Summary & Vision
Traditional travel agency platforms are often cluttered with aggressive pop-ups, overwhelming grids of text, and frantic countdown timers that create "booking anxiety."

**NextGen Travel** is a modern, premium travel agency platform designed to counter this noise. The vision is to deliver a highly visual, serene, and curated travel-booking experience. By blending a minimalist interface with immersive imagery and glassmorphic design, the platform transforms the planning phase from a chore into a seamless, inspiring journey.

### Core Philosophy
- **Zero Noise:** No flashing banners, no hidden fees, no overwhelming filter sidebars.
- **Visual Storytelling:** High-quality, intentional imagery takes center stage.
- **Liquid Glass Design:** Sophisticated three-layer glassmorphism system with backdrop blur, radial light ripples, and diagonal refractions across all interactive elements.
- **Effortless Flow:** A simple, linear path from inspiration to booking confirmation.

---

## 2. User Personas

### 2.1. The Intentional Explorer
- **Profile:** A user looking for a unique, curated vacation who values design, ease of use, and a stress-free planning experience.
- **Needs:** Desires high-quality visual context, simple itinerary breakdowns, transparent pricing without dark UX patterns.

### 2.2. The Busy Professional
- **Profile:** Someone who wants to book a premium, pre-vetted travel package quickly without sifting through thousands of conflicting reviews.
- **Needs:** A frictionless, fast checkout experience and a downloadable, clear travel itinerary instantly on completion.

### 2.3. The Admin Operator
- **Profile:** A platform administrator who manages destinations, bookings, users, and customer inquiries.
- **Needs:** A centralized dashboard to perform CRUD operations on all entities, monitor analytics, and handle support tickets.

---

## 3. High-Level Scope (Full Prototype Flow)
The prototype includes a full ecosystem of travel planning, management, and administrative tools:

```
[Curated Homepage] ➔ [Search / Inspiration / Collections]
       ➔ [Immersive Destination Detail] ➔ [Itinerary Builder]
       ➔ [Multi-Step Checkout & Booking] ➔ [Confirmation]

[User Profile & Bookings] — Manage personal info, travel docs, trip history
[Admin Dashboard] — Manages all of the above
```

---

## 4. Functional Requirements

### 4.1. Homepage & Discovery
The entry point feels like an elegant digital travel magazine.
- **Hero Section:** Full-screen background video/image with a clean search intent bar and capsule-style search widget.
- **Curated Collections:** "Travel Moods" filtering by vibe (Romantic, Adventure, Solo, Family) and continent — interactive filter buttons that dynamically show/hide destination cards.
- **Interactive World Map:** Leaflet.js-powered map with GPS markers for 50+ destinations across 7 continents, pulling data from Supabase.
- **Scroll Animations:** Intersection Observer-based reveal effects on cards and sections.
- **Concierge Button:** WhatsApp connection with animated pulse ring.
- **Parallax Effects:** Scroll-driven parallax on the About section background.
- **Micro-Interactions:** Smooth fade-ins, hover zooms, liquid glass ripple effects on click.
- **Currency Switcher:** USD/EUR toggle with DOM text updates.

### 4.2. Search & Discovery Pages

#### 4.2.1. Search Results (search-results.html)
- Full-text search across destinations with multi-mode filtering:
  - **Search Mode:** Query destinations by keyword
  - **Vibe Mode:** Filter by travel mood (Romantic, Adventure, Solo, Family)
  - **Price Mode:** Filter by budget range
  - **Continent Mode:** Filter by geographic region
- **Smart Document Detection:** Analyzes from/to locations to determine domestic vs. international travel and shows appropriate document requirement badges.
- **Trip Availability:** Real-time availability checking via API with available spots display.
- **Condensed Search Bar:** Sticky header with a pill-shaped search bar for refinement.
- **Results Grid:** Visual card layout with destination images, prices, vibe labels, country info.

#### 4.2.2. Inspiration Page (inspiration.html)
- Curated visual collections with full-bleed hero imagery.
- Per-inspiration detail view with back navigation.
- Direct link to book the featured destination.

#### 4.2.3. Blog / Journal (blog.html)
- Travel journal with article cards, full-bleed hero header.
- Category tags and reading time indicators.
- Hover zoom effects on article imagery.

### 4.3. Immersive Destination & Itinerary View
- **Hero Section:** Full-width destination image with title, edition, booking CTA.
- **Pricing & Guest Selector:** Clear per-person pricing with dynamic guest count updates.
- **Itinerary Timeline:** Day-by-day breakdown of the experience.
- **Included Amenities:** Visual iconography for Flights, Boutique Stay, Curated Tours, Private Transport.
- **Photo Gallery:** Curated image collection of the destination.
- **Reviews Section:** User-submitted ratings and comments, fetched from Supabase.
- **Smart Document Badge:** Required travel documents based on destination vs. user's profile country.
- **Action Buttons:** "Reserve Your Escape" and "Add to Wishlist" with persistence.

### 4.4. Custom Itinerary Builder (itinerary-builder.html)
- **Multi-Day Builder:** Add/remove days with custom titles, descriptions, activities per day.
- **Activity Management:** Time-stamped activities within each day.
- **Save & Load:** Persists custom itineraries to Supabase.
- **Smart Document Detection:** Analyzes destination to classify as domestic/international.
- **Export / Booking:** Option to book the custom itinerary.
- **Empty State:** Friendly prompt when no itineraries exist, login-required gate.

### 4.5. Checkout & Booking (checkout.html)
- **Multi-Step Form:**
  1. Traveler Details: Name, email, guest count, passport/ID card, hotel preference
  2. Trip Selection: From/To locations, departure date, document type
  3. Payment: Paystack pop-up (charges in NGN, USD→NGN auto-conversion)
- **Order Summary Sidebar:** Sticky card with destination image, dates, guest count, hotel add-on, total.
- **Smart Document Detection:** Real-time analysis of From/To locations with live badge and animated toast notification.
- **Location Autocomplete:** Comprehensive city/country/destination lookup (50+ destinations, 50+ cities, 50+ countries).
- **Dynamic Pricing:** Per-person base price + optional hotel add-on, real-time calculation.
- **Paystack Integration:** Real Paystack pop-up (`js.paystack.co/v1/inline.js`), charges in NGN with live USD→NGN conversion, server-side verification (`/api/paystack-verify`), fallback to offline booking reference if unconfigured.
- **Confirmation Screen:** Booking reference, itinerary summary, download option.

### 4.6. Authentication System
Full Supabase Auth integration across the platform.
- **Signup / Login Modal:** Bootstrap modal with tabbed forms, glassmorphism styling.
- **Google OAuth:** One-click Google sign-in via Supabase OAuth provider.
- **Email/Password Auth:** Signup with name, email, password, confirm password validation.
- **Session Persistence:** Auto-sync of Supabase session on page load, token in localStorage.
- **Password Reset:** forgot-password.html and reset-password.html with token handling.
- **Profile Center:** Glassmorphic modal with:
  - Personal Info: Name, passport, identity card, emergency contact, country
  - Travel Preferences: Always-book-hotel toggle, food preference
  - Tabbed Content: "Journeys" (booking history) and "Escapes" (wishlist)
  - Avatar Upload: FileReader-based base64 with localStorage persistence
  - Quick Stats: Journey count, escape count, countries visited
  - Gradient header with "Elite Voyager" membership badge

### 4.7. User Profile & Bookings

#### 4.7.1. Profile Page (profile.html)
Standalone profile page with full glassmorphism design:
- Avatar and personal info management
- Identity docs (passport, ID card)
- Emergency contact
- Travel preferences
- Password change
- Logout

#### 4.7.2. Bookings Page (bookings.html)
Full booking history page:
- Status cards with color-coded badges (Confirmed/Pending/Cancelled)
- Destination images per booking
- Booking reference, dates, guest count
- Empty state with CTA to explore destinations

### 4.8. Admin Dashboard (admin.html)
Full-featured dark-themed admin panel:
- **Dashboard Overview:** Stats cards (bookings, revenue, users, reviews, contacts, newsletter), recent bookings/contacts tables.
- **Destinations Management:** Full CRUD with inline form overlays, active/inactive toggle.
- **Bookings Management:** Searchable table, status filter, inline status change, document type badge, delete.
- **Trips Management:** Full CRUD with from/to, departure, capacity tracking, status toggle.
- **Users Management:** Searchable user table with verification status.
- **Contact Submissions:** Inbox management with read/unread, search, reply-via-email, delete.
- **Newsletter Management:** Searchable subscriber list.
- **Audit Logs:** Admin action trail with admin name, action, details, IP, timestamp.
- **Documents Section:** User document verification hub with search and filter.
- **Toast Notifications:** Success/error toast system.
- **Mobile-Responsive Sidebar:** Collapsible navigation.

### 4.9. Additional Public Pages
- **Contact (contact.html):** Inquiry form, WhatsApp integration, contact info cards.
- **Help Center (help.html):** FAQ accordion.
- **Legal (legal.html):** Terms of Service, Privacy Policy, Cookie Policy, Disclaimer.
- **Forgot/Reset/Verify Email:** Complete auth recovery flow.

---

## 5. Technical Specifications & Stack

### Stack Definitions
- **Markup:** HTML5 semantic layouts.
- **Styling & Layout:** CSS3 with Bootstrap 5.3. Custom `style.css` with 44 CSS custom properties, Liquid Glass design tokens, animations, responsive design.
- **Interactivity:** Vanilla JavaScript (ES6+), 724 lines in `main.js`.
- **Backend & Database:** Supabase (PostgreSQL, Auth, RLS, REST API).
- **Mapping:** Leaflet.js with Esri World Street Map tiles.
- **Payments:** Paystack inline pop-up, NGN charges, conditional real/fallback.
- **Flight Search:** Duffel API client (`js/duffel.js`) with user-configurable API token.
- **Geolocation:** REST Countries API for country datalists and document detection.
- **Icons:** Bootstrap Icons library.
- **Typography:** Google Fonts — Playfair Display (serif headings), Montserrat (sans body), Archivo Black (display), Inter (search hero).
- **CLI Tools:** `create-admin.js`, `test-login.js`, `tests/document-detection.test.js`.

### Database Schema (Supabase — 9 Tables)
| Table | Purpose |
| :--- | :--- |
| `profiles` | Extends auth.users with name, passport, identity_card, emergency contact, preferences, admin flag |
| `destinations` | Travel packages with id, title, edition, description, price, country, vibe, image, itinerary steps (JSONB) |
| `bookings` | Booking records with user_id, dest_id, guest info, dates, total, hotel, status, reference, plus payment columns |
| `contacts` | Contact form submissions with name, email, subject, message, read status |
| `reviews` | User reviews with rating (1-5), comment, linked to destination and user |
| `itineraries` | Custom user-built itineraries with title, description, days (JSONB) |
| `trips` | Scheduled trips with from/to, departure, capacity tracking, status |
| `newsletter_subscribers` | Email subscriptions with unique constraint |
| `audit_logs` | Admin action audit trail with admin_id, action, details, IP |

**Row Level Security:** All tables have RLS enabled with policies for user-own-data access and admin full access. Includes `public.is_admin()` security definer function.

### Authentication
- Supabase Auth with email/password and Google OAuth.
- Auto-profile creation on signup via database trigger.
- Token-based session management with localStorage persistence.
- Email verification and password reset flows.

### Smart Document Detection System
- **Lookup Dictionaries:** 50+ countries, 20+ city-to-country, 50+ destination-to-country mappings.
- **Algorithm:** Exact match → comma-separated → city lookup → word-boundary regex → destination lookup.
- **Classification:** Same country = domestic (ID card), different country = international (passport).
- **Integrated In:** checkout.html, itinerary-builder.html, search-results.html, destination.html.

---

## 6. UI/UX Design & Aesthetic Guidelines

### Design System: "Snappy Noir Nature / Premium Editorial"

#### Color Palette
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--comptoir-navy` | `#1a2b3c` | Dark navy |
| `--comptoir-ochre` | `#d4a373` | Signature accent (terracotta gold) |
| `--ocean-abyss` | `#080808` | Near-black backgrounds |
| `--land-moss` | `#2A2F22` | Dark olive |
| `--land-sage` | `#9CAF88` | Sage green |
| `--sand-marker` | `#DCCFBF` | Warm beige |
| `--sand-beige` | `#f7f5ed` | Light sand |

#### Liquid Glass System
A sophisticated three-layer glassmorphism system applied to 30+ element types:
- **Layer 1 (::before):** Radial light ripple expanding from click point via JS-set `--ripple-x`/`--ripple-y` CSS variables.
- **Layer 2 (::after):** Diagonal refraction gradient `linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06), transparent)`.
- **Layer 3 (element):** `backdrop-filter: blur(16px-40px)` with translucent background.

| Token | Value |
| :--- | :--- |
| `--glass-bg` | `rgba(255,255,255,0.06)` |
| `--glass-blur` | `16px` |
| `--glass-blur-heavy` | `24px` |
| `--glass-border` | `rgba(255,255,255,0.15)` |
| `--glass-shadow` | `0 4px 16px rgba(0,0,0,0.08)` |
| `--glass-inset-light` | `inset 0 1px 0 rgba(255,255,255,0.25)` |

#### Typography
- **Playfair Display** (serif) — headings, editorial feel
- **Montserrat** (sans-serif) — body text
- **Archivo Black** (display) — bold impact headings
- **Inter** — search hero sections

#### Motion
- `--ease-snap`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — overshoot bounce curve
- `--transition-snappy`: `0.6s var(--ease-snap)`
- Keyframes: `heroZoom` (20s infinite scale), `fadeSlideIn` (0.35s), `confirmSlideDown` (0.5s), `avail-spin`, `docToastIn/Out`
- Scroll: navbar hide/show on scroll direction, `IntersectionObserver` reveal animations

#### Key Glass Elements
| Element | Blur | Use |
| :--- | :--- | :--- |
| Navbar (scrolled) | 12px | Dark glass navigation |
| Search bar (.discovery-bar) | 24px | Hero search widget |
| Auth modal | 24px | Login/signup modal |
| Profile modal | 40px | User profile center |
| Booking confirm card | 24px | Booking confirmation |
| Destination cards | 16px | Gallery cards |
| Footer social icons | 16px | Social links |
| Passenger dropdown | 24px | Guest selector |

#### Profile Modal Design
- **Container:** `rgba(10,10,10,0.92)` with `backdrop-filter: blur(40px)`, `border-radius: 24px`
- **Header:** Gradient background, 72px circular avatar with camera upload overlay, "Elite Voyager" gold gradient badge, quick stat cards
- **Layout:** Two-column — left (identity docs + preferences), right (tabbed Journeys/Escapes content)
- **Tabs:** Active tab uses `rgba(212,163,115,0.15)` background with gold text
- **Form fields:** Dark inputs (`rgba(255,255,255,0.06)`) with gold focus ring

#### Admin Panel Theme
- Dark theme: `#0a0a0a` background, `#141414` cards
- Sidebar-based navigation with collapsible mobile menu
- Toast notification system for CRUD actions

---

## 7. Key Performance Indicators (KPIs)
- **Time-to-Book:** Under 3 minutes from selecting a destination to final checkout confirmation.
- **Form Completion Rate:** Low drop-off due to elimination of upsells, multi-step hurdles, intrusive pop-ups.
- **Visual Engagement:** Session duration tracking on destination detail view.
- **Admin Efficiency:** Time saved managing bookings, destinations, and customer inquiries through centralized dashboard.

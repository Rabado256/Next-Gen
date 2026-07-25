# Product Requirement Document (PRD)

## Project Name: Nexopencode
tGen Travel (Prototype)
**Author:** Product Management  
**Date:** June 23, 2026  
**Status:** Prototype Complete — Feature-Rich  

---

## 1. Executive Summary & Vision
Traditional travel agency platforms are often cluttered with aggressive pop-ups, overwhelming grids of text, and frantic countdown timers that create "booking anxiety." 

**NextGen Travel** is a modern, premium travel agency platform designed to counter this noise. The vision is to deliver a highly visual, serene, and curated travel-booking experience. By blending a minimalist interface with immersive imagery, the platform transforms the planning phase from a chore into a seamless, inspiring journey.

### Core Philosophy
* **Zero Noise:** No flashing banners, no hidden fees, and no overwhelming filter sidebars.
* **Visual Storytelling:** High-quality, intentional imagery takes center stage.
* **Effortless Flow:** A simple, linear path from inspiration to booking confirmation.

---

## 2. User Personas

### 2.1. The Intentional Explorer
* **Profile:** A user looking for a unique, curated vacation who values design, ease of use, and a stress-free planning experience.
* **Needs:** Desires high-quality visual context, simple itinerary breakdowns, and transparent pricing without dark UX patterns.

### 2.2. The Busy Professional
* **Profile:** Someone who wants to book a premium, pre-vetted travel package quickly without sifting through thousands of conflicting reviews.
* **Needs:** A frictionless, fast checkout experience and a downloadable, clear travel itinerary instantly on completion.

### 2.3. The Admin Operator
* **Profile:** A platform administrator who manages destinations, bookings, users, and customer inquiries.
* **Needs:** A centralized dashboard to perform CRUD operations on all entities, monitor analytics, and handle support tickets.

---

## 3. High-Level Scope (Full Prototype Flow)
The prototype has been expanded significantly beyond the core MVP to include a full ecosystem of travel planning, management, and administrative tools:

```
[Curated Homepage] ➔ [Search / Inspiration / Collections]
       ➔ [Immersive Destination Detail] ➔ [Itinerary Builder]
       ➔ [Minimalist Checkout & Booking] ➔ [Confirmation]
       
[Admin Dashboard] — Manages all of the above
```

---

## 4. Functional Requirements

### 4.1. Homepage & Discovery
The entry point feels like an elegant digital travel magazine.
* **Hero Section:** Full-screen background video/image with a clean search intent bar.
* **Curated Collections:** "Travel Moods" filtering by vibe (Romantic, Adventure, Solo, Family) and continent.
* **Vibe & Continent Filtering:** Interactive filter buttons on homepage that dynamically show/hide destination cards.
* **Interactive World Map:** Leaflet.js-powered map with markers for all destinations, pulling data from Supabase API with a 50+ destination coordinate fallback.
* **Scroll Animations:** Intersection Observer-based reveal effects (`.reveal-snap`, `.reveal-up`) on cards and sections.
* **Concierge Button:** Simulated personal concierge connection via WhatsApp.
* **Parallax Effects:** Scroll-driven parallax on the About section background.
* **Micro-Interactions:** Smooth fade-ins and hover animations on destination cards.

### 4.2. Search & Discovery Pages
#### 4.2.1. Search Results (search-results.html)
* Full-text search across destinations with multi-mode filtering:
  - **Search Mode:** Query destinations by keyword
  - **Vibe Mode:** Filter by travel mood (Romantic, Adventure, Solo, Family)
  - **Price Mode:** Filter by budget range
  - **Continent Mode:** Filter by geographic region
* **Smart Document Detection:** Analyzes from/to locations to determine domestic vs. international travel and shows appropriate document requirement badges (Passport vs. ID Card).
* **Trip Availability:** Real-time availability checking via `checkTripAvailability()` API with available spots display.
* **Condensed Search Bar:** Sticky header with a pill-shaped search bar for refinement.
* **Results Grid:** Visual card layout with destination images, prices, vibe labels, and country info.

#### 4.2.2. Inspiration Page (inspiration.html)
* Curated visual collections with full-bleed hero imagery.
* Per-inspiration detail view with back navigation.
* Direct link to book the featured destination.

#### 4.2.3. Blog / Journal (blog.html)
* Travel journal with article cards.
* Full-bleed hero header.
* Category tags and reading time indicators.
* Hover zoom effects on article imagery.

### 4.3. Immersive Destination & Itinerary View
When a user selects a destination, the detail page presents information elegantly.
* **Hero Section:** Full-width destination image with title, edition, and booking CTA.
* **Pricing & Guest Selector:** Clear per-person pricing with dynamic guest count updates.
* **Itinerary Timeline:** Day-by-day breakdown of the experience with step titles and descriptions.
* **Included Amenities:** Visual iconography for Flights, Boutique Stay, Curated Tours, Private Transport.
* **Photo Gallery:** Curated image collection of the destination.
* **Reviews Section:** User-submitted ratings and comments, fetched from Supabase.
* **Smart Document Badge:** Shows required travel documents (Passport/ID Card) based on destination country vs. user's profile country.
* **Action Buttons:** "Reserve Your Sanctuary" (book now) and "Add to Wishlist" with persistence.

### 4.4. Custom Itinerary Builder (itinerary-builder.html)
A full-featured custom trip builder for authenticated users.
* **Multi-Day Builder:** Add/remove days with custom titles, descriptions, and activities per day.
* **Activity Management:** Time-stamped activities within each day (breakfast, tours, free time, etc.).
* **Save & Load:** Persists custom itineraries to Supabase, with listing of saved itineraries.
* **Smart Document Detection:** Analyzes destination from itinerary title to classify trip as domestic/international and display required document hints.
* **Export / Booking:** Option to book the custom itinerary.
* **Empty State:** Friendly prompt when no itineraries exist, with clear login-required gate.

### 4.5. Checkout & Booking (checkout.html)
A comprehensive single-page checkout flow.
* **Loading & Error States:** Full-page loading spinner and error state if destination data fails to load.
* **Multi-Step Form:**
  1. *Traveler Details:* Name, email, guest count, passport/ID card number, hotel preference.
  2. *Trip Selection:* From/To location inputs, departure date, document type.
  3. *Payment:* Stripe-style payment fields with card number, expiry, CVC, and name on card.
* **Order Summary Sidebar:** Sticky card with destination image, dates, guest count, hotel add-on, and total price.
* **Smart Document Detection:** Real-time analysis of From/To locations to determine domestic vs. international travel. Shows a live badge (green for domestic/ID card, blue for international/passport) and updates dynamically as inputs change.
* **Document Change Toast:** Animated toast notification when document requirements change based on location input.
* **Location Autocomplete:** Country-aware extraction from free-text location input using a comprehensive city/country/destination lookup map (50+ destinations, 50+ cities, 50+ countries).
* **Dynamic Pricing:** Per-person base price + optional hotel add-on, with real-time total calculation.
* **Confirmation Screen:** Post-booking success view with booking reference, itinerary summary, and download option.
* **Invoice Ready:** Placeholder payment integration with `createPaymentIntent` and `confirmPayment` stubs.

### 4.6. Authentication System
Full Supabase Auth integration across the platform.
* **Signup / Login Modal:** Bootstrap modal with tabbed forms for login and account creation.
* **Email Verification Flow:** Support for email confirmation with verify-email.html page.
* **Password Reset:** forgot-password.html and reset-password.html pages with token handling.
* **Session Persistence:** Auto-sync of Supabase session on page load via `syncSession()`, with token stored in localStorage.
* **Profile Center:** After login, user avatar and name show in navbar. Clicking opens a profile modal with:
  - **Personal Info:** Name, passport, identity card, emergency contact, country
  - **Travel Preferences:** Always-book-hotel toggle, food preference
  - **Activity History:** Upcoming and past bookings with details
  - **Wishlist:** Saved destinations with images and links
  - **Avatar Upload:** File reader-based avatar with localStorage persistence
  - **Logout:** Session cleanup and page reload

### 4.7. Admin Dashboard (admin.html)
A full-featured dark-themed admin panel for platform management.
* **Authentication:** Admin login with credential validation, auto-restore session, and self-service admin fix capability.
* **Dashboard Overview:** Stats cards for total bookings, revenue, users, reviews, contacts, and newsletter subscribers. Recent bookings and contacts tables.
* **Destinations Management:** Full CRUD with inline form overlays. Create/edit destinations with ID (slug), title, edition, description, price, country, vibe, image URL, and dynamic itinerary steps (add/remove). Active/inactive toggle.
* **Bookings Management:** Searchable table with status filter. Inline status change dropdown (confirmed/pending/cancelled). Document type badge (Passport/ID Card/Both). Delete capability.
* **Trips Management:** Full CRUD for scheduled trips with from/to locations, departure date/time, max capacity, booked count, and available spots calculation. Status toggle.
* **Users Management:** Searchable user table showing name, email, passport, identity card, verification status, and creation date.
* **Contact Submissions:** Inbox-style management with read/unread indicators, search, view overlay with full message details, reply-via-email link, and delete.
* **Newsletter Management:** Searchable subscriber list with creation dates.
* **Audit Logs:** Admin action log with admin name, action type, details, IP address, and timestamp.
* **Documents Section:** User document verification hub with search and filter (all / passport / ID card / both / none). Shows document status badges per user.
* **Toast Notifications:** Success/error toast system for admin actions.
* **Mobile-Responsive Sidebar:** Collapsible navigation for mobile devices.

### 4.8. Additional Public Pages
* **Contact (contact.html):** Inquiry form with name, email, subject, and message fields. WhatsApp integration button. Contact information cards with phone, email, address, and hours.
* **Help Center (help.html):** FAQ accordion with common questions and support information.
* **Legal (legal.html):** Terms of Service, Privacy Policy, Cookie Policy, and Disclaimer sections.
* **Forgot Password / Reset Password / Verify Email:** Complete auth flow pages for email-based account recovery.

---

## 5. Technical Specifications & Prototyping Stack

### Stack Definitions
* **Markup:** `HTML5` for structured, semantic document layouts.
* **Styling & Layout:** `CSS3` combined with `Bootstrap 5.3`. Custom `style.css` with CSS custom properties, animations (fade-in, snap-reveal, parallax), and responsive design. Google Fonts (Playfair Display for serif headings, Inter for sans-serif body).
* **Interactivity:** Native Vanilla JavaScript (ES6+) for UI state management, dynamic pricing, filtering, form validation, and DOM manipulation.
* **Backend & Database:** `Supabase` for PostgreSQL database, authentication, Row Level Security, and REST API.
* **Mapping:** `Leaflet.js` with Esri World Street Map tiles for interactive destination maps.
* **Icons:** `Bootstrap Icons` library.
* **Payments:** Placeholder payment integration with stub functions.

### Database Schema (Supabase — 9 Tables)
| Table | Purpose |
| :--- | :--- |
| `profiles` | Extends auth.users with name, passport, identity_card, emergency contact, preferences, admin flag |
| `destinations` | Travel packages with id, title, edition, description, price, country, vibe, image, itinerary steps (JSONB) |
| `bookings` | Booking records with user_id, dest_id, guest info, dates, total, hotel, status, reference |
| `contacts` | Contact form submissions with name, email, subject, message, read status |
| `reviews` | User reviews with rating (1-5), comment, linked to destination and user |
| `itineraries` | Custom user-built itineraries with title, description, days (JSONB) |
| `trips` | Scheduled trips with from/to, departure, capacity tracking, status |
| `newsletter_subscribers` | Email subscriptions with unique constraint |
| `audit_logs` | Admin action audit trail with admin_id, action, details, IP |

**Row Level Security:** All tables have RLS enabled with policies for user-own-data access and admin full access. Includes a `public.is_admin()` security definer function to prevent recursive policy issues.

### Authentication
* Supabase Auth with email/password.
* Auto-profile creation on signup via database trigger.
* Token-based session management with localStorage persistence.
* Email verification and password reset flows.

### Smart Document Detection System
A cross-page feature that automatically classifies trips as domestic or international based on location input.
* **Lookup Dictionaries:**
  - 50+ country names (Set)
  - 20+ city-to-country mappings
  - 50+ destination title-to-country mappings
* **Detection Algorithm:** Exact match → comma-separated "City, Country" → city lookup → word-boundary regex → destination lookup. Returns null if unknown.
* **Classification:** Same country = domestic (ID card required), different country = international (passport required), unknown = generic document prompt.
* **Integrated In:** checkout.html, itinerary-builder.html, search-results.html, destination.html

### CLI Tools
* `create-admin.js` — Node.js script to create/verify admin user in Supabase.
* `test-login.js` — Diagnostic script to test auth credentials against Supabase.
* `tests/document-detection.test.js` — Unit test suite for the document detection system (runs via `node tests/document-detection.test.js`).

---

## 6. UI/UX Design & Aesthetic Guidelines

| Element | Specification |
| :--- | :--- |
| **Color Palette** | Monochromatic bases (deep charcoal/black text, off-white/cream backgrounds). Accent: ochre/terracotta (`#d4a373`). Admin panel uses dark theme (`#0a0a0a` background, `#141414` cards). |
| **Typography** | Playfair Display (serif) for headings — luxury editorial feel. Inter (sans-serif) for body copy — clean and legible. |
| **Spacing** | Generous white space with Bootstrap spacing utilities (`py-5`, `mb-4`, `px-4`) to allow the design to breathe. |
| **Imagery** | High-contrast, editorial-grade photography via Unsplash. Full-bleed hero sections. Grayscale overlays for certain treatments. |
| **Animations** | Scroll-triggered reveal animations via Intersection Observer. Fade-in, snap-reveal, and parallax effects. Navbar hide/show on scroll direction. |
| **Micro-Interactions** | Hover zooms on cards, button transitions, spinner loading states, toast notifications. |

---

## 7. Key Performance Indicators (KPIs)
* **Time-to-Book:** A target of under 3 minutes from selecting a destination to final checkout confirmation.
* **Form Completion Rate:** Tracking low drop-off rates due to the elimination of upsells, multi-step hurdles, and intrusive pop-ups.
* **Visual Engagement:** Session duration tracking on the destination detail split-page to measure user interaction with the visual assets.
* **Admin Efficiency:** Time saved managing bookings, destinations, and customer inquiries through the centralized dashboard.

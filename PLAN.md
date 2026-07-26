# PLAN.md — NextGen Travel Agency

**Created:** 2026-07-26
**Status:** Active (plan mode)
**Last reviewed:** 2026-07-26 (CEO Review Round 5)

---

## Project Overview
A modern, premium travel agency platform for a client who needs direct flight booking with payment processing.

**Tech Stack:** HTML5, CSS3, Bootstrap 5.3, Vanilla JS (ES6+), Supabase, Leaflet.js
**Current Health Score:** 92/100 (post-QA fixes)

---

## CEO Review Decisions (2026-07-26)

### Strategic Inputs
| Question | Answer | Implication |
|----------|--------|-------------|
| Primary purpose | Client project | Real business, not portfolio |
| Timeline | 3-6 months | Need phased approach |
| Client has existing system? | No, build from scratch | Full scope |
| Design approved? | Needs revision | Client feedback required |
| Hotels required? | Optional (flights compulsory) | Flight-first MVP |
| API budget | Free tier only | Amadeus 10K req/month |
| Business model | Direct booking | Need Stripe payments |

### Scope Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| MVP scope | Flights + payments + users + admin | Core business needs |
| Hotels | Phase 2 (after MVP launch) | Optional, adds complexity |
| Payment processor | Stripe | No upfront cost, 2.9% + $0.30/txn |
| API provider | Amadeus (free tier) | 10,000 requests/month |
| Hosting | Vercel/Netlify (free tier) | Zero upfront cost |
| Monetization | Direct booking revenue | Client processes payments |

### Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Booking model | Direct booking via Stripe | Client requirement |
| Flight data | **Duffel API** (NOT Amadeus — deprecated July 17, 2026) | Duffel has free test mode + $1/order starter plan |
| Payment processor | Stripe | No upfront cost, 2.9% + $0.30/txn |
| User accounts | Supabase Auth | Already integrated |
| Admin auth | Server-side API routes | Security requirement |
| State management | Vanilla JS (no framework) | Keep existing stack |
| Build system | None (no Vite) | Keep simple for now |

### API Migration: Amadeus → Duffel
**Why:** Amadeus Self-Service API was deprecated on July 17, 2026 (9 days ago).
**Alternative:** Duffel — modern REST API, 300+ airlines via NDC, no IATA accreditation needed.
**Pricing:** Free test mode, $1/order on Starter plan (50 orders/month free).

---

## What Exists Today

### Working Features ✅
- Hero search (UI only, no data binding)
- Destination gallery (12 cards, hardcoded)
- Bali destination page (maps, stats, booking widget)
- Flight/hotel/holiday search tabs (static mock data)
- Checkout flow (form validation, no payment)
- Admin dashboard (UI shell, no CRUD)
- Contact page (WhatsApp integration)
- Newsletter subscription (Supabase)
- Responsive design (mobile-friendly)

### Partially Working ⚠️
- Auth (login/register works, logout buggy)
- Search results (filter UI exists, no logic)
- Itinerary builder (UI only, no save)
- Document requirements (badge UI, no data)

### Broken/Dead 🔴
- 11/12 destination links (only Bali works)
- Currency toggle (visual only)
- Day/night toggle (no logic)
- Search form submission (no results routing)

### Missing (Required for MVP) ❌
- Real flight data (Amadeus API integration)
- Stripe payment processing
- Booking state machine (pending → confirmed → completed)
- User booking history
- Admin CRUD operations
- Server-side admin auth
- Proper RLS policies

---

## Implementation Roadmap

### Phase 1: Design Revision (Week 1-2)
- [ ] Present current design to client
- [ ] Collect feedback and revision requests
- [ ] Implement design changes
- [ ] Get client sign-off

### Phase 2: Flight Search (Week 3-4)
- [ ] Sign up for Duffel API (app.duffel.com)
- [ ] Create `js/duffel.js` — API client with OAuth2 auth
- [ ] Wire search form to Duffel `/air/shopping` endpoint
- [ ] Display real flight results on search-results.html
- [ ] Add Supabase cache for search results (reduce API calls)
- [ ] Add loading states and error handling

### Phase 3: Booking + Payments (Week 5-8)
- [ ] Implement booking state machine in Supabase
- [ ] Integrate Stripe for payment processing
- [ ] Build booking confirmation flow
- [ ] Add booking receipts/invoices
- [ ] Implement cancellation/refund logic

### Phase 4: User Accounts (Week 9-10)
- [ ] Fix logout functionality
- [ ] Add booking history page
- [ ] Implement saved searches
- [ ] Add user profile management

### Phase 5: Admin Dashboard (Week 11-12)
- [ ] Move admin auth to server-side
- [ ] Implement CRUD for destinations
- [ ] Add booking management (view, status updates)
- [ ] Add analytics dashboard

### Phase 6: Launch Prep (Week 13-16)
- [ ] QA testing (all features)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deploy to production
- [ ] Monitor and fix issues

---

## Tech Stack Additions

| Component | Current | New (Required) |
|-----------|---------|----------------|
| Payment | None | Stripe.js |
| Flight data | Mock | **Duffel API** |
| Email | None | SendGrid/Resend (optional) |
| Hosting | Local dev | Vercel/Netlify |
| Domain | None | Client provides |

---

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-26 | Activate plan mode | CEO review to set direction |
| 2026-07-26 | Client project, 3-6 months | Real business engagement |
| 2026-07-26 | Flights only MVP, hotels Phase 2 | Scope reduction for timeline |
| 2026-07-26 | Direct booking via Stripe | Client requirement |
| 2026-07-26 | **Duffel API (NOT Amadeus)** | Amadeus Self-Service deprecated July 17, 2026 |
| 2026-07-26 | No build system | Keep existing stack simple |

---

## Open Questions

| # | Question | Status | Answer |
|---|----------|--------|--------|
| 1 | Client's target market? (India/Global) | Pending | Need to confirm |
| 2 | Client's domain name? | Pending | Need from client |
| 3 | Client's brand colors? (current is our default) | Pending | Need from client |
| 4 | Client's content (destination descriptions)? | Pending | Need from client |

---

## Risks & Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| No remote origin configured | Cannot deploy or collaborate | Set up GitHub remote |
| .env credentials in version control | Security risk | Rotate keys, add to gitignore |
| Server-side admin auth weak | Admin dashboard accessible | Implement proper RLS |
| Duffel free tier limits | Can't handle traffic spikes | Cache aggressively |
| Client revision requests | Timeline slip | Lock design early |
| Stripe fees eat margins | Low profit per booking | Price accordingly |

---

## Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Flight search works | Real data from **Duffel API** | User can search and see results |
| Booking flow works | End-to-end with payment | User can book and pay |
| User accounts work | Login, history, saved searches | User can manage bookings |
| Admin dashboard works | CRUD for content and bookings | Client can manage site |
| Performance | < 3s page load | Lighthouse score |
| Security | No critical vulnerabilities | Security audit pass |

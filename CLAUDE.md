# NextGen Travel Agency

A modern, premium travel agency platform designed to deliver a highly visual, serene, and curated travel-booking experience.

## Tech Stack
- HTML5, CSS3, Bootstrap 5.3
- Vanilla JavaScript (ES6+)
- Supabase (Auth: email/password + Google; Postgres database with RLS)
- Supabase JS SDK (client) + `@supabase/supabase-js` (server, service-role)
- Leaflet.js for maps
- Google Fonts (Playfair Display, Inter)

## Project Structure
- `index.html` - Homepage with hero, curated collections, world map
- `search-results.html` - Search with multi-mode filtering
- `destination.html` - Immersive destination detail view
- `checkout.html` - Multi-step booking flow
- `admin.html` - Full-featured admin dashboard
- `style.css` - Custom styles with CSS variables
- `app.js` - Main application logic
- `js/supabase-config.js` - Supabase URL + anon key (gitignored)
- `js/supabase-client.js` - Supabase client init (`window.auth`, `window.db`)
- `js/api.js` - Supabase/Postgres data-access layer
- `supabase-admin.js` - Server-side Supabase service-role helper
- `supabase-schema.sql` - Database schema + RLS policies

## Environment / credentials
- Client config lives in `js/supabase-config.js` (gitignored) or is injected at runtime from `/api/config` (Vercel env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- Server/scripts use the Supabase service-role key — see `supabase-admin.js` for credential setup (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env`).
- Deploy Firestore rules equivalent: run `supabase-schema.sql` in the Supabase SQL Editor; deploy checklist in `DEPLOY.md`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

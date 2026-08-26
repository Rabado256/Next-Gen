# NextGen Travel Agency

A modern, premium travel agency platform designed to deliver a highly visual, serene, and curated travel-booking experience.

## Tech Stack
- HTML5, CSS3, Bootstrap 5.3
- Vanilla JavaScript (ES6+)
- Firebase (Auth: email/password + Google; Firestore database)
- Firebase Admin SDK for backend (`server.js`, `api/*`, scripts)
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
- `js/firebase-config.js` - Firebase web config (gitignored)
- `js/firebase-client.js` - Firebase client init (`window.auth`, `window.db`)
- `js/api.js` - Firebase/Firestore data-access layer
- `firebase-admin.js` - Server-side Firebase Admin helper
- `firestore.rules` - Firestore security rules (deploy via `firebase deploy --only firestore:rules`)
- `scripts/migrate-supabase-to-firebase.js` - One-time data migration (needs legacy Supabase keys in `.env`)

## Environment / credentials
- Client web config lives in `js/firebase-config.js` (gitignored) or is injected at runtime from `/api/config` (Vercel env vars `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`).
- Server/scripts use the Firebase Admin SDK — see `firebase-admin.js` for the three supported credential sources (`FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`).
- Set up a new project: follow `FIREBASE_SETUP.md`; deploy checklist in `DEPLOY.md`.

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

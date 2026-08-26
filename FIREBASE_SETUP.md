# Firebase Setup — NextGen Travel

The app runs entirely on Firebase: **Firebase Auth** (email/password + Google) and
**Firestore** (database). This page lists every credential, where it goes, and the
one-time setup steps.

---

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a project (or reuse one).
2. **Authentication** → Sign-in method → enable:
   - **Email/Password**
   - **Google**
   - Turn **ON** "Email enumeration protection" for stricter security if desired.
3. **Firestore Database** → Create database → pick a region → **Production mode**.

---

## 2. Copy the web app config (client)

In the Firebase console: **Project settings → Your apps → Web app (</>)**.
Add a web app and copy the `firebaseConfig` object.

Paste it into **`js/firebase-config.js`** (gitignored, never committed):

```js
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIza...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  storageBucket_old: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

> `js/firebase-config.example.js` shows the shape. On Vercel the config is instead
> injected via `/api/config` from server env vars (see §4), so the static file is a
> local-dev fallback only.

### Authorize your domains for Google sign-in

**Authentication → Settings → Authorized domains**: add your production domain
(e.g. `yourapp.vercel.app`) and `localhost`.

---

## 3. Service account (backend / scripts / API endpoints)

Backend code (`server.js`, `/api/*`, seed/migrate/create-admin scripts) uses the
**Firebase Admin SDK** and needs a service account.

1. **Project settings → Service accounts → Generate new private key** → download
   the JSON file. Never commit it.
2. Provide it to the server one of three ways (in `.env`):
   - `FIREBASE_SERVICE_ACCOUNT` — the whole JSON file as a single-line string, or
   - `GOOGLE_APPLICATION_CREDENTIALS` — path to the JSON file, or
   - `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

---

## 4. Server environment variables (Vercel)

In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | Value |
| --- | --- |
| `FIREBASE_API_KEY` | from the web config |
| `FIREBASE_AUTH_DOMAIN` | `your-app.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `your-project-id` |
| `FIREBASE_STORAGE_BUCKET` | `your-app.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | from the web config |
| `FIREBASE_APP_ID` | from the web config |
| `FIREBASE_SERVICE_ACCOUNT` | service-account JSON (one line) |
| `PAYSTACK_PUBLIC_KEY` | existing Paystack key (unchanged) |
| `RESEND_API_KEY` | optional — confirmation emails |

`/api/config` returns the six `firebase_*` values so the client picks them up at
runtime; the service account stays private on the server.

---

## 5. Deploy Firestore security rules

In `firestore.rules` (repo root) are rules mirroring the old Supabase RLS: owners
can read/write their own profiles/bookings/searches, guests can create
contacts/reviews/subscriptions, and only admins (profiles `is_admin: true`) can
manage everything else.

Deploy after any rule edit:

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

(Requires `firebase-tools`: `npm i -g firebase-tools`.)

> Firestore requires a **composite index** for the flight cache query
> (`flight_caches` where `cache_key` + `created_at_ms` range + orderBy desc).
> The first time a search runs you'll get an error link in the console — click it
> to create the index automatically.

---

## 6. Local dev

`.env` (gitignored) needs the **Firebase** vars above plus the **legacy Supabase**
vars only if you still want to run the one-time data migration:

```bash
# Firebase (server/backend)
FIREBASE_SERVICE_ACCOUNT="{\"type\":\"service_account\",...}"

# Legacy Supabase — only needed for the migration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-password
```

Run:

```bash
npm install
npm run migrate   # one-time: Supabase -> Firestore (needs legacy keys)
npm run seed      # idempotent: admin user + sample destinations/trips
node create-admin.js  # create/promote an admin (Firebase Auth + profile)
npm start         # local server at http://localhost:3000
```

---

## 7. Verify

- `npm test` — 100+ unit tests (document detection, api client, security).
- `node tests/live-e2e.js` — optional live check against your real Firebase
  project (booking state machine + saved searches), cleans up after itself.
- In the browser: sign up → check Firestore `profiles` has your doc → set
  `is_admin: true` in the console → log in and open `admin.html`.

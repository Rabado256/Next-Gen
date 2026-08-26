# Deploy Checklist — NextGen Travel Agency

Production deployment guide for **Vercel**. The `api/` folder is deployed as
serverless functions; the static site (HTML/CSS/JS at the repo root) is served
as static files. Client config is resolved at runtime from `/api/config`, so
`js/firebase-config.js` stays gitignored and never reaches the server.

See **FIREBASE_SETUP.md** for full Firebase console steps (project, Auth methods,
service account, Firestore rules).

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**
(or `vercel env add NAME production`). Required unless marked optional.

| Name | Required | Purpose |
|---|---|---|
| `FIREBASE_API_KEY` | yes | Firebase web API key (returned by `/api/config` for the client) |
| `FIREBASE_AUTH_DOMAIN` | yes | e.g. `your-app.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | yes | Firebase project id |
| `FIREBASE_STORAGE_BUCKET` | yes | e.g. `your-app.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | yes | from the Firebase web config |
| `FIREBASE_APP_ID` | yes | from the Firebase web config |
| `FIREBASE_SERVICE_ACCOUNT` | yes | Service-account JSON (one line) — server-only. **Never** put in client env |
| `PAYSTACK_PUBLIC_KEY` | yes | Returned by `/api/config` for the Paystack popup |
| `PAYSTACK_SECRET_KEY` | yes | Server-side Paystack verification |
| `RESEND_API_KEY` | no | Confirmation emails (booking saves without it) |
| `MAIL_FROM` | no | Email sender address |

> `js/env.js` fetches `/api/config` on every page and merges the six
> `firebase_*` values into `window.__FIREBASE_CONFIG__`, falling back to the
> local `js/firebase-config.js` only for static-only local dev.

## 2. Deploy

```bash
vercel login            # or import the repo via the dashboard
vercel --prod           # project is already linked (.vercel/project.json)
```

Optional CI: push to GitHub → connect the repo in Vercel → auto-deploys on push to `main`.

Deploy the Firestore rules once:

```bash
firebase use <project-id>
firebase deploy --only firestore:rules
```

## 3. Post-deploy verification

- [ ] `curl https://<your-domain>/api/config` returns `paystack_public_key` and the six `firebase_*` keys
- [ ] Homepage loads with no console errors (config resolved via `/api/config`)
- [ ] Guest checkout persists a booking (TEST MODE banner shows if `pk_test_`)
- [ ] Email/password signup, Google sign-in, booking history, saved searches, receipts work
- [ ] `/api/invoice?reference=<ref>` renders a printable receipt
- [ ] `/api/lookup-booking` rejects bad refs, masks passport/ID/phone/email without owner email
- [ ] `/api/admin-verify` returns `is_admin:false` for anonymous/forged tokens
- [ ] Admin dashboard gates non-admins server-side
- [ ] `/api/complete-bookings` returns 401/403 without an admin token

## 4. Production hardening (before real traffic)

- [ ] Swap `PAYSTACK_PUBLIC_KEY`/`PAYSTACK_SECRET_KEY` to live keys (`pk_live_`/`sk_live_`) — TEST MODE banner disappears
- [ ] Enable platform-level rate limiting on `/api/invoice` and `/api/lookup-booking` (WAF / dashboard) — the in-code limiter is per-warm-instance best-effort
- [ ] In Firebase Auth settings: set password min-length policy, review sign-up quota, enable email enumeration protection
- [ ] Keep the Firebase service account rotating; audit it in **Project settings → Service accounts**
- [ ] Set up Vercel + Firebase usage alerts

## 5. Rollback

```bash
vercel rollback                 # latest
vercel rollback <deployment>    # specific deployment
```

Or redeploy a previous commit from the dashboard.

# Deploy Checklist — NextGen Travel Agency

Production deployment guide for **Vercel**. The `api/` folder is deployed as
serverless functions; the static site (HTML/CSS/JS at the repo root) is served
as static files. Client config is resolved at runtime from `/api/config`, so
`js/config.js` stays gitignored and never reaches the server.

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**
(or `vercel env add NAME production`). Required unless marked optional.

| Name | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | Public anon key (also returned by `/api/config` for the client) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key — receipts, guest checkout, export, auto-complete. **Never** put in client env |
| `PAYSTACK_PUBLIC_KEY` | yes | Returned by `/api/config` for the Paystack popup |
| `PAYSTACK_SECRET_KEY` | yes | Server-side Paystack verification |
| `RESEND_API_KEY` | no | Confirmation emails (booking saves without it) |
| `MAIL_FROM` | no | Email sender address |

> `js/env.js` fetches `/api/config` on every page and merges
> `supabase_url` + `supabase_anon_key` into `window.__SUPABASE_CONFIG__`,
> falling back to the local `js/config.js` only for static-only local dev.

## 2. Deploy

```bash
vercel login            # or import the repo via the dashboard
vercel --prod           # project is already linked (.vercel/project.json)
```

Optional CI: push to GitHub → connect the repo in Vercel → auto-deploys on push to `main`.

## 3. Post-deploy verification

- [ ] `curl https://<your-domain>/api/config` returns `paystack_public_key`, `supabase_url`, `supabase_anon_key`
- [ ] Homepage loads with no console errors (config resolved via `/api/config`)
- [ ] Guest checkout persists a booking (TEST MODE banner shows if `pk_test_`)
- [ ] Login, booking history, saved searches, receipts work
- [ ] `/api/invoice?reference=<ref>` renders a printable receipt
- [ ] `/api/lookup-booking` rejects bad refs, masks passport/ID/phone/email without owner email
- [ ] `/api/admin-verify` returns `is_admin:false` for anonymous/forged tokens
- [ ] Admin dashboard gates non-admins server-side
- [ ] `/api/complete-bookings` returns 401/403 without an admin token

## 4. Production hardening (before real traffic)

- [ ] Swap `PAYSTACK_PUBLIC_KEY`/`PAYSTACK_SECRET_KEY` to live keys (`pk_live_`/`sk_live_`) — TEST MODE banner disappears
- [ ] Enable platform-level rate limiting on `/api/invoice` and `/api/lookup-booking` (WAF / dashboard) — the in-code limiter is per-warm-instance best-effort
- [ ] Confirm Supabase auth settings (email confirmation, signup rate limits)
- [ ] Set up Vercel + Supabase usage alerts

## 5. Rollback

```bash
vercel rollback                 # latest
vercel rollback <deployment>    # specific deployment
```

Or redeploy a previous commit from the dashboard.

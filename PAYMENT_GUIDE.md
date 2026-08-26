# Paystack Payment Guide

Payments on NextGen Travel Agency are handled by **Paystack** (dashboard.paystack.com),
a payment gateway built for the African market. All charges are made in **Nigerian Naira
(NGN)** using a **Paystack pop-up** — the customer fills their card details in a secure
Paystack-hosted iframe, and the site never sees the card number.

> **Current status:** the code is fully wired for Paystack but no live keys are installed
> yet. Until `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` are set to real values, checkout
> gracefully falls back to saving bookings **without a live charge** so the rest of the
> site stays testable. Steps 2–4 below remove that fallback.

---

## 1. How a payment works

```
Customer fills checkout form
        │
        ▼
Checkout fetches /api/config  ───►  public key (safe to expose)
        │
        ▼
Site converts the USD order total to NGN via live exchange rates
        │
        ▼
PaystackPop.setup(...) opens the Paystack pop-up (amount in kobo = NGN × 100)
        │
        ▼
Customer pays in the pop-up; Paystack returns a reference
        │
        ▼
POST /api/paystack-verify  { reference }  ──► server calls
        https://api.paystack.co/transaction/verify/{reference}
        using the SECRET key (never exposed to the browser)
        │
        ▼
If verified "success"  ──►  booking is saved to Supabase with the Paystack reference
```

Key facts:

- Amounts sent to Paystack are in **kobo** (1 Naira = 100 kobo). The site charges
  `USD total × NGN rate × 100` kobo.
- The browser only ever holds the **public** key. The **secret** key lives in
  server-side code (`.env` locally, Vercel Environment Variables in production).
- The server **re-derives the amount it displays** from the order summary, and Paystack
  verification is done server-side so a booking is only saved after a confirmed charge.

---

## 2. Create a Paystack account and get test keys

1. Go to **https://dashboard.paystack.com** and sign up (email + password).
2. Complete the basic business setup prompts (you can use a test/placeholder business
   profile while in test mode).
3. From the dashboard menu go to **Settings → Developers** (or the API Keys page,
   `https://dashboard.paystack.com/#/settings/developers`).
4. You will see a **Secret Key** and a **Public Key**. In test mode they look like:
   - `sk_test_...` (secret — keep private)
   - `pk_test_...` (public — safe to expose)

These test keys connect to Paystack's sandbox. No real money moves.

---

## 3. Install the keys

There are **three** places a key can live. For local development set them all; for
production only the Vercel Environment Variables matter.

### a) Local `.env` (used by `node server.js` and the `/api/*` functions)

```env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

### b) Frontend fallback in `js/supabase-config.js`

The public key is also hardcoded as a fallback so the page works even when `/api/config`
is unreachable:

```js
window.__PAYSTACK_PUBLIC_KEY__ = 'pk_test_your_public_key_here';
```

Keep `js/supabase-config.js` and the `.env` public key in sync. The secret key is **never** put
in frontend files.

### c) Production (Vercel)

In the Vercel dashboard for the project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `PAYSTACK_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_...` or `pk_test_...` |

Then redeploy. The serverless functions in `api/*.js` read these automatically
(they run `require('dotenv').config()` and also see Vercel env vars).

---

## 4. Testing payments

With `pk_test_...` keys installed you get a visible **TEST MODE banner** on the checkout
payment step so nobody mistakes a sandbox charge for real money.

Use Paystack's sandbox test card:

| Field | Value |
|-------|-------|
| Card number | `4084 0840 8408 4081` |
| CVV | any 3 digits (e.g. `408`) |
| Expiry | any future date (e.g. `12/29`) |
| PIN | `0000` (if prompted) |

Other useful test cards (from Paystack docs):

- `5078 5078 5078 5078` — successful card with PIN and OTP.
- `4084 0840 8408 4081` — successful card without PIN (recommended).
- To force a failed transaction, add `4141 4141 4141 4141` or use a `-f` variation
  (see Paystack's test-card docs).

The flow to test:

1. Pick any trip, go through checkout.
2. On the payment step confirm the NGN amount shown matches
   `USD total × exchange rate`.
3. Click **Authorize Payment** → the Paystack pop-up opens.
4. Enter the test card and complete the payment.
5. On success the booking is saved and the receipt shows a `PS-...` reference.

---

## 5. Currency conversion

- Order totals are computed and displayed in **USD** throughout the site.
- At checkout the USD total is converted to NGN for the Paystack charge using live
  exchange rates from the currency module (`js/currency.js` → `CURRENCY.getRates()`).
- If the live rates call fails, a **fallback rate of ₦1,540 = $1** is used, and the
  rate cache still carries static fallbacks per currency.
- The charge amount is rounded to whole kobo with a **₦0.50 minimum** so Paystack
  always receives a valid amount.

---

## 6. Fallback when Paystack is not configured

If no usable public key is found (missing, `REPLACE_ME`, or `xxxx` placeholder):

- The payment step shows a notice: *"Paystack is not configured yet — bookings will be
  saved without a live charge."*
- Clicking **Authorize Payment** skips the pop-up and saves the booking directly with an
  empty payment reference.

This keeps the whole booking flow usable while the account and keys are pending, but
remember it means **no real payment is collected** — do not take this fallback to
production with real bookings.

---

## 7. Going live

1. In Paystack go to **Settings → Business** and complete your real business details and
   bank account; switch the dashboard from **Test** to **Live**.
2. Copy the live keys (`sk_live_...` / `pk_live_...`) from the Developers page.
3. Update `.env`, `js/supabase-config.js`, and the Vercel Environment Variables with the live keys.
4. Redeploy and make a small real purchase to confirm.
5. Confirm the TEST MODE banner no longer shows (it only appears for `pk_test_` keys).

---

## 8. Code map

| File | Purpose |
|------|---------|
| `checkout.html` | Paystack pop-up flow, NGN conversion, booking save after verification |
| `js/api.js` | `paystackVerify(reference)` — calls `/api/paystack-verify` |
| `api/paystack-verify.js` | Serverless function that verifies a reference with Paystack |
| `api/config.js` | Serves the public key to the frontend |
| `server.js` | Local dev server hosting `/api/config` + `/api/paystack-verify` |
| `js/supabase-config.js` | Frontend public-key fallback |
| `.env` / `.env.example` | Local secret + public key placeholders |
| `vercel.json` | Vercel routing (functions auto-served under `/api/*`) |

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Payment step says "Paystack is not configured yet" | Public key missing/placeholder. Set `PAYSTACK_PUBLIC_KEY` in `.env`, `js/supabase-config.js`, and Vercel. |
| "Paystack verification failed" after paying | Server couldn't reach Paystack or reference not found — check `PAYSTACK_SECRET_KEY` is set and the reference string is intact. |
| Booking saved but no charge | You are in fallback mode (no secret/public key), or `pk_test_` key with a test card — check the TEST MODE banner. |
| Amount in NGN looks wrong | Live rate fetch failed, so the ₦1,540 fallback was used. Compare with the USD total on the summary. |
| Pop-up doesn't open | `js.paystack.co/v1/inline.js` blocked, or no public key resolved. Open the browser console for errors. |
| Keys working locally but not on Vercel | Vercel Environment Variables are not set, or a redeploy wasn't triggered after adding them. |

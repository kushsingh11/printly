# Printly

Campus print shop + stationery store. Students log in, upload a PDF, configure
print options, pay by UPI (scan QR → upload receipt), and collect when it's
ready. They can also buy stationery for pickup. The shopkeeper verifies
payments and moves jobs/orders through the pipeline — and students get notified.

- **Live:** https://printly-okc.netlify.app
- **Demo logins:**
  - Shopkeeper — `shop@printly.college` / `printly123`
  - Student — `student@printly.college` / `student123`

---

## How it works

The web app is **Next.js on Netlify**. Its database is a **Google Sheet**,
reached through a **Google Apps Script web app** (a JSON API). Uploaded files
(PDFs, receipts, product images) live in **Netlify Blobs**.

```
Browser ─► Next.js (Netlify, server actions + API routes)
               │  fetch(APPS_SCRIPT_URL, { secret, action, payload })   ← server-side only
               ▼
        Apps Script /exec (doPost, secret-guarded)
               │
               ▼
        Google Sheet  ("Printly Data")        Netlify Blobs (files)
```

Only the Next.js **server** calls the Apps Script API, and every call carries a
shared secret (`API_SECRET`), so the Sheet can't be read/written by anyone else.

### Tech
- **Next.js 16** (App Router, server actions) + **Tailwind v4**
- **Auth.js v5** — email/password (JWT sessions); ownership is keyed by email
- **Google Sheets** via **Apps Script** — `apps-script-api/Code.gs`
- **Netlify Blobs** — private file storage (student docs/receipts), public product images
- **pdf-lib** (page count), **qrcode** (UPI QR), **zod** (validation), **bcryptjs**

---

## The data (Google Sheet)

A spreadsheet named **Printly Data** holds everything. Tabs:

| Tab | What |
|---|---|
| `Settings` | key/value — print prices, UPI ID, shop name, toggles |
| `Users` | accounts (email, name, role, bcrypt hash) |
| `Products` | catalog (sku, name, category, price, stock, …) |
| `PrintJobs` | print orders + status + payment |
| `Orders` / `OrderItems` | stationery orders |
| `Notifications` | per-student in-app notifications |

You can **view and edit data directly in the sheet** (e.g. change a price in
`Settings`, add a product row in `Products`, adjust stock). Changes show up in
the app immediately.

> **Money is stored in paise** (integers). ₹95 = `9500`.

---

## Environment variables

Set in Netlify (Site config → Environment variables) and in a local `.env`:

| Var | Purpose |
|---|---|
| `APPS_SCRIPT_URL` | the Apps Script web-app `/exec` URL (the Sheets API) |
| `API_SECRET` | shared secret; must match the script's `API_SECRET` Script Property |
| `AUTH_SECRET` | Auth.js session signing secret (`openssl rand -base64 32`) |

`.env` is git-ignored. `.env.example` lists the keys.

---

## Project layout

```
src/
├─ app/
│  ├─ (auth)/login, signup          # auth pages
│  ├─ (student)/print, store, orders, notifications
│  ├─ shop/                         # shopkeeper: queue, orders, inventory, settings
│  └─ api/                          # auth, file/receipt/image serving, upload
├─ lib/
│  ├─ sheets.ts                     # the Google Sheets API client (all data access)
│  ├─ types.ts                      # domain types
│  ├─ storage.ts                    # Netlify Blobs (files)
│  ├─ pricing.ts                    # print price calc (shared client/server)
│  └─ actions/                      # server actions (auth, print, store, queue, products, settings)
└─ components/                      # student + shop UI
apps-script-api/
└─ Code.gs                          # the Sheets backend (deployed as an Apps Script web app)
```

---

## Local development

```bash
npm install
# create .env with APPS_SCRIPT_URL, API_SECRET, AUTH_SECRET (see .env.example)
npm run dev            # http://localhost:3000
```

> Local dev talks to the **same live Google Sheet** (via `APPS_SCRIPT_URL`), so
> reads/writes affect real data. Netlify Blobs needs the Netlify context, so file
> uploads are best tested on a deploy (or via `netlify dev`).

Checks:
```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

## Deploying

The site is linked to Netlify (CLI logged in). To ship a change:

```bash
netlify deploy --build --prod
```

(There's no automatic Git deploy set up — deploys are manual via the CLI. To get
push-to-deploy, connect the GitHub repo in the Netlify UI.)

---

## The Sheets API (`apps-script-api/Code.gs`)

This is deployed **separately**, inside Google, bound to the **Printly Data** sheet.

To (re)deploy it:
1. Open the **Printly Data** sheet → **Extensions → Apps Script**.
2. Paste `apps-script-api/Code.gs` into `Code.gs`.
3. **Project Settings → Script properties** → set `API_SECRET` (same value as the Netlify env var).
4. Run **`setup`** once (creates tabs + seed data).
5. **Deploy → New deployment → Web app** · Execute as **Me** · access **Anyone** → copy the `/exec` URL into `APPS_SCRIPT_URL`.

After editing `Code.gs`, redeploy via **Deploy → Manage deployments → Edit → New version**.

The API is action-based (`doPost` with `{ secret, action, payload }`). Composite
actions like `verifyOrderPayment` do the read-modify-write **and** stock
decrement **and** notification in one call, so multi-step changes stay atomic
server-side.

---

## Notes & limitations

- **Sheets isn't a real database** — no transactions across calls, and Google
  rate limits apply. Fine for a single campus shop's volume; not for large scale.
- **Payments are manual UPI** — students upload a receipt; the shopkeeper verifies
  it, which moves the job into the queue / marks the order ready.
- **Auth** is email/password. Seed accounts are created by `setup()`; students
  self-register (role `STUDENT`). The shopkeeper account is seeded.

# RAVERS — Custom Clothing E-Commerce MVP

RAVERS is a Lagos-based custom clothing and fashion brand. This is a full-stack
MVP: a customer storefront (catalog, cart, checkout, Custom Studio requests,
order tracking, accounts) and a protected admin dashboard (products, orders,
custom requests, customers), built on a plain HTML/CSS/JS frontend and a
Node.js/Express/PostgreSQL backend.

## Features

**Customer storefront**
- Product catalog with search, category filtering, and a dynamic product detail page
- Cart persisted in `localStorage` for guests, checked out as a real order for anyone
- Checkout with server-side price calculation and a Paystack-ready payment flow (mock mode by default)
- Custom Studio — a 6-step custom clothing request wizard with reference file upload
- Order tracking by reference number + email (works for both regular and custom orders)
- Email/password accounts (JWT) with order and custom-request history

**Admin dashboard** (role-protected, separate visual shell)
- Overview stats: total/pending/in-production orders, custom request count, recent orders
- Product CRUD (name, price, category, sizes, images, featured flag)
- Order management with status updates
- Custom request review: design details, reference file, status, quote, notes
- Customer list with order/request history

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework, no build step)
- **Backend:** Node.js, Express.js, REST API
- **Database:** PostgreSQL (raw parameterized SQL via `pg`, no ORM)
- **Auth:** JWT + bcrypt
- **File uploads:** Multer (local disk in dev; swappable for Cloudinary/Supabase Storage)
- **Payments:** Paystack-ready architecture with an automatic mock/dev fallback

## Project Structure

```
ravers-commerce/
├── client/                 Static frontend — deploy as-is to Netlify or any static host
│   ├── *.html               Customer-facing pages
│   ├── admin/                Admin dashboard pages
│   ├── css/                  global.css, components.css, pages.css, admin.css
│   └── js/                   api.js, auth.js, cart.js, products.js,
│                              custom-order.js, checkout.js, tracking.js, admin.js
├── server/                 Express API — deploy to Render/Railway
│   └── src/
│       ├── config/            Database pool
│       ├── middleware/         auth, error handling, uploads, validation
│       ├── routes/             one file per resource
│       ├── controllers/        request handling
│       ├── services/           DB queries + business logic
│       └── scripts/            create-admin bootstrap script
├── database/
│   ├── schema.sql             Table definitions, indexes, constraints
│   └── seed.sql                12 sample products
└── .env.example
```

## Installation

### 1. Prerequisites
- Node.js 18+
- A PostgreSQL database (local, or a free tier on Supabase/Neon/Render)

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Configure environment variables
```bash
cp ../.env.example .env
```
Edit `server/.env` — see [Environment Variables](#environment-variables) below.

### 4. Set up the database
```bash
psql "$DATABASE_URL" -f ../database/schema.sql
psql "$DATABASE_URL" -f ../database/seed.sql
```
(Or run the two files through your provider's SQL editor if you're using a
hosted Postgres console.)

### 5. Create the initial admin account
```bash
npm run create-admin
```
This reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from `server/.env`
and creates (or promotes) that account to `ADMIN`. No password is ever
hardcoded in source.

### 6. Run the backend
```bash
npm start          # production
npm run dev         # auto-restarts on file changes
```
The API runs on `http://localhost:5000` by default.

### 7. Run the frontend
The frontend is static — serve the `client/` folder with anything:
```bash
cd client
npx serve .
# or: python3 -m http.server 8888
```
`client/js/api.js` automatically points to `http://localhost:5000/api` when
the page is served from `localhost`, so no configuration is needed locally.

## Environment Variables

See `.env.example` for the full list with comments. The essentials:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set `true` for Supabase/Neon/Render Postgres in production |
| `JWT_SECRET` | Long random string signing auth tokens |
| `CLIENT_URL` | Comma-separated allowed CORS origins |
| `PAYSTACK_SECRET_KEY` | Leave blank to run checkout in mock mode |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used once by `npm run create-admin` |

## Deployment

**Backend (Render or Railway)**
1. Push this repo to GitHub.
2. Create a new Web Service pointing at `server/` (build command `npm install`, start command `npm start`).
3. Add all variables from `.env.example` in the platform's environment settings.
4. After the first deploy, run the schema/seed SQL against your managed
   Postgres instance, then run `npm run create-admin` once (via the platform's
   shell/console, or locally against the same `DATABASE_URL`).

**Database (Supabase, Neon, or Render Postgres)**
Any of these work — just set `DATABASE_URL` (and `DATABASE_SSL=true`) to the
connection string they give you.

**Frontend (Netlify or any static host)**
1. Deploy the `client/` folder.
2. Since the frontend and backend will be on different domains, add a small
   line before `js/api.js` loads on each page (or create one `client/js/config.js`
   and include it first) setting:
   ```html
   <script>window.RAVERS_API_BASE_URL = "https://your-backend.onrender.com/api";</script>
   ```

## API Overview

All responses are JSON: `{ success, data }` or `{ success: false, message }`.

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | user |
| GET | `/api/products` | — (`?search=&category=&featured=&limit=&exclude=`) |
| GET | `/api/products/:id` | — |
| GET | `/api/products/admin/all` | admin |
| POST/PUT/DELETE | `/api/products(/:id)` | admin |
| POST | `/api/orders` | optional (guest checkout allowed) |
| POST | `/api/orders/track` | — (`{ reference, email }`, checks both orders and custom orders) |
| POST | `/api/orders/verify-payment` | — (`{ reference }`, called by checkout.html after a live Paystack redirect) |
| GET | `/api/orders/my-orders` | user |
| GET | `/api/orders` | admin |
| GET | `/api/orders/:id` | user (own order) / admin |
| PATCH | `/api/orders/:id/status` | admin |
| POST | `/api/custom-orders` | optional (`multipart/form-data`, field `referenceImage`) |
| GET | `/api/custom-orders/my-requests` | user |
| GET | `/api/custom-orders` | admin |
| GET | `/api/custom-orders/:id` | user (own request) / admin |
| PATCH | `/api/custom-orders/:id/status` | admin |
| GET | `/api/admin/dashboard` | admin |
| GET | `/api/admin/customers(/:id)` | admin |

Every admin route is enforced server-side by JWT + role check — the frontend
guard is a UX convenience only, never the real security boundary.

## Intentionally Mocked / Requires Credentials

- **Payments** — with no `PAYSTACK_SECRET_KEY` set, orders are marked `paid`
  automatically on creation so the checkout flow can be demoed end to end.
  Add a real key to `server/.env` and `paymentService.js` switches to live
  `transaction/initialize` calls: the customer is redirected to Paystack,
  then redirected back to `checkout.html?reference=...`, which calls
  `POST /api/orders/verify-payment` to confirm the payment server-side
  before showing the order as complete — the redirect alone is never
  trusted. Two things to remember when you flip this on:
  - **Restart the server after editing `.env`.** Env vars are only read at
    process startup, so an edit to a running process does nothing until it
    restarts (`npm run dev`'s `--watch` doesn't pick up `.env` changes
    either). If deployed, add the key in your host's dashboard, not just
    a local `.env` file — Render/Railway don't see your local file.
  - **Set a callback URL in the Paystack dashboard** (Settings → API Keys
    & Webhooks) pointing at `https://your-frontend-domain/checkout.html`.
    The backend also passes `callback_url` explicitly when `CLIENT_URL` is
    set to a real domain (not the local-dev `*`), but the dashboard setting
    is the reliable fallback Paystack uses either way.
- **File storage** — custom order reference files are saved to local disk
  under `server/uploads/`. `middleware/upload.js` isolates this behind a
  single storage config, so swapping in Cloudinary or Supabase Storage later
  is a localized change.
- **Delivery fee** — a flat placeholder (`₦3,500`, see `DELIVERY_FEE` in
  `orderService.js`) stands in for real rate calculation.
- **Product images** — seeded with neutral placeholder URLs
  (`placehold.co`) rather than real product photography.

## Verified Working

Every API endpoint was exercised end-to-end against a real PostgreSQL
instance during development: registration, login, product CRUD and
filtering, guest and authenticated checkout (including server-side price
recalculation and transactional order creation), order/custom-order
tracking, file upload with type/size validation, and every admin route —
including negative cases (wrong password, non-admin access attempts,
ownership checks, invalid status values).

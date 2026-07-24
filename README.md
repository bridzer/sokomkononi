# Kalro Farm Kenya — E-commerce Website

A simple, efficient e-commerce platform for **Kalro Farm Kenya** (Naivasha) selling dairy goats, boer goats, poultry, kanga birds and farm-fresh eggs. Built for farmers, agri-businesses and the general public with tight WhatsApp integration.

**Reference:** https://karlofarm.co.ke

## Tech stack

| Layer      | Tech                                     |
| ---------- | ---------------------------------------- |
| Frontend   | React 18, React Router, Tailwind CSS, Axios, react-hot-toast |
| Backend    | Node.js, Express, JWT auth               |
| Database   | PostgreSQL                               |
| Messaging  | WhatsApp click-to-chat (`wa.me`)         |

## Project structure

```
kalro/
├── client/          # React frontend (public site + admin panel)
├── server/          # Node/Express REST API
│   ├── sql/         # PostgreSQL schema
│   ├── uploads/     # Admin-uploaded product/category images (created automatically)
│   └── src/scripts/ # migrate.js, seed.js
├── package.json     # root workspace scripts
└── README.md
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- PostgreSQL 13+ running locally

## 1. Create the database

Open a PostgreSQL prompt and create the database:

```sql
CREATE DATABASE kalro_farm;
```

## 2. Configure environment

There are two `.env` files — one for the API and one for the React client.

### Server (`server/.env`)

```bash
cp server/.env.example server/.env
```

Important values:

- `DATABASE_URL` (or the individual `DB_*` vars) — how the API connects to Postgres
- `JWT_SECRET` — set to a long random string in production
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin account created during seed
- `WHATSAPP_NUMBER` — international format without `+`, e.g. `254756908482`

### Client (`client/.env`)

```bash
cp client/.env.example client/.env
```

All customer-facing phone / WhatsApp numbers are driven from this file so the admin can update them without touching code. Only variables starting with `REACT_APP_` are exposed to the browser.

| Variable                          | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `REACT_APP_BUSINESS_NAME`         | Business name shown across the site                        |
| `REACT_APP_BUSINESS_LOCATION`     | Business location (footer/contact)                          |
| `REACT_APP_BUSINESS_EMAIL`        | Public contact email                                        |
| `REACT_APP_PHONE_{n}_LABEL`       | Short heading, e.g. `Main Line`                             |
| `REACT_APP_PHONE_{n}_SUBTITLE`    | One-line description, e.g. `Sales & orders`                 |
| `REACT_APP_PHONE_{n}_NUMBER`      | Call number in any Kenyan format (`+254…`, `0…`, `254…`)    |
| `REACT_APP_PHONE_{n}_WHATSAPP`    | Optional WhatsApp override. Leave **blank** to hide from the WhatsApp chooser (call-only line) |
| `REACT_APP_PHONE_{n}_DISPLAY`     | Optional pretty display, e.g. `020 822 4938`                |

`{n}` starts at `1` and can go up to `8`. Delete a block to remove that line entirely.

> ⚠️ **These are compiled in at build time.** After editing `client/.env`:
> - Local dev: restart `npm start` (in `client/`).
> - Railway: update the env vars in the service settings and redeploy — Railway rebuilds the client on every deploy.

## 3. Install dependencies

From the project root:

```bash
npm run install:all
```

This installs deps for both `server/` and `client/` (root only needs `concurrently`).

If the root install is needed first:

```bash
npm install
```

## 4. Migrate + seed the database

```bash
npm run db:migrate   # applies server/sql/schema.sql
npm run db:seed      # creates admin + categories + products
```

To reset everything (drops all tables and re-seeds):

```bash
npm run db:reset
```

Default seeded admin (change in `.env` before running seed):

- **Email:** `admin@kalrofarm.co.ke`
- **Password:** `Admin@1234`

## 5. Run the app (dev)

Run both server and client concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API:      http://localhost:5000/api
- Admin:    http://localhost:3000/admin/login

Or run them independently:

```bash
npm run server   # http://localhost:5000
npm run client   # http://localhost:3000
```

The React dev server proxies `/api` to `http://localhost:5000` (see `client/package.json`).

## Features

### Public site
- **Home** – hero, categories, featured products, why-choose section, WhatsApp CTAs
- **Shop** – all products with sidebar category filter + search
- **Category pages** – `/shop/dairy-goats`, `/shop/boer-goats`, `/shop/poultry`, `/shop/eggs`
- **Product detail** – full info, quantity picker, add to cart, buy now, order via WhatsApp
- **Cart** – edit quantities, remove items, subtotal
- **Checkout** – place order (guest or logged-in), select county, or send via WhatsApp
- **Order success** – confirmation with WhatsApp confirm link
- **About / Contact** – company info + contact form (saved as messages for admin)
- **Floating WhatsApp button** on every page

### Admin panel (`/admin`)
- **Login** – JWT-protected
- **Dashboard** – counts (products, orders, revenue, unread messages), recent orders, low-stock warnings
- **Products** – full CRUD with category, price, stock, featured flag, active flag
- **Categories** – CRUD
- **Orders** – list with status filter, detailed view, update status (pending → delivered), WhatsApp/call customer
- **Messages** – contact enquiries with WhatsApp reply

### WhatsApp integration
- Floating chat button on the public site (bottom-right)
- Every product card + product detail has an **Order via WhatsApp** button with the product name and price pre-filled
- Checkout has an **Order via WhatsApp** option that ships the entire cart as a formatted message
- Order success page → **Confirm on WhatsApp** button
- Admin can WhatsApp customers from the order detail and contact messages screens

## Database schema (Postgres)

| Table              | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `users`            | Customers + admins with `role` and hashed passwords |
| `categories`       | Product groupings (goats, poultry, eggs, ...)    |
| `products`         | Sale items with breed, age/stage, price, stock, unit, image |
| `orders`           | Customer orders with delivery details & status   |
| `order_items`      | Line items for each order                        |
| `contact_messages` | Enquiries from the contact form                  |
| `settings`         | Business settings (name, phone, WhatsApp, ...)   |

See `server/sql/schema.sql` for the full DDL.

## API reference (public routes)

Base URL: `http://localhost:5000/api`

| Method | Endpoint                       | Auth   | Description                        |
| ------ | ------------------------------ | ------ | ---------------------------------- |
| GET    | `/health`                      | –      | Health check                       |
| POST   | `/auth/register`               | –      | Register a customer                |
| POST   | `/auth/login`                  | –      | Login (returns JWT + user)         |
| GET    | `/auth/me`                     | Bearer | Current authenticated user         |
| GET    | `/categories`                  | –      | List active categories             |
| GET    | `/products`                    | –      | List active products (`?category`, `?search`, `?featured`) |
| GET    | `/products/:slug`              | –      | Single product                     |
| POST   | `/orders`                      | –      | Place an order (guest supported)   |
| GET    | `/orders/lookup/:orderNumber`  | –      | Lookup order for success page      |
| POST   | `/contact`                     | –      | Submit contact message             |
| GET    | `/settings`                    | –      | Public business settings           |

Admin (Bearer JWT, `role=admin`):

- `GET  /admin/stats`
- `GET/POST/PUT/DELETE /admin/products[/{id}]`
- `GET/POST/PUT/DELETE /admin/categories[/{id}]`
- `GET  /admin/orders`, `GET /admin/orders/:id`, `PUT /admin/orders/:id/status`
- `GET  /admin/messages`, `PUT /admin/messages/:id/read`, `DELETE /admin/messages/:id`
- `POST /admin/uploads` — multipart form, field name `image` (JPG/PNG/WEBP/GIF/SVG, ≤ 5 MB). Returns `{ url: "/uploads/…" }`.
- `DELETE /admin/uploads/:filename` — remove a previously uploaded file.
- `PUT  /settings`

### Image uploads

Product and category images are uploaded directly from the admin's device.

- Files are stored under `server/uploads/` and served publicly at `http://localhost:5000/uploads/<file>`.
- The React dev server proxies both `/api` and `/uploads` to the backend (see `client/src/setupProxy.js`) so you can develop as if it's one origin.
- The upload folder is auto-created if missing and its contents are git-ignored.
- Limits: 5 MB per image; JPG, PNG, WEBP, GIF and SVG only.

## Production build

The root `build` and `start` scripts turn the monorepo into a single deployable Node app that serves the React build from the same origin as the API. No CORS, no separate frontend host needed.

```bash
# Build (installs server + client deps, builds React)
npm run build

# Start (Express serves API + client/build)
NODE_ENV=production npm start
```

Alternatively, deploy the frontend to a static host (Vercel/Netlify) and the backend elsewhere — set `REACT_APP_API_URL` on the frontend and `CLIENT_URL` on the backend.

## Loop payments

Loop integration uses the [Loop sandbox API](https://sandbox.loop.co.ke/devportal/docs/loop-api/introduction) (WSO2 APIM).

### Server env vars (Railway — never expose to client)

| Variable | Description |
|----------|-------------|
| `APP_BASE_URL` | Public site URL, e.g. `https://kalro.store` |
| `LOOP_API_BASE_URL` | **`https://sandbox.loop.co.ke`** — do **not** use `api-sandbox.loopdfs.co.ke` (invalid DNS) |
| `LOOP_CLIENT_ID` | From Loop developer portal |
| `LOOP_CLIENT_SECRET` | From Loop developer portal |
| `LOOP_API_KEY` | Optional subscription key from dev portal (sent as `X-API-Key`) |
| `LOOP_WEBHOOK_SECRET` | Optional — enables HMAC callback verification |
| `LOOP_PAYMENT_INIT_PATH` | Default `/loop-api/1.0.0/payments/initiate` |

Test locally:

```bash
cd server
node src/scripts/test-loop-payment.js          # OAuth only
node src/scripts/test-loop-payment.js --initiate # Full payment initiate test
```

If OAuth succeeds but payment returns **401**, subscribe your application to the Loop API in the [developer portal](https://sandbox.loop.co.ke/devportal/home) and confirm credentials.

### Enable in admin

1. Set env vars and redeploy
2. Admin → **Settings** → enable **Loop payments**
3. Register callback URL in Loop portal: `https://kalro.store/api/payments/loop/callback`

### Checkout flow

- **Pay on delivery** — existing manual order flow
- **Pay with Loop** — creates order, initiates mobile payment prompt, webhook confirms payment

---

## Google Analytics (GA4)

Tracks page views, ecommerce (cart, checkout, purchases), product views, search, contact leads, WhatsApp clicks, and shares. Admin routes are excluded.

### Client env vars (Railway — rebuild required)

| Variable | Description |
|----------|-------------|
| `REACT_APP_GA_ENABLED` | `true` to enable tracking |
| `REACT_APP_GA_MEASUREMENT_ID` | GA4 Measurement ID (`G-XXXXXXXXXX`) |
| `REACT_APP_GA_ANONYMIZE_IP` | `true` (default) — anonymize IPs in reports |
| `REACT_APP_GA_DEBUG` | `true` — send events to GA DebugView |
| `REACT_APP_GA_BUSINESS_NAME` | Custom user property on all events |
| `REACT_APP_GA_SITE_NAME` | Site label attached to page views |
| `REACT_APP_GA_CURRENCY` | Ecommerce currency (default `KES`) |

### Server env vars (optional — early gtag load without rebuild)

| Variable | Description |
|----------|-------------|
| `GA_ENABLED` | `true` — inject gtag in served HTML |
| `GA_MEASUREMENT_ID` | Same as `REACT_APP_GA_MEASUREMENT_ID` |

Set both client and server vars on Railway, redeploy, then verify in [GA4 Realtime](https://analytics.google.com/) while browsing the site.

---

## Deploying to Railway

Railway's build system (Railpack) needs to know this is a Node app deployable from the repo root. The included `railway.json` handles that. Steps:

1. **Push your repo to GitHub** (already done: https://github.com/Edensystems/kalro).

2. **Create a new Railway project** → *Deploy from GitHub repo* → pick this repo. Leave the root directory empty (Railway will read `railway.json` at the root).

3. **Add a PostgreSQL plugin**:
   - In the project, *New → Database → PostgreSQL*.
   - Railway automatically exposes `DATABASE_URL` to your service. `server/src/db.js` already prefers `DATABASE_URL`, so nothing else to configure.

4. **Set environment variables** on the web service (Variables tab):

   | Name              | Example / Notes |
   | ----------------- | --------------- |
   | `NODE_ENV`        | `production` |
   | `JWT_SECRET`      | long random string (e.g. `openssl rand -hex 48`) |
   | `JWT_EXPIRES_IN`  | `7d` |
   | `ADMIN_EMAIL`     | `admin@kalrofarm.co.ke` |
   | `ADMIN_PASSWORD`  | strong password |
   | `ADMIN_NAME`      | `Kalro Admin` |
   | `WHATSAPP_NUMBER` | `254756908482` |
   | `PHONE_NUMBER`    | `0756908482` |
   | `BUSINESS_EMAIL`  | `info@kalrofarm.co.ke` |
   | `BUSINESS_LOCATION` | `Naivasha, Kenya` |
   | `CLIENT_URL`      | Leave unset for single-service (same-origin). If you split, set to your frontend URL. |

   Also add the client-side (`REACT_APP_*`) vars so the deployed site shows the right business name and phone lines:

   | Name                                | Example                       |
   | ----------------------------------- | ----------------------------- |
   | `REACT_APP_BUSINESS_NAME`           | `Kalro Farm Kenya`            |
   | `REACT_APP_BUSINESS_LOCATION`       | `Naivasha, Kenya`             |
   | `REACT_APP_BUSINESS_EMAIL`          | `info@kalrofarm.co.ke`        |
   | `REACT_APP_PHONE_1_LABEL`           | `Main Line`                   |
   | `REACT_APP_PHONE_1_SUBTITLE`        | `Sales & orders`              |
   | `REACT_APP_PHONE_1_NUMBER`          | `+254208224938`               |
   | `REACT_APP_PHONE_1_WHATSAPP`        | `+254756908482`               |
   | `REACT_APP_PHONE_1_DISPLAY`         | `020 822 4938`                |
   | `REACT_APP_PHONE_2_LABEL`           | `Naivasha Branch`             |
   | `REACT_APP_PHONE_2_SUBTITLE`        | `Poultry & eggs`              |
   | `REACT_APP_PHONE_2_NUMBER`          | `+254756908482`               |

   `PORT` is provided by Railway — do **not** set it manually.

5. **Persistent uploads (required)** — Railway containers wipe the filesystem on every deploy. Pick **one**:

   **Option A — Railway Volume (simplest, no extra service):**
   - Web service → **Volumes** → **New Volume**
   - Mount path: **`/app/server/uploads`**
   - Add variable: `UPLOAD_DIR=/app/server/uploads`
   - Redeploy, then re-upload images **once** — they will survive future deploys

   **Option B — Railway Storage Bucket / Cloudflare R2 / AWS S3:**

   Railway buckets are **private** — files are uploaded to S3 and served through your app at `/uploads/...`.

   1. In Railway project canvas: **+ New → Bucket** → pick region → create
   2. Open your **web service → Variables → Add Variable Reference** → select the bucket → choose **AWS SDK** preset (or map manually below)
   3. Add these on your **web service** (reference bucket vars where shown):

   ```env
   STORAGE_TYPE=s3
   S3_BUCKET=${{Bucket.BUCKET}}
   S3_ENDPOINT=${{Bucket.ENDPOINT}}
   S3_REGION=${{Bucket.REGION}}
   S3_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
   S3_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
   APP_BASE_URL=https://kalro.store
   S3_PUBLIC_BASE_URL=https://kalro.store/uploads
   ```

   Check the bucket **Credentials** tab for URL style:
   - **Virtual-hosted** (default): leave `S3_FORCE_PATH_STYLE` unset
   - **Path-style** (older buckets): add `S3_FORCE_PATH_STYLE=true`

   You can also use Railway's native names directly — the app accepts `AWS_*` and `BUCKET` aliases:

   ```env
   STORAGE_TYPE=s3
   AWS_S3_BUCKET_NAME=${{Bucket.BUCKET}}
   AWS_ENDPOINT_URL=${{Bucket.ENDPOINT}}
   AWS_DEFAULT_REGION=${{Bucket.REGION}}
   AWS_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
   AWS_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
   APP_BASE_URL=https://kalro.store
   ```

   **Cloudflare R2** (public CDN URL):

   ```env
   STORAGE_TYPE=s3
   S3_BUCKET=kalro-uploads
   S3_REGION=auto
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
   S3_FORCE_PATH_STYLE=true
   ```

   After deploy, re-upload product images once. Old `/uploads/...` paths in the DB still work via the S3 proxy.

   After deploy, check **`GET /api/health`** — the `uploads` section shows whether storage is persistent. If you see a warning, uploads will be lost on the next deploy.

6. **Deploy** — Railway will now:
   - Run the `buildCommand` from `railway.json`:
     `npm --prefix server install --omit=dev && npm --prefix client install && npm --prefix client run build`
   - Run the `startCommand`: `node server/src/index.js`
   - Poll `GET /api/health` to verify the service is up.

7. **Migrate + seed the DB** (one-time). Open the service → *Settings → Deploy → Custom Start Command* temporarily, or use the Railway CLI:

   ```bash
   railway login
   railway link                    # link this project
   railway run npm run db:migrate   # applies server/sql/schema.sql
   railway run npm run db:seed      # creates admin + categories + products
   ```

8. **Visit the domain** Railway assigns (or attach a custom domain from *Settings → Domains*). The frontend and API are served from the same origin, so:
   - Storefront: `https://<your-app>.up.railway.app/`
   - Admin login: `https://<your-app>.up.railway.app/admin/login`
   - API health check: `https://<your-app>.up.railway.app/api/health`

### Troubleshooting Railway

- **"No start command"** — Ensure `railway.json` is at the repo root and committed. Alternatively, in the service *Settings*, set the *Build Command* and *Start Command* manually with the same values.
- **`DATABASE_URL` not set** — Verify the PG plugin is attached to *this* service (Variables tab should show `DATABASE_URL`).
- **`client/build not found`** — The build step didn't run. Check the *Build logs* for the client build output.
- **Images disappear after redeploy** — Uploads were stored on ephemeral disk. Add a Railway Volume at `/app/server/uploads` with `UPLOAD_DIR=/app/server/uploads`, **or** set `STORAGE_TYPE=s3` with R2/S3 credentials. Check `/api/health` → `uploads.persistent` should be `true`. You only need to re-upload once after fixing storage.

## License

Proprietary — © Kalro Farm Kenya.
#   f a r m c a r e  
 
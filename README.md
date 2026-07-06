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

Copy `server/.env.example` to `server/.env` and update the values:

```bash
cp server/.env.example server/.env
```

Important values:

- `DATABASE_URL` (or the individual `DB_*` vars) — how the API connects to Postgres
- `JWT_SECRET` — set to a long random string in production
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin account created during seed
- `WHATSAPP_NUMBER` — international format without `+`, e.g. `254756908482`

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

```bash
# Frontend static build
npm run build --prefix client   # outputs client/build/

# Backend — set NODE_ENV=production and use a process manager (pm2, systemd, etc.)
NODE_ENV=production npm start --prefix server
```

Serve the frontend from any static host (Netlify, Vercel, S3, Nginx) pointing to `client/build`, and expose the API on a subdomain (e.g. `api.kalrofarm.co.ke`). Update `REACT_APP_API_URL` and `CLIENT_URL` accordingly.

## License

Proprietary — © Kalro Farm Kenya.

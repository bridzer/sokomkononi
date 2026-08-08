-- Soko Mkononi - PostgreSQL Schema
-- Idempotent: safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (customers + admins + sellers)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  phone         VARCHAR(32),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer','admin','seller')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing DBs may still have the old 2-role check — widen it
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer','admin','seller'));

-- Categories: Dairy Goats, Boer Goats, Poultry, Eggs, etc.
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main vs sub-category: NULL parent_id = top-level (e.g. Livestock);
-- non-NULL = subcategory under that parent. Products should use a subcategory.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES categories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  category_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(220) NOT NULL UNIQUE,
  description  TEXT,
  breed        VARCHAR(120),
  age_stage    VARCHAR(120),
  unit         VARCHAR(60) NOT NULL DEFAULT 'each',
  price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url    TEXT,                                     -- primary/cover image (denormalized from images[0])
  images       JSONB NOT NULL DEFAULT '[]'::jsonb,       -- ordered gallery of image URLs
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for existing installs: add the `images` column if missing and
-- backfill it from any single-image row so the gallery has at least one photo.
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE products
SET images = jsonb_build_array(image_url)
WHERE (images IS NULL OR images = '[]'::jsonb)
  AND image_url IS NOT NULL
  AND image_url <> '';

-- Pricing modes: fixed (default) or range (price = min, price_max = max)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) NOT NULL DEFAULT 'fixed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_max NUMERIC(12,2);

UPDATE products SET price_type = 'fixed' WHERE price_type IS NULL OR price_type = '';
UPDATE products SET price_max = NULL WHERE price_type = 'fixed';

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_price_type_check
    CHECK (price_type IN ('fixed', 'range'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_price_max_check
    CHECK (
      (price_type = 'fixed' AND price_max IS NULL) OR
      (price_type = 'range' AND price_max IS NOT NULL AND price_max >= price)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  order_number      VARCHAR(30) NOT NULL UNIQUE,
  user_id           INT REFERENCES users(id) ON DELETE SET NULL,
  customer_name     VARCHAR(160) NOT NULL,
  customer_phone    VARCHAR(32)  NOT NULL,
  customer_email    VARCHAR(160),
  delivery_address  TEXT NOT NULL,
  county            VARCHAR(80),
  notes             TEXT,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            VARCHAR(24) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','processing','delivered','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INT REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Contact / enquiry messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  phone      VARCHAR(32),
  email      VARCHAR(160),
  subject    VARCHAR(200),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site settings (single row)
CREATE TABLE IF NOT EXISTS settings (
  id                SERIAL PRIMARY KEY,
  business_name     VARCHAR(160) NOT NULL DEFAULT 'Soko Mkononi',
  whatsapp_number   VARCHAR(32),
  phone_number      VARCHAR(32),
  email             VARCHAR(160),
  location          VARCHAR(200),
  about             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment settings (admin toggle — secrets stay in server env vars)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS loop_payments_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Order payment tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(24) NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid';

-- Payment gateway transaction log (Loop callbacks, idempotency)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id               SERIAL PRIMARY KEY,
  order_id         INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider         VARCHAR(32) NOT NULL DEFAULT 'loop',
  reference        VARCHAR(64) NOT NULL,
  external_id      VARCHAR(128),
  amount           NUMERIC(12,2) NOT NULL,
  currency         VARCHAR(8) NOT NULL DEFAULT 'KES',
  status           VARCHAR(24) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','completed','failed','cancelled')),
  callback_payload JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Sellers (created by admin; products without a seller belong to Soko Mkononi by default)
CREATE TABLE IF NOT EXISTS sellers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  phone       VARCHAR(32),
  email       VARCHAR(160),
  whatsapp    VARCHAR(32),
  location    VARCHAR(200),
  bio         TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(is_active);

ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES sellers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);

-- Delivery window on orders (working days)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_min_days INT NOT NULL DEFAULT 3;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_max_days INT NOT NULL DEFAULT 7;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- Opaque view token for confirmation / payment status (prevents order-number enumeration)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS view_token VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_view_token ON orders(view_token) WHERE view_token IS NOT NULL;
-- Longer unpredictable order numbers (KF-YYYYMMDD- + 16 hex)
ALTER TABLE orders ALTER COLUMN order_number TYPE VARCHAR(40);

-- Out-of-stock product bookings (interest / waitlist)
CREATE TABLE IF NOT EXISTS product_bookings (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name   VARCHAR(160) NOT NULL,
  customer_phone  VARCHAR(32) NOT NULL,
  customer_email  VARCHAR(160),
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes           TEXT,
  status          VARCHAR(24) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','contacted','fulfilled','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_bookings_status ON product_bookings(status);
CREATE INDEX IF NOT EXISTS idx_product_bookings_product ON product_bookings(product_id);

-- Product reviews (public after admin approval)
CREATE TABLE IF NOT EXISTS product_reviews (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  customer_name   VARCHAR(160) NOT NULL,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(product_id, is_approved);

-- Related products strategy (admin-configurable; default = closest relationship)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS related_products_mode VARCHAR(40) NOT NULL DEFAULT 'closest';

-- Seller trust signals (Alibaba-style supplier profile)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivered_count INT NOT NULL DEFAULT 0;

-- Who fulfills / ships the product: Soko Mkononi (platform) or the listing seller
ALTER TABLE products ADD COLUMN IF NOT EXISTS fulfilled_by VARCHAR(24) NOT NULL DEFAULT 'platform';

-- Checkout delivery preference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(32) NOT NULL DEFAULT 'soko_delivery';

-- ---------------------------------------------------------------------------
-- Hybrid commerce model
--   marketplace = limited supply (livestock, fresh produce) → commission
--   retail      = constant supply (inputs, machinery) → store / markup
-- ---------------------------------------------------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS default_commerce_mode VARCHAR(20) NOT NULL DEFAULT 'retail';
ALTER TABLE products ADD COLUMN IF NOT EXISTS commerce_mode VARCHAR(20) NOT NULL DEFAULT 'retail';
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS marketplace_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS featured_listing_price_kes NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS featured_listing_days INT NOT NULL DEFAULT 30;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES sellers(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commerce_mode VARCHAR(20);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS fulfilled_by VARCHAR(24);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE categories ADD CONSTRAINT categories_default_commerce_mode_check
    CHECK (default_commerce_mode IN ('marketplace', 'retail'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_commerce_mode_check
    CHECK (commerce_mode IN ('marketplace', 'retail'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed category defaults from taxonomy slugs (idempotent)
UPDATE categories SET default_commerce_mode = 'marketplace', updated_at = NOW()
WHERE parent_id IS NULL
  AND slug IN (
    'livestock', 'horticulture', 'crop-production',
    'fisheries-aquaculture', 'forestry'
  );

UPDATE categories SET default_commerce_mode = 'retail', updated_at = NOW()
WHERE parent_id IS NULL
  AND slug IN (
    'agricultural-engineering', 'soil-science-inputs', 'agribusiness',
    'food-science-technology', 'biotechnology-genetics'
  );

-- Children inherit parent's default
UPDATE categories child
SET default_commerce_mode = parent.default_commerce_mode,
    updated_at = NOW()
FROM categories parent
WHERE child.parent_id = parent.id
  AND parent.default_commerce_mode IS NOT NULL;

-- Promote stock that sits under marketplace categories (livestock, produce, etc.)
UPDATE products p
SET commerce_mode = 'marketplace',
    updated_at = NOW()
FROM categories c
LEFT JOIN categories pc ON pc.id = c.parent_id
WHERE p.category_id = c.id
  AND p.commerce_mode = 'retail'
  AND COALESCE(pc.default_commerce_mode, c.default_commerce_mode) = 'marketplace';

CREATE INDEX IF NOT EXISTS idx_products_commerce_mode ON products(commerce_mode);
CREATE INDEX IF NOT EXISTS idx_products_featured_until ON products(featured_until)
  WHERE is_featured = TRUE;

-- Seller login: link a sellers row to a users account (role = seller)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id INT UNIQUE REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_user ON sellers(user_id);

-- Structured delivery address (for routing / distance). delivery_address kept as composed string.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS country_code VARCHAR(8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS country_name VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(240);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(240);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code VARCHAR(32);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sub_county VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sub_location VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
CREATE INDEX IF NOT EXISTS idx_orders_county ON orders(county);
CREATE INDEX IF NOT EXISTS idx_orders_country ON orders(country_code);

-- Structured seller base location (sellers.location stays the composed display string).
-- admin_location = Kenya LOCATION unit (avoids clash with legacy location column).
ALTER TABLE sellers ALTER COLUMN location TYPE VARCHAR(500);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS country_code VARCHAR(8);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS country_name VARCHAR(120);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(240);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(240);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(32);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS county VARCHAR(120);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS sub_county VARCHAR(120);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS admin_location VARCHAR(120);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS sub_location VARCHAR(120);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
CREATE INDEX IF NOT EXISTS idx_sellers_county ON sellers(county);

-- Seller profile photo (shown on storefront + seller hub)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ---------------------------------------------------------------------------
-- Market discovery + marketplace lot lifecycle (Kaggriculture-inspired)
-- ---------------------------------------------------------------------------

-- Marketplace lot pipeline (retail products stay listed)
ALTER TABLE products ADD COLUMN IF NOT EXISTS lot_status VARCHAR(20) NOT NULL DEFAULT 'listed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS ready_from TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserve_expires_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_lot_status_check
    CHECK (lot_status IN ('draft', 'listed', 'reserved', 'sold', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_lot_status ON products(lot_status);

-- Seller service radius + pickup point ("tiles")
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS service_counties JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pickup_label VARCHAR(200);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

-- Soft reserves (one active hold per product to prevent double-sell)
CREATE TABLE IF NOT EXISTS product_reserves (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name   VARCHAR(160) NOT NULL,
  customer_phone  VARCHAR(32) NOT NULL,
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source          VARCHAR(32) NOT NULL DEFAULT 'whatsapp_hold'
                  CHECK (source IN ('whatsapp_hold', 'booking', 'manual')),
  status          VARCHAR(24) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reserves_product ON product_reserves(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reserves_status ON product_reserves(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reserves_one_active
  ON product_reserves(product_id)
  WHERE status = 'active';

-- Waitlist restock notify tracking
ALTER TABLE product_bookings ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Manual remittance ledger for marketplace seller payouts
CREATE TABLE IF NOT EXISTS seller_payout_entries (
  id              SERIAL PRIMARY KEY,
  order_item_id   INT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  seller_id       INT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  gmv             NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(24) NOT NULL DEFAULT 'owed'
                  CHECK (status IN ('owed', 'remitted')),
  remitted_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_payout_entries_seller ON seller_payout_entries(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payout_entries_status ON seller_payout_entries(status);

-- Lightweight search demand log (Shop / county pages)
CREATE TABLE IF NOT EXISTS search_events (
  id              SERIAL PRIMARY KEY,
  search_query    VARCHAR(200),
  category_slug   VARCHAR(140),
  county          VARCHAR(120),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_events_created ON search_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_events_county ON search_events(county);

-- Discovery / hold settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS corridor_counties JSONB NOT NULL DEFAULT '["Nakuru","Nyandarua","Kiambu","Nairobi"]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS reserve_hold_hours INT NOT NULL DEFAULT 24;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS market_pulse_min_listings INT NOT NULL DEFAULT 5;

UPDATE settings
SET corridor_counties = '["Nakuru","Nyandarua","Kiambu","Nairobi"]'::jsonb
WHERE corridor_counties IS NULL OR corridor_counties = '[]'::jsonb;

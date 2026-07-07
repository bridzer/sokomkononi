-- Kalro Farm Kenya - PostgreSQL Schema
-- Idempotent: safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (customers + admins)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  phone         VARCHAR(32),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  business_name     VARCHAR(160) NOT NULL DEFAULT 'Kalro Farm Kenya',
  whatsapp_number   VARCHAR(32),
  phone_number      VARCHAR(32),
  email             VARCHAR(160),
  location          VARCHAR(200),
  about             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

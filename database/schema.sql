-- RAVERS E-Commerce — PostgreSQL schema
-- Run this once against a fresh database before seed.sql

BEGIN;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
                        CHECK (role IN ('CUSTOMER', 'ADMIN')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category        VARCHAR(100) NOT NULL,
    image_url       TEXT NOT NULL DEFAULT '',
    sizes           TEXT[] NOT NULL DEFAULT '{}',
    material        VARCHAR(255) NOT NULL DEFAULT '',
    featured        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active) WHERE is_active = TRUE;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(40) NOT NULL UNIQUE,
    user_id             INTEGER REFERENCES users (id) ON DELETE SET NULL,
    customer_name       VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(50) NOT NULL,
    address             TEXT NOT NULL,
    city                VARCHAR(120) NOT NULL,
    state               VARCHAR(120) NOT NULL,
    notes               TEXT NOT NULL DEFAULT '',
    status              VARCHAR(30) NOT NULL DEFAULT 'Order Received'
                            CHECK (status IN (
                                'Order Received', 'Confirmed', 'In Production',
                                'Quality Check', 'Ready for Delivery', 'Delivered', 'Cancelled'
                            )),
    subtotal            NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total               NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_reference   VARCHAR(120),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products (id) ON DELETE SET NULL,
    product_name    VARCHAR(255) NOT NULL,
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    selected_size   VARCHAR(20) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

-- ============================================================
-- CUSTOM ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_orders (
    id                      SERIAL PRIMARY KEY,
    reference_number        VARCHAR(40) NOT NULL UNIQUE,
    user_id                  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    customer_name            VARCHAR(255) NOT NULL,
    email                    VARCHAR(255) NOT NULL,
    phone                    VARCHAR(50) NOT NULL,
    clothing_type            VARCHAR(50) NOT NULL,
    size                     VARCHAR(20) NOT NULL DEFAULT '',
    color                    VARCHAR(80) NOT NULL DEFAULT '',
    fit_style                VARCHAR(50) NOT NULL DEFAULT '',
    design_description       TEXT NOT NULL,
    design_notes             TEXT NOT NULL DEFAULT '',
    reference_image_url      TEXT,
    status                   VARCHAR(30) NOT NULL DEFAULT 'Submitted'
                                CHECK (status IN (
                                    'Submitted', 'Reviewing', 'Quote Sent', 'Approved',
                                    'In Production', 'Completed', 'Cancelled'
                                )),
    estimated_price          NUMERIC(10, 2),
    admin_notes              TEXT NOT NULL DEFAULT '',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_orders_email ON custom_orders (email);
CREATE INDEX IF NOT EXISTS idx_custom_orders_user_id ON custom_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_reference ON custom_orders (reference_number);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_orders (status);

COMMIT;

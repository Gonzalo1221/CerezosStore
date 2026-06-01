-- Drop existing tables
DROP TABLE IF EXISTS credit_payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Users
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name TEXT,
  email TEXT,
  password TEXT,
  role TEXT,
  status TEXT,
  last_access TIMESTAMPTZ,
  password_hash TEXT,
  password_salt TEXT,
  password_iterations INT
);

-- Products
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  category TEXT,
  size TEXT,
  gender TEXT,
  sku TEXT,
  cost NUMERIC,
  price NUMERIC,
  stock INT,
  min_stock INT,
  description TEXT,
  sell_without_stock BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id BIGINT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  credit_limit NUMERIC DEFAULT 0,
  credit_used NUMERIC DEFAULT 0,
  credit_enabled BOOLEAN DEFAULT TRUE
);

-- Sales
CREATE TABLE sales (
  id BIGINT PRIMARY KEY,
  ticket TEXT,
  date TIMESTAMPTZ,
  client TEXT,
  client_id BIGINT,
  items JSONB,
  subtotal NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  pay_method TEXT,
  status TEXT,
  credit_type TEXT,
  credit_remaining NUMERIC,
  credit_due_date DATE,
  credit_installments INT DEFAULT 1,
  credit_interest_rate NUMERIC DEFAULT 0,
  credit_base_financed NUMERIC DEFAULT 0,
  credit_interest_amount NUMERIC DEFAULT 0,
  credit_installment_value NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  down_payment NUMERIC DEFAULT 0
);

-- Credit payments
CREATE TABLE credit_payments (
  id BIGINT PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id),
  ticket TEXT,
  amount NUMERIC,
  date TIMESTAMPTZ,
  pay_method TEXT,
  notes TEXT
);

-- Brands
CREATE TABLE brands (
  id BIGINT PRIMARY KEY,
  name TEXT,
  status TEXT
);

-- Categories
CREATE TABLE categories (
  id BIGINT PRIMARY KEY,
  name TEXT,
  status TEXT
);

-- Quotes / Cotizaciones
CREATE TABLE quotes (
  id BIGINT PRIMARY KEY,
  folio TEXT NOT NULL,
  date TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT 'Consumidor Final',
  client_id BIGINT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'Vigente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE settings (
  id BIGINT PRIMARY KEY,
  iva_rate NUMERIC DEFAULT 16,
  currency TEXT DEFAULT '$',
  min_stock INT DEFAULT 5,
  auto_ticket TEXT DEFAULT 'yes',
  default_interest NUMERIC DEFAULT 20,
  fixed_cost NUMERIC DEFAULT 0,
  business_name TEXT DEFAULT 'Cerezos Store GLZ',
  business_phone TEXT DEFAULT '+52 555 123 4567',
  business_address TEXT DEFAULT 'Av. Principal #123, Col. Centro',
  business_rfc TEXT DEFAULT 'CST260101ABC',
  credit_limit NUMERIC DEFAULT 10000,
  credit_days INT DEFAULT 30
);

-- Migrations for existing databases:
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_enabled BOOLEAN DEFAULT TRUE;
-- ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS ticket TEXT;
-- ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS pay_method TEXT;
-- ALTER TABLE credit_payments ADD COLUMN IF NOT EXISTS notes TEXT;
-- ALTER TABLE credit_payments DROP COLUMN IF EXISTS type;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_without_stock BOOLEAN DEFAULT FALSE;

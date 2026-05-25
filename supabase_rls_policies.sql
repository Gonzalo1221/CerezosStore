-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "anon_all" ON users;
DROP POLICY IF EXISTS "anon_all" ON products;
DROP POLICY IF EXISTS "anon_all" ON clients;
DROP POLICY IF EXISTS "anon_all" ON sales;
DROP POLICY IF EXISTS "anon_all" ON credit_payments;
DROP POLICY IF EXISTS "anon_all" ON brands;
DROP POLICY IF EXISTS "anon_all" ON categories;
DROP POLICY IF EXISTS "anon_all" ON settings;
DROP POLICY IF EXISTS "anon_all" ON quotes;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key on all tables
CREATE POLICY "anon_all" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON credit_payments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON brands FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON quotes FOR ALL TO anon USING (true) WITH CHECK (true);

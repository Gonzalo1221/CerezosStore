-- ============ CATEGORIES UPGRADE: Professional Structure ============
-- Ejecutar este SQL en Supabase SQL Editor

-- 1. Extender tabla categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'prenda';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'unisex';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS subcategories JSONB DEFAULT '[]';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏷️';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS size_ids JSONB DEFAULT '[]';

-- 2. Extender tabla sizes con sistema
ALTER TABLE sizes ADD COLUMN IF NOT EXISTS system TEXT DEFAULT 'shoe';

-- 3. Extender tabla brands con sistema de tallas
ALTER TABLE brands ADD COLUMN IF NOT EXISTS size_system TEXT DEFAULT 'shoe';

-- 4. Extender tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'unisex';
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_id BIGINT;

-- 5. Migrar datos existentes
UPDATE categories SET type = 'prenda', department = 'unisex' WHERE type IS NULL;
UPDATE sizes SET system = 'shoe' WHERE system IS NULL;
UPDATE brands SET size_system = 'shoe' WHERE size_system IS NULL;
UPDATE products SET department = 'unisex' WHERE department IS NULL;

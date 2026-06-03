-- ============ PRODUCTS V2: Multi-size per product ============
-- Ejecutar este SQL en Supabase SQL Editor
-- Este script migra de 1 producto/size a 1 producto/multi-size

-- 1. Agregar nuevas columnas
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_ids JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stocks JSONB DEFAULT '{}';

-- 2. Migrar datos existentes: agrupar filas por modelo
-- Crea una tabla temporal con los datos agrupados
CREATE TEMP TABLE product_groups AS
SELECT
  MIN(id) AS keep_id,
  name,
  brand,
  category,
  COALESCE(subcategory, '') AS subcategory,
  COALESCE(department, 'unisex') AS department,
  COALESCE(gender, 'Unisex') AS gender,
  MAX(sku) AS sku,
  MAX(cost) AS cost,
  MAX(price) AS price,
  COALESCE(MAX(min_stock), 5) AS min_stock,
  COALESCE(MAX(description), '') AS description,
  COALESCE(MAX(sell_without_stock), false) AS sell_without_stock,
  -- Collect all size_ids
  (
    SELECT COALESCE(JSONB_AGG(DISTINCT p2.size_id ORDER BY p2.size_id), '[]'::jsonb)
    FROM products p2
    WHERE p2.name = products.name
      AND p2.brand = products.brand
      AND p2.category = products.category
      AND COALESCE(p2.subcategory, '') = COALESCE(products.subcategory, '')
      AND COALESCE(p2.department, 'unisex') = COALESCE(products.department, 'unisex')
      AND COALESCE(p2.gender, 'Unisex') = COALESCE(products.gender, 'Unisex')
      AND p2.size_id IS NOT NULL
  ) AS size_ids,
  -- Build stocks JSONB object { "sizeId": stock }
  (
    SELECT COALESCE(
      JSONB_OBJECT_AGG(p2.size_id::text, p2.stock),
      '{}'::jsonb
    )
    FROM products p2
    WHERE p2.name = products.name
      AND p2.brand = products.brand
      AND p2.category = products.category
      AND COALESCE(p2.subcategory, '') = COALESCE(products.subcategory, '')
      AND COALESCE(p2.department, 'unisex') = COALESCE(products.department, 'unisex')
      AND COALESCE(p2.gender, 'Unisex') = COALESCE(products.gender, 'Unisex')
      AND p2.size_id IS NOT NULL
  ) AS stocks
FROM products
GROUP BY name, brand, category,
  COALESCE(subcategory, ''),
  COALESCE(department, 'unisex'),
  COALESCE(gender, 'Unisex');

-- 3. Actualizar el producto que se conserva
UPDATE products p
SET
  size_ids = pg.size_ids,
  stocks = pg.stocks,
  cost = pg.cost,
  price = pg.price,
  min_stock = pg.min_stock,
  sku = pg.sku,
  description = pg.description,
  sell_without_stock = pg.sell_without_stock
FROM product_groups pg
WHERE p.id = pg.keep_id;

-- 4. Eliminar las filas duplicadas (las que NO son keep_id)
DELETE FROM products p
WHERE p.id NOT IN (SELECT keep_id FROM product_groups)
  AND p.id IN (
    SELECT p2.id FROM products p2
    INNER JOIN product_groups pg
      ON p2.name = pg.name
      AND p2.brand = pg.brand
      AND p2.category = pg.category
  );

-- 5. Para productos sin size_id (si existen), poner arrays vacíos
UPDATE products SET size_ids = '[]', stocks = '{}' WHERE size_ids IS NULL;

-- 6. Limpiar brands: quitar size_ids y size_system
UPDATE brands SET size_ids = '[]' WHERE size_ids IS NOT NULL AND size_ids != '[]'::jsonb;
ALTER TABLE brands DROP COLUMN IF EXISTS size_ids;
ALTER TABLE brands DROP COLUMN IF EXISTS size_system;

-- 7. Eliminar columnas viejas de products
ALTER TABLE products DROP COLUMN IF EXISTS size;
ALTER TABLE products DROP COLUMN IF EXISTS size_id;

-- 8. Limpiar tabla temporal
DROP TABLE IF EXISTS product_groups;

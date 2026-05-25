-- Seed data

-- Users
INSERT INTO users (id, name, email, password, role, status, last_access) VALUES
(1, 'Admin Principal', 'admin@cerezos.com', 'admin123', 'Super Admin', 'active', '2026-05-22 10:30'),
(2, 'Juan Pérez', 'juan@cerezos.com', 'juan123', 'Vendedor', 'active', '2026-05-21 18:00'),
(3, 'María López', 'maria@cerezos.com', 'maria123', 'Administrador', 'active', '2026-05-22 09:15');

-- Brands
INSERT INTO brands (id, name, status) VALUES
(1, 'Adidas', 'active'), (2, 'Asics', 'active'), (3, 'Balenciaga', 'active'),
(4, 'Brooks', 'active'), (5, 'Converse', 'active'), (6, 'Crocs', 'active'),
(7, 'Diadora', 'active'), (8, 'Dr. Martens', 'active'), (9, 'Fila', 'active'),
(10, 'Hoka', 'active'), (11, 'Jordan', 'active'), (12, 'New Balance', 'active'),
(13, 'Nike', 'active'), (14, 'On', 'active'), (15, 'Puma', 'active'),
(16, 'Reebok', 'active'), (17, 'Saucony', 'active'), (18, 'Skechers', 'active'),
(19, 'Timberland', 'active'), (20, 'Under Armour', 'active'), (21, 'Vans', 'active');

-- Categories
INSERT INTO categories (id, name, status) VALUES
(1, 'Sneakers', 'active'), (2, 'Running', 'active'), (3, 'Casuales', 'active'),
(4, 'Deportivas', 'active'), (5, 'Botas', 'active'), (6, 'Sandalias', 'active'),
(7, 'Edición Limitada', 'active');

-- Products
INSERT INTO products (id, name, brand, category, size, gender, sku, cost, price, stock, min_stock, description) VALUES
(1, 'Air Max 90', 'Nike', 'Sneakers', '39', 'Unisex', 'NK-AM90-001', 1200, 2499, 15, 5, 'Clásico diseño Air Max'),
(2, 'Ultra Boost 22', 'Adidas', 'Running', '40', 'Hombre', 'AD-UB22-002', 1800, 3299, 8, 5, 'Máximo confort para running'),
(3, 'Classic Leather', 'Reebok', 'Casuales', '38', 'Unisex', 'RB-CL-003', 800, 1599, 22, 5, 'Estilo clásico atemporal'),
(4, 'Yeezy 350 V2', 'Adidas', 'Edición Limitada', '41', 'Unisex', 'AD-YZ350-004', 3500, 5999, 3, 2, 'Edición limitada Yeezy'),
(5, 'Air Jordan 1 Retro', 'Nike', 'Sneakers', '42', 'Unisex', 'NK-AJ1-005', 2200, 4299, 0, 3, 'Icónico Jordan Retro'),
(6, 'Chuck Taylor All Star', 'Converse', 'Casuales', '39', 'Unisex', 'CV-CT-006', 600, 1199, 30, 10, 'El clásico por excelencia'),
(7, 'Gel-Kayano 30', 'Asics', 'Running', '40', 'Hombre', 'AS-GK30-007', 1500, 2899, 12, 5, 'Running profesional'),
(8, 'Suede Classic', 'Puma', 'Sneakers', '39', 'Unisex', 'PM-SC-008', 900, 1799, 18, 5, 'Estilo urbano Puma'),
(9, 'Dr. Martens 1460', 'Dr. Martens', 'Botas', '41', 'Unisex', 'DM-1460-009', 2500, 4599, 7, 3, 'Bota clásica Dr. Martens'),
(10, 'Old Skool', 'Vans', 'Casuales', '38', 'Unisex', 'VN-OS-010', 700, 1399, 25, 8, 'Skateboarding clásico'),
(11, 'New Balance 550', 'New Balance', 'Sneakers', '40', 'Unisex', 'NB-550-011', 1300, 2699, 4, 5, 'Tendencia retro basketball'),
(12, 'Huarache Run', 'Nike', 'Deportivas', '39', 'Mujer', 'NK-HR-012', 1100, 2199, 14, 5, 'Comodidad deportiva');

-- Clients
INSERT INTO clients (id, name, phone, email, credit_limit, credit_used) VALUES
(1, 'Carlos Ramírez', '+52 555 111 2222', 'carlos@email.com', 10000, 0),
(2, 'Ana García', '+52 555 333 4444', 'ana@email.com', 15000, 0),
(3, 'Roberto Mendoza', '+52 555 555 6666', 'roberto@email.com', 8000, 0);

-- Sales
INSERT INTO sales (id, ticket, date, client, client_id, items, subtotal, tax, total, pay_method, status, credit_type, credit_remaining, credit_due_date, credit_installments, credit_interest_rate, credit_base_financed, credit_interest_amount, credit_installment_value) VALUES
(1, 'TK-0001', '2026-05-20 14:30', 'Carlos Ramírez', 1, '[{"name":"Air Max 90","qty":1,"price":2499},{"name":"Chuck Taylor","qty":2,"price":1199}]', 4897, 783.52, 5680.52, 'Efectivo', 'Completada', 'contado', 0, NULL, 1, 0, 0, 0, 0),
(2, 'TK-0002', '2026-05-21 10:15', 'Ana García', 2, '[{"name":"Yeezy 350 V2","qty":1,"price":5999}]', 5999, 959.84, 6958.84, 'Crédito', 'Pendiente', 'credito', 6958.84, '2026-06-20', 2, 0.35, 5154.70, 1804.14, 3479.42),
(3, 'TK-0003', '2026-05-21 16:45', 'Carlos Ramírez', 1, '[{"name":"Ultra Boost 22","qty":1,"price":3299},{"name":"Old Skool","qty":1,"price":1399}]', 4698, 751.68, 5449.68, 'Tarjeta', 'Completada', 'contado', 0, NULL, 1, 0, 0, 0, 0),
(4, 'TK-0004', '2026-05-22 09:00', 'Roberto Mendoza', 3, '[{"name":"Air Jordan 1 Retro","qty":1,"price":4299},{"name":"Dr. Martens 1460","qty":1,"price":4599}]', 8898, 1423.68, 10321.68, 'Crédito', 'Pendiente', 'credito', 8000, '2026-06-21', 3, 0.45, 8000, 3600, 3866.67);

-- Settings (default row, id=1 is always the single settings row)
INSERT INTO settings (id, iva_rate, currency, min_stock, auto_ticket, default_interest, fixed_cost, business_name, business_phone, business_address, business_rfc, credit_limit, credit_days) VALUES
(1, 16, '$', 5, 'yes', 20, 0, 'Cerezos Sneaker GLZ', '+52 555 123 4567', 'Av. Principal #123, Col. Centro', 'CSG260101ABC', 10000, 30)
ON CONFLICT (id) DO NOTHING;

-- Seed data for Printly. Idempotent (ON CONFLICT DO NOTHING) so it's safe on
-- branch databases that already contain a copy of production data.
-- Money is stored as integer paise (₹2 = 200).

-- Shop settings (singleton, id = 1)
INSERT INTO "PricingSettings" (
  "id", "bwPerPage", "colorPerPage", "doubleSidedSurcharge", "a3Surcharge",
  "stapleFee", "spiralFee", "coverPageFee", "rushPercent", "freeSpiralAbove",
  "acceptingJobs", "allowCashOnCollection", "autoEmailWhenReady",
  "upiId", "shopName", "shopLocation", "updatedAt"
) VALUES (
  1, 200, 1000, 0, 300, 500, 3000, 1000, 20, 20000,
  true, true, true, 'printly@okaxis', 'Printly', 'Block B', CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Users (passwords: shopkeeper "printly123", student "student123")
INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role") VALUES
  ('usr_shop', 'Ramesh Patel', 'shop@printly.college', NULL,
    '$2b$10$xYhppHXluq5lULGKQrUj1OQNLDmb9EkQj4Qg2Jkm2zIRCwjmzADGS', 'SHOPKEEPER'),
  ('usr_student', 'Aanya M.', 'student@printly.college', '9876543210',
    '$2b$10$x100p64J5MrkX5pzDoO98.UBv2SBhh6ChLsG6cum67SJBsfgwbyY.', 'STUDENT')
ON CONFLICT ("email") DO NOTHING;

-- Categories
INSERT INTO "Category" ("id", "name") VALUES
  ('cat_notebooks', 'Notebooks'),
  ('cat_pens', 'Pens'),
  ('cat_calculators', 'Calculators'),
  ('cat_files', 'Files'),
  ('cat_sheets', 'Sheets'),
  ('cat_geometry', 'Geometry')
ON CONFLICT ("name") DO NOTHING;

-- Products (8 SKUs; P-03 and P-06 are below their reorder level => low-stock)
INSERT INTO "Product" (
  "id", "sku", "name", "categoryId", "price", "stock", "reorderAt",
  "accentColor", "description", "isHot", "isVisible", "updatedAt"
) VALUES
  ('prd_01', 'P-01', 'Classmate Notebook · 200 pgs', 'cat_notebooks', 9500, 42, 10, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP),
  ('prd_02', 'P-02', 'Reynolds 045 Pen · pack of 5', 'cat_pens', 5000, 120, 20, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP),
  ('prd_03', 'P-03', 'Casio fx-991EX Calculator', 'cat_calculators', 145000, 6, 8, '#ffe2d2', NULL, true, true, CURRENT_TIMESTAMP),
  ('prd_04', 'P-04', 'Graph sheets · A4 · 100', 'cat_sheets', 8000, 28, 10, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP),
  ('prd_05', 'P-05', 'Lab record file · ruled', 'cat_files', 11000, 14, 10, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP),
  ('prd_06', 'P-06', 'Highlighter pack · 4 colors', 'cat_pens', 12000, 9, 12, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP),
  ('prd_07', 'P-07', 'Apsara Platinum Pencil · pack of 10', 'cat_pens', 8000, 60, 15, '#ffe2d2', 'Smooth-write graphite. Pre-sharpened. Great for exam halls.', true, true, CURRENT_TIMESTAMP),
  ('prd_08', 'P-08', 'Geometry box · Camlin', 'cat_geometry', 18000, 22, 8, '#ffe2d2', NULL, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("sku") DO NOTHING;

-- Code counters (next print job = PR-241, next order = SO-101)
INSERT INTO "Counter" ("name", "value") VALUES
  ('print', 240),
  ('order', 100)
ON CONFLICT ("name") DO NOTHING;

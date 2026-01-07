-- BUG-042: Add Search Indexes for Global Search Performance
-- Adds FULLTEXT indexes on frequently searched text columns
-- Expected impact: Significant performance improvement on search queries

-- Products table - search by name and category
CREATE FULLTEXT INDEX IF NOT EXISTS idx_products_search
  ON products(nameCanonical, category, subcategory, description);

-- Strains table - search by name and aliases
CREATE FULLTEXT INDEX IF NOT EXISTS idx_strains_search
  ON strains(name, standardizedName, aliases, description);

-- Batches table - search by code and SKU (B-tree for exact/prefix matches)
CREATE INDEX IF NOT EXISTS idx_batches_code_search ON batches(code);
CREATE INDEX IF NOT EXISTS idx_batches_sku_search ON batches(sku);

-- Clients table - search by name, email, phone, address
CREATE FULLTEXT INDEX IF NOT EXISTS idx_clients_search
  ON clients(name, email, phone, address);

-- Orders table - search by order number and notes
CREATE INDEX IF NOT EXISTS idx_orders_order_number_search ON orders(orderNumber);
CREATE FULLTEXT INDEX IF NOT EXISTS idx_orders_notes_search ON orders(notes);

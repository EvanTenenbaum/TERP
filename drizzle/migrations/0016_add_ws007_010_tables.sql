-- WS-007 through WS-010: Add tables for flower intake, alerts, shrinkage, and photography
-- Migration: 0021_add_ws007_010_tables.sql

-- WS-007: Add fields to batches table for flower intake
ALTER TABLE batches ADD COLUMN IF NOT EXISTS intake_type ENUM('PURCHASE', 'CLIENT_DROPOFF', 'CONSIGNMENT', 'OTHER') DEFAULT 'PURCHASE';
ALTER TABLE batches ADD COLUMN IF NOT EXISTS dropoff_client_id INT REFERENCES clients(id);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_pending_valuation BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS valued_at TIMESTAMP NULL;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS valued_by INT REFERENCES users(id);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS original_intake_value DECIMAL(12,2);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS valuation_notes TEXT;

-- Index for pending valuation queries
CREATE INDEX IF NOT EXISTS idx_pending_valuation ON batches(is_pending_valuation, dropoff_client_id);

-- WS-008: Add stock level fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_stock_level DECIMAL(12,2);

-- WS-009: Add fields to inventory_movements for shrinkage tracking
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS reason ENUM('DRYING', 'PROCESSING', 'TRIMMING', 'PACKAGING_LOSS', 'QUALITY_CONTROL', 'SAMPLE', 'DAMAGE', 'THEFT', 'CORRECTION', 'OTHER');
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS reason_notes TEXT;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS shrinkage_percent DECIMAL(5,2);
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS expected_shrinkage_percent DECIMAL(5,2);

-- WS-010: Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT REFERENCES batches(id),
  product_id INT REFERENCES products(id),
  image_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') DEFAULT 'APPROVED',
  uploaded_by INT REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch_images (batch_id),
  INDEX idx_product_images (product_id)
);

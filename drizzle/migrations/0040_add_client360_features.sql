-- Sprint 4 Track B: Client 360 View Schema Migrations
-- This migration adds support for:
-- - 4.B.4: Client Referrer Tagging (referredByClientId on clients)
-- - 4.B.6: Client Wants/Needs Tracking
-- - 4.B.9: Office Needs Auto-Population

-- ============================================================================
-- Add referredByClientId to clients table (4.B.4 - MEET-012)
-- ============================================================================

ALTER TABLE clients
ADD COLUMN referred_by_client_id INT NULL,
ADD CONSTRAINT fk_clients_referred_by
  FOREIGN KEY (referred_by_client_id) REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_referred_by ON clients(referred_by_client_id);

-- ============================================================================
-- Client Wants Table (4.B.6 - MEET-021)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_wants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,

  -- Product/Category targeting
  product_id INT NULL,
  category_id INT NULL,
  strain_name VARCHAR(255) NULL,
  product_keywords VARCHAR(500) NULL,

  -- Quantity and price preferences
  min_quantity DECIMAL(10, 2) NULL,
  max_quantity DECIMAL(10, 2) NULL,
  max_price_per_unit DECIMAL(10, 2) NULL,

  -- Priority and status
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('ACTIVE', 'MATCHED', 'FULFILLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',

  -- Notes
  notes TEXT NULL,
  internal_notes TEXT NULL,

  -- Notification preferences
  notify_on_match BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT FALSE,

  -- Timing
  needed_by_date TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,

  -- Tracking
  created_by INT NULL,
  last_matched_at TIMESTAMP NULL,
  match_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_client_wants_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_client_wants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_client_wants_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_client_wants_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_client_wants_client_id ON client_wants(client_id);
CREATE INDEX idx_client_wants_status ON client_wants(status);
CREATE INDEX idx_client_wants_priority ON client_wants(priority);
CREATE INDEX idx_client_wants_product_id ON client_wants(product_id);
CREATE INDEX idx_client_wants_category_id ON client_wants(category_id);
CREATE INDEX idx_client_wants_expires_at ON client_wants(expires_at);

-- ============================================================================
-- Client Want Matches Table (tracks products matching wants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_want_matches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_want_id INT NOT NULL,
  inventory_item_id INT NOT NULL,

  -- Match quality
  match_score DECIMAL(5, 2) NULL,
  match_reasons JSON NULL,

  -- Status tracking
  status ENUM('NEW', 'NOTIFIED', 'VIEWED', 'CONVERTED', 'DISMISSED') NOT NULL DEFAULT 'NEW',
  notified_at TIMESTAMP NULL,
  viewed_at TIMESTAMP NULL,
  converted_to_order_id INT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_cwm_client_want FOREIGN KEY (client_want_id) REFERENCES client_wants(id) ON DELETE CASCADE,
  CONSTRAINT fk_cwm_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

CREATE INDEX idx_cwm_client_want_id ON client_want_matches(client_want_id);
CREATE INDEX idx_cwm_inventory_item_id ON client_want_matches(inventory_item_id);
CREATE INDEX idx_cwm_status ON client_want_matches(status);

-- ============================================================================
-- Office Supply Items Table (4.B.9 - MEET-055)
-- ============================================================================

CREATE TABLE IF NOT EXISTS office_supply_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,

  -- Reorder settings
  reorder_point DECIMAL(10, 2) NOT NULL,
  reorder_quantity DECIMAL(10, 2) NOT NULL,
  preferred_supplier_id INT NULL,

  -- Auto-reorder settings
  auto_reorder_enabled BOOLEAN DEFAULT FALSE,
  last_reorder_date TIMESTAMP NULL,
  next_scheduled_reorder TIMESTAMP NULL,

  -- Tracking
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_office_supply_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_office_supply_preferred_supplier FOREIGN KEY (preferred_supplier_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_office_supply_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_office_supply_product_id ON office_supply_items(product_id);
CREATE INDEX idx_office_supply_preferred_supplier ON office_supply_items(preferred_supplier_id);
CREATE INDEX idx_office_supply_active ON office_supply_items(is_active);

-- ============================================================================
-- Office Supply Needs Table (auto-generated reorder suggestions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS office_supply_needs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  office_supply_item_id INT NOT NULL,

  -- Quantities
  current_stock DECIMAL(10, 2) NOT NULL,
  suggested_quantity DECIMAL(10, 2) NOT NULL,

  -- Status
  status ENUM('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',

  -- Linked purchase order (when ordered)
  purchase_order_id INT NULL,

  -- Processing
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_osn_office_supply_item FOREIGN KEY (office_supply_item_id) REFERENCES office_supply_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_osn_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_osn_office_supply_item_id ON office_supply_needs(office_supply_item_id);
CREATE INDEX idx_osn_status ON office_supply_needs(status);

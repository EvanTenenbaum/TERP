-- Migration: MEET-005, MEET-006, FEAT-007
-- Sprint 3 Track D: Payables Logic
--
-- MEET-005: Payables Due When SKU Hits Zero
-- MEET-006: Office Owned Inventory Tracking
-- FEAT-007: Add Payment Recording Against Invoices

-- ============================================================================
-- MEET-006: Add ownership_type to batches table
-- ============================================================================

ALTER TABLE batches
ADD COLUMN ownership_type ENUM('CONSIGNED', 'OFFICE_OWNED', 'SAMPLE') NOT NULL DEFAULT 'CONSIGNED'
AFTER payment_terms;

-- ============================================================================
-- MEET-005: Vendor Payables Table
-- Tracks payables to vendors for consigned inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_payables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deleted_at TIMESTAMP NULL,
  version INT NOT NULL DEFAULT 1,

  -- Vendor reference (supplier)
  vendor_client_id INT NOT NULL,

  -- Batch reference
  batch_id INT NOT NULL,
  lot_id INT NOT NULL,

  -- Payable details
  payable_number VARCHAR(50) NOT NULL UNIQUE,
  units_sold DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cogs_per_unit DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Status tracking
  status ENUM('PENDING', 'DUE', 'PARTIAL', 'PAID', 'VOID') NOT NULL DEFAULT 'PENDING',
  due_date DATE NULL,
  paid_date DATE NULL,

  -- Grace period tracking
  inventory_zero_at TIMESTAMP NULL,
  notification_sent_at TIMESTAMP NULL,
  grace_period_hours INT NOT NULL DEFAULT 24,

  -- Audit fields
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,

  -- Foreign keys
  CONSTRAINT fk_vendor_payables_vendor FOREIGN KEY (vendor_client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_payables_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_payables_lot FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vendor_payables_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,

  -- Indexes
  INDEX idx_vendor_payables_vendor (vendor_client_id),
  INDEX idx_vendor_payables_batch (batch_id),
  INDEX idx_vendor_payables_status (status),
  INDEX idx_vendor_payables_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MEET-005: Payable Notifications Table
-- Tracks notifications sent to accounting for due payables
-- ============================================================================

CREATE TABLE IF NOT EXISTS payable_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deleted_at TIMESTAMP NULL,

  payable_id INT NOT NULL,
  notification_type ENUM('GRACE_PERIOD_WARNING', 'PAYABLE_DUE', 'PAYMENT_REMINDER', 'OVERDUE') NOT NULL,
  sent_to_user_id INT NULL,
  sent_to_role VARCHAR(50) NULL,

  -- Notification content
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Status
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  read_at TIMESTAMP NULL,
  acknowledged_by INT NULL,
  acknowledged_at TIMESTAMP NULL,

  -- Foreign keys
  CONSTRAINT fk_payable_notifications_payable FOREIGN KEY (payable_id) REFERENCES vendor_payables(id) ON DELETE CASCADE,
  CONSTRAINT fk_payable_notifications_sent_to FOREIGN KEY (sent_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payable_notifications_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_payable_notifications_payable (payable_id),
  INDEX idx_payable_notifications_type (notification_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FEAT-007: Invoice Payments Junction Table
-- Allows payments to be allocated across multiple invoices
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deleted_at TIMESTAMP NULL,

  payment_id INT NOT NULL,
  invoice_id INT NOT NULL,
  allocated_amount DECIMAL(15, 2) NOT NULL,

  -- Allocation metadata
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  allocated_by INT NOT NULL,
  notes TEXT NULL,

  -- Foreign keys
  CONSTRAINT fk_invoice_payments_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_payments_allocated_by FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE RESTRICT,

  -- Indexes
  INDEX idx_invoice_payments_payment (payment_id),
  INDEX idx_invoice_payments_invoice (invoice_id),

  -- Prevent duplicate allocations
  UNIQUE KEY uk_invoice_payments (payment_id, invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Configuration for grace period (system settings)
-- ============================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, created_at, updated_at)
SELECT 'payables.grace_period_hours', '24', 'number', 'Grace period in hours before payable due notification is sent', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'payables.grace_period_hours');

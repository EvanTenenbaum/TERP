-- WS-011 through WS-014: Add tables for customer management and vendor reminders
-- Migration: 0022_add_ws011_014_tables.sql

-- WS-012: Add preference fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_strains JSON;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_products JSON;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referred_by_client_id INT REFERENCES clients(id);

-- Index for referral lookups
CREATE INDEX IF NOT EXISTS idx_client_referrals ON clients(referred_by_client_id);

-- WS-014: Create vendor_harvest_reminders table
CREATE TABLE IF NOT EXISTS vendor_harvest_reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL REFERENCES vendors(id),
  expected_harvest_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  strain VARCHAR(100),
  estimated_quantity DECIMAL(12,2),
  actual_quantity DECIMAL(12,2),
  notes TEXT,
  status ENUM('PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  contacted_at TIMESTAMP NULL,
  contacted_by INT REFERENCES users(id),
  contact_notes TEXT,
  completed_at TIMESTAMP NULL,
  completion_notes TEXT,
  INDEX idx_vendor_reminders (vendor_id, status),
  INDEX idx_reminder_date (reminder_date, status)
);

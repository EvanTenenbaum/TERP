-- WS-004: Referral Credits System
-- Migration to add referral tracking tables

-- Add referral fields to orders table
ALTER TABLE orders ADD COLUMN referred_by_client_id INT REFERENCES clients(id);
ALTER TABLE orders ADD COLUMN is_referral_order BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD INDEX idx_orders_referred_by (referred_by_client_id);

-- Create referral_credits table
CREATE TABLE IF NOT EXISTS referral_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_client_id INT NOT NULL,
  referred_client_id INT NOT NULL,
  referred_order_id INT NOT NULL,
  credit_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  order_total DECIMAL(12,2) NOT NULL,
  credit_amount DECIMAL(12,2) NOT NULL,
  status ENUM('PENDING', 'AVAILABLE', 'APPLIED', 'EXPIRED', 'CANCELLED') DEFAULT 'PENDING',
  applied_to_order_id INT,
  applied_amount DECIMAL(12,2),
  applied_at TIMESTAMP NULL,
  applied_by INT,
  expires_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (applied_to_order_id) REFERENCES orders(id),
  FOREIGN KEY (applied_by) REFERENCES users(id),
  INDEX idx_referral_referrer (referrer_client_id),
  INDEX idx_referral_referred_order (referred_order_id),
  INDEX idx_referral_status (status)
);

-- Create referral_settings table
CREATE TABLE IF NOT EXISTS referral_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_tier VARCHAR(50),
  credit_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  min_order_amount DECIMAL(12,2) DEFAULT 0,
  max_credit_amount DECIMAL(12,2),
  credit_expiry_days INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX unique_tier (client_tier)
);

-- Insert default global referral setting (10%)
INSERT INTO referral_settings (client_tier, credit_percentage, is_active)
VALUES (NULL, 10.00, TRUE)
ON DUPLICATE KEY UPDATE credit_percentage = 10.00;

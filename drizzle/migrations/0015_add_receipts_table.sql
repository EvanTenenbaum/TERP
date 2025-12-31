-- WS-006: Add receipts table for receipt tracking
-- Migration: 0020_add_receipts_table.sql

CREATE TABLE IF NOT EXISTS receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  transaction_type ENUM('PAYMENT', 'CREDIT', 'ADJUSTMENT', 'STATEMENT') NOT NULL,
  transaction_id INT,
  previous_balance DECIMAL(12,2) NOT NULL,
  transaction_amount DECIMAL(12,2) NOT NULL,
  new_balance DECIMAL(12,2) NOT NULL,
  note TEXT,
  pdf_url VARCHAR(500),
  emailed_to VARCHAR(255),
  emailed_at TIMESTAMP NULL,
  sms_sent_to VARCHAR(20),
  sms_sent_at TIMESTAMP NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_receipt_client (client_id),
  INDEX idx_receipt_number (receipt_number),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add sharing and conversion columns to sales_sheet_history
-- TERP-INIT-016: Sales Sheet sharing and conversion functionality

-- Add share token for public access
ALTER TABLE sales_sheet_history
ADD COLUMN share_token VARCHAR(64) NULL UNIQUE AFTER notes;

-- Add expiration for share links
ALTER TABLE sales_sheet_history
ADD COLUMN share_expires_at TIMESTAMP NULL AFTER share_token;

-- Add view tracking
ALTER TABLE sales_sheet_history
ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER share_expires_at;

ALTER TABLE sales_sheet_history
ADD COLUMN last_viewed_at TIMESTAMP NULL AFTER view_count;

-- Add conversion tracking (order already exists, add live session)
ALTER TABLE sales_sheet_history
ADD COLUMN converted_to_session_id VARCHAR(36) NULL AFTER converted_to_order_id;

-- Create index for share token lookups
CREATE INDEX idx_sales_sheet_share_token ON sales_sheet_history(share_token);

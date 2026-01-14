-- FEAT-001: Add business type, preferred contact, and payment terms fields to clients table
-- Improves client data collection and usability

-- Add business type enum (if not exists)
-- Note: MySQL ENUM is added directly in column definition

-- Add new columns to clients table
ALTER TABLE `clients`
  ADD COLUMN `business_type` ENUM('RETAIL', 'WHOLESALE', 'DISPENSARY', 'DELIVERY', 'MANUFACTURER', 'DISTRIBUTOR', 'OTHER') DEFAULT NULL,
  ADD COLUMN `preferred_contact` ENUM('EMAIL', 'PHONE', 'TEXT', 'ANY') DEFAULT NULL,
  ADD COLUMN `payment_terms` INT DEFAULT 30 COMMENT 'Payment terms in days';

-- Add indexes for filtering by business type and preferred contact
CREATE INDEX `idx_clients_business_type` ON `clients` (`business_type`);
CREATE INDEX `idx_clients_preferred_contact` ON `clients` (`preferred_contact`);

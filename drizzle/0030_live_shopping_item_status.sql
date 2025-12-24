-- Migration: Add itemStatus column to sessionCartItems
-- Purpose: Enable three-status workflow (Sample Request, Interested, To Purchase)

-- Add the enum type if not exists (MySQL handles this in column definition)
-- Add the itemStatus column with default value
ALTER TABLE `sessionCartItems` 
ADD COLUMN `itemStatus` ENUM('SAMPLE_REQUEST', 'INTERESTED', 'TO_PURCHASE') DEFAULT 'INTERESTED';

-- Update existing rows to have a default status
UPDATE `sessionCartItems` SET `itemStatus` = 'INTERESTED' WHERE `itemStatus` IS NULL;

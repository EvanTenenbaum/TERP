-- Add adjustment reason enum
ALTER TABLE inventoryMovements 
ADD COLUMN adjustmentReason ENUM('DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_DISCREPANCY', 'QUALITY_ISSUE', 'REWEIGH', 'OTHER') AFTER referenceId;

-- Rename reason column to notes for clarity
ALTER TABLE inventoryMovements 
CHANGE COLUMN reason notes TEXT;

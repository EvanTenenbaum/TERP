-- Migration: Add Strain Family Support
-- Date: 2025-10-29
-- Description: Adds parentStrainId and baseStrainName columns to support strain families

-- Add parentStrainId column (self-referencing foreign key)
ALTER TABLE strains 
  ADD COLUMN parentStrainId INT NULL,
  ADD COLUMN baseStrainName VARCHAR(255) NULL;

-- Add index for parent strain lookups
CREATE INDEX idx_strains_parent_id ON strains(parentStrainId);

-- Add index for base strain name lookups
CREATE INDEX idx_strains_base_name ON strains(baseStrainName);

-- Add foreign key constraint (self-referencing)
ALTER TABLE strains
  ADD CONSTRAINT fk_strains_parent 
  FOREIGN KEY (parentStrainId) 
  REFERENCES strains(id) 
  ON DELETE SET NULL;


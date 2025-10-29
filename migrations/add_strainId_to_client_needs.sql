-- Migration: Add strainId to client_needs table
-- Purpose: Link client needs to standardized strains for better matching

-- Add strainId column (nullable for backward compatibility)
ALTER TABLE client_needs 
ADD COLUMN strainId INT NULL AFTER strain;

-- Add foreign key constraint
ALTER TABLE client_needs
ADD CONSTRAINT fk_client_needs_strain
FOREIGN KEY (strainId) REFERENCES strains(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_client_needs_strainId ON client_needs(strainId);

-- Comment for documentation
ALTER TABLE client_needs MODIFY COLUMN strainId INT NULL COMMENT 'Standardized strain ID for better matching';


-- Migration: Add indexes for strain fuzzy matching performance
-- Date: 2025-10-29
-- Description: Adds indexes to optimize strain search and matching queries

-- Add indexes for strains table
CREATE INDEX IF NOT EXISTS idx_strains_standardized ON strains(standardizedName);
CREATE INDEX IF NOT EXISTS idx_strains_name ON strains(name);
CREATE INDEX IF NOT EXISTS idx_strains_openthc ON strains(openthcId);
CREATE INDEX IF NOT EXISTS idx_strains_category ON strains(category);

-- Add index for products.strainId foreign key
CREATE INDEX IF NOT EXISTS idx_products_strain ON products(strainId);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_strains_category_name ON strains(category, name);


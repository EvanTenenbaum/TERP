-- Migration: Create Strain Family Database Views
-- Purpose: Automatic aggregation of strain family data
-- Benefit: No manual joins needed in queries, better performance

-- View 1: Products with complete strain family information
-- This view automatically includes parent strain data for every product
CREATE OR REPLACE VIEW products_with_strain_family AS
SELECT 
  p.*,
  s.id as strain_id,
  s.name as strain_name,
  s.category as strain_category,
  s.baseStrainName as strain_base_name,
  s.parentStrainId as strain_parent_id,
  parent.id as parent_strain_id,
  parent.name as parent_strain_name,
  parent.category as parent_strain_category,
  CASE 
    WHEN s.parentStrainId IS NOT NULL THEN TRUE
    ELSE FALSE
  END as is_variant
FROM products p
LEFT JOIN strains s ON p.strainId = s.id
LEFT JOIN strains parent ON s.parentStrainId = parent.id;

-- View 2: Strain family statistics and aggregations
-- Provides counts, inventory levels, and sales data per family
CREATE OR REPLACE VIEW strain_family_stats AS
SELECT 
  COALESCE(parent.id, s.id) as family_id,
  COALESCE(parent.name, s.name) as family_name,
  COALESCE(parent.category, s.category) as family_category,
  COUNT(DISTINCT CASE WHEN s.parentStrainId IS NOT NULL THEN s.id END) as variant_count,
  COUNT(DISTINCT p.id) as product_count,
  COALESCE(SUM(CAST(b.onHandQty AS DECIMAL(10,2))), 0) as total_inventory_qty,
  COUNT(DISTINCT b.id) as batch_count
FROM strains s
LEFT JOIN strains parent ON s.parentStrainId = parent.id
LEFT JOIN products p ON p.strainId = s.id OR p.strainId = parent.id
LEFT JOIN batches b ON b.productId = p.id
GROUP BY 
  COALESCE(parent.id, s.id),
  COALESCE(parent.name, s.name),
  COALESCE(parent.category, s.category);

-- View 3: Client strain preferences (aggregated from purchase history)
-- Shows which strain families each client prefers based on historical purchases
CREATE OR REPLACE VIEW client_strain_preferences AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  COALESCE(parent.id, s.id) as family_id,
  COALESCE(parent.name, s.name) as family_name,
  COUNT(DISTINCT t.id) as purchase_count,
  SUM(CAST(ti.quantity AS DECIMAL(10,2))) as total_quantity,
  SUM(CAST(ti.subtotal AS DECIMAL(10,2))) as total_revenue,
  MAX(t.createdAt) as last_purchase_date
FROM clients c
INNER JOIN transactions t ON t.clientId = c.id
INNER JOIN transaction_items ti ON ti.transactionId = t.id
INNER JOIN batches b ON ti.batchId = b.id
INNER JOIN products p ON b.productId = p.id
INNER JOIN strains s ON p.strainId = s.id
LEFT JOIN strains parent ON s.parentStrainId = parent.id
WHERE t.type = 'sale'
GROUP BY 
  c.id,
  c.name,
  COALESCE(parent.id, s.id),
  COALESCE(parent.name, s.name);

-- View 4: Strain family variants (all variants of each family)
-- Makes it easy to find all products in a strain family
CREATE OR REPLACE VIEW strain_family_variants AS
SELECT 
  COALESCE(parent.id, s.id) as family_id,
  COALESCE(parent.name, s.name) as family_name,
  s.id as variant_id,
  s.name as variant_name,
  s.category as variant_category,
  s.baseStrainName as variant_base_name,
  CASE 
    WHEN s.parentStrainId IS NOT NULL THEN TRUE
    ELSE FALSE
  END as is_variant,
  COUNT(DISTINCT p.id) as product_count
FROM strains s
LEFT JOIN strains parent ON s.parentStrainId = parent.id
LEFT JOIN products p ON p.strainId = s.id
GROUP BY 
  COALESCE(parent.id, s.id),
  COALESCE(parent.name, s.name),
  s.id,
  s.name,
  s.category,
  s.baseStrainName,
  s.parentStrainId;

-- Indexes for view performance
CREATE INDEX IF NOT EXISTS idx_products_strainId ON products(strainId);
CREATE INDEX IF NOT EXISTS idx_strains_parentStrainId ON strains(parentStrainId);
CREATE INDEX IF NOT EXISTS idx_strains_baseStrainName ON strains(baseStrainName);
CREATE INDEX IF NOT EXISTS idx_batches_productId ON batches(productId);
CREATE INDEX IF NOT EXISTS idx_transaction_items_batchId ON transaction_items(batchId);

-- Comments for documentation
COMMENT ON VIEW products_with_strain_family IS 'Products with complete strain family information including parent strain data';
COMMENT ON VIEW strain_family_stats IS 'Aggregated statistics for each strain family including variant counts and inventory levels';
COMMENT ON VIEW client_strain_preferences IS 'Client purchase preferences by strain family based on historical transactions';
COMMENT ON VIEW strain_family_variants IS 'All variants within each strain family with product counts';


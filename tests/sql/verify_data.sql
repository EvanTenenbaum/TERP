-- ============================================================================
-- TERP Database Verification Queries
-- Run these queries to verify data state before/after deployment
-- ============================================================================

-- Usage:
-- 1. Connect to production database
-- 2. Run each query section
-- 3. Compare results against expected values
-- 4. Document any discrepancies

-- ============================================================================
-- SECTION 1: Core Entity Counts
-- ============================================================================

-- 1.1 Products count (QA-049)
-- Expected: total > 100, active = ~121
SELECT
  COUNT(*) as total_products,
  SUM(CASE WHEN archived = false OR archived IS NULL THEN 1 ELSE 0 END) as active_products,
  SUM(CASE WHEN archived = true THEN 1 ELSE 0 END) as archived_products
FROM products;

-- 1.2 Samples count (QA-050)
-- Expected: total = 6 (or more)
SELECT
  status,
  COUNT(*) as count
FROM samples
GROUP BY status
ORDER BY count DESC;

-- 1.3 Batches count
-- Expected: multiple batches with various statuses
SELECT
  status,
  COUNT(*) as count
FROM batches
GROUP BY status
ORDER BY count DESC;

-- 1.4 Inventory summary
SELECT
  COUNT(*) as total_batches,
  SUM(quantity) as total_quantity,
  COUNT(DISTINCT product_id) as unique_products
FROM batches
WHERE status = 'active';

-- ============================================================================
-- SECTION 2: Relationship Integrity (BUG-040 related)
-- ============================================================================

-- 2.1 Clients with pricing rules
-- Check: Are there clients with 0 rules? (This was causing BUG-040)
SELECT
  c.id,
  c.name,
  COUNT(pr.id) as rule_count
FROM clients c
LEFT JOIN pricing_rules pr ON c.id = pr.client_id
GROUP BY c.id, c.name
ORDER BY rule_count ASC
LIMIT 20;

-- 2.2 Clients without ANY pricing rules (edge case)
-- These clients should still work in Order Creator after BUG-040 fix
SELECT
  c.id,
  c.name,
  c.created_at
FROM clients c
LEFT JOIN pricing_rules pr ON c.id = pr.client_id
WHERE pr.id IS NULL;

-- 2.3 Products without prices
-- These should still display (with fallback pricing)
SELECT
  p.id,
  p.name,
  p.base_price
FROM products p
WHERE p.base_price IS NULL OR p.base_price = 0;

-- ============================================================================
-- SECTION 3: User & Permission Integrity (BUG-043 related)
-- ============================================================================

-- 3.1 Users with roles
SELECT
  u.id,
  u.email,
  u.username,
  COUNT(ur.role_id) as role_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.username
ORDER BY role_count ASC
LIMIT 20;

-- 3.2 Users without ANY roles (edge case for BUG-043)
-- These users should still be able to log in after fix
SELECT
  u.id,
  u.email,
  u.username,
  u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role_id IS NULL;

-- 3.3 Role distribution
SELECT
  r.name as role_name,
  COUNT(ur.user_id) as user_count
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
GROUP BY r.id, r.name
ORDER BY user_count DESC;

-- ============================================================================
-- SECTION 4: Batch & Location Integrity (BUG-041 related)
-- ============================================================================

-- 4.1 Batches with locations
SELECT
  b.id,
  b.batch_number,
  COUNT(bl.id) as location_count
FROM batches b
LEFT JOIN batch_locations bl ON b.id = bl.batch_id
GROUP BY b.id, b.batch_number
ORDER BY location_count ASC
LIMIT 20;

-- 4.2 Batches without locations (edge case for BUG-041)
-- These should display correctly without crashing
SELECT
  b.id,
  b.batch_number,
  b.status,
  b.created_at
FROM batches b
LEFT JOIN batch_locations bl ON b.id = bl.batch_id
WHERE bl.id IS NULL
LIMIT 10;

-- 4.3 Audit log coverage
SELECT
  'batches' as entity_type,
  COUNT(DISTINCT b.id) as total_entities,
  COUNT(DISTINCT al.entity_id) as entities_with_logs
FROM batches b
LEFT JOIN audit_logs al ON b.id = al.entity_id AND al.entity_type = 'batch';

-- ============================================================================
-- SECTION 5: Search Index Verification (BUG-042 related)
-- ============================================================================

-- 5.1 Products with searchable fields
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END) as with_name,
  SUM(CASE WHEN sku IS NOT NULL AND sku != '' THEN 1 ELSE 0 END) as with_sku
FROM products;

-- 5.2 Sample search query test
-- This mimics what the search feature does
SELECT
  id,
  name,
  sku
FROM products
WHERE
  name LIKE '%OG%'
  OR sku LIKE '%OG%'
LIMIT 10;

-- ============================================================================
-- SECTION 6: Data Quality Checks
-- ============================================================================

-- 6.1 Recent activity (verify app is being used)
SELECT
  DATE(created_at) as date,
  COUNT(*) as order_count
FROM orders
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 6.2 Orphaned records check
-- Orders without valid client
SELECT COUNT(*) as orphaned_orders
FROM orders o
LEFT JOIN clients c ON o.client_id = c.id
WHERE c.id IS NULL;

-- Order items without valid product
SELECT COUNT(*) as orphaned_order_items
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL;

-- 6.3 Data freshness
SELECT
  'products' as entity,
  MAX(updated_at) as last_updated
FROM products
UNION ALL
SELECT
  'orders' as entity,
  MAX(created_at) as last_updated
FROM orders
UNION ALL
SELECT
  'batches' as entity,
  MAX(updated_at) as last_updated
FROM batches;

-- ============================================================================
-- SECTION 7: Performance Baseline Queries
-- ============================================================================

-- 7.1 Table sizes (for monitoring growth)
SELECT
  table_name,
  table_rows as estimated_rows,
  ROUND(data_length / 1024 / 1024, 2) as data_size_mb,
  ROUND(index_length / 1024 / 1024, 2) as index_size_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY data_length DESC
LIMIT 15;

-- 7.2 Index usage check
SHOW INDEX FROM products;
SHOW INDEX FROM orders;
SHOW INDEX FROM batches;

-- ============================================================================
-- SECTION 8: Post-Deployment Verification Summary
-- ============================================================================

-- Run this after deployment to get a quick summary
SELECT
  'Products (active)' as metric,
  COUNT(*) as value
FROM products
WHERE archived = false OR archived IS NULL
UNION ALL
SELECT
  'Samples' as metric,
  COUNT(*) as value
FROM samples
UNION ALL
SELECT
  'Active Batches' as metric,
  COUNT(*) as value
FROM batches
WHERE status = 'active'
UNION ALL
SELECT
  'Clients' as metric,
  COUNT(*) as value
FROM clients
UNION ALL
SELECT
  'Orders (last 24h)' as metric,
  COUNT(*) as value
FROM orders
WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
UNION ALL
SELECT
  'Users with roles' as metric,
  COUNT(DISTINCT user_id) as value
FROM user_roles;

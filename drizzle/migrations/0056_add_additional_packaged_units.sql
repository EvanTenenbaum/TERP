-- FEAT-013: Add Additional Packaged Unit Types
-- Adds specific packaged units for common product packaging scenarios

-- Insert additional packaged unit types
INSERT INTO `unit_types` (`code`, `name`, `description`, `category`, `conversion_factor`, `base_unit_code`, `sort_order`) VALUES
  ('PK5', 'Pack of 5', '5-unit package', 'PACKAGED', 5, 'EA', 85),
  ('PK10', 'Pack of 10', '10-unit package', 'PACKAGED', 10, 'EA', 95),
  ('CASE24', 'Case (24)', 'Case containing 24 units', 'PACKAGED', 24, 'EA', 105),
  ('PALLET', 'Pallet', 'Standard pallet (quantity varies by product)', 'PACKAGED', 1, NULL, 110)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- DI-006: Add Missing Foreign Key Constraints
-- This migration adds foreign key constraints to columns that reference other tables but lack constraints

-- ============================================================================
-- CLEANUP ORPHANED DATA
-- ============================================================================
-- Before adding FK constraints, we need to clean up any orphaned references
-- This prevents the migration from failing due to referential integrity violations

-- Clean orphaned reviewedBy in client_interest_lists
UPDATE `client_interest_lists`
SET `reviewed_by` = NULL
WHERE `reviewed_by` IS NOT NULL
AND `reviewed_by` NOT IN (SELECT `id` FROM `users`);

-- Clean orphaned convertedToOrderId in client_interest_lists
UPDATE `client_interest_lists`
SET `converted_to_order_id` = NULL
WHERE `converted_to_order_id` IS NOT NULL
AND `converted_to_order_id` NOT IN (SELECT `id` FROM `orders`);

-- Clean orphaned convertedBy in client_interest_lists
UPDATE `client_interest_lists`
SET `converted_by` = NULL
WHERE `converted_by` IS NOT NULL
AND `converted_by` NOT IN (SELECT `id` FROM `users`);

-- Clean orphaned batchId in client_interest_list_items
DELETE FROM `client_interest_list_items`
WHERE `batch_id` NOT IN (SELECT `id` FROM `batches`);

-- Clean orphaned batchId in client_draft_interests
DELETE FROM `client_draft_interests`
WHERE `batch_id` NOT IN (SELECT `id` FROM `batches`);

-- Clean orphaned batchId in client_price_alerts
DELETE FROM `client_price_alerts`
WHERE `batch_id` NOT IN (SELECT `id` FROM `batches`);

-- Clean orphaned inventoryItemId in client_want_matches
DELETE FROM `client_want_matches`
WHERE `inventory_item_id` NOT IN (SELECT `id` FROM `batches`);

-- Clean orphaned convertedToOrderId in client_want_matches
UPDATE `client_want_matches`
SET `converted_to_order_id` = NULL
WHERE `converted_to_order_id` IS NOT NULL
AND `converted_to_order_id` NOT IN (SELECT `id` FROM `orders`);

-- Clean orphaned convertedToOrderId in sales_sheet_history
UPDATE `sales_sheet_history`
SET `converted_to_order_id` = NULL
WHERE `converted_to_order_id` IS NOT NULL
AND `converted_to_order_id` NOT IN (SELECT `id` FROM `orders`);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- client_interest_lists table
ALTER TABLE `client_interest_lists`
ADD CONSTRAINT `client_interest_lists_reviewed_by_users_id_fk`
FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `client_interest_lists`
ADD CONSTRAINT `client_interest_lists_converted_to_order_id_orders_id_fk`
FOREIGN KEY (`converted_to_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL;

ALTER TABLE `client_interest_lists`
ADD CONSTRAINT `client_interest_lists_converted_by_users_id_fk`
FOREIGN KEY (`converted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- client_interest_list_items table
ALTER TABLE `client_interest_list_items`
ADD CONSTRAINT `client_interest_list_items_batch_id_batches_id_fk`
FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE;

-- client_draft_interests table
ALTER TABLE `client_draft_interests`
ADD CONSTRAINT `client_draft_interests_batch_id_batches_id_fk`
FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE;

-- client_price_alerts table
ALTER TABLE `client_price_alerts`
ADD CONSTRAINT `client_price_alerts_batch_id_batches_id_fk`
FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE;

-- client_want_matches table
ALTER TABLE `client_want_matches`
ADD CONSTRAINT `client_want_matches_inventory_item_id_batches_id_fk`
FOREIGN KEY (`inventory_item_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE;

ALTER TABLE `client_want_matches`
ADD CONSTRAINT `client_want_matches_converted_to_order_id_orders_id_fk`
FOREIGN KEY (`converted_to_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL;

-- sales_sheet_history table
ALTER TABLE `sales_sheet_history`
ADD CONSTRAINT `sales_sheet_history_converted_to_order_id_orders_id_fk`
FOREIGN KEY (`converted_to_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL;

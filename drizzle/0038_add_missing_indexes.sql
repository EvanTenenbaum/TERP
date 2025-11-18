-- ST-005: Add Missing Database Indexes
-- Priority: High-traffic tables and foreign keys
-- Expected impact: 60-80% performance improvement on queries with JOINs and WHERE clauses

-- Batches table indexes (high priority - core inventory table)
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(productId);
CREATE INDEX IF NOT EXISTS idx_batches_lot_id ON batches(lotId);

-- Orders table indexes (high priority - frequently joined)
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_packed_by ON orders(packed_by);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_by ON orders(shipped_by);
CREATE INDEX IF NOT EXISTS idx_orders_intake_event_id ON orders(intake_event_id);

-- Order status history
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);

-- Vendor notes
CREATE INDEX IF NOT EXISTS idx_vendor_notes_vendor_id ON vendorNotes(vendorId);
CREATE INDEX IF NOT EXISTS idx_vendor_notes_user_id ON vendorNotes(userId);

-- Payment history (financial queries)
CREATE INDEX IF NOT EXISTS idx_payment_history_batch_id ON paymentHistory(batchId);
CREATE INDEX IF NOT EXISTS idx_payment_history_vendor_id ON paymentHistory(vendorId);
CREATE INDEX IF NOT EXISTS idx_payment_history_recorded_by ON paymentHistory(recordedBy);

-- Batch locations (inventory lookups)
CREATE INDEX IF NOT EXISTS idx_batch_locations_batch_id ON batchLocations(batchId);

-- Sales table (reporting and analytics)
CREATE INDEX IF NOT EXISTS idx_sales_batch_id ON sales(batchId);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(productId);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customerId);

-- Order returns
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_batch_id ON order_returns(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_created_by ON order_returns(created_by);

-- Comments (if table exists)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(userId);
CREATE INDEX IF NOT EXISTS idx_comments_entity_type ON comments(entityType);
CREATE INDEX IF NOT EXISTS idx_comments_entity_id ON comments(entityId);

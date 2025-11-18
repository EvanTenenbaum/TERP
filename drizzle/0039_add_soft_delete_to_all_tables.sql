-- Migration: Add soft delete support to all tables
-- ST-013: Standardize Soft Deletes
-- Adds deletedAt timestamp column to all tables for soft delete functionality

-- Note: calendar_events already has deleted_at, so we skip it

-- Core System Tables
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE user_dashboard_preferences ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE sequences ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Vendor Management
ALTER TABLE vendors ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE vendor_notes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE purchase_order_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Product Catalog
ALTER TABLE brands ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE strains ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE product_synonyms ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE product_media ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tags ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE product_tags ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Inventory Management
ALTER TABLE lots ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE batches ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE batch_locations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE inventory_movements ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE warehouse_transfers ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE locations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Financial Tables
ALTER TABLE sales ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE payment_history ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE cogs_history ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE ledger_entries ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE invoice_line_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE payment_allocations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Client Management
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE client_notes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE client_needs ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE client_pricing ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE credit_accounts ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE credit_transactions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bad_debt_records ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Orders & Sales
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE order_line_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE order_status_history ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE order_returns ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE order_return_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE sales_sheets ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE sales_sheet_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE samples ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Pricing & Configuration
ALTER TABLE pricing_rules ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE pricing_defaults ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE configuration ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Audit & Logging
ALTER TABLE audit_logs ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE order_audit_log ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE cogs_change_log ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Refunds & Returns
ALTER TABLE refunds ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE refund_line_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE returns ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE return_line_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Notes & Documentation
ALTER TABLE freeform_notes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE scratch_pad ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- VIP Portal
ALTER TABLE vip_portal_access ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE vip_portal_activity ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Todo & Task Management
ALTER TABLE todo_lists ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE todo_tasks ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE todo_activity ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Comments & Collaboration
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE comment_mentions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Inbox & Notifications
ALTER TABLE inbox_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Calendar (excluding calendar_events which already has it)
ALTER TABLE calendar_participants ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE calendar_reminders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE calendar_recurrence ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE calendar_meetings ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE calendar_invitations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- RBAC (Role-Based Access Control)
ALTER TABLE rbac_users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE rbac_roles ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE rbac_permissions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE rbac_role_permissions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE rbac_user_roles ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Workflow System
ALTER TABLE workflow_queue ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE workflow_history ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Deployments & System
ALTER TABLE deployments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Additional tables (if any were missed, add them here)
-- Check the schema for any new tables added after this migration

-- Create indexes on deleted_at for performance
-- Only index tables that will have frequent soft delete queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX idx_batches_deleted_at ON batches(deleted_at);
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX idx_vendors_deleted_at ON vendors(deleted_at);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_purchase_orders_deleted_at ON purchase_orders(deleted_at);
CREATE INDEX idx_sales_sheets_deleted_at ON sales_sheets(deleted_at);
CREATE INDEX idx_todo_tasks_deleted_at ON todo_tasks(deleted_at);
CREATE INDEX idx_calendar_events_deleted_at ON calendar_events(deleted_at);

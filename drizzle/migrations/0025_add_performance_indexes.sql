-- Migration: Add performance indexes for frequently queried columns
-- Date: 2025-01-07
-- Purpose: Improve query performance for common operations (Wave 7 Tech Debt)

-- ============================================================================
-- INVOICES TABLE INDEXES
-- ============================================================================

-- Index on invoice status for filtering by status
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Index on invoice due date for overdue queries
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(dueDate);

-- Composite index for common query: customer invoices by status
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customerId, status);

-- ============================================================================
-- BATCHES TABLE INDEXES
-- ============================================================================

-- Index on batch status for filtering by status
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(batchStatus);

-- Index on lot ID for lot-based queries
CREATE INDEX IF NOT EXISTS idx_batches_lot_id ON batches(lotId);

-- Index on status ID for workflow queue queries
CREATE INDEX IF NOT EXISTS idx_batches_status_id ON batches(statusId);

-- Composite index for live inventory queries
CREATE INDEX IF NOT EXISTS idx_batches_status_publish ON batches(batchStatus, publishB2b);

-- ============================================================================
-- CLIENTS TABLE INDEXES
-- ============================================================================

-- Index on client name for search operations
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Index on buyer flag for buyer-only queries
CREATE INDEX IF NOT EXISTS idx_clients_is_buyer ON clients(is_buyer);

-- Index on seller flag for supplier queries
CREATE INDEX IF NOT EXISTS idx_clients_is_seller ON clients(is_seller);

-- Index on VIP portal enabled for portal queries
CREATE INDEX IF NOT EXISTS idx_clients_vip_portal ON clients(vip_portal_enabled);

-- ============================================================================
-- ORDERS TABLE INDEXES (Additional)
-- ============================================================================

-- Index on due date for payment tracking
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);

-- Composite index for client sales queries
CREATE INDEX IF NOT EXISTS idx_orders_client_type ON orders(client_id, order_type);

-- ============================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================

-- Index on payment date for date range queries
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(paymentDate);

-- Index on payment type for filtering
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(paymentType);

-- ============================================================================
-- BILLS TABLE INDEXES (Accounts Payable)
-- ============================================================================

-- Index on bill status
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Index on due date for overdue queries
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(dueDate);

-- ============================================================================
-- CALENDAR EVENTS TABLE INDEXES
-- ============================================================================

-- Composite index for date range queries with type
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_type ON calendar_events(start_date, event_type);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- ============================================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================================

-- Index on entity type and ID for entity history lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON auditLogs(entityType, entityId);

-- Index on created at for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON auditLogs(createdAt);

-- ============================================================================
-- SAMPLE REQUESTS TABLE INDEXES
-- ============================================================================

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_sample_requests_status ON sample_requests(status);

-- Index on client ID
CREATE INDEX IF NOT EXISTS idx_sample_requests_client ON sample_requests(clientId);

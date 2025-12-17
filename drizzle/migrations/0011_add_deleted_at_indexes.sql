-- Migration: Add indexes on deletedAt columns for soft-delete performance
-- Date: 2025-12-17
-- Purpose: Improve query performance for soft-delete filtering on invoices, payments, and bills tables

-- Add index on invoices.deleted_at
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

-- Add index on payments.deleted_at
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);

-- Add index on bills.deleted_at
CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills(deleted_at);

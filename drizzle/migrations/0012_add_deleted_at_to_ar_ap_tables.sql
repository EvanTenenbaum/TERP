-- Migration: Add deleted_at columns to AR/AP tables
-- Date: 2025-12-17
-- Purpose: Fix schema drift - code expects deleted_at columns that don't exist in production
-- Affected tables: invoices, payments, bills, invoiceLineItems, billLineItems

-- Add deleted_at to invoices table
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at to payments table  
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at to bills table
ALTER TABLE bills ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at to invoiceLineItems table
ALTER TABLE invoiceLineItems ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at to billLineItems table
ALTER TABLE billLineItems ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Create indexes for soft-delete query performance
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX idx_bills_deleted_at ON bills(deleted_at);

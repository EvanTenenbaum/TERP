-- Add composite indexes for performance optimization
-- These indexes improve query performance for filtered lists

-- Invoice: frequently filtered by customer and status
CREATE INDEX IF NOT EXISTS "Invoice_customerId_status_idx" ON "Invoice"("customerId", "status");

-- Payment: frequently filtered by customer and status
CREATE INDEX IF NOT EXISTS "Payment_customerId_status_idx" ON "Payment"("customerId", "status");

-- Order: frequently filtered by customer and status
CREATE INDEX IF NOT EXISTS "Order_customerId_status_idx" ON "Order"("customerId", "status");

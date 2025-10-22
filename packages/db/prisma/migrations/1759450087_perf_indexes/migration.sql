CREATE INDEX IF NOT EXISTS "invoice_due_idx" ON "Invoice"("dueAt");
CREATE INDEX IF NOT EXISTS "invoice_customer_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "lot_product_idx" ON "InventoryLot"("productId");
CREATE INDEX IF NOT EXISTS "payment_app_payment_idx" ON "PaymentApplication"("paymentId");
-- Attachment entity/index already added previously but ensure:
CREATE INDEX IF NOT EXISTS "attachment_entity_idx2" ON "Attachment"("entity","entityId");

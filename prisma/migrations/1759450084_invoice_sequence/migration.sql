DO $$ BEGIN
  CREATE SEQUENCE invoice_number_seq START 100000 INCREMENT 1;
EXCEPTION WHEN duplicate_table THEN
  -- sequence exists
  NULL;
END $$;

-- Ensure column exists before altering default; adapt to your actual Invoice table/column
ALTER TABLE "Invoice" ALTER COLUMN "invoiceNumber" SET DEFAULT CONCAT('INV-', LPAD(NEXTVAL('invoice_number_seq')::text, 6, '0'));
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

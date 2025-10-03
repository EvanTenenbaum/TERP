CREATE TABLE IF NOT EXISTS "VendorInvoice"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendorId" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "issuedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "dueAt" TIMESTAMP,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  CONSTRAINT fk_vendor_ap FOREIGN KEY("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_invoice_unique" ON "VendorInvoice"("vendorId","invoiceNumber");

CREATE TABLE IF NOT EXISTS "VendorPayment"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendorId" UUID NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "amountCents" INTEGER NOT NULL,
  "remainingCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vendor_pay FOREIGN KEY("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE
);

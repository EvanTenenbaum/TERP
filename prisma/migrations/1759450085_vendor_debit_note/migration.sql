CREATE TABLE IF NOT EXISTS "VendorDebitNote"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendorId" UUID NOT NULL,
  "vendorReturnId" UUID NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vendor FOREIGN KEY("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "vdn_vendor_idx" ON "VendorDebitNote"("vendorId");

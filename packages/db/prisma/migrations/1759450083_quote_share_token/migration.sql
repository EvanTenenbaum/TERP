CREATE TABLE IF NOT EXISTS "QuoteShareToken"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "revokedAt" TIMESTAMP NULL,
  CONSTRAINT fk_quote FOREIGN KEY("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "quote_share_quote_idx" ON "QuoteShareToken"("quoteId");

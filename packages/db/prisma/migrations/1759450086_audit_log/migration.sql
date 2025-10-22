CREATE TABLE IF NOT EXISTS "AuditLog"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "AuditLog"("entity","entityId");

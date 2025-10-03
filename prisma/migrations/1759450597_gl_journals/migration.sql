CREATE TABLE IF NOT EXISTS "GLAccount"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "GLJournal"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "memo" TEXT
);

CREATE TABLE IF NOT EXISTS "GLJournalLine"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "journalId" UUID NOT NULL REFERENCES "GLJournal"("id") ON DELETE CASCADE,
  "accountId" UUID NOT NULL REFERENCES "GLAccount"("id"),
  "debitCents" INTEGER NOT NULL DEFAULT 0,
  "creditCents" INTEGER NOT NULL DEFAULT 0,
  "entity" TEXT,
  "entityId" TEXT
);

-- Seed minimal accounts if missing (AP, AR, Cash)
INSERT INTO "GLAccount"(id,code,name) SELECT gen_random_uuid(),'2000','Accounts Payable' WHERE NOT EXISTS(SELECT 1 FROM "GLAccount" WHERE code='2000');
INSERT INTO "GLAccount"(id,code,name) SELECT gen_random_uuid(),'1100','Accounts Receivable' WHERE NOT EXISTS(SELECT 1 FROM "GLAccount" WHERE code='1100');
INSERT INTO "GLAccount"(id,code,name) SELECT gen_random_uuid(),'1000','Cash' WHERE NOT EXISTS(SELECT 1 FROM "GLAccount" WHERE code='1000');

CREATE TABLE IF NOT EXISTS "Report"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "spec" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "ReportSnapshot"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportId" UUID NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "capturedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "data" JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS "Dashboard"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT
);
CREATE TABLE IF NOT EXISTS "DashboardWidget"(
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "dashboardId" UUID NOT NULL REFERENCES "Dashboard"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "reportId" UUID REFERENCES "Report"("id") ON DELETE SET NULL,
  "viz" TEXT NOT NULL DEFAULT 'auto',
  "position" JSONB NOT NULL DEFAULT '{}'::jsonb
);

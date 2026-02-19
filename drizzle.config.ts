import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: [
    "./drizzle/schema.ts",
    "./drizzle/schema-vip-portal.ts",
    "./drizzle/schema-rbac.ts",
    "./drizzle/schema-client360.ts",
    "./drizzle/schema-cron.ts",
    "./drizzle/schema-gamification.ts",
    "./drizzle/schema-feature-flags.ts",
    "./drizzle/schema-live-shopping.ts",
    "./drizzle/schema-extensions-live-shopping.ts",
    "./drizzle/schema-scheduling.ts",
    "./drizzle/schema-sprint5-trackd.ts",
    "./drizzle/schema-storage.ts",
  ],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  // Keep test DB sync lean while including required canary schemas used by
  // strict drift/fingerprint gates.
  schema: ["./drizzle/schema.ts", "./drizzle/schema-cron.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

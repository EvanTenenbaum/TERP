import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  // Use a single canonical schema source for test DB sync to avoid duplicate
  // table/index definitions split across legacy schema modules.
  schema: ["./drizzle/schema.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});


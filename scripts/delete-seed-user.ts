import { db } from "./db-sync.js";
import { users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

async function deleteSeedUser() {
  try {
    const result = await db.delete(users).where(eq(users.openId, "admin-seed-user"));
    console.log("✓ Deleted admin-seed-user");
  } catch (error) {
    console.error("Error deleting user:", error);
    process.exit(1);
  }
}

deleteSeedUser().then(() => {
  console.log("Done");
  process.exit(0);
});

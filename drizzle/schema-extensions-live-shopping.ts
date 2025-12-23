/**
 * NOTE: This content represents modifications required in `drizzle/schema.ts` or 
 * wherever the `orders` table is defined.
 * 
 * Since the orders table likely exists in the core schema, add these columns 
 * and relations to the existing table definition.
 */

import { mysqlEnum, int } from "drizzle-orm/mysql-core";
import { liveShoppingSessions } from "./schema-live-shopping";

// 1. Update Order Origin Enum
// In the orders table definition:
export const orderOriginEnum = mysqlEnum("origin", [
  "manual_entry",
  "b2b_portal",
  "shopify_sync",
  "live_shopping" // <--- ADD THIS
]);

// 2. Add Live Session Reference Column
// Add to orders table columns:
/*
  liveSessionId: int("liveSessionId")
    .references(() => liveShoppingSessions.id, { onDelete: "set null" }),
*/

// 3. Update Relations
// In ordersRelations:
/*
  liveSession: one(liveShoppingSessions, {
    fields: [orders.liveSessionId],
    references: [liveShoppingSessions.id],
  }),
*/

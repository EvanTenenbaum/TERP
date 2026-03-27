/**
 * Users Router
 * API endpoints for user management and listing
 */

import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { ne, isNull, and } from "drizzle-orm";

export const usersRouter = router({
  // Get all users (for sharing/collaboration features)
  list: protectedProcedure
    .use(requirePermission("users:read"))
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all users except the current user, excluding soft-deleted users
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(and(ne(users.id, ctx.user.id), isNull(users.deletedAt)));

      return allUsers;
    }),
});

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { simpleAuth } from "../_core/simpleAuth";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const userManagementRouter = router({
  // List all users
  listUsers: publicProcedure.query(async () => {
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    const allUsers = await database.select({
      openId: users.openId,
      email: users.email,
      name: users.name,
      lastSignedIn: users.lastSignedIn,
    }).from(users);

    return allUsers;
  }),

  // Create a new user
  createUser: publicProcedure
    .input(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(4, "Password must be at least 4 characters"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await simpleAuth.createUser(
        input.username,
        input.password,
        input.name || input.username
      );

      return {
        success: true,
        user: {
          username: user.email,
          name: user.name,
        },
      };
    }),

  // Delete a user
  deleteUser: publicProcedure
    .input(
      z.object({
        username: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      await database.delete(users).where(eq(users.email, input.username));

      return { success: true };
    }),

  // Reset user password
  resetPassword: publicProcedure
    .input(
      z.object({
        username: z.string(),
        newPassword: z.string().min(4, "Password must be at least 4 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.username);
      
      if (!user) {
        throw new Error("User not found");
      }

      // Hash new password
      const passwordHash = await simpleAuth.hashPassword(input.newPassword);

      // Update user with new password hash
      await db.upsertUser({
        ...user,
        loginMethod: passwordHash,
      });

      return { success: true };
    }),
});


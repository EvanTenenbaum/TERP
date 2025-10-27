import { ForbiddenError } from "@shared/_core/errors";
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/backend";
import type { Express, Request, Response, NextFunction } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

class ClerkAuthService {
  /**
   * Authenticate a request using Clerk session
   * This expects Clerk middleware to have already run
   */
  async authenticateRequest(req: Request): Promise<User> {
    try {
      // Get auth from Clerk middleware
      const auth = getAuth(req);
      
      if (!auth || !auth.userId) {
        throw ForbiddenError("Not authenticated");
      }

      const userId = auth.userId;

      // Get user from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      // Sync user to local database
      await db.upsertUser({
        openId: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
        loginMethod: "clerk",
        lastSignedIn: new Date(),
      });

      // Get user from database
      const user = await db.getUser(clerkUser.id);
      
      if (!user) {
        throw ForbiddenError("User not found in database");
      }

      return user;
    } catch (error) {
      console.error("[Clerk Auth] Authentication failed:", error);
      throw ForbiddenError("Authentication failed");
    }
  }

  /**
   * Get Clerk middleware for Express
   */
  getMiddleware() {
    return clerkMiddleware();
  }

  /**
   * Get Clerk requireAuth middleware
   */
  getRequireAuthMiddleware() {
    return requireAuth();
  }
}

export const clerkAuth = new ClerkAuthService();

export function registerClerkOAuthRoutes(app: Express) {
  // Apply Clerk middleware to all routes
  app.use(clerkAuth.getMiddleware());

  // Clerk webhook to sync users
  app.post("/api/clerk/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      
      if (event.type === "user.created" || event.type === "user.updated") {
        const user = event.data;
        await db.upsertUser({
          openId: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
          email: user.email_addresses?.[0]?.email_address || null,
          loginMethod: "clerk",
          lastSignedIn: new Date(),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Clerk] Webhook failed", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}


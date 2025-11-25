import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail, getUser, upsertUser } from "../db";
import { env } from "./env";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const PUBLIC_USER_EMAIL =
  env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
const PUBLIC_USER_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

async function getOrCreatePublicUser(): Promise<User | null> {
  try {
    const existing = await getUserByEmail(PUBLIC_USER_EMAIL);
    if (existing) {
      return existing;
    }

    await upsertUser({
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      lastSignedIn: new Date(),
    });

    const created = await getUser(PUBLIC_USER_ID);
    if (created) {
      return created;
    }
  } catch (error) {
    logger.warn(
      { error },
      "[Public Access] Failed to provision public demo user"
    );
  }

  const now = new Date();
  return {
    id: -1,
    openId: PUBLIC_USER_ID,
    email: PUBLIC_USER_EMAIL,
    name: "Public Demo User",
    role: "user",
    loginMethod: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Direct console output (bypasses logger replacement) to verify function is called
  process.stdout.write(`[CONTEXT-DIRECT] createContext CALLED for ${opts.req.url}\n`);
  
  try {
    logger.info({ path: opts.req.url }, "[Context] createContext called");
    let user: User | null = null;

    try {
      user = await simpleAuth.authenticateRequest(opts.req);
      logger.info({ userId: user?.id }, "[Context] Authenticated user found");
    } catch (error) {
      // Authentication is optional - this is expected for public access
      logger.info("[Context] No authenticated user, provisioning public user");
      user = null;
    }

    if (!user) {
      try {
        user = await getOrCreatePublicUser();
        logger.info({ userId: user?.id, email: user?.email }, "[Context] Public user provisioned");
      } catch (error) {
        logger.warn({ error }, "[Public Access] Failed to get/create public user, using synthetic fallback");
        // Fallback to synthetic user if everything fails
        const now = new Date();
        user = {
          id: -1,
          openId: PUBLIC_USER_ID,
          email: PUBLIC_USER_EMAIL,
          name: "Public Demo User",
          role: "user",
          loginMethod: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        };
        logger.info("[Context] Using synthetic public user fallback");
      }
    }

    // Ensure user is never null
    if (!user) {
      logger.error("[Context] CRITICAL: User is still null after all attempts!");
      const now = new Date();
      user = {
        id: -1,
        openId: PUBLIC_USER_ID,
        email: PUBLIC_USER_EMAIL,
        name: "Public Demo User",
        role: "user",
        loginMethod: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      };
      logger.warn("[Context] Final fallback: created synthetic user");
    }

    logger.info({ userId: user.id, email: user.email, openId: user.openId }, "[Context] Context created with user");
    process.stdout.write(`[CONTEXT-DIRECT] Returning context with user: id=${user.id}, email=${user.email}\n`);

    return {
      req: opts.req,
      res: opts.res,
      user, // This should NEVER be null at this point
    };
  } catch (error) {
    process.stdout.write(`[CONTEXT-DIRECT] ERROR in createContext: ${error}\n`);
    logger.error({ error }, "[Context] Fatal error in createContext");
    // Even on error, return a public user
    const now = new Date();
    const fallbackUser = {
      id: -1,
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      loginMethod: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    process.stdout.write(`[CONTEXT-DIRECT] Returning fallback user: id=${fallbackUser.id}\n`);
    return {
      req: opts.req,
      res: opts.res,
      user: fallbackUser,
    };
  }
}


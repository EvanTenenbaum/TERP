import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail, getUser, upsertUser } from "../db";
import { env } from "./env";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User; // Always non-null - public user is provisioned if no authenticated user
};

const PUBLIC_USER_EMAIL =
  env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
const PUBLIC_USER_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

/**
 * Get or create public demo user
 * NEVER returns null - always returns a valid User object
 */
async function getOrCreatePublicUser(): Promise<User> {
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
      "[Public Access] Failed to provision public demo user, using synthetic"
    );
  }

  // Always return synthetic user if DB operations fail
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

/**
 * Create tRPC context for each request
 * 
 * CRITICAL: This function MUST NEVER throw - it must always return a valid context.
 * Based on tRPC best practices: https://trpc.io/docs/server/context
 * 
 * Pattern: Always return context, even if authentication fails.
 * Public users are automatically provisioned for anonymous access.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Direct stdout logging to verify function is called (bypasses logger)
  process.stdout.write(`[CONTEXT] CALLED: ${opts.req.method} ${opts.req.url}\n`);
  
  // Create synthetic public user as ultimate fallback
  const createSyntheticUser = (): User => {
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
  };

  // Try to get authenticated user (completely optional - never throw)
  let user: User | null = null;
  
  try {
    // Check if there's a session token first (avoid calling authenticateRequest if no token)
    // Verify cookies exist and token is present
    const cookies = opts.req.cookies || {};
    const token = cookies["terp_session"];
    if (token && typeof token === "string") {
      try {
        user = await simpleAuth.authenticateRequest(opts.req);
        process.stdout.write(`[CONTEXT] Authenticated user: id=${user.id}\n`);
      } catch (authError) {
        // Authentication failed - this is expected for anonymous users
        // Don't log as error, just continue to public user provisioning
        process.stdout.write(`[CONTEXT] No valid auth token, using public user\n`);
      }
    } else {
      process.stdout.write(`[CONTEXT] No auth token in cookies, using public user\n`);
    }
  } catch (error) {
    // Any error in auth check - continue to public user
    process.stdout.write(`[CONTEXT] Auth check error (non-fatal): ${error}\n`);
  }

  // If no authenticated user, provision public user
  if (!user) {
    try {
      user = await getOrCreatePublicUser();
      process.stdout.write(`[CONTEXT] Public user provisioned: id=${user.id}\n`);
    } catch (error) {
      // Database error - use synthetic user
      process.stdout.write(`[CONTEXT] DB error, using synthetic user\n`);
      user = createSyntheticUser();
    }
  }

  // Final safety check - should never be null at this point
  if (!user) {
    process.stdout.write(`[CONTEXT] WARNING: User was null, creating synthetic\n`);
    user = createSyntheticUser();
  }

  process.stdout.write(`[CONTEXT] RETURNING: user id=${user.id}, email=${user.email}\n`);

  // ALWAYS return a valid context - never throw
  return {
    req: opts.req,
    res: opts.res,
    user, // Guaranteed to be non-null
  };
}


import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail, getUser, upsertUser } from "../db";
import { env } from "./env";
import { logger } from "./logger";
import { QA_ROLES, QA_PASSWORD } from "./qaAuth";
import bcrypt from "bcrypt";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User; // Always non-null - public user is provisioned if no authenticated user
  isPublicDemoUser: boolean;
  vipPortalClientId?: number; // Set by VIP Portal authentication middleware
};

export const PUBLIC_USER_EMAIL =
  env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
export const PUBLIC_USER_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

export function isPublicDemoUser(
  user:
    | { id: number; openId?: string; email?: string | null }
    | null
    | undefined
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.id <= 0 ||
    user.openId === PUBLIC_USER_ID ||
    user.email === PUBLIC_USER_EMAIL
  );
}

/**
 * Get the Super Admin QA role config (guaranteed to exist in QA_ROLES)
 */
const DEMO_ADMIN_ROLE = QA_ROLES.find(
  r => r.rbacRoleName === "Super Admin"
) ?? {
  email: "qa.superadmin@terp.test",
  name: "QA Super Admin",
  rbacRoleName: "Super Admin",
  userRole: "admin" as const,
  description: "Unrestricted access to entire system",
};

/**
 * Get or create Demo Admin user (Super Admin for DEMO_MODE)
 * NEVER returns null - always returns a valid User object
 */
async function getOrCreateDemoAdmin(): Promise<User> {
  const email = DEMO_ADMIN_ROLE.email;

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return existing;
    }

    // Create the demo admin user
    const passwordHash = await bcrypt.hash(QA_PASSWORD, 10);
    const openId = `demo-admin-${Date.now()}`;

    await upsertUser({
      openId,
      email,
      name: DEMO_ADMIN_ROLE.name,
      loginMethod: passwordHash,
      role: "admin",
      lastSignedIn: new Date(),
    });

    const created = await getUser(openId);
    if (created) {
      logger.info({ email }, "Demo admin user created for DEMO_MODE");
      return created;
    }
  } catch (error) {
    logger.warn(
      { error },
      "[Demo Mode] Failed to provision demo admin user, using synthetic"
    );
  }

  // Always return synthetic admin user if DB operations fail
  const now = new Date();
  return {
    id: -2, // Different from public user (-1)
    openId: "demo-admin",
    email,
    name: DEMO_ADMIN_ROLE.name,
    role: "admin",
    loginMethod: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

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
    const cookies = opts.req.cookies || {};
    const token = cookies["terp_session"];
    if (token && typeof token === "string") {
      try {
        user = await simpleAuth.authenticateRequest(opts.req);
        logger.debug({ userId: user.id }, "Authenticated user in context");
      } catch (_authError) {
        // Authentication failed - this is expected for anonymous users
        // Continue to public user provisioning
        logger.debug("No valid auth token, using public user");
      }
    }
  } catch (error) {
    // Any error in auth check - continue to public user
    logger.debug({ error }, "Auth check error (non-fatal), using public user");
  }

  // If no authenticated user, check for DEMO_MODE or provision public user
  if (!user) {
    // DEMO_MODE: Auto-authenticate as Super Admin
    if (env.DEMO_MODE) {
      try {
        user = await getOrCreateDemoAdmin();
        logger.debug(
          { userId: user.id },
          "Demo admin user provisioned for DEMO_MODE"
        );

        // Set the session cookie for subsequent requests
        const token = simpleAuth.createSessionToken(user);
        opts.res.cookie("terp_session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      } catch (error) {
        logger.warn(
          { error },
          "Failed to provision demo admin, falling back to public user"
        );
        user = await getOrCreatePublicUser();
      }
    } else {
      // Standard behavior: provision public user
      try {
        user = await getOrCreatePublicUser();
        logger.debug({ userId: user.id }, "Public user provisioned");
      } catch (error) {
        // Database error - use synthetic user
        logger.warn(
          { error },
          "Failed to provision public user from DB, using synthetic"
        );
        user = createSyntheticUser();
      }
    }
  }

  // Final safety check - should never be null at this point
  if (!user) {
    logger.warn("User was null after all fallbacks, creating synthetic user");
    user = createSyntheticUser();
  }

  // ALWAYS return a valid context - never throw
  return {
    req: opts.req,
    res: opts.res,
    user, // Guaranteed to be non-null
    isPublicDemoUser: isPublicDemoUser(user),
  };
}

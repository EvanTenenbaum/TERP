import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isPublicDemoUser } from "./context";
import { sanitizeUserInput } from "./sanitization";
import { logger } from "./logger";
import { getUserByEmail, getUser, upsertUser } from "../db";
import { env } from "./env";
import { db } from "../db";
import { vipPortalAuth } from "../../drizzle/schema-vip-portal";
import { eq, and, gt } from "drizzle-orm";

/**
 * Helper to get authenticated user ID from context.
 * Throws UNAUTHORIZED if user is not authenticated or is the public demo user.
 *
 * Use this instead of `ctx.user?.id || 1` pattern to ensure proper authentication.
 *
 * @param ctx - tRPC context
 * @returns The authenticated user's ID
 * @throws TRPCError with code UNAUTHORIZED if not authenticated
 */
export function getAuthenticatedUserId(ctx: {
  user?: { id: number; email?: string | null; openId?: string } | null;
}): number {
  if (!ctx.user || isPublicDemoUser(ctx.user)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to perform this action.",
    });
  }
  return ctx.user.id;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

// Global error handling middleware applied to all procedures
const errorHandlingMiddleware = t.middleware(async opts => {
  const { ctx, next, path } = opts;
  try {
    return await next();
  } catch (error) {
    // Log error with context
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        path,
        userId: ctx.user?.id,
      },
      "tRPC procedure error"
    );
    throw error;
  }
});

export const publicProcedure = t.procedure.use(errorHandlingMiddleware);

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === "string") {
    return sanitizeUserInput(input);
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  // Handle objects
  if (typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).map(
      ([key, value]) => [key, sanitizeInput(value)]
    );
    return Object.fromEntries(entries);
  }

  // Return primitives as-is
  return input;
}

/**
 * Sanitization middleware for tRPC procedures
 * Automatically sanitizes all string inputs to prevent XSS attacks
 */
export const sanitizationMiddleware = t.middleware(async ({ next, input }) => {
  // Recursively sanitize all string values in the input
  const sanitizedInput = sanitizeInput(input);

  // Log if any sanitization occurred
  if (JSON.stringify(input) !== JSON.stringify(sanitizedInput)) {
    logger.warn({
      msg: "Input sanitization applied",
      original: input,
      sanitized: sanitizedInput,
    });
  }

  // Pass sanitized input to the next middleware/procedure
  return next({
    input: sanitizedInput,
  });
});

/**
 * Get or create public demo user (defensive fallback)
 * This ensures we always have a user, even if createContext failed
 */
async function getOrCreatePublicUserFallback() {
  const PUBLIC_USER_EMAIL =
    env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
  const PUBLIC_USER_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

  try {
    const existing = await getUserByEmail(PUBLIC_USER_EMAIL);
    if (existing) return existing;

    await upsertUser({
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      lastSignedIn: new Date(),
    });

    const created = await getUser(PUBLIC_USER_ID);
    if (created) return created;
  } catch (error) {
    logger.warn(
      { error },
      "Failed to get/create public user in requireUser middleware"
    );
  }

  // Ultimate fallback: synthetic user
  const now = new Date();
  return {
    id: -1,
    openId: PUBLIC_USER_ID,
    email: PUBLIC_USER_EMAIL,
    name: "Public Demo User",
    role: "user" as const,
    loginMethod: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

const requireUser = t.middleware(async opts => {
  const { ctx, next, type } = opts;

  // DEFENSIVE APPROACH: If context creation failed, provision public user here
  // This avoids the debug loop by ensuring we always have a user
  let user = ctx.user;

  if (!user) {
    logger.warn({
      msg: "requireUser: ctx.user is null - provisioning public user as fallback",
      url: ctx.req.url,
    });
    user = await getOrCreatePublicUserFallback();
  }

  // Log warning if public user is being used for mutations
  // Reject public/demo user for mutations to prevent unauthorized writes
  const isDemo = isPublicDemoUser(user);
  if (type === "mutation" && isDemo) {
    logger.warn({
      msg: "SECURITY: Public demo user attempted mutation - rejecting",
      url: ctx.req.url,
      type,
    });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  }

  // Public demo user (id: -1) is allowed for read operations
  // Authenticated users are also allowed
  return next({
    ctx: {
      ...ctx,
      user, // Guaranteed to be non-null at this point
      isPublicDemoUser: isDemo,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireUser);

/**
 * Strictly protected procedure - rejects public/demo users
 *
 * Use this for mutations that MUST have a real authenticated user.
 * Unlike protectedProcedure, this will NOT fall back to the public demo user.
 *
 * Security: This prevents the ctx.user?.id || 1 fallback pattern vulnerability
 * where mutations could be attributed to a default user instead of requiring
 * real authentication.
 */
const requireAuthenticatedUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Reject if no user at all
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to perform this action.",
    });
  }

  // Reject public demo user (id: -1)
  if (isPublicDemoUser(ctx.user)) {
    logger.warn({
      msg: "strictlyProtectedProcedure: Rejecting public demo user for mutation",
      url: ctx.req.url,
      userId: ctx.user.id,
    });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to perform this action.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Guaranteed to be a real authenticated user
      actorId: ctx.user.id, // Canonical actor attribution
    },
  });
});

export const strictlyProtectedProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireAuthenticatedUser);

export const adminProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      // Require authentication and admin role
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }

      // Public users cannot access admin procedures
      if (ctx.user.id === -1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Admin access required. Please log in with an admin account.",
        });
      }

      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  );

// ============================================================================
// VIP PORTAL AUTHENTICATION
// Part of Canonical Model Unification - Phase 5, Task 21
// ============================================================================

/**
 * VIP Portal Session interface
 * Represents a verified VIP portal session
 */
export interface VipPortalSession {
  clientId: number;
  email: string;
  sessionToken: string;
  expiresAt: Date;
}

/**
 * Verify VIP portal session token
 *
 * @param sessionToken - The session token from the x-vip-session-token header
 * @returns The VIP portal session if valid, null otherwise
 */
async function verifyVipPortalSession(
  sessionToken: string
): Promise<VipPortalSession | null> {
  if (!sessionToken || !db) {
    return null;
  }

  try {
    const now = new Date();

    // Find valid session (not expired)
    const authRecord = await db.query.vipPortalAuth.findFirst({
      where: and(
        eq(vipPortalAuth.sessionToken, sessionToken),
        gt(vipPortalAuth.sessionExpiresAt, now)
      ),
      columns: {
        clientId: true,
        email: true,
        sessionToken: true,
        sessionExpiresAt: true,
      },
    });

    if (
      !authRecord ||
      !authRecord.sessionExpiresAt ||
      !authRecord.sessionToken
    ) {
      return null;
    }

    return {
      clientId: authRecord.clientId,
      email: authRecord.email,
      sessionToken: authRecord.sessionToken,
      expiresAt: authRecord.sessionExpiresAt,
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      msg: "Failed to verify VIP portal session",
    });
    return null;
  }
}

/**
 * VIP Portal procedure middleware
 *
 * Use this for VIP portal endpoints that require authenticated portal sessions.
 * Verifies the session token from the x-vip-session-token header and resolves
 * to a clientId for authorization.
 *
 * Security: This ensures VIP portal writes are properly authenticated and
 * attributed to the correct client for audit purposes.
 *
 * @example
 * ```typescript
 * export const vipPortalRouter = router({
 *   updateProfile: vipPortalProcedure
 *     .input(z.object({ ... }))
 *     .mutation(async ({ ctx, input }) => {
 *       // ctx.vipSession.clientId is guaranteed to be valid
 *       // ctx.actorId is set to "vip:{clientId}" for audit
 *     }),
 * });
 * ```
 */
const requireVipPortalSession = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Get session token from header
  const sessionToken = ctx.req.headers["x-vip-session-token"] as
    | string
    | undefined;

  if (!sessionToken) {
    logger.warn({
      msg: "VIP portal request missing session token",
      url: ctx.req.url,
    });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "VIP portal session required. Please log in to the portal.",
    });
  }

  // Verify session
  const session = await verifyVipPortalSession(sessionToken);

  if (!session) {
    logger.warn({
      msg: "VIP portal session invalid or expired",
      url: ctx.req.url,
    });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Your VIP portal session has expired. Please log in again.",
    });
  }

  logger.info({
    msg: "VIP portal session verified",
    clientId: session.clientId,
    email: session.email,
  });

  return next({
    ctx: {
      ...ctx,
      vipSession: session,
      clientId: session.clientId,
      actorId: `vip:${session.clientId}`, // VIP portal actor attribution for audit
    },
  });
});

/**
 * VIP Portal protected procedure
 *
 * Use this for all VIP portal endpoints that modify data.
 * Ensures proper session verification and actor attribution.
 */
export const vipPortalProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireVipPortalSession);

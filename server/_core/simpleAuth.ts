import { ForbiddenError } from "@shared/_core/errors";
import type { Express, Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env, shouldBlockDemoModeInProduction } from "./env";
import { logger } from "./logger";
import { getSessionCookieOptions } from "./cookies";
import {
  invalidateToken,
  isTokenInvalidated,
  isUserTokensInvalidated,
} from "./tokenInvalidation";

// JWT_SECRET is accessed lazily to prevent startup crashes
// This allows the server to start even if JWT_SECRET validation fails
// The error will occur when auth is actually used, not during module import
const getJwtSecret = () => env.JWT_SECRET;
const COOKIE_NAME = "terp_session";

interface SessionPayload {
  userId: string;
  email: string;
  // jsonwebtoken auto-populates iat (seconds since epoch) on verify.
  iat?: number;
}

/**
 * TER-1149: Classify why an auth attempt did (or did not) succeed. Callers
 * like the tRPC context gate DEMO_MODE auto-re-auth on this so a cookie that
 * was just revoked is never silently re-provisioned as Super Admin.
 */
export type AuthStatus = "ok" | "no-cookie" | "invalid" | "invalidated";

export interface AuthAttemptResult {
  status: AuthStatus;
  user: User | null;
}

class SimpleAuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create a JWT session token
   */
  createSessionToken(user: User): string {
    const payload: SessionPayload = {
      userId: user.openId,
      email: user.email || "",
    };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
  }

  /**
   * Verify and decode a JWT session token
   */
  verifySessionToken(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, getJwtSecret()) as SessionPayload;
    } catch (_error) {
      return null;
    }
  }

  /**
   * TER-1149: Authenticate and return a classified result rather than
   * throwing. Callers that need to distinguish "no cookie" from "cookie was
   * just invalidated" (e.g. tRPC context gating DEMO_MODE auto-re-auth) must
   * use this method. REST callers that want the legacy throwing behavior use
   * `authenticateRequest` below.
   */
  async authenticateRequestWithStatus(
    req: Request
  ): Promise<AuthAttemptResult> {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token || typeof token !== "string") {
      return { status: "no-cookie", user: null };
    }

    const payload = this.verifySessionToken(token);
    if (!payload) {
      return { status: "invalid", user: null };
    }

    // TER-1149: Per-token blacklist. `invalidateToken` is called on logout
    // but until this check was added the same JWT kept authenticating until
    // its 30-day expiry.
    if (isTokenInvalidated(token)) {
      return { status: "invalidated", user: null };
    }

    const user = await db.getUser(payload.userId);
    if (!user) {
      return { status: "invalid", user: null };
    }

    // TER-1149: Per-user bulk invalidation (covers multi-tab / stolen-token
    // scenarios where every JWT issued before the event should be rejected).
    if (
      typeof payload.iat === "number" &&
      isUserTokensInvalidated(user.id, new Date(payload.iat * 1000))
    ) {
      return { status: "invalidated", user: null };
    }

    return { status: "ok", user };
  }

  /**
   * Authenticate a request using session cookie. Throws ForbiddenError on any
   * failure — used by the REST `/api/auth/me`, `/push-schema`, `/seed`
   * endpoints which map every failure to 401.
   */
  async authenticateRequest(req: Request): Promise<User> {
    try {
      const result = await this.authenticateRequestWithStatus(req);
      if (result.status === "ok" && result.user) {
        return result.user;
      }
      throw ForbiddenError("Authentication failed");
    } catch (_error) {
      // Error logging handled by error handling middleware
      throw ForbiddenError("Authentication failed");
    }
  }

  /**
   * Login with username and password
   */
  async login(
    username: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    // Find user by email (we'll use email field for username)
    let user: User | undefined;
    try {
      user = await db.getUserByEmail(username);
    } catch (error) {
      logger.error({ error, username }, "Auth login failed during user lookup");
      throw ForbiddenError("Invalid username or password");
    }

    if (!user) {
      logger.warn({ username }, "Auth login rejected: user not found");
      throw ForbiddenError("Invalid username or password");
    }

    // Verify password (stored in loginMethod field temporarily)
    let isValid = false;
    try {
      isValid = await this.verifyPassword(password, user.loginMethod || "");
    } catch (error) {
      logger.error(
        { error, username },
        "Auth login failed during password verify"
      );
      throw ForbiddenError("Invalid username or password");
    }

    if (!isValid) {
      logger.warn({ username }, "Auth login rejected: password mismatch");
      throw ForbiddenError("Invalid username or password");
    }

    // Update last signed in
    await db.upsertUser({
      ...user,
      lastSignedIn: new Date(),
    });

    // Create session token
    const token = this.createSessionToken(user);

    return { user, token };
  }

  /**
   * Create a new user with username and password
   */
  async createUser(
    username: string,
    password: string,
    name?: string
  ): Promise<User> {
    // Check if user already exists
    const existing = await db.getUserByEmail(username);
    if (existing) {
      throw new Error("User already exists");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user (store password hash in loginMethod field)
    await db.upsertUser({
      openId: username, // Use username as openId
      email: username,
      name: name || username,
      loginMethod: passwordHash, // Store password hash here
      lastSignedIn: new Date(),
    });

    const user = await db.getUser(username);
    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }
}

export const simpleAuth = new SimpleAuthService();

export function registerSimpleAuthRoutes(app: Express) {
  // Keep demo auth out of the real production app, but allow the explicitly
  // named staging app which intentionally runs with DEMO_MODE=true.
  if (
    shouldBlockDemoModeInProduction({
      demoMode: process.env.DEMO_MODE,
      nodeEnv: process.env.NODE_ENV,
      appId: process.env.VITE_APP_ID,
    })
  ) {
    throw new Error(
      "DEMO_MODE must not be enabled in production — this is a security risk"
    );
  }

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password required" });
      }

      const { user, token } = await simpleAuth.login(username, password);

      // Set session cookie
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (error) {
      // Provide minimal details for diagnosis; never log password.
      const username = req.body?.username;
      logger.warn(
        {
          username: typeof username === "string" ? username : undefined,
          err:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : String(error),
        },
        "Auth login request failed"
      );
      // Error logging handled by error handling middleware
      res.status(401).json({ error: "Invalid username or password" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // TERP-0014: Invalidate the token so it can't be reused
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      invalidateToken({
        tokenId: token,
        reason: "LOGOUT",
      });
    }
    res.clearCookie(COOKIE_NAME, getSessionCookieOptions(req));
    res.json({ success: true });
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await simpleAuth.authenticateRequest(req);
      res.json({ user: { name: user.name, email: user.email } });
    } catch {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Database schema push endpoint (for schema updates)
  app.post("/api/auth/push-schema", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Disabled in production" });
    }

    // Require valid JWT + admin auth
    let user: Awaited<ReturnType<typeof simpleAuth.authenticateRequest>>;
    try {
      user = await simpleAuth.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { pushSchema } = await import("../services/pushSchema");
      const result = await pushSchema();
      res.json({
        success: true,
        message: "Schema pushed successfully",
        output: result.output,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Manual seed endpoint (for initial setup)
  app.post("/api/auth/seed", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Disabled in production" });
    }

    // Require valid JWT + admin auth
    let seedUser: Awaited<ReturnType<typeof simpleAuth.authenticateRequest>>;
    try {
      seedUser = await simpleAuth.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (seedUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if seeding is disabled (case-insensitive)
    const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
    if (skipSeeding === "true" || skipSeeding === "1") {
      return res.status(403).json({
        error: "Seeding is disabled via SKIP_SEEDING environment variable",
      });
    }

    try {
      const { seedAllDefaults } = await import("../services/seedDefaults");
      await seedAllDefaults();

      // Create admin user only if environment variables are provided
      const { env } = await import("./env");
      if (env.initialAdminUsername && env.initialAdminPassword) {
        const { getUserByEmail } = await import("../db");
        const adminExists = await getUserByEmail(env.initialAdminUsername);
        if (!adminExists) {
          await simpleAuth.createUser(
            env.initialAdminUsername,
            env.initialAdminPassword,
            `${env.initialAdminUsername} (Admin)`
          );
        }
      }

      res.json({ success: true, message: "Seeding completed successfully" });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create first user endpoint (for initial setup)
  app.post("/api/auth/create-first-user", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Disabled in production" });
    }

    try {
      // Reject if any users already exist — prevents account takeover
      const { countUsers } = await import("../db");
      const existingCount = await countUsers();
      if (existingCount > 0) {
        return res
          .status(403)
          .json({ error: "Users already exist. Use login instead." });
      }

      const { username, password, name } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password required" });
      }

      // BUG-W7-3: Enforce minimum password policy (8+ chars, at least one letter and one number)
      if (typeof password !== "string" || password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
          error: "Password must contain at least one letter and one number",
        });
      }

      const user = await simpleAuth.createUser(username, password, name);
      res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (error) {
      // QA-002: Catch TOCTOU duplicate-entry race — if two concurrent requests both pass
      // the countUsers() check, the DB unique constraint on openId will reject the second.
      if (error instanceof Error && error.message.includes("Duplicate entry")) {
        return res
          .status(403)
          .json({ error: "Users already exist. Use login instead." });
      }
      // Error logging handled by error handling middleware
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create user",
      });
    }
  });
}

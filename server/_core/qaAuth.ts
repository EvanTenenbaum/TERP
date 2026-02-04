/**
 * QA Authentication Service
 *
 * Provides deterministic authentication for QA roles to enable:
 * - RBAC validation testing
 * - Full coverage runs across all roles
 * - Regression testing without SSO/magic-link dependencies
 *
 * SECURITY: This module MUST only be enabled in non-production environments.
 * Control via QA_AUTH_ENABLED=true environment variable.
 *
 * @module server/_core/qaAuth
 */

import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail, upsertUser, getUser } from "../db";
import { logger } from "./logger";
import bcrypt from "bcrypt";

// ============================================================================
// QA AUTH CONFIGURATION
// ============================================================================

/**
 * QA Authentication enabled flag
 *
 * Returns true when:
 * 1. QA_AUTH_ENABLED=true AND not in production, OR
 * 2. DEMO_MODE=true (explicit demo mode works in any environment)
 *
 * DEMO_MODE is the preferred way to enable QA auth in production for
 * internal/demo deployments.
 */
export function isQaAuthEnabled(): boolean {
  // DEMO_MODE explicitly enables QA auth in any environment
  // This is intentional for demo/internal deployments
  const demoMode = process.env.DEMO_MODE === "true";
  if (demoMode) {
    return true;
  }

  // Standard QA auth: only in non-production
  const enabled = process.env.QA_AUTH_ENABLED === "true";
  const isProduction = process.env.NODE_ENV === "production";

  // Safety check: Never enable in production even if flag is set (unless DEMO_MODE)
  if (isProduction && enabled) {
    logger.warn(
      "QA_AUTH_ENABLED is set to true in production - this is ignored for security. Use DEMO_MODE=true for production demos."
    );
    return false;
  }

  return enabled;
}

/**
 * Standard QA password for all QA test accounts
 * Deterministic password enables automated testing
 */
export const QA_PASSWORD = "TerpQA2026!";

/**
 * QA Role definitions mapping to RBAC roles
 * Each QA user maps to exactly one RBAC role
 */
export interface QaRoleConfig {
  email: string;
  name: string;
  rbacRoleName: string;
  userRole: "admin" | "user";
  description: string;
}

/**
 * QA Role Configurations
 * These map directly to the roles defined in USER_FLOW_MATRIX.csv
 */
export const QA_ROLES: QaRoleConfig[] = [
  {
    email: "qa.superadmin@terp.test",
    name: "QA Super Admin",
    rbacRoleName: "Super Admin",
    userRole: "admin",
    description: "Unrestricted access to entire system",
  },
  {
    email: "qa.salesmanager@terp.test",
    name: "QA Sales Manager",
    rbacRoleName: "Sales Manager",
    userRole: "user",
    description: "Full access to clients, orders, quotes, sales sheets",
  },
  {
    email: "qa.salesrep@terp.test",
    name: "QA Sales Rep",
    rbacRoleName: "Customer Service",
    userRole: "user",
    description: "Full access to clients, orders, returns, refunds",
  },
  {
    email: "qa.inventory@terp.test",
    name: "QA Inventory Manager",
    rbacRoleName: "Inventory Manager",
    userRole: "user",
    description:
      "Full access to inventory, locations, transfers, product intake",
  },
  {
    email: "qa.fulfillment@terp.test",
    name: "QA Fulfillment",
    rbacRoleName: "Warehouse Staff",
    userRole: "user",
    description:
      "Can receive POs, adjust inventory, transfer inventory, process returns",
  },
  {
    email: "qa.accounting@terp.test",
    name: "QA Accounting Manager",
    rbacRoleName: "Accountant",
    userRole: "user",
    description: "Full access to accounting, credits, COGS, bad debt",
  },
  {
    email: "qa.auditor@terp.test",
    name: "QA Read-Only Auditor",
    rbacRoleName: "Read-Only Auditor",
    userRole: "user",
    description: "Read-only access to all modules, full access to audit logs",
  },
];

/**
 * Get QA role configuration by email
 */
export function getQaRoleByEmail(email: string): QaRoleConfig | undefined {
  return QA_ROLES.find(
    role => role.email.toLowerCase() === email.toLowerCase()
  );
}

/**
 * Check if an email is a QA test account
 */
export function isQaEmail(email: string): boolean {
  return QA_ROLES.some(
    role => role.email.toLowerCase() === email.toLowerCase()
  );
}

// ============================================================================
// QA AUTH SERVICE
// ============================================================================

/**
 * QA Authentication Service
 * Handles login/logout for QA test accounts with audit logging
 */
class QaAuthService {
  /**
   * Authenticate a QA user with deterministic credentials
   *
   * @param email - QA user email (must match QA_ROLES)
   * @param password - Must be QA_PASSWORD
   * @returns User and session token if successful
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<{ user: User; token: string }> {
    // Validate QA auth is enabled
    if (!isQaAuthEnabled()) {
      logger.warn(
        { email },
        "QA auth login attempted but QA_AUTH_ENABLED is false"
      );
      throw new Error("QA authentication is not enabled");
    }

    // Validate this is a QA email
    const qaRole = getQaRoleByEmail(email);
    if (!qaRole) {
      logger.warn({ email }, "QA auth login attempted with non-QA email");
      throw new Error("Invalid QA credentials");
    }

    // Validate password matches QA_PASSWORD
    if (password !== QA_PASSWORD) {
      logger.warn({ email }, "QA auth login failed: incorrect password");
      throw new Error("Invalid QA credentials");
    }

    // Get or create the QA user
    let user = await getUserByEmail(email);

    if (!user) {
      // Create QA user on first login
      const passwordHash = await bcrypt.hash(QA_PASSWORD, 10);
      const openId = `qa-${qaRole.rbacRoleName.toLowerCase().replace(/[\s/]+/g, "-")}-${Date.now()}`;

      await upsertUser({
        openId,
        email: qaRole.email,
        name: qaRole.name,
        loginMethod: passwordHash,
        role: qaRole.userRole,
        lastSignedIn: new Date(),
      });

      user = await getUser(openId);

      if (!user) {
        throw new Error("Failed to create QA user");
      }

      logger.info(
        { email, role: qaRole.rbacRoleName },
        "QA user created on first login"
      );
    } else {
      // Update last signed in
      await upsertUser({
        ...user,
        lastSignedIn: new Date(),
      });
    }

    // Create session token
    const token = simpleAuth.createSessionToken(user);

    // Log the QA auth event
    logger.info(
      {
        email,
        role: qaRole.rbacRoleName,
        userId: user.id,
        openId: user.openId,
        ipAddress,
        authMethod: "qa-auth",
        environment: process.env.NODE_ENV,
      },
      "QA user authenticated successfully"
    );

    return { user, token };
  }

  /**
   * Get list of available QA roles for the role switcher UI
   */
  getAvailableRoles(): Array<{
    email: string;
    name: string;
    role: string;
    description: string;
  }> {
    if (!isQaAuthEnabled()) {
      return [];
    }

    return QA_ROLES.map(role => ({
      email: role.email,
      name: role.name,
      role: role.rbacRoleName,
      description: role.description,
    }));
  }

  /**
   * Check if a user is a QA user (for UI indicators)
   */
  isQaUser(user: User | null | undefined): boolean {
    if (!user || !user.email) return false;
    return isQaEmail(user.email);
  }

  /**
   * Get the QA role name for a user
   */
  getQaRoleName(user: User | null | undefined): string | null {
    if (!user || !user.email) return null;
    const qaRole = getQaRoleByEmail(user.email);
    return qaRole?.rbacRoleName || null;
  }
}

export const qaAuth = new QaAuthService();

// ============================================================================
// QA AUTH ROUTES
// ============================================================================

/**
 * Register QA authentication routes
 *
 * @param app - Express application
 */
export function registerQaAuthRoutes(app: import("express").Express): void {
  const COOKIE_NAME = "terp_session";

  // QA login endpoint
  app.post("/api/qa-auth/login", async (req: Request, res: Response) => {
    // Check if QA auth is enabled
    if (!isQaAuthEnabled()) {
      return res.status(403).json({
        error: "QA authentication is not enabled",
        hint: "Set QA_AUTH_ENABLED=true in your environment",
      });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password required",
        });
      }

      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress;

      const { user, token } = await qaAuth.login(email, password, ipAddress);

      // Set session cookie
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const qaRole = getQaRoleByEmail(email);

      res.json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          role: qaRole?.rbacRoleName,
        },
        qaContext: {
          isQaUser: true,
          role: qaRole?.rbacRoleName,
          description: qaRole?.description,
        },
      });
    } catch (error) {
      logger.warn(
        {
          email: req.body?.email,
          error: error instanceof Error ? error.message : String(error),
        },
        "QA auth login failed"
      );

      res.status(401).json({
        error: "Invalid QA credentials",
      });
    }
  });

  // Get available QA roles (for role switcher UI)
  app.get("/api/qa-auth/roles", (req: Request, res: Response) => {
    if (!isQaAuthEnabled()) {
      return res.status(403).json({
        error: "QA authentication is not enabled",
      });
    }

    res.json({
      enabled: true,
      roles: qaAuth.getAvailableRoles(),
      password: QA_PASSWORD, // Safe to expose in dev/staging
    });
  });

  // Check if QA auth is enabled
  app.get("/api/qa-auth/status", (req: Request, res: Response) => {
    res.json({
      enabled: isQaAuthEnabled(),
      environment: process.env.NODE_ENV,
    });
  });

  logger.info("QA auth routes registered");
}

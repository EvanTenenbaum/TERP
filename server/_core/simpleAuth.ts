import { ForbiddenError } from "@shared/_core/errors";
import type { Express, Request, Response, NextFunction } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "./env";

const JWT_SECRET = env.JWT_SECRET || "your-secret-key-change-in-production";
const COOKIE_NAME = "terp_session";

interface SessionPayload {
  userId: string;
  email: string;
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
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
  }

  /**
   * Verify and decode a JWT session token
   */
  verifySessionToken(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as SessionPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate a request using session cookie
   */
  async authenticateRequest(req: Request): Promise<User> {
    try {
      // Get session token from cookie
      const token = req.cookies[COOKIE_NAME];
      
      if (!token) {
        throw ForbiddenError("Not authenticated - no session token");
      }

      // Verify token
      const payload = this.verifySessionToken(token);
      if (!payload) {
        throw ForbiddenError("Invalid session token");
      }

      // Get user from database
      const user = await db.getUser(payload.userId);
      
      if (!user) {
        throw ForbiddenError("User not found");
      }

      return user;
    } catch (error) {
      console.error("[Simple Auth] Authentication failed:", error);
      throw ForbiddenError("Authentication failed");
    }
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    // Find user by email (we'll use email field for username)
    const user = await db.getUserByEmail(username);
    
    if (!user) {
      throw ForbiddenError("Invalid username or password");
    }

    // Verify password (stored in loginMethod field temporarily)
    const isValid = await this.verifyPassword(password, user.loginMethod || "");
    
    if (!isValid) {
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
  async createUser(username: string, password: string, name?: string): Promise<User> {
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
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const { user, token } = await simpleAuth.login(username, password);

      // Set session cookie
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(401).json({ error: "Invalid username or password" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await simpleAuth.authenticateRequest(req);
      res.json({ user: { name: user.name, email: user.email } });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Database migration endpoint (for schema updates)
  app.post("/api/auth/migrate", async (req, res) => {
    try {
      const { runMigrations } = await import("../services/migrate");
      await runMigrations();
      res.json({ success: true, message: "Migrations completed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual seed endpoint (for initial setup)
  app.post("/api/auth/seed", async (req, res) => {
    try {
      const { seedAllDefaults } = await import("../services/seedDefaults");
      await seedAllDefaults();
      
      // Create admin user
      const { getUserByEmail } = await import("../db");
      const adminExists = await getUserByEmail("Evan");
      if (!adminExists) {
        await simpleAuth.createUser("Evan", "oliver", "Evan (Admin)");
      }
      
      res.json({ success: true, message: "Seeding completed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create first user endpoint (for initial setup)
  app.post("/api/auth/create-first-user", async (req, res) => {
    try {
      const { username, password, name } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await simpleAuth.createUser(username, password, name);
      res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Create first user failed", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create user" });
    }
  });
}


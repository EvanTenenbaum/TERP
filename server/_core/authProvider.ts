/**
 * Authentication Provider Abstraction Layer
 *
 * Provides a consistent interface for authentication regardless of the underlying
 * implementation (simpleAuth, Clerk, Auth0, etc.). This enables:
 * - Easy swapping of auth providers
 * - Better testability (mock the provider)
 * - Future features: MFA, SSO, OAuth
 * - Consistent error handling
 *
 * @module server/_core/authProvider
 */

import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { isTokenInvalidated, isUserTokensInvalidated } from "./tokenInvalidation";

/**
 * Session payload containing user identification
 */
export interface SessionPayload {
  userId: string;
  email: string;
}

/**
 * Extended session payload with JWT standard claims
 * JWT automatically adds iat (issued at) and exp (expiration)
 */
interface JWTSessionPayload extends SessionPayload {
  iat?: number;
  exp?: number;
}

/**
 * Successful authentication result
 */
export interface AuthSuccess {
  success: true;
  user: User;
}

/**
 * Failed authentication result with error details
 */
export interface AuthFailure {
  success: false;
  error:
    | "NO_TOKEN"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "TOKEN_REVOKED"
    | "USER_NOT_FOUND"
    | "UNKNOWN";
  message: string;
}

/**
 * Authentication result (success or failure)
 */
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authentication provider interface
 *
 * Any auth implementation must conform to this interface
 */
export interface AuthProvider {
  /**
   * Authenticate a request and return user if valid
   *
   * @param req - Express request object
   * @returns Authentication result with user or error
   */
  authenticate(req: Request): Promise<AuthResult>;

  /**
   * Create a session token for a user
   *
   * @param user - User to create session for
   * @returns Session token string
   */
  createSession(user: User): string;

  /**
   * Verify and decode a session token
   *
   * @param token - Session token to verify
   * @returns Session payload or null if invalid
   */
  verifySession(token: string): SessionPayload | null;

  /**
   * Hash a password for secure storage
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   *
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Get the name of the current auth provider
   *
   * @returns Provider name (e.g., 'simpleAuth', 'clerk', 'auth0')
   */
  getProvider(): string;
}

/**
 * SimpleAuth implementation of AuthProvider
 *
 * Wraps the existing simpleAuth service to conform to the AuthProvider interface
 */
class SimpleAuthProvider implements AuthProvider {
  async authenticate(req: Request): Promise<AuthResult> {
    try {
      // Get session token from cookie
      const COOKIE_NAME = "terp_session";
      const token = req.cookies?.[COOKIE_NAME];

      // Check if token exists
      if (!token) {
        return {
          success: false,
          error: "NO_TOKEN",
          message: "No authentication token provided",
        };
      }

      // Verify token
      const basePayload = simpleAuth.verifySessionToken(token);
      if (!basePayload) {
        return {
          success: false,
          error: "INVALID_TOKEN",
          message: "Invalid or malformed authentication token",
        };
      }
      // Cast to include JWT standard claims (iat, exp)
      const payload = basePayload as JWTSessionPayload;

      // TERP-0014: Check if token has been invalidated (blacklisted)
      if (isTokenInvalidated(token)) {
        return {
          success: false,
          error: "TOKEN_REVOKED",
          message: "Authentication token has been revoked",
        };
      }

      // Get user from database
      const db = await import("../db");
      const user = await db.getUser(payload.userId);

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "User associated with token not found",
        };
      }

      // TERP-0014: Check if user's tokens have been bulk-invalidated
      // This happens on password change, admin revocation, etc.
      if (payload.iat) {
        const tokenIssuedAt = new Date(payload.iat * 1000);
        if (isUserTokensInvalidated(user.id, tokenIssuedAt)) {
          return {
            success: false,
            error: "TOKEN_REVOKED",
            message: "All sessions for this user have been invalidated",
          };
        }
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      // Handle unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check for token expiration (JWT throws specific error)
      if (
        errorMessage.includes("expired") ||
        errorMessage.includes("jwt expired")
      ) {
        return {
          success: false,
          error: "TOKEN_EXPIRED",
          message: "Authentication token has expired",
        };
      }

      return {
        success: false,
        error: "UNKNOWN",
        message: errorMessage,
      };
    }
  }

  createSession(user: User): string {
    return simpleAuth.createSessionToken(user);
  }

  verifySession(token: string): SessionPayload | null {
    return simpleAuth.verifySessionToken(token);
  }

  async hashPassword(password: string): Promise<string> {
    return simpleAuth.hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return simpleAuth.verifyPassword(password, hash);
  }

  getProvider(): string {
    return "simpleAuth";
  }
}

/**
 * Default auth provider instance
 *
 * Currently uses SimpleAuth, but can be swapped to Clerk, Auth0, etc.
 * by changing this line.
 */
export const authProvider: AuthProvider = new SimpleAuthProvider();

/**
 * Create a custom auth provider
 *
 * Use this for testing or to swap providers at runtime
 *
 * @param provider - Custom auth provider implementation
 * @returns Auth provider instance
 */
export function createAuthProvider(provider: AuthProvider): AuthProvider {
  return provider;
}

import rateLimit, { type Options } from "express-rate-limit";

/**
 * Base rate limit options shared across limiters
 * Using Partial<Options> to allow type-safe configuration
 */
type RateLimitConfig = Partial<Options>;

/**
 * General API rate limiter
 * Protects against abuse while allowing normal application usage
 *
 * Threshold rationale:
 * - 500 requests per 15 minutes = ~33 req/min = reasonable for interactive apps
 * - Reduced from 1000 to improve security posture
 * - High enough for typical user workflows but catches obvious abuse
 */
const apiLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Reduced from 1000 for better security
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy headers from DigitalOcean App Platform
};
export const apiLimiter = rateLimit(apiLimiterConfig);

/**
 * Authentication endpoint rate limiter
 * Protects against brute force attacks
 *
 * Threshold rationale:
 * - 10 failed attempts per 15 minutes is reasonable for legitimate users
 * - Increased from 5 to reduce false positives (typos, forgotten passwords)
 * - skipSuccessfulRequests=true means successful logins don't count
 * - Still strict enough to prevent brute force attacks
 */
const authLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to reduce user friction
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
};
export const authLimiter = rateLimit(authLimiterConfig);

/**
 * Strict rate limiter for sensitive operations
 * Used for data modification, financial transactions, and bulk operations
 *
 * Threshold rationale:
 * - 30 requests per minute balances batch operations with security
 * - Reduced from 100 (too permissive) but higher than original 10 (too restrictive)
 * - Suitable for legitimate batch imports while preventing abuse
 * - Apply to: create, update, delete operations on sensitive data
 */
const strictLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Reduced from 100, balanced approach
  message: "Rate limit exceeded. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
};
export const strictLimiter = rateLimit(strictLimiterConfig);

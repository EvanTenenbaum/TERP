/**
 * CSRF (Cross-Site Request Forgery) protection utility
 * Generates and validates CSRF tokens for state-changing operations
 */

import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.AUTH_JWT_SECRET || 'default-csrf-secret';
const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token for a user session
 * @param userId - User identifier
 * @returns CSRF token string
 */
export function generateCsrfToken(userId: string): string {
  const random = randomBytes(TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString();
  const data = `${userId}:${timestamp}:${random}`;
  
  const hmac = createHmac('sha256', CSRF_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  return `${data}:${signature}`;
}

/**
 * Validate a CSRF token
 * @param token - CSRF token to validate
 * @param userId - Expected user identifier
 * @param maxAgeMs - Maximum token age in milliseconds (default: 1 hour)
 * @returns true if valid, false otherwise
 */
export function validateCsrfToken(
  token: string,
  userId: string,
  maxAgeMs: number = 60 * 60 * 1000 // 1 hour default
): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 4) return false;
    
    const [tokenUserId, timestamp, random, signature] = parts;
    
    // Verify user ID matches
    if (tokenUserId !== userId) return false;
    
    // Verify token hasn't expired
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) return false;
    if (Date.now() - tokenTime > maxAgeMs) return false;
    
    // Verify signature
    const data = `${tokenUserId}:${timestamp}:${random}`;
    const hmac = createHmac('sha256', CSRF_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return false;
    
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return mismatch === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Extract CSRF token from request headers or body
 * @param req - Request object with headers and body
 * @returns CSRF token string or null
 */
export function extractCsrfToken(req: {
  headers: { get(name: string): string | null };
  body?: any;
}): string | null {
  // Check X-CSRF-Token header (preferred)
  const headerToken = req.headers.get('x-csrf-token');
  if (headerToken) return headerToken;
  
  // Check body (for form submissions)
  if (req.body && typeof req.body === 'object') {
    if ('_csrf' in req.body) return req.body._csrf;
    if ('csrfToken' in req.body) return req.body.csrfToken;
  }
  
  return null;
}

/**
 * Middleware helper to validate CSRF token for state-changing requests
 * @param req - Request object
 * @param userId - User identifier from auth
 * @returns true if valid or not required, false if invalid
 */
export function validateCsrfForRequest(
  req: { method: string; headers: { get(name: string): string | null }; body?: any },
  userId: string
): boolean {
  // Only validate for state-changing methods
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true; // No CSRF validation needed for safe methods
  }
  
  // Extract and validate token
  const token = extractCsrfToken(req);
  if (!token) return false;
  
  return validateCsrfToken(token, userId);
}

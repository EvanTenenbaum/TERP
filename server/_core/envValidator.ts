import { logger } from "./logger";

/**
 * Environment Variable Validator
 *
 * Validates required and optional environment variables at application startup.
 * Ensures security best practices and proper configuration.
 */

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all environment variables required for the application.
 *
 * @returns Validation result with errors and warnings
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  validateRequired(errors);

  // Format validations
  validateDatabaseUrl(errors);
  validateJwtSecret(errors, warnings);

  // Optional but recommended
  validateOptional(warnings);

  // Format validations for optional variables
  validateNodeEnv(warnings);
  validatePort(warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that all required environment variables are present.
 * JWT_SECRET accepts NEXTAUTH_SECRET as a fallback for backward compatibility.
 */
function validateRequired(errors: string[]): void {
  // DATABASE_URL is always required
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  }
  
  // JWT_SECRET or NEXTAUTH_SECRET (fallback) is required
  if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
    errors.push("JWT_SECRET (or NEXTAUTH_SECRET as fallback) is required");
  }
}

/**
 * Validates DATABASE_URL format.
 */
function validateDatabaseUrl(errors: string[]): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return; // Already caught by validateRequired
  }

  // Check for valid MySQL connection string format
  if (!databaseUrl.startsWith("mysql://")) {
    errors.push(
      "DATABASE_URL must be a valid MySQL connection string (mysql://...)"
    );
  }
}

/**
 * Default JWT secret value that should not be used in production.
 * This constant is used for validation only, not as an actual secret.
 */
const DEFAULT_JWT_SECRET = "terp-secret-key-change-in-production";

/**
 * Validates JWT_SECRET (or NEXTAUTH_SECRET fallback) security requirements.
 */
function validateJwtSecret(errors: string[], warnings: string[]): void {
  // Use JWT_SECRET, fall back to NEXTAUTH_SECRET
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!jwtSecret) {
    return; // Already caught by validateRequired
  }

  // Warn if using fallback
  if (!process.env.JWT_SECRET && process.env.NEXTAUTH_SECRET) {
    warnings.push("Using NEXTAUTH_SECRET as fallback - consider setting JWT_SECRET directly");
  }

  // Check minimum length for security
  if (jwtSecret.length < 32) {
    errors.push("JWT_SECRET (or NEXTAUTH_SECRET) must be at least 32 characters for security");
  }

  // Check for default value in production
  const isProduction = process.env.NODE_ENV === "production";
  const isDefaultSecret = jwtSecret === DEFAULT_JWT_SECRET;

  if (isProduction && isDefaultSecret) {
    errors.push("JWT_SECRET must not use default value in production");
  }
}

/**
 * Validates optional but recommended environment variables.
 */
function validateOptional(warnings: string[]): void {
  const isProduction = process.env.NODE_ENV === "production";

  // Production-recommended variables
  if (isProduction) {
    if (!process.env.SENTRY_DSN) {
      warnings.push("SENTRY_DSN is recommended for production error tracking");
    }
  }
}

/**
 * Validates NODE_ENV value.
 */
function validateNodeEnv(warnings: string[]): void {
  const nodeEnv = process.env.NODE_ENV;

  if (!nodeEnv) {
    return; // Optional, defaults to development
  }

  const validEnvs = ["development", "production", "test"];

  if (!validEnvs.includes(nodeEnv)) {
    warnings.push(`NODE_ENV should be one of: ${validEnvs.join(", ")}`);
  }
}

/**
 * Validates PORT value.
 */
function validatePort(warnings: string[]): void {
  const port = process.env.PORT;

  if (!port) {
    return; // Optional, defaults to 3000
  }

  const portNum = parseInt(port, 10);

  if (isNaN(portNum)) {
    warnings.push("PORT must be a valid number");
    return;
  }

  if (portNum < 1 || portNum > 65535) {
    warnings.push("PORT should be between 1 and 65535");
  }
}

/**
 * Validates environment variables and throws if validation fails.
 * Use this at application startup to ensure proper configuration.
 *
 * @throws Error if validation fails with critical errors
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  // Log warnings even if validation passes
  if (result.warnings.length > 0) {
    console.warn("⚠️  Environment Variable Warnings:");
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  // Throw on errors
  if (!result.isValid) {
    console.error("❌ Environment Variable Validation Failed:");
    result.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s). ` +
        `Check your .env file or environment variables.`
    );
  }

  logger.info("✅ Environment variables validated successfully");
}

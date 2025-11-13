import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./envValidator";

describe("Environment Variable Validator", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env after each test
    process.env = originalEnv;
  });

  describe("Required Variables", () => {
    it("should fail validation when DATABASE_URL is missing", () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("DATABASE_URL is required");
    });

    it("should fail validation when JWT_SECRET is missing", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      delete process.env.JWT_SECRET;

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("JWT_SECRET is required");
    });

    it("should pass validation when all required variables are present", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("DATABASE_URL Format Validation", () => {
    it("should fail validation for invalid DATABASE_URL format", () => {
      process.env.DATABASE_URL = "invalid-url";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "DATABASE_URL must be a valid MySQL connection string (mysql://...)"
      );
    });

    it("should accept valid mysql:// connection string", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/database";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result.isValid).toBe(true);
    });

    it("should accept valid mysql:// connection string with SSL parameters", () => {
      process.env.DATABASE_URL = "mysql://user:pass@host.com:25060/db?ssl=true";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result.isValid).toBe(true);
    });
  });

  describe("JWT_SECRET Security Validation", () => {
    it("should fail validation for JWT_SECRET shorter than 32 characters", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "short-secret";

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "JWT_SECRET must be at least 32 characters for security"
      );
    });

    it("should warn about default JWT_SECRET in production", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "terp-secret-key-change-in-production";
      process.env.NODE_ENV = "production";

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "JWT_SECRET must not use default value in production"
      );
    });

    it("should accept JWT_SECRET with exactly 32 characters", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "12345678901234567890123456789012"; // 32 chars

      const result = validateEnv();

      expect(result.isValid).toBe(true);
    });
  });

  describe("Optional Variables", () => {
    it("should pass validation when optional variables are missing", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      delete process.env.ARGOS_TOKEN;
      delete process.env.SENTRY_DSN;

      const result = validateEnv();

      expect(result.isValid).toBe(true);
    });

    it("should include warnings for missing optional production variables", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.NODE_ENV = "production";
      delete process.env.SENTRY_DSN;

      const result = validateEnv();

      expect(result.warnings).toContain(
        "SENTRY_DSN is recommended for production error tracking"
      );
    });
  });

  describe("NODE_ENV Validation", () => {
    it("should accept valid NODE_ENV values", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const validEnvs = ["development", "production", "test"];

      validEnvs.forEach(env => {
        process.env.NODE_ENV = env;
        const result = validateEnv();
        expect(result.isValid).toBe(true);
      });
    });

    it("should warn about invalid NODE_ENV value", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.NODE_ENV = "invalid";

      const result = validateEnv();

      expect(result.warnings).toContain(
        "NODE_ENV should be one of: development, production, test"
      );
    });
  });

  describe("PORT Validation", () => {
    it("should accept valid PORT number", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.PORT = "3000";

      const result = validateEnv();

      expect(result.isValid).toBe(true);
    });

    it("should warn about invalid PORT value", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.PORT = "not-a-number";

      const result = validateEnv();

      expect(result.warnings).toContain("PORT must be a valid number");
    });

    it("should warn about PORT out of valid range", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.PORT = "99999";

      const result = validateEnv();

      expect(result.warnings).toContain("PORT should be between 1 and 65535");
    });
  });

  describe("Validation Result Structure", () => {
    it("should return proper structure with all fields", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";

      const result = validateEnv();

      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("Multiple Errors", () => {
    it("should collect all validation errors", () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      const result = validateEnv();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors).toContain("DATABASE_URL is required");
      expect(result.errors).toContain("JWT_SECRET is required");
    });

    it("should collect both errors and warnings", () => {
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.JWT_SECRET = "test-secret-key-minimum-32-chars";
      process.env.NODE_ENV = "invalid";
      process.env.PORT = "not-a-number";

      const result = validateEnv();

      expect(result.isValid).toBe(true); // Warnings don't fail validation
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });
});

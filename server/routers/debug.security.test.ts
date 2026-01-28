/**
 * SEC-028: Debug Router Security Tests
 *
 * Verifies that all debug endpoints are properly protected:
 * 1. All endpoints require admin authentication (adminProcedure)
 * 2. All endpoints check assertDebugAllowed() before execution
 * 3. Debug router is not registered in production
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expected debug endpoints that should all use adminProcedure and assertDebugAllowed
 */
const EXPECTED_DEBUG_ENDPOINTS = [
  'rawMysqlTest',
  'drizzleTest',
  'leaderboardTableCheck',
  'checkDatabaseSchema',
  'checkLeaderboardTables',
  'dataDisplayDiagnostics',
  'getCounts',
] as const;

describe('SEC-028: Debug Router Security', () => {
  // Read the debug router source code for static analysis
  const debugRouterPath = path.join(__dirname, 'debug.ts');
  const debugRouterSource = fs.readFileSync(debugRouterPath, 'utf-8');

  describe('Property 1: All endpoints use adminProcedure', () => {
    it('should not use protectedProcedure in the debug router', () => {
      // protectedProcedure should not be used - all endpoints need admin access
      const hasProtectedProcedure = debugRouterSource.includes('protectedProcedure.query');
      expect(hasProtectedProcedure).toBe(false);
    });

    it('should not import protectedProcedure', () => {
      // Check that protectedProcedure is not imported
      const importLine = debugRouterSource.match(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/\_core\/trpc/);
      if (importLine) {
        expect(importLine[0]).not.toContain('protectedProcedure');
      }
    });

    it('should use adminProcedure for all endpoints', () => {
      // Count the number of adminProcedure.query usages
      const adminProcedureUsages = (debugRouterSource.match(/adminProcedure\.query/g) || []).length;

      // Should have at least as many adminProcedure usages as expected endpoints
      expect(adminProcedureUsages).toBeGreaterThanOrEqual(EXPECTED_DEBUG_ENDPOINTS.length);
    });

    EXPECTED_DEBUG_ENDPOINTS.forEach((endpoint) => {
      it(`should use adminProcedure for ${endpoint}`, () => {
        // Create a regex to find the endpoint definition
        const endpointPattern = new RegExp(`${endpoint}:\\s*adminProcedure\\.query`);
        expect(debugRouterSource).toMatch(endpointPattern);
      });
    });
  });

  describe('Property 2: All endpoints call assertDebugAllowed()', () => {
    it('should define assertDebugAllowed function', () => {
      expect(debugRouterSource).toContain('function assertDebugAllowed()');
    });

    it('should throw FORBIDDEN error when debug is disabled', () => {
      expect(debugRouterSource).toContain("code: 'FORBIDDEN'");
      expect(debugRouterSource).toContain('Debug endpoints are disabled in production');
    });

    EXPECTED_DEBUG_ENDPOINTS.forEach((endpoint) => {
      it(`should call assertDebugAllowed() in ${endpoint}`, () => {
        // Find the endpoint definition and check it calls assertDebugAllowed
        // This regex finds the endpoint and its immediate function body
        const endpointRegex = new RegExp(
          `${endpoint}:\\s*adminProcedure\\.query\\(async\\s*\\(\\)\\s*=>\\s*\\{[^}]*assertDebugAllowed\\(\\)`,
          's'
        );
        expect(debugRouterSource).toMatch(endpointRegex);
      });
    });
  });

  describe('Property 3: Production environment check', () => {
    it('should check isProduction for debug enabled flag', () => {
      expect(debugRouterSource).toContain('!env.isProduction');
    });

    it('should allow override via ENABLE_DEBUG_ENDPOINTS env var', () => {
      expect(debugRouterSource).toContain("ENABLE_DEBUG_ENDPOINTS === 'true'");
    });

    it('should default to disabled in production', () => {
      // The flag should be: !env.isProduction || ENABLE_DEBUG_ENDPOINTS === 'true'
      // Meaning: enabled by default in dev, disabled by default in prod
      expect(debugRouterSource).toMatch(/isDebugEnabled\s*=\s*!env\.isProduction/);
    });
  });

  describe('Property 4: Router registration security', () => {
    // Read the main routers.ts file
    const routersPath = path.join(__dirname, '..', 'routers.ts');
    const routersSource = fs.readFileSync(routersPath, 'utf-8');

    it('should conditionally load debug router based on NODE_ENV', () => {
      expect(routersSource).toContain("process.env.NODE_ENV !== \"production\"");
    });

    it('should use spread operator to conditionally include debug router', () => {
      expect(routersSource).toContain('...(debugRouter ? { debug: debugRouter } : {})');
    });

    it('should not register debug router in test environment', () => {
      expect(routersSource).toContain("process.env.NODE_ENV !== \"test\"");
    });

    it('should wrap debug router import in try-catch', () => {
      expect(routersSource).toContain('try {');
      expect(routersSource).toContain('debugRouter = require("./routers/debug").debugRouter');
      expect(routersSource).toContain('} catch {');
    });
  });

  describe('Property 5: SEC-028 documentation', () => {
    it('should have SEC-028 reference in file header', () => {
      expect(debugRouterSource).toContain('SEC-028:');
    });

    it('should document SEC-028 protection for each endpoint', () => {
      // Each endpoint should have a comment mentioning SEC-028
      const sec028Comments = (debugRouterSource.match(/SEC-028:/g) || []).length;
      // Header + assertDebugAllowed + each endpoint = at least 8 mentions
      expect(sec028Comments).toBeGreaterThanOrEqual(8);
    });
  });
});

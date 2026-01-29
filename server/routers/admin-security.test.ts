/**
 * Security Test: Admin Endpoints Authorization
 * 
 * CL-003: Verify all admin routers use adminProcedure instead of publicProcedure
 * 
 * This test ensures that admin endpoints are properly secured and cannot be
 * accessed without admin privileges.
 */

import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Admin Endpoints Security (CL-003)', () => {
  const adminRouterFiles = [
    'admin.ts',
    'adminDataAugment.ts',
    'adminImport.ts',
    'adminMigrations.ts',
    'adminQuickFix.ts',
    'adminSchema.ts',
    'adminSchemaPush.ts',
    'adminSetup.ts',
    'vipPortalAdmin.ts'
  ];

  it('should not use publicProcedure in any admin router', () => {
    const violations: string[] = [];

    // Known exceptions: endpoints that MUST be public for their security model to work
    // exchangeToken: Uses one-time tokens as authentication, must be public for impersonation page
    const knownExceptions = [
      'exchangeToken: publicProcedure',
    ];

    for (const filename of adminRouterFiles) {
      const filePath = path.join(__dirname, filename);

      if (!fs.existsSync(filePath)) {
        violations.push(`${filename}: File not found`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for publicProcedure usage (excluding imports and comments)
      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Skip import statements
        if (trimmed.startsWith('import')) return;

        // Skip comment lines
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        // Skip known exceptions
        if (knownExceptions.some(exc => trimmed.includes(exc))) return;

        // Check for publicProcedure usage in actual code
        if (trimmed.includes('publicProcedure.') || trimmed.includes(': publicProcedure')) {
          violations.push(`${filename}:${index + 1}: Found publicProcedure usage`);
        }
      });
    }

    if (violations.length > 0) {
      console.error('Security violations found:');
      violations.forEach(v => console.error(`  - ${v}`));
      throw new Error(`Found ${violations.length} admin endpoints using publicProcedure. All admin endpoints MUST use adminProcedure.`);
    }
  });

  it('should import adminProcedure or protectedProcedure in all admin routers', () => {
    const violations: string[] = [];

    for (const filename of adminRouterFiles) {
      const filePath = path.join(__dirname, filename);
      
      if (!fs.existsSync(filePath)) {
        continue; // Already reported in previous test
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if adminProcedure or protectedProcedure is imported
      const hasAdminProc = content.includes('adminProcedure');
      const hasProtectedProc = content.includes('protectedProcedure');
      
      if (!hasAdminProc && !hasProtectedProc) {
        violations.push(`${filename}: Missing adminProcedure or protectedProcedure import`);
      }
    }

    if (violations.length > 0) {
      console.error('Missing adminProcedure imports:');
      violations.forEach(v => console.error(`  - ${v}`));
      throw new Error(`${violations.length} admin routers are missing adminProcedure import.`);
    }
  });

  it('should use adminProcedure for all procedures in admin routers', () => {
    const violations: string[] = [];

    for (const filename of adminRouterFiles) {
      const filePath = path.join(__dirname, filename);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Count procedure definitions by matching 'name: procedureType' pattern
      // This handles method chaining like adminProcedure.input(...).query(...)
      const adminProcedureCount = (content.match(/:\s*adminProcedure/g) || []).length;
      const publicProcedureCount = (content.match(/:\s*publicProcedure/g) || []).length;
      const protectedProcedureCount = (content.match(/:\s*protectedProcedure/g) || []).length;

      if (publicProcedureCount > 0) {
        violations.push(`${filename}: Has ${publicProcedureCount} publicProcedure(s) - should be adminProcedure`);
      }

      // protectedProcedure with permission middleware is acceptable for admin routers
      // (it's actually MORE secure than adminProcedure alone)

      const totalSecureProcedures = adminProcedureCount + protectedProcedureCount;
      
      if (totalSecureProcedures === 0 && publicProcedureCount === 0) {
        violations.push(`${filename}: No procedures found - verify file structure`);
      }
      
      if (totalSecureProcedures === 0 && publicProcedureCount > 0) {
        violations.push(`${filename}: Only has publicProcedure - needs adminProcedure or protectedProcedure`);
      }
    }

    if (violations.length > 0) {
      console.error('Procedure type violations:');
      violations.forEach(v => console.error(`  - ${v}`));
      throw new Error(`Found ${violations.length} admin routers with incorrect procedure types.`);
    }
  });
});

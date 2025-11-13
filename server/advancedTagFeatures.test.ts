/**
 * Security Tests for Advanced Tag Features
 * 
 * Tests that SQL injection vulnerabilities are fixed in booleanTagSearch()
 * 
 * @module server/advancedTagFeatures.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('advancedTagFeatures - SQL Injection Security', () => {
  it('should not use string interpolation in SQL queries', () => {
    // Read the source file
    const filePath = path.join(__dirname, 'advancedTagFeatures.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Check for dangerous pattern: ${...map(t => `'${t}'`).join(',')}
    // This pattern indicates SQL injection vulnerability via string interpolation
    const dangerousPattern = /\$\{.*\.map\(.*=>\s*`'.*`\)\.join\(/g;
    const matches = fileContent.match(dangerousPattern);
    
    // This test will FAIL initially (Red phase of TDD)
    // After fixing the code, it should PASS (Green phase)
    expect(matches).toBeNull();
    
    if (matches) {
      console.error('Found SQL injection vulnerabilities:');
      console.error(matches);
      throw new Error(`Found ${matches.length} SQL injection vulnerability patterns. See console for details.`);
    }
  });

  it('should use inArray() for safe SQL queries with arrays', () => {
    // Check the helper file where the actual SQL queries are now located
    const helperPath = path.join(__dirname, 'tagSearchHelpers.ts');
    const helperContent = fs.readFileSync(helperPath, 'utf-8');
    
    // After the fix, the code should use inArray() instead of string interpolation
    // Check that inArray is imported from drizzle-orm
    expect(helperContent).toContain('inArray');
    
    // Check that the evaluateBooleanExpression function uses inArray for tag name queries
    const evaluateMatch = helperContent.match(/export async function evaluateBooleanExpression[\s\S]*?^}/m);
    
    if (evaluateMatch) {
      const functionBody = evaluateMatch[0];
      
      // The function should use inArray() with safe parameterized queries
      // It should NOT use sql template literals with string interpolation for user input
      const hasSafePattern = functionBody.includes('inArray');
      
      expect(hasSafePattern).toBe(true);
    }
  });

  it('should not have SQL template literals with .map() in tag queries', () => {
    // Check the helper file where the actual SQL queries are now located
    const helperPath = path.join(__dirname, 'tagSearchHelpers.ts');
    const helperContent = fs.readFileSync(helperPath, 'utf-8');
    
    // Extract the evaluateBooleanExpression function
    const lines = helperContent.split('\n');
    const vulnerableLines: number[] = [];
    
    lines.forEach((line, index) => {
      // Check for the specific vulnerable pattern on lines 94, 121, 143
      if (line.includes('sql`') && line.includes('.map(') && line.includes('tags.name')) {
        vulnerableLines.push(index + 1); // Line numbers are 1-indexed
      }
    });
    
    // Initially this will fail (lines 94, 121, 143 are vulnerable)
    // After fix, this should pass (no vulnerable lines)
    expect(vulnerableLines).toEqual([]);
    
    if (vulnerableLines.length > 0) {
      console.error(`Found SQL injection vulnerabilities on lines: ${vulnerableLines.join(', ')}`);
      throw new Error(`SQL injection vulnerabilities found on ${vulnerableLines.length} lines`);
    }
  });
});

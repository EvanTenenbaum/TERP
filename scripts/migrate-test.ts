#!/usr/bin/env tsx
/**
 * TypeScript Test Migration Tool
 * 
 * Migrates test files from old database mocking pattern to new testDb utility
 * Uses ts-morph for safe, type-aware AST transformations
 */

import { Project, SyntaxKind, SourceFile, CallExpression } from "ts-morph";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface MigrationResult {
  success: boolean;
  file: string;
  changes: string[];
  errors: string[];
  testsPass: boolean;
}

class TestMigrator {
  private project: Project;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
    });
  }

  /**
   * Migrate a single test file
   */
  migrate(filePath: string, dryRun: boolean = false): MigrationResult {
    const result: MigrationResult = {
      success: false,
      file: filePath,
      changes: [],
      errors: [],
      testsPass: false,
    };

    try {
      // Create backup
      if (!dryRun) {
        fs.copyFileSync(filePath, `${filePath}.backup`);
        result.changes.push("Created backup");
      }

      // Load source file
      const sourceFile = this.project.addSourceFileAtPath(filePath);

      // Apply transformations
      this.addImports(sourceFile, result);
      this.transformMockSetup(sourceFile, result);
      this.transformMockImplementations(sourceFile, result);

      if (dryRun) {
        console.log("\n=== DRY RUN: Changes Preview ===");
        console.log(sourceFile.getFullText());
        result.success = true;
        return result;
      }

      // Save changes
      sourceFile.saveSync();
      result.changes.push("Saved transformed file");

      // Run tests
      try {
        const testFileName = path.basename(filePath);
        execSync(`pnpm test ${testFileName}`, {
          cwd: process.cwd(),
          stdio: "pipe",
          timeout: 30000,
        });
        result.testsPass = true;
        result.changes.push("Tests passed");
        
        // Remove backup on success
        fs.unlinkSync(`${filePath}.backup`);
        result.success = true;
      } catch (testError: unknown) {
        result.errors.push(`Tests failed: ${testError instanceof Error ? testError.message : String(testError)}`);
        result.testsPass = false;
        
        // Rollback on test failure
        fs.copyFileSync(`${filePath}.backup`, filePath);
        result.errors.push("Rolled back changes");
      }
    } catch (error: unknown) {
      result.errors.push(`Migration error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Rollback on error
      if (fs.existsSync(`${filePath}.backup`)) {
        fs.copyFileSync(`${filePath}.backup`, filePath);
        result.errors.push("Rolled back changes");
      }
    }

    return result;
  }

  /**
   * Add testDb imports if not present
   */
  private addImports(sourceFile: SourceFile, result: MigrationResult): void {
    const existingImports = sourceFile.getImportDeclarations();
    const hasTestDbImport = existingImports.some(
      (imp) => imp.getModuleSpecifierValue().includes("test-utils/testDb")
    );

    if (!hasTestDbImport) {
      // Find the relative path to test-utils
      const filePath = sourceFile.getFilePath();
      const relativePath = this.getRelativePathToTestUtils(filePath);

      sourceFile.addImportDeclaration({
        moduleSpecifier: relativePath,
        namedImports: ["setupDbMock", "createMockDb", "mockSelectQuery"],
      });
      result.changes.push("Added testDb imports");
    }
  }

  /**
   * Transform vi.mock setup from old pattern to new
   */
  private transformMockSetup(sourceFile: SourceFile, result: MigrationResult): void {
    const mockCalls = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((call) => {
        const expr = call.getExpression();
        return (
          expr.getKind() === SyntaxKind.PropertyAccessExpression &&
          expr.getText() === "vi.mock"
        );
      });

    mockCalls.forEach((mockCall) => {
      const args = mockCall.getArguments();
      if (args.length >= 1) {
        const firstArg = args[0].getText();
        
        // Check if it's mocking the db module
        if (firstArg.includes('"../db"') || firstArg.includes("'../db'")) {
          // Replace the second argument with setupDbMock()
          if (args.length >= 2) {
            mockCall.removeArgument(1);
            mockCall.addArgument("() => setupDbMock()");
            result.changes.push("Transformed vi.mock setup for db");
          }
        }
      }
    });
  }

  /**
   * Transform mock implementations (select, insert, update, delete)
   */
  private transformMockImplementations(sourceFile: SourceFile, result: MigrationResult): void {
    // This is a simplified version - in practice, you'd need more sophisticated
    // pattern matching to handle all the different mocking patterns
    
    // Find patterns like: (db.select as any).mockReturnValue(...)
    const mockReturnValueCalls = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((call) => {
        const expr = call.getExpression();
        return expr.getText().includes("mockReturnValue") || 
               expr.getText().includes("mockImplementation");
      });

    // Add comment suggesting manual review for complex mocks
    if (mockReturnValueCalls.length > 0) {
      result.changes.push(
        `Found ${mockReturnValueCalls.length} mock implementations - may need manual review`
      );
    }
  }

  /**
   * Get relative path from test file to test-utils
   */
  private getRelativePathToTestUtils(filePath: string): string {
    const fileDir = path.dirname(filePath);
    const testUtilsPath = path.join(process.cwd(), "server", "test-utils");
    const relativePath = path.relative(fileDir, testUtilsPath);
    return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const files = args.filter((arg) => !arg.startsWith("--"));

  if (files.length === 0) {
    console.error("Usage: tsx migrate-test.ts [--dry-run] <test-file-path>");
    process.exit(1);
  }

  const migrator = new TestMigrator();

  for (const file of files) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Migrating: ${file}`);
    console.log("=".repeat(60));

    const result = migrator.migrate(file, dryRun);

    console.log(`\nStatus: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Tests: ${result.testsPass ? "✅ PASS" : "❌ FAIL"}`);

    if (result.changes.length > 0) {
      console.log("\nChanges:");
      result.changes.forEach((change) => console.log(`  - ${change}`));
    }

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach((error) => console.log(`  - ${error}`));
    }
  }
}

main().catch(console.error);

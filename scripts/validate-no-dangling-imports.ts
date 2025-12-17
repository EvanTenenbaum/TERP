#!/usr/bin/env npx tsx
/**
 * Validate No Dangling Imports
 *
 * This script searches for imports of deleted files to ensure
 * no dangling references exist in the codebase.
 *
 * Usage: pnpm validate:imports
 *
 * Validates: Requirements 5.3 (Orphan Feature Linkage Cleanup)
 */

import * as fs from "fs";
import * as path from "path";

// Known deleted files that should not be imported
const DELETED_FILES = [
  "DebugOrders",
  "DebugOrders.tsx",
  "client/src/pages/DebugOrders",
];

// Directories to search
const SEARCH_DIRS = ["client/src", "server"];

// File extensions to check
const FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

interface DanglingImport {
  file: string;
  line: number;
  importStatement: string;
  deletedFile: string;
}

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules
    if (entry.name === "node_modules") continue;

    if (entry.isDirectory()) {
      files.push(...findSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      FILE_EXTENSIONS.some(ext => entry.name.endsWith(ext))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function findDanglingImports(): DanglingImport[] {
  const danglingImports: DanglingImport[] = [];

  for (const dir of SEARCH_DIRS) {
    const files = findSourceFiles(dir);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Check for import statements
        if (line.includes("import") || line.includes("require")) {
          for (const deletedFile of DELETED_FILES) {
            if (line.includes(deletedFile)) {
              danglingImports.push({
                file,
                line: index + 1,
                importStatement: line.trim(),
                deletedFile,
              });
            }
          }
        }
      });
    }
  }

  return danglingImports;
}

function main(): void {
  console.log("🔍 Checking for dangling imports...\n");

  const danglingImports = findDanglingImports();

  if (danglingImports.length === 0) {
    console.log("✅ No dangling imports found!");
    console.log(`   Checked for imports of: ${DELETED_FILES.join(", ")}`);
    process.exit(0);
  } else {
    console.log(`❌ Found ${danglingImports.length} dangling import(s):\n`);

    danglingImports.forEach(di => {
      console.log(`  📁 ${di.file}:${di.line}`);
      console.log(`     Import: ${di.importStatement}`);
      console.log(`     References deleted file: ${di.deletedFile}\n`);
    });

    console.log("\n⚠️  Please remove these imports before committing.");
    process.exit(1);
  }
}

main();

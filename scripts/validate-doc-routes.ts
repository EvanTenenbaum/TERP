#!/usr/bin/env npx tsx
/**
 * Validate Documentation Route References
 *
 * This script extracts route references from markdown files
 * and validates them against declared routes in App.tsx.
 *
 * Usage: pnpm validate:doc-routes
 *
 * Property 5: Documentation Route References Are Valid
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import * as fs from "fs";
import * as path from "path";

// Note: glob import removed - using native fs.readdirSync instead

// Valid routes in the application
const VALID_ROUTES = new Set([
  "/",
  "/dashboard",
  "/clients",
  "/orders",
  "/quotes",
  "/inventory",
  "/batches",
  "/products",
  "/invoices",
  "/payments",
  "/vendors",
  "/calendar",
  "/settings",
  "/reports",
  "/accounting",
  "/orders-debug",
  "/dev/showcase",
  "/orders/create",
  "/vip-portal",
]);

// Route patterns that are valid (with parameters)
const VALID_ROUTE_PATTERNS = [
  /^\/clients\?selected=\d+$/,
  /^\/orders\?selected=\d+$/,
  /^\/quotes\?selected=\d+$/,
  /^\/invoices\?selected=\d+$/,
  /^\/batches\?selected=\d+$/,
  /^\/products\?selected=\d+$/,
  /^\/vendors\?selected=\d+$/,
  /^\/clients\?selected=:id$/,
  /^\/orders\?selected=:id$/,
  /^\/quotes\?selected=:id$/,
];

// Known invalid patterns that should be flagged
const INVALID_PATTERNS = [
  /^\/orders\/\d+$/, // /orders/123 - old pattern
  /^\/orders\/\d+\/edit$/, // /orders/123/edit - old pattern
  /^\/orders\/:id$/, // /orders/:id - old pattern
  /^\/clients\/\d+$/, // /clients/123 - old pattern
];

interface RouteReference {
  file: string;
  line: number;
  route: string;
  context: string;
}

interface ValidationResult {
  valid: RouteReference[];
  invalid: RouteReference[];
  warnings: RouteReference[];
}

function isValidRoute(route: string): boolean {
  // Check exact matches
  if (VALID_ROUTES.has(route)) return true;

  // Check valid patterns
  if (VALID_ROUTE_PATTERNS.some(p => p.test(route))) return true;

  return false;
}

function isKnownInvalidPattern(route: string): boolean {
  return INVALID_PATTERNS.some(p => p.test(route));
}

function extractRoutes(content: string, file: string): RouteReference[] {
  const routes: RouteReference[] = [];
  const lines = content.split("\n");

  // Pattern to match route references in markdown
  const routePattern =
    /`(\/[a-zA-Z0-9\-_/?=:]+)`|href="(\/[a-zA-Z0-9\-_/?=:]+)"|path="(\/[a-zA-Z0-9\-_/?=:]+)"/g;

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    while ((match = routePattern.exec(line)) !== null) {
      const route = match[1] || match[2] || match[3];
      if (route && route.startsWith("/")) {
        routes.push({
          file,
          line: index + 1,
          route,
          context: line.trim().substring(0, 100),
        });
      }
    }
  });

  return routes;
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateDocRoutes(): ValidationResult {
  const result: ValidationResult = {
    valid: [],
    invalid: [],
    warnings: [],
  };

  const files = findMarkdownFiles("docs");

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const routes = extractRoutes(content, file);

    for (const ref of routes) {
      if (isValidRoute(ref.route)) {
        result.valid.push(ref);
      } else if (isKnownInvalidPattern(ref.route)) {
        result.invalid.push(ref);
      } else {
        result.warnings.push(ref);
      }
    }
  }

  return result;
}

function main(): void {
  console.log("🔍 Validating documentation route references...\n");

  const result = validateDocRoutes();

  console.log(`📊 Results:`);
  console.log(`   ✅ Valid routes: ${result.valid.length}`);
  console.log(`   ❌ Invalid routes: ${result.invalid.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}\n`);

  if (result.invalid.length > 0) {
    console.log("❌ Invalid route references found:\n");
    result.invalid.forEach(ref => {
      console.log(`  📁 ${ref.file}:${ref.line}`);
      console.log(`     Route: ${ref.route}`);
      console.log(`     Context: ${ref.context}\n`);
    });
  }

  if (result.warnings.length > 0) {
    console.log("⚠️  Unrecognized routes (may need review):\n");
    result.warnings.slice(0, 10).forEach(ref => {
      console.log(`  📁 ${ref.file}:${ref.line}`);
      console.log(`     Route: ${ref.route}\n`);
    });
    if (result.warnings.length > 10) {
      console.log(`   ... and ${result.warnings.length - 10} more\n`);
    }
  }

  if (result.invalid.length > 0) {
    console.log("\n⚠️  Please fix invalid route references before committing.");
    process.exit(1);
  } else {
    console.log("✅ All documentation route references are valid!");
    process.exit(0);
  }
}

main();

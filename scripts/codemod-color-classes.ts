#!/usr/bin/env tsx
/**
 * TER-1240: Codemod to replace raw Tailwind color classes with semantic variants
 *
 * This script performs the following transformations:
 * 1. Replace Badge components with raw colors → semantic Badge variants
 * 2. Replace common status color patterns → CSS vars
 * 3. Replace background/text colors with semantic equivalents
 *
 * Usage: tsx scripts/codemod-color-classes.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

interface Replacement {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

// Badge variant mappings
const badgeReplacements: Replacement[] = [
  // Success states (green backgrounds)
  {
    pattern: /className=["']([^"']*bg-green-(?:50|100|200)[^"']*)["']/g,
    replacement: 'variant="success" className="$1"',
    description: "Badge with green background → success variant",
  },
  // Warning states (yellow/orange backgrounds)
  {
    pattern: /className=["']([^"']*bg-(?:yellow|orange)-(?:50|100|200)[^"']*)["']/g,
    replacement: 'variant="warning" className="$1"',
    description: "Badge with yellow/orange background → warning variant",
  },
  // Info states (blue backgrounds)
  {
    pattern: /className=["']([^"']*bg-blue-(?:50|100|200)[^"']*)["']/g,
    replacement: 'variant="info" className="$1"',
    description: "Badge with blue background → info variant",
  },
  // Muted states (gray backgrounds)
  {
    pattern: /className=["']([^"']*bg-gray-(?:50|100|200)[^"']*)["']/g,
    replacement: 'variant="muted" className="$1"',
    description: "Badge with gray background → muted variant",
  },
];

// General color replacements
const colorReplacements: Replacement[] = [
  // Success colors (green)
  {
    pattern: /bg-green-(?:50|100)\s/g,
    replacement: "bg-[var(--success-bg)] ",
    description: "Green background → success-bg var",
  },
  {
    pattern: /text-green-(?:600|700|800)\s/g,
    replacement: "text-[var(--success)] ",
    description: "Green text → success var",
  },
  // Warning colors (yellow/orange)
  {
    pattern: /bg-(?:yellow|orange)-(?:50|100)\s/g,
    replacement: "bg-[var(--warning-bg)] ",
    description: "Yellow/orange background → warning-bg var",
  },
  {
    pattern: /text-(?:yellow|orange)-(?:600|700|800)\s/g,
    replacement: "text-[var(--warning)] ",
    description: "Yellow/orange text → warning var",
  },
  // Info colors (blue)
  {
    pattern: /bg-blue-(?:50|100)\s/g,
    replacement: "bg-[var(--info-bg)] ",
    description: "Blue background → info-bg var",
  },
  {
    pattern: /text-blue-(?:600|700|800)\s/g,
    replacement: "text-[var(--info)] ",
    description: "Blue text → info var",
  },
];

function applyReplacements(
  content: string,
  replacements: Replacement[]
): { content: string; changes: string[] } {
  let result = content;
  const changes: string[] = [];

  for (const { pattern, replacement, description } of replacements) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      result = result.replace(pattern, replacement as string);
      changes.push(`  - ${description} (${matches.length} occurrences)`);
    }
  }

  return { content: result, changes };
}

function cleanupBadgeClassName(content: string): string {
  // Remove now-redundant color classes from Badge className after variant is set
  return content.replace(
    /variant="(?:success|warning|info|muted)" className="([^"]*)bg-(?:green|yellow|orange|blue|gray)-\d+([^"]*)"/g,
    (match, before, after) => {
      const cleaned = `${before}${after}`.replace(/\s+/g, " ").trim();
      return cleaned
        ? `variant="${match.split('"')[1]}" className="${cleaned}"`
        : `variant="${match.split('"')[1]}"`;
    }
  );
}

function processFile(filePath: string, dryRun: boolean): number {
  const originalContent = readFileSync(filePath, "utf-8");
  let content = originalContent;
  const allChanges: string[] = [];

  // Apply Badge replacements (only in Badge components)
  if (content.includes("<Badge") || content.includes("Badge variant=")) {
    const badgeResult = applyReplacements(content, badgeReplacements);
    content = badgeResult.content;
    allChanges.push(...badgeResult.changes);

    // Clean up redundant className attributes
    content = cleanupBadgeClassName(content);
  }

  // Apply general color replacements
  const colorResult = applyReplacements(content, colorReplacements);
  content = colorResult.content;
  allChanges.push(...colorResult.changes);

  if (content !== originalContent) {
    console.log(`\n📝 ${filePath}`);
    allChanges.forEach((change) => console.log(change));

    if (!dryRun) {
      writeFileSync(filePath, content, "utf-8");
      console.log("  ✅ Applied changes");
    } else {
      console.log("  🔍 Dry run - no changes written");
    }

    return 1;
  }

  return 0;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("🎨 TER-1240: Color Class Codemod");
  console.log("================================");
  console.log(dryRun ? "🔍 DRY RUN MODE\n" : "✨ LIVE MODE\n");

  // Find all TypeScript/TSX files in client/src
  const files = globSync("client/src/**/*.{ts,tsx}", {
    cwd: repoRoot,
    absolute: true,
    ignore: ["**/node_modules/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
  });

  console.log(`Found ${files.length} files to process\n`);

  let filesChanged = 0;
  for (const file of files) {
    filesChanged += processFile(file, dryRun);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Summary: ${filesChanged} files modified`);

  if (dryRun) {
    console.log("\n💡 Run without --dry-run to apply changes");
  } else {
    console.log("\n✅ Changes applied successfully");
    console.log("\nNext steps:");
    console.log("  1. Run: git add -p  (review changes interactively)");
    console.log("  2. Verify: pnpm check && pnpm build");
    console.log("  3. Count remaining: grep -roE 'bg-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|lime)-[0-9]+' client/ | wc -l");
  }
}

main();

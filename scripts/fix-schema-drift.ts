/**
 * Schema Drift Fix Generator
 *
 * Reads validation report and generates fix recommendations
 * Usage: pnpm fix:schema:report
 */

import * as fs from "fs/promises";
import * as path from "path";

interface ValidationIssue {
  table: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  category: string;
  column: string;
  dbValue: unknown;
  drizzleValue: unknown;
  description: string;
}

interface ValidationReport {
  timestamp: string;
  totalTables: number;
  totalColumns: number;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  criticalTables: Record<string, ValidationIssue[]>;
  allIssues: ValidationIssue[];
}

const CRITICAL_TABLES = [
  "inventory_movements",
  "order_status_history",
  "invoices",
  "ledger_entries",
  "payments",
  "client_activity",
];

async function generateFixes() {
  console.log("🔧 Generating schema drift fix recommendations...\n");

  // Read validation report
  const reportPath = path.join(process.cwd(), "schema-validation-report.json");

  try {
    const reportData = await fs.readFile(reportPath, "utf-8");
    const report: ValidationReport = JSON.parse(reportData);

    console.log(
      `📊 Loaded validation report from ${new Date(report.timestamp).toLocaleString()}`
    );
    console.log(`   Total Issues: ${report.totalIssues}\n`);

    // Generate markdown report
    let markdown = `# Schema Drift Fix Recommendations\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Based on validation:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `Total issues found: ${report.totalIssues}\n\n`;
    markdown += `### Issues by Severity\n\n`;
    for (const [severity, count] of Object.entries(report.issuesBySeverity)) {
      if (count > 0) {
        markdown += `- **${severity}:** ${count}\n`;
      }
    }
    markdown += `\n`;

    // Critical Tables Section
    markdown += `## Critical Tables (Priority Fixes)\n\n`;
    markdown += `These tables must be fixed before Phase 2 seeding can proceed.\n\n`;

    for (const tableName of CRITICAL_TABLES) {
      const issues = report.criticalTables[tableName] || [];

      if (issues.length === 0) {
        markdown += `### ✅ ${tableName}\n\nNo issues found.\n\n`;
        continue;
      }

      markdown += `### 🔴 ${tableName}\n\n`;
      markdown += `**Issues:** ${issues.length}\n\n`;

      // Group by category
      const byCategory = issues.reduce(
        (acc, issue) => {
          if (!acc[issue.category]) acc[issue.category] = [];
          acc[issue.category].push(issue);
          return acc;
        },
        {} as Record<string, ValidationIssue[]>
      );

      for (const [category, categoryIssues] of Object.entries(byCategory)) {
        markdown += `#### ${category} Issues (${categoryIssues.length})\n\n`;

        for (const issue of categoryIssues) {
          markdown += `**Column:** \`${issue.column}\`\n\n`;
          markdown += `- **Problem:** ${issue.description}\n`;
          markdown += `- **Database Value:** \`${JSON.stringify(issue.dbValue)}\`\n`;
          markdown += `- **Drizzle Value:** \`${JSON.stringify(issue.drizzleValue)}\`\n`;
          markdown += `- **Severity:** ${issue.severity}\n\n`;

          // Generate fix recommendation
          if (category === "Missing") {
            markdown += `**Recommended Fix:**\n\`\`\`typescript\n`;
            markdown += `// Add this column to the ${tableName} table definition:\n`;
            markdown += `${issue.column}: ${issue.dbValue}('${issue.column}'),\n`;
            markdown += `\`\`\`\n\n`;
          } else if (category === "DataType") {
            markdown += `**Recommended Fix:**\n\`\`\`typescript\n`;
            markdown += `// Update column type from ${issue.drizzleValue} to ${issue.dbValue}\n`;
            markdown += `${issue.column}: ${issue.dbValue}('${issue.column}'),\n`;
            markdown += `\`\`\`\n\n`;
          } else if (category === "Nullable") {
            const shouldBeNullable = issue.dbValue === true;
            markdown += `**Recommended Fix:**\n\`\`\`typescript\n`;
            if (shouldBeNullable) {
              markdown += `// Remove .notNull() from ${issue.column}\n`;
            } else {
              markdown += `// Add .notNull() to ${issue.column}\n`;
            }
            markdown += `\`\`\`\n\n`;
          }

          markdown += `---\n\n`;
        }
      }
    }

    // All other issues
    const otherIssues = report.allIssues.filter(
      i => !CRITICAL_TABLES.includes(i.table)
    );

    if (otherIssues.length > 0) {
      markdown += `## Other Tables (${otherIssues.length} issues)\n\n`;
      markdown += `These issues should be addressed after critical tables are fixed.\n\n`;

      const byTable = otherIssues.reduce(
        (acc, issue) => {
          if (!acc[issue.table]) acc[issue.table] = [];
          acc[issue.table].push(issue);
          return acc;
        },
        {} as Record<string, ValidationIssue[]>
      );

      for (const [tableName, tableIssues] of Object.entries(byTable)) {
        markdown += `### ${tableName} (${tableIssues.length} issues)\n\n`;
        for (const issue of tableIssues.slice(0, 5)) {
          markdown += `- **${issue.column}**: ${issue.description}\n`;
        }
        if (tableIssues.length > 5) {
          markdown += `\n_... and ${tableIssues.length - 5} more issues_\n`;
        }
        markdown += `\n`;
      }
    }

    // Implementation checklist
    markdown += `## Implementation Checklist\n\n`;
    markdown += `- [ ] Review all critical table fixes above\n`;
    markdown += `- [ ] Apply fixes to \`drizzle/schema.ts\`\n`;
    markdown += `- [ ] Add comment: \`// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)\`\n`;
    markdown += `- [ ] Run \`pnpm validate:schema:fixes\` to verify\n`;
    markdown += `- [ ] Commit changes\n`;
    markdown += `- [ ] Proceed to Phase 2 seeding\n\n`;

    // Write report
    const fixesPath = path.join(process.cwd(), "SCHEMA_DRIFT_FIXES.md");
    await fs.writeFile(fixesPath, markdown);

    console.log(`✅ Fix recommendations saved to: SCHEMA_DRIFT_FIXES.md\n`);
    console.log(`📋 Next steps:`);
    console.log(`   1. Review SCHEMA_DRIFT_FIXES.md`);
    console.log(`   2. Apply fixes to drizzle/schema.ts`);
    console.log(`   3. Run: pnpm validate:schema:fixes\n`);
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      console.error("❌ Validation report not found!");
      console.error("   Run: pnpm validate:schema first\n");
      process.exit(1);
    }
    throw error;
  }
}

generateFixes().catch(error => {
  console.error("❌ Failed to generate fixes:", error);
  process.exit(1);
});

import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import { checkSchemaFingerprint } from "../../server/autoMigrate";

const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  "docs",
  "audits",
  "schema-fingerprint-report.json"
);

function maskDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "not-set";
  return rawUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");

  const result = await checkSchemaFingerprint({ retries: 2 });
  const report = {
    checkedAt: new Date().toISOString(),
    database: maskDatabaseUrl(process.env.DATABASE_URL),
    complete: result.complete,
    passedChecks: result.count,
    totalChecks: result.checks.length,
    missingChecks: result.missingChecks,
    checks: result.checks,
    attempts: result.attempts,
    lastError: result.lastError ?? null,
  };

  fs.mkdirSync(path.dirname(DEFAULT_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    DEFAULT_OUTPUT_PATH,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.info("Schema fingerprint report generated:");
  console.info(`- Output: ${DEFAULT_OUTPUT_PATH}`);
  console.info(
    `- Result: ${report.passedChecks}/${report.totalChecks} checks passed (${report.complete ? "complete" : "incomplete"})`
  );

  if (report.missingChecks.length > 0) {
    console.info("- Missing checks:");
    for (const check of report.missingChecks) {
      console.info(`  - ${check}`);
    }
  }

  if (strict && !report.complete) {
    console.error(
      "Strict mode failed: schema fingerprint is incomplete. Review report and reconcile before deploy."
    );
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error("Failed to generate schema fingerprint report:", error);
  process.exit(1);
});

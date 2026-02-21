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

function parseOptionalChecks(args: string[]): Set<string> {
  const argValue = args
    .find(arg => arg.startsWith("--optional-checks="))
    ?.split("=", 2)[1];
  const envValue = process.env.SCHEMA_FINGERPRINT_OPTIONAL_CHECKS;

  return new Set(
    [argValue, envValue]
      .filter((value): value is string => Boolean(value))
      .flatMap(value => value.split(","))
      .map(value => value.trim())
      .filter(Boolean)
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  // Keep strict behavior, but allow explicitly-configured optional checks for
  // environment-specific canaries (for example ops-only tables not present locally).
  const optionalChecks = parseOptionalChecks(args);

  const result = await checkSchemaFingerprint({ retries: 2 });
  const requiredChecks = result.checks.filter(
    check => !optionalChecks.has(check.key)
  );
  const missingRequiredChecks = requiredChecks
    .filter(check => !check.passed)
    .map(check => check.key);
  const requiredPassedChecks = requiredChecks.filter(check => check.passed).length;
  const complete = requiredChecks.length > 0 && missingRequiredChecks.length === 0;

  const report = {
    checkedAt: new Date().toISOString(),
    database: maskDatabaseUrl(process.env.DATABASE_URL),
    complete,
    passedChecks: result.count,
    totalChecks: result.checks.length,
    missingChecks: result.missingChecks,
    requiredPassedChecks,
    requiredTotalChecks: requiredChecks.length,
    missingRequiredChecks,
    optionalChecks: Array.from(optionalChecks).sort(),
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
    `- Result: ${report.requiredPassedChecks}/${report.requiredTotalChecks} required checks passed (${report.complete ? "complete" : "incomplete"})`
  );
  console.info(
    `- Raw result: ${report.passedChecks}/${report.totalChecks} checks passed`
  );

  if (report.optionalChecks.length > 0) {
    console.info("- Optional checks:");
    for (const check of report.optionalChecks) {
      console.info(`  - ${check}`);
    }
  }

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

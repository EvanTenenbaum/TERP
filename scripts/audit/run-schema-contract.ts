import { execSync } from "child_process";
import { loadAuditEnv } from "../_lib/loadAuditEnv";

function runCommand(
  command: string,
  env: Record<string, string | undefined> = process.env
): void {
  console.info(`\n$ ${command}`);
  execSync(command, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });
}

async function main(): Promise<void> {
  const schemaOnlyEnv = { ...process.env };
  delete schemaOnlyEnv.DATABASE_URL;
  delete schemaOnlyEnv.TEST_DATABASE_URL;

  runCommand("pnpm test:schema", schemaOnlyEnv);
  console.info("✓ Completed: pnpm test:schema");

  const envResult = loadAuditEnv();

  console.info("============================================");
  console.info("SCHEMA AUDIT CONTRACT");
  console.info("============================================");
  console.info(
    `DATABASE_URL present: ${envResult.databaseUrlPresent ? "yes" : "no"}`
  );
  if (envResult.loadedFrom.length > 0) {
    console.info("Loaded env from:");
    for (const sourcePath of envResult.loadedFrom) {
      console.info(`- ${sourcePath}`);
    }
  }

  if (!envResult.databaseUrlPresent) {
    throw new Error(
      "DATABASE_URL is not available. Set it directly or provide TERP_AUDIT_ENV_FILE."
    );
  }

  runCommand("pnpm audit:schema-drift:strict");
  console.info("✓ Completed: pnpm audit:schema-drift:strict");
  runCommand("pnpm audit:schema-fingerprint:strict");
  console.info("✓ Completed: pnpm audit:schema-fingerprint:strict");

  console.info("\nSchema audit contract completed successfully.");
  process.exit(0);
}

main().catch(error => {
  console.error("Schema audit contract failed:", error);
  process.exit(1);
});

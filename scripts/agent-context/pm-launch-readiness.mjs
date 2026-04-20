import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateContext, getRepoRoot, validateContextBundle } from "./generate-agent-context.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publisherScriptPath = path.join(__dirname, "pm-publisher.mjs");
const installServicesScriptPath = path.join(__dirname, "install-pm-services.mjs");

function parseArgs(argv) {
  const options = {
    repoRoot: undefined,
    skipLinear: true,
    skipPmTests: false,
    skipScriptLint: false,
    skipRefresh: false,
    skipPublishSmoke: false,
    skipServiceSmoke: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--with-linear") {
      options.skipLinear = false;
      continue;
    }
    if (arg === "--skip-pm-tests") {
      options.skipPmTests = true;
      continue;
    }
    if (arg === "--skip-script-lint") {
      options.skipScriptLint = true;
      continue;
    }
    if (arg === "--skip-refresh") {
      options.skipRefresh = true;
      continue;
    }
    if (arg === "--skip-publish-smoke") {
      options.skipPublishSmoke = true;
      continue;
    }
    if (arg === "--skip-service-smoke") {
      options.skipServiceSmoke = true;
      continue;
    }
  }

  return options;
}

function executeStep({ name, summary, command, args, cwd }) {
  const startedAt = Date.now();

  try {
    const stdout = execFileSync(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return {
      name,
      summary,
      status: "passed",
      duration_ms: Date.now() - startedAt,
      stdout: stdout.trim(),
    };
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : Buffer.from(error.stderr || "").toString("utf8").trim();
    const stdout = typeof error.stdout === "string" ? error.stdout.trim() : Buffer.from(error.stdout || "").toString("utf8").trim();
    const wrappedError = new Error(`${name} failed`);
    wrappedError.step = {
      name,
      summary,
      status: "failed",
      duration_ms: Date.now() - startedAt,
      stdout,
      stderr,
      exit_code: Number.isInteger(error.status) ? error.status : 1,
    };
    throw wrappedError;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = getRepoRoot(options.repoRoot);
  const cleanupDirs = [];
  const checks = [];

  try {
    if (!options.skipScriptLint) {
      checks.push(
        executeStep({
          name: "pm-script-lint",
          summary: "Lint PM runtime scripts only.",
          command: "pnpm",
          args: ["run", "pm:script:lint"],
          cwd: repoRoot,
        }),
      );
    }

    if (!options.skipPmTests) {
      checks.push(
        executeStep({
          name: "pm-tests",
          summary: "Run the targeted persistent-PM test suite.",
          command: "pnpm",
          args: ["run", "pm:test"],
          cwd: repoRoot,
        }),
      );
    }

    if (!options.skipRefresh) {
      const bundle = await generateContext({
        repoRoot,
        reason: "pm-launch-readiness",
        skipLinear: options.skipLinear,
      });
      checks.push({
        name: "context-refresh",
        summary: "Regenerate the PM bundle and shared live mirror.",
        status: "passed",
        duration_ms: 0,
        freshness: bundle.state.freshness.status,
        git_sha: bundle.state.git.head,
      });
    }

    const validation = await validateContextBundle({
      repoRoot,
      skipLinear: options.skipLinear,
    });
    if (validation.problems.length) {
      const error = new Error("context-check failed");
      error.step = {
        name: "context-check",
        summary: "Validate PM freshness, hashes, and redirect guards.",
        status: "failed",
        duration_ms: 0,
        problems: validation.problems,
        warnings: validation.warnings,
      };
      throw error;
    }
    checks.push({
      name: "context-check",
      summary: "Validate PM freshness, hashes, and redirect guards.",
      status: "passed",
      duration_ms: 0,
      warnings: validation.warnings,
    });

    if (!options.skipPublishSmoke) {
      const outputDir = mkdtempSync(path.join(os.tmpdir(), "terp-pm-launch-check-publish-"));
      cleanupDirs.push(outputDir);
      checks.push(
        executeStep({
          name: "publish-smoke",
          summary: "Smoke-check PM public mirror publishing.",
          command: process.execPath,
          args: [publisherScriptPath, "--repo-root", repoRoot, "--output-dir", outputDir, "--debounce-seconds", "0"],
          cwd: repoRoot,
        }),
      );
    }

    if (!options.skipServiceSmoke) {
      const outputDir = mkdtempSync(path.join(os.tmpdir(), "terp-pm-launch-check-launchd-"));
      cleanupDirs.push(outputDir);
      checks.push(
        executeStep({
          name: "service-install-smoke",
          summary: "Dry-run launchd/service install for the PM runtime.",
          command: process.execPath,
          args: [installServicesScriptPath, "--repo-root", repoRoot, "--dry-run", "--output-dir", outputDir],
          cwd: repoRoot,
        }),
      );
    }

    console.info(
      JSON.stringify(
        {
          status: "ready",
          repoRoot,
          launch_scope: "persistent-pm",
          broader_repo_health: "not-evaluated",
          checks,
          guidance: [
            "PM launch readiness is intentionally scoped to the persistent-PM system.",
            "Unrelated TERP webapp unit, build, or broader repo failures do not block PM launch or PM-assisted repair work.",
            "Use full repo verification only when shipping app changes, not when deciding whether the PM runtime itself can launch.",
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const failedCheck = error.step || {
      name: "unknown",
      summary: error.message,
      status: "failed",
    };
    console.error(
      JSON.stringify(
        {
          status: "not-ready",
          repoRoot,
          launch_scope: "persistent-pm",
          broader_repo_health: "not-evaluated",
          checks: [...checks, failedCheck],
          guidance: [
            "Fix the failed PM-specific check and rerun pnpm pm:launch:check.",
            "Do not use unrelated TERP app failures as a proxy for PM readiness.",
          ],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  } finally {
    for (const dirPath of cleanupDirs) {
      rmSync(dirPath, { recursive: true, force: true });
    }
  }
}

await main();

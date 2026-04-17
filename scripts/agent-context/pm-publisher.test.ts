import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { validateContextBundle } from "./generate-agent-context.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function createFixtureRepo() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "terp-pm-publisher-"));

  execFileSync("git", ["init", "-b", "main", repoRoot], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  execFileSync("git", ["-C", repoRoot, "config", "user.email", "pm-test@example.com"]);
  execFileSync("git", ["-C", repoRoot, "config", "user.name", "PM Fixture"]);

  writeFile(path.join(repoRoot, "AGENTS.md"), "# Fixture AGENTS\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "CLAUDE.MD"), "# Fixture CLAUDE\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/ACTIVE_SESSIONS.md"), "# Active Sessions\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/PROJECT_CONTEXT.md"), "# Project Context\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/TERP_AGENT_INSTRUCTIONS.md"), "# Agent Instructions\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/ROADMAP_AGENT_GUIDE.md"), "# Roadmap Guide\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "agent-prompts/README.md"), "# Prompts\n\nStart with `docs/agent-context/START_HERE.md`.\n");

  execFileSync("git", ["-C", repoRoot, "add", "."]);
  execFileSync("git", ["-C", repoRoot, "commit", "-m", "chore: seed publisher fixture"], {
    stdio: ["ignore", "ignore", "ignore"],
  });

  return repoRoot;
}

const fixtureRoots: string[] = [];

afterEach(() => {
  while (fixtureRoots.length) {
    const fixtureRoot = fixtureRoots.pop();
    if (!fixtureRoot) {
      break;
    }
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe("pm-publisher", () => {
  it("updates last_publish and mirrors the public bundle", () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    const outputDir = mkdtempSync(path.join(os.tmpdir(), "terp-pm-publisher-out-"));
    fixtureRoots.push(outputDir);

    execFileSync(
      process.execPath,
      [path.join(__dirname, "pm-publisher.mjs"), "--repo-root", repoRoot, "--output-dir", outputDir],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );

    const health = JSON.parse(readFileSync(path.join(repoRoot, "docs/agent-context/public/health.json"), "utf8"));
    const sharedHealth = JSON.parse(
      readFileSync(path.join(repoRoot, ".git", "persistent-pm", "current", "public", "health.json"), "utf8"),
    );
    const mirroredManifest = JSON.parse(readFileSync(path.join(outputDir, "manifest.json"), "utf8"));

    expect(Date.parse(health.last_publish)).toBeLessThanOrEqual(Date.parse(health.generated_at));
    expect(Date.parse(sharedHealth.last_publish)).toBeLessThanOrEqual(Date.parse(sharedHealth.generated_at));
    expect(mirroredManifest.artifacts["state.json"]).toBeTruthy();
  });

  it("keeps the bundle valid under concurrent publish attempts", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    const outputDir = mkdtempSync(path.join(os.tmpdir(), "terp-pm-publisher-race-"));
    fixtureRoots.push(outputDir);

    const results = (await Promise.all(
      Array.from({ length: 4 }, () => {
        return new Promise<{ status: string }>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              path.join(__dirname, "pm-publisher.mjs"),
              "--repo-root",
              repoRoot,
              "--output-dir",
              outputDir,
              "--debounce-seconds",
              "0",
            ],
            {
              cwd: repoRoot,
              env: process.env,
              stdio: ["ignore", "pipe", "pipe"],
            },
          );

          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (chunk) => {
            stdout += String(chunk);
          });
          child.stderr.on("data", (chunk) => {
            stderr += String(chunk);
          });
          child.on("exit", (code) => {
            if (code === 0) {
              resolve(JSON.parse(stdout));
              return;
            }
            reject(new Error(stderr || `publisher exited with code ${code}`));
          });
        });
      }),
    )) as Array<{ status: string }>;

    const validation = await validateContextBundle({
      repoRoot,
      skipLinear: true,
    });
    const ranCount = results.filter((result) => result.status === "ran").length;

    expect(ranCount).toBeGreaterThanOrEqual(1);
    expect(validation.problems).toEqual([]);
    expect(JSON.parse(readFileSync(path.join(outputDir, "manifest.json"), "utf8")).artifacts["state.json"]).toBeTruthy();
  });
});

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  appendDecision,
  generateContext,
  proposeChange,
  validateContextBundle,
} from "./generate-agent-context.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function createFixtureRepo() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "terp-pm-fixture-"));

  execFileSync("git", ["init", "-b", "main", repoRoot], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  execFileSync("git", ["-C", repoRoot, "config", "user.email", "pm-test@example.com"]);
  execFileSync("git", ["-C", repoRoot, "config", "user.name", "PM Fixture"]);

  writeFile(
    path.join(repoRoot, "AGENTS.md"),
    "# Fixture AGENTS\n\nStart with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "CLAUDE.MD"),
    "# Fixture CLAUDE\n\nStart with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "docs/ACTIVE_SESSIONS.md"),
    "# Active Sessions\n\n> Legacy snapshot. Start with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "docs/PROJECT_CONTEXT.md"),
    "# Project Context\n\n> Legacy background only. Start with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "docs/TERP_AGENT_INSTRUCTIONS.md"),
    "# TERP Agent Instructions\n\nStart with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "docs/ROADMAP_AGENT_GUIDE.md"),
    "# Roadmap Guide\n\nStart with `docs/agent-context/START_HERE.md`.\n",
  );
  writeFile(
    path.join(repoRoot, "agent-prompts/README.md"),
    "# Agent prompts\n\nRead `docs/agent-context/START_HERE.md` before using this directory.\n",
  );
  writeFile(
    path.join(repoRoot, "product-management/START_HERE.md"),
    "# Old PM\n\nThis should be replaced with the redirect stub.\n",
  );
  writeFile(
    path.join(
      repoRoot,
      "docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json",
    ),
    JSON.stringify(
      {
        gate: "orders-runtime",
        gate_verdict: "partial",
        updated_at: "2026-04-17T12:00:00.000Z",
        next_move: {
          summary: "Tighten the persistent PM integration before rollout.",
        },
      },
      null,
      2,
    ),
  );

  execFileSync("git", ["-C", repoRoot, "add", "."]);
  execFileSync("git", ["-C", repoRoot, "commit", "-m", "chore: seed fixture"], {
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
  delete process.env.PM_SIGNING_SECRET;
});

function mockLinearSnapshot() {
  return {
    mode: "live",
    fetchedAt: "2026-04-17T16:00:00.000Z",
    latestIssueUpdatedAt: "2026-04-17T15:55:00.000Z",
    activeProjects: [
      {
        id: "project-1",
        name: "TERP Persistent PM",
        state: "started",
        updatedAt: "2026-04-17T15:30:00.000Z",
        url: "https://linear.app/terpcorp/project/persistent-pm",
        description: "Harden the repo-backed PM system.",
      },
    ],
    recentIssues: [
      {
        id: "issue-1",
        identifier: "TER-1200",
        title: "Ship persistent PM bundle",
        number: 1200,
        teamKey: "TER",
        priority: "high",
        updatedAt: "2026-04-17T15:55:00.000Z",
        url: "https://linear.app/terpcorp/issue/TER-1200/ship-persistent-pm-bundle",
        state: "In Progress",
        stateType: "started",
        project: "TERP Persistent PM",
      },
      {
        id: "issue-2",
        identifier: "TER-1201",
        title: "Publish sanitized PM mirror",
        number: 1201,
        teamKey: "TER",
        priority: "normal",
        updatedAt: "2026-04-17T15:40:00.000Z",
        url: "https://linear.app/terpcorp/issue/TER-1201/publish-sanitized-pm-mirror",
        state: "Todo",
        stateType: "unstarted",
        project: "TERP Persistent PM",
      },
    ],
  };
}

describe("persistent PM bundle generator", () => {
  it("generates the canonical artifacts, redirect stub, and per-surface bootstraps", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    const now = new Date().toISOString();

    const bundle = await generateContext({
      repoRoot,
      now,
      linearSnapshot: mockLinearSnapshot(),
    });

    expect(bundle.state.startupContract.manifest).toBe("docs/agent-context/manifest.json");
    expect(bundle.state.startupContract.workMap).toBe("docs/agent-context/work.json");
    expect(bundle.state.trustModel.firstClassWriters).toContain("Codex Mac app");
    expect(bundle.state.startupContract.sharedLiveBundleDir).toContain(path.join(".git", "persistent-pm", "current"));

    expect(readFileSync(path.join(repoRoot, "product-management/START_HERE.md"), "utf8")).toContain(
      "legacy redirect only",
    );
    expect(readFileSync(path.join(repoRoot, "docs/agent-context/manifest.json"), "utf8")).toContain(
      "\"public/manifest.json\"",
    );
    expect(readFileSync(path.join(repoRoot, "docs/agent-context/bootstrap/claude-ai.md"), "utf8")).toContain(
      "PROPOSED_DECISION",
    );
    expect(readFileSync(path.join(repoRoot, "docs/agent-context/public/state.json"), "utf8")).not.toContain(
      "/Users/",
    );
    expect(readFileSync(path.join(repoRoot, ".git", "persistent-pm", "current", "START_HERE.md"), "utf8")).toBe(
      readFileSync(path.join(repoRoot, "docs/agent-context/START_HERE.md"), "utf8"),
    );
    expect(readFileSync(path.join(repoRoot, ".git", "persistent-pm", "current", "clients.json"), "utf8")).toBe(
      readFileSync(path.join(repoRoot, "docs/agent-context/clients.json"), "utf8"),
    );

    const validation = await validateContextBundle({
      repoRoot,
      skipLinear: true,
    });

    expect(validation.problems).toEqual([]);
  });

  it("appends a signed decision and regenerates the bundle", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    process.env.PM_SIGNING_SECRET = "fixture-secret";
    const now = new Date().toISOString();

    await generateContext({
      repoRoot,
      now,
      linearSnapshot: mockLinearSnapshot(),
    });

    const basedOnSha = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const result = await appendDecision({
      repoRoot,
      clientId: "codex-mac-app",
      basedOnSha,
      summary: "Adopt the repo-backed PM bundle",
      rationale: "It prevents drift across agents and surfaces.",
      linearRefs: ["TER-1200"],
      now,
      linearSnapshot: mockLinearSnapshot(),
      skipLinear: true,
    });

    expect(result.decision.signature_mode).toBe("hmac-sha256");
    expect(result.decision.client_id).toBe("codex-mac-app");
    expect(result.decision.linear_refs).toEqual(["TER-1200"]);
    expect(readFileSync(path.join(repoRoot, ".git", "persistent-pm", "current", "decisions.ndjson"), "utf8")).toContain(
      "Adopt the repo-backed PM bundle",
    );

    const state = JSON.parse(readFileSync(path.join(repoRoot, "docs/agent-context/state.json"), "utf8"));
    expect(state.decisions.total).toBe(1);
  });

  it("serializes concurrent authoritative appends so no decisions are lost", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    process.env.PM_SIGNING_SECRET = "fixture-secret";

    await generateContext({
      repoRoot,
      now: "2026-04-17T17:00:00.000Z",
      linearSnapshot: mockLinearSnapshot(),
      skipLinear: true,
    });

    const basedOnSha = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const runnerPath = path.join(repoRoot, "append-decision-runner.mjs");
    writeFile(
      runnerPath,
      `import { appendDecision } from ${JSON.stringify(path.join(__dirname, "generate-agent-context.mjs"))};\n` +
        "const [, , repoRoot, basedOnSha, n] = process.argv;\n" +
        "await appendDecision({\n" +
        "  repoRoot,\n" +
        "  clientId: 'codex-mac-app',\n" +
        "  basedOnSha,\n" +
        "  summary: `Concurrent decision ${n}`,\n" +
        "  rationale: `Stress decision ${n}`,\n" +
        "  skipLinear: true,\n" +
        "});\n",
    );

    await Promise.all(
      Array.from({ length: 12 }, (_, index) => {
        return new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [runnerPath, repoRoot, basedOnSha, String(index)], {
            cwd: repoRoot,
            env: {
              ...process.env,
              PM_SIGNING_SECRET: "fixture-secret",
            },
            stdio: ["ignore", "pipe", "pipe"],
          });

          let stderr = "";
          child.stderr.on("data", (chunk) => {
            stderr += String(chunk);
          });
          child.on("exit", (code) => {
            if (code === 0) {
              resolve();
              return;
            }
            reject(new Error(stderr || `append runner exited with code ${code}`));
          });
        });
      }),
    );

    const decisions = readFileSync(
      path.join(repoRoot, ".git", "persistent-pm", "current", "decisions.ndjson"),
      "utf8",
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)) as Array<{ summary: string }>;
    const state = JSON.parse(readFileSync(path.join(repoRoot, "docs/agent-context/state.json"), "utf8"));
    const validation = await validateContextBundle({
      repoRoot,
      skipLinear: true,
    });

    expect(decisions).toHaveLength(12);
    expect(new Set(decisions.map((entry) => entry.summary)).size).toBe(12);
    expect(state.decisions.total).toBe(12);
    expect(validation.problems).toEqual([]);
  });

  it("writes mediated proposals for hosted clients", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    const now = new Date().toISOString();

    await generateContext({
      repoRoot,
      now,
      linearSnapshot: mockLinearSnapshot(),
      skipLinear: true,
    });

    const basedOnSha = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const result = await proposeChange({
      repoRoot,
      clientId: "claude-ai",
      basedOnSha,
      summary: "Mirror the latest PM checkpoint",
      rationale: "Hosted Claude needs a promoted decision instead of a direct write.",
      linearRefs: ["TER-1201"],
      now,
    });

    expect(result.proposal.client_id).toBe("claude-ai");
    expect(result.proposal.status).toBe("proposed");
    expect(readFileSync(result.proposalPath, "utf8")).toContain("TER-1201");
    expect(result.proposalPath).toContain(path.join(".git", "persistent-pm", "current", "proposals"));
    expect(
      readFileSync(path.join(repoRoot, "docs/agent-context/proposals", path.basename(result.proposalPath)), "utf8"),
    ).toContain("TER-1201");
  });

  it("flags legacy PM drift when the redirect stub is replaced", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    const now = new Date().toISOString();

    await generateContext({
      repoRoot,
      now,
      linearSnapshot: mockLinearSnapshot(),
      skipLinear: true,
    });

    writeFile(
      path.join(repoRoot, "product-management/START_HERE.md"),
      "# Old PM\n\nThis is the single source of truth again.\n",
    );

    const validation = await validateContextBundle({
      repoRoot,
      skipLinear: true,
    });

    expect(validation.problems.some((problem) => problem.includes("redirect stub"))).toBe(true);
  });
});

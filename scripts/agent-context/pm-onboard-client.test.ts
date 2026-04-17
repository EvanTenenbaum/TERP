import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function createFixtureRepo() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "terp-pm-onboard-"));

  execFileSync("git", ["init", "-b", "main", repoRoot], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  execFileSync("git", ["-C", repoRoot, "config", "user.email", "pm-test@example.com"]);
  execFileSync("git", ["-C", repoRoot, "config", "user.name", "PM Fixture"]);

  writeFile(path.join(repoRoot, "AGENTS.md"), "# Fixture AGENTS\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "CLAUDE.md"), "# Fixture CLAUDE\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/ACTIVE_SESSIONS.md"), "# Active Sessions\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/PROJECT_CONTEXT.md"), "# Project Context\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/TERP_AGENT_INSTRUCTIONS.md"), "# Agent Instructions\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "docs/ROADMAP_AGENT_GUIDE.md"), "# Roadmap Guide\n\nStart with `docs/agent-context/START_HERE.md`.\n");
  writeFile(path.join(repoRoot, "agent-prompts/README.md"), "# Prompts\n\nStart with `docs/agent-context/START_HERE.md`.\n");

  execFileSync("git", ["-C", repoRoot, "add", "."]);
  execFileSync("git", ["-C", repoRoot, "commit", "-m", "chore: seed onboard fixture"], {
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

describe("pm-onboard-client", () => {
  it("adds a new read-only client and generates its bootstrap", () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);

    execFileSync(
      process.execPath,
      [path.join(__dirname, "pm-onboard-client.mjs"), "--repo-root", repoRoot, "--name", "Gemini cloud"],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );

    const clients = JSON.parse(readFileSync(path.join(repoRoot, "docs/agent-context/clients.json"), "utf8"));
    const gemini = clients.clients.find((client: { id: string }) => client.id === "gemini-cloud");
    expect(gemini).toBeTruthy();
    expect(gemini.trustLevel).toBe("read-only");
    expect(gemini.allowedTools).toEqual(["pm.proposeChange"]);
    expect(gemini.readPaths[0]).toBe("public-mirror");

    const bootstrap = readFileSync(
      path.join(repoRoot, "docs/agent-context/bootstrap/gemini-cloud.md"),
      "utf8",
    );
    expect(bootstrap).toContain("PM Bootstrap: Gemini cloud");
    expect(bootstrap).toContain("proposal-only");
    expect(
      readFileSync(path.join(repoRoot, ".git", "persistent-pm", "current", "clients.json"), "utf8"),
    ).toContain("gemini-cloud");
  });

  it("can add a conditional local writer profile", () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);

    execFileSync(
      process.execPath,
      [
        path.join(__dirname, "pm-onboard-client.mjs"),
        "--repo-root",
        repoRoot,
        "--name",
        "Claude Desktop Lab",
        "--trust",
        "conditional-first-class-writer",
        "--category",
        "local",
      ],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );

    const clients = JSON.parse(readFileSync(path.join(repoRoot, "docs/agent-context/clients.json"), "utf8"));
    const client = clients.clients.find((entry: { id: string }) => entry.id === "claude-desktop-lab");
    expect(client).toBeTruthy();
    expect(client.trustLevel).toBe("conditional-first-class-writer");
    expect(client.writeMode).toBe("pm-mcp");
    expect(client.allowedTools).toContain("pm.checkpoint");
    expect(client.readPaths[0]).toBe("shared-live-bundle");
  });
});

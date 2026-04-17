import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
}

function createFixtureRepo() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "terp-pm-mcp-"));

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
  execFileSync("git", ["-C", repoRoot, "commit", "-m", "chore: seed mcp fixture"], {
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

describe("pm-mcp server", () => {
  it("serves PM reads and authoritative appends over stdio MCP", async () => {
    const repoRoot = createFixtureRepo();
    fixtureRoots.push(repoRoot);
    process.env.PM_SIGNING_SECRET = "fixture-secret";

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(__dirname, "pm-mcp-server.mjs"), "--repo-root", repoRoot],
      env: {
        ...process.env,
        PM_SIGNING_SECRET: "fixture-secret",
      },
      stderr: "pipe",
      cwd: repoRoot,
    });

    const client = new Client({
      name: "pm-mcp-test-client",
      version: "1.0.0",
    });

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["pm.read", "pm.appendDecision", "pm.proposeChange", "pm.checkpoint"]),
      );

      const summary = await client.callTool({
        name: "pm.read",
        arguments: {
          artifact: "summary",
        },
      });
      expect(JSON.stringify(summary)).toContain("TERP Persistent PM");

      const head = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();

      const decisionResult = await client.callTool({
        name: "pm.appendDecision",
        arguments: {
          clientId: "codex-mac-app",
          basedOnSha: head,
          summary: "Verify MCP append path",
          rationale: "The pm-mcp server should be able to write authoritative PM state.",
          linearRefs: [],
        },
      });

      expect(JSON.stringify(decisionResult)).toContain("Verify MCP append path");
    } finally {
      await transport.close();
    }
  });
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

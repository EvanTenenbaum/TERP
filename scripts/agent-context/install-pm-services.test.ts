import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length) {
    const tempPath = tempPaths.pop();
    if (!tempPath) {
      break;
    }
    rmSync(tempPath, { recursive: true, force: true });
  }
});

describe("install-pm-services", () => {
  it("writes dry-run launchd plists for the PM services", () => {
    const outputDir = mkdtempSync(path.join(os.tmpdir(), "terp-pm-launchd-"));
    tempPaths.push(outputDir);

    execFileSync(
      process.execPath,
      [path.join(__dirname, "install-pm-services.mjs"), "--repo-root", repoRoot, "--dry-run", "--output-dir", outputDir],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );

    const mcpPlist = readFileSync(path.join(outputDir, "com.evantenenbaum.terp.pm-mcp-http.plist"), "utf8");
    const publisherPlist = readFileSync(path.join(outputDir, "com.evantenenbaum.terp.pm-publisher.plist"), "utf8");

    expect(mcpPlist).toContain("pm-mcp-server.mjs");
    expect(mcpPlist).toContain("--transport");
    expect(publisherPlist).toContain("pm-publisher.mjs");
    expect(publisherPlist).toContain("<key>StartInterval</key>");
  });
});

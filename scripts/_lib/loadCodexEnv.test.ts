import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getCodexEnvPath, loadCodexEnv } from "./loadCodexEnv";

const LICENSE_ENV_KEY = "VITE_AG_GRID_LICENSE_KEY";

describe("loadCodexEnv", () => {
  const originalLicenseKey = process.env[LICENSE_ENV_KEY];

  afterEach(() => {
    if (originalLicenseKey === undefined) {
      delete process.env[LICENSE_ENV_KEY];
    } else {
      process.env[LICENSE_ENV_KEY] = originalLicenseKey;
    }
  });

  it("resolves the canonical Codex env path from a home directory", () => {
    expect(getCodexEnvPath("/tmp/example-home")).toBe(
      path.resolve("/tmp/example-home", ".codex/.env")
    );
  });

  it("loads Vite env vars from the canonical Codex env file", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-env-"));
    const envDir = path.join(homeDir, ".codex");
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(
      path.join(envDir, ".env"),
      `${LICENSE_ENV_KEY}=local-ag-grid-license\n`
    );

    delete process.env[LICENSE_ENV_KEY];
    loadCodexEnv({ homeDir });

    expect(process.env[LICENSE_ENV_KEY]).toBe("local-ag-grid-license");
  });

  it("does not override an existing value unless explicitly asked", () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-env-"));
    const envDir = path.join(homeDir, ".codex");
    fs.mkdirSync(envDir, { recursive: true });
    fs.writeFileSync(
      path.join(envDir, ".env"),
      `${LICENSE_ENV_KEY}=from-codex-env\n`
    );

    process.env[LICENSE_ENV_KEY] = "already-set";
    loadCodexEnv({ homeDir });

    expect(process.env[LICENSE_ENV_KEY]).toBe("already-set");
  });
});

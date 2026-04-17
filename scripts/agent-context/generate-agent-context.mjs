import { execFileSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runExclusivePmTask } from "./pm-runtime-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..");

export const LINEAR_LOOKBACK_DAYS = 21;
export const MANIFEST_SCHEMA_VERSION = 1;
export const STATE_SCHEMA_VERSION = 2;
export const WORK_SCHEMA_VERSION = 1;
export const EVIDENCE_SCHEMA_VERSION = 1;
export const CLIENTS_SCHEMA_VERSION = 1;
export const PROPOSAL_SCHEMA_VERSION = 1;
export const HEALTH_SCHEMA_VERSION = 1;
export const DECISION_SCHEMA_VERSION = 1;

export const ARTIFACT_TTLS = {
  "START_HERE.md": 3600,
  "state.json": 900,
  "work.json": 3600,
  "evidence.json": 86400,
  "manifest.json": 900,
  "health.json": 300,
  "bootstrap/README.md": 3600,
  "bootstrap/any-llm.md": 3600,
  "public/START_HERE.md": 3600,
  "public/state.json": 900,
  "public/work.json": 3600,
  "public/manifest.json": 900,
  "public/health.json": 300,
};

export const PRIVATE_ARTIFACTS = new Set([
  "START_HERE.md",
  "state.json",
  "work.json",
  "evidence.json",
  "manifest.json",
  "health.json",
  "decisions.ndjson",
  "conflicts.ndjson",
  "clients.json",
  "bootstrap/README.md",
  "bootstrap/any-llm.md",
]);

export const PUBLIC_ARTIFACTS = new Set([
  "START_HERE.md",
  "state.json",
  "work.json",
  "manifest.json",
  "health.json",
]);

export const LEGACY_DOCS = [
  ["docs/ACTIVE_SESSIONS.md", "legacy session registry snapshot"],
  ["docs/PROJECT_CONTEXT.md", "historical orientation packet"],
  ["docs/TERP_AGENT_INSTRUCTIONS.md", "legacy onboarding prompt-pack file"],
  ["docs/ROADMAP_AGENT_GUIDE.md", "legacy roadmap guide"],
  ["product-management/START_HERE.md", "legacy PM entrypoint"],
  ["agent-prompts/README.md", "legacy prompt-pack entrypoint"],
];

export const LEGACY_REDIRECT_STUB = `# Legacy Redirect

This file is a legacy redirect only. Do not use it as PM authority.

Start with \`docs/agent-context/START_HERE.md\`, then confirm freshness in \`docs/agent-context/manifest.json\`.
`;

export const DEFAULT_CLIENTS_REGISTRY = {
  schemaVersion: CLIENTS_SCHEMA_VERSION,
  defaultTrustLevel: "read-only",
  description:
    "Registry of PM-capable client surfaces. Edit via PR only. Newly onboarded clients stay read-only until explicitly promoted.",
  clients: [
    {
      id: "hermes",
      name: "Hermes",
      surface: "Hermes",
      category: "local",
      trustLevel: "first-class-writer",
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/hermes.md",
      pushBeforeHosted: false,
      notes: "Dedicated adapter required; do not assume parity with Codex or Claude clients.",
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
    },
    {
      id: "codex-mac-app",
      name: "Codex Mac app",
      surface: "Codex Mac app",
      category: "local",
      trustLevel: "first-class-writer",
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/codex-mac-app.md",
      pushBeforeHosted: false,
      notes: "Primary TERP local working surface.",
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
    },
    {
      id: "codex-cloud",
      name: "Codex cloud",
      surface: "Codex cloud",
      category: "hosted",
      trustLevel: "mediated-writer",
      readPaths: ["git-clone", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: "pull-request",
      allowedTools: ["pm.read", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/codex-cloud.md",
      pushBeforeHosted: true,
      notes: "Hosted surface should work from pushed git state and open PRs for PM-affecting changes.",
      signingMode: "git-identity",
      signingKeyFingerprint: "pr-mediated",
    },
    {
      id: "codex-cli-local",
      name: "Codex CLI (local)",
      surface: "Codex CLI",
      category: "local",
      trustLevel: "first-class-writer",
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/codex-cli-local.md",
      pushBeforeHosted: false,
      notes: "Treat as first-class writer only when running on trusted local infrastructure.",
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
    },
    {
      id: "codex-cli-cloud",
      name: "Codex CLI (cloud)",
      surface: "Codex CLI",
      category: "hosted",
      trustLevel: "mediated-writer",
      readPaths: ["git-clone", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: "pull-request",
      allowedTools: ["pm.read", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/codex-cli-cloud.md",
      pushBeforeHosted: true,
      notes: "Cloud or sandboxed Codex CLI runs should use PRs or proposal files, not direct PM writes.",
      signingMode: "git-identity",
      signingKeyFingerprint: "pr-mediated",
    },
    {
      id: "claude-mac-app",
      name: "Claude Mac app",
      surface: "Claude Mac app",
      category: "local",
      trustLevel: "conditional-first-class-writer",
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/claude-mac-app.md",
      pushBeforeHosted: false,
      notes:
        "Promote to first-class writer only when refresh/check and local connector support are validated end to end.",
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
    },
    {
      id: "claude-ai",
      name: "claude.ai",
      surface: "claude.ai",
      category: "hosted",
      trustLevel: "read-only",
      readPaths: ["github-integration", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: "proposal-only",
      allowedTools: ["pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/claude-ai.md",
      pushBeforeHosted: true,
      notes: "Hosted Anthropic surfaces never depend on tailnet-only services and do not write authoritatively.",
      signingMode: "none",
      signingKeyFingerprint: "read-only",
    },
    {
      id: "claude-code-cloud",
      name: "Claude Code cloud",
      surface: "Claude Code cloud",
      category: "hosted",
      trustLevel: "mediated-writer",
      readPaths: ["git-clone", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: "pull-request",
      allowedTools: ["pm.read", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/claude-code-cloud.md",
      pushBeforeHosted: true,
      notes: "Use pushed git state and PR-mediated writes.",
      signingMode: "git-identity",
      signingKeyFingerprint: "pr-mediated",
    },
    {
      id: "claude-code-cli-local",
      name: "Claude Code CLI (local)",
      surface: "Claude Code CLI",
      category: "local",
      trustLevel: "first-class-writer",
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/claude-code-cli-local.md",
      pushBeforeHosted: false,
      notes: "Trusted local Claude Code CLI may act as a first-class writer through the mediator only.",
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
    },
    {
      id: "claude-code-cli-cloud",
      name: "Claude Code CLI (cloud)",
      surface: "Claude Code CLI",
      category: "hosted",
      trustLevel: "mediated-writer",
      readPaths: ["git-clone", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: "pull-request",
      allowedTools: ["pm.read", "pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/claude-code-cli-cloud.md",
      pushBeforeHosted: true,
      notes: "Cloud Claude Code CLI should use PR or proposal mediated writes.",
      signingMode: "git-identity",
      signingKeyFingerprint: "pr-mediated",
    },
    {
      id: "new-model-template",
      name: "Future new model/service",
      surface: "Any new model/service",
      category: "template",
      trustLevel: "read-only",
      readPaths: ["public-mirror", "bootstrap-paste"],
      fallbackReadPaths: ["manual-bootstrap"],
      writeMode: "proposal-only",
      allowedTools: ["pm.proposeChange"],
      bootstrapPath: "docs/agent-context/bootstrap/any-llm.md",
      pushBeforeHosted: true,
      notes: "Unregistered clients stay read-only until a validated adapter and registry entry exist.",
      signingMode: "none",
      signingKeyFingerprint: "read-only",
    },
  ],
};

const priorityNames = {
  0: "none",
  1: "urgent",
  2: "high",
  3: "normal",
  4: "low",
};

const PUBLIC_SCAN_PATTERNS = [
  { label: "absolute local path", pattern: /\/Users\/[^\s"`]+/g },
  { label: "tailnet hostname", pattern: /\b[\w.-]+\.ts\.net\b/g },
  { label: "dotenv secret reference", pattern: /\b(?:LINEAR_API_KEY|PM_SIGNING_SECRET|OPENAI_API_KEY|ANTHROPIC_API_KEY)\b/g },
  { label: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

function safeNow(now = new Date()) {
  return now instanceof Date ? now : new Date(now);
}

export function getRepoRoot(explicitRoot) {
  return path.resolve(explicitRoot || process.env.PM_REPO_ROOT || DEFAULT_REPO_ROOT);
}

export function getGitCommonDir(repoRoot = getRepoRoot()) {
  const resolvedRepoRoot = getRepoRoot(repoRoot);
  const raw = runGit(resolvedRepoRoot, ["rev-parse", "--git-common-dir"], true);
  return path.resolve(resolvedRepoRoot, raw || ".git");
}

export function getPmPaths(repoRoot = getRepoRoot()) {
  const resolvedRepoRoot = getRepoRoot(repoRoot);
  const gitCommonDir = getGitCommonDir(resolvedRepoRoot);
  const outputDir = path.join(resolvedRepoRoot, "docs", "agent-context");
  const publicDir = path.join(outputDir, "public");
  const bootstrapDir = path.join(outputDir, "bootstrap");
  const sharedOutputDir = path.join(gitCommonDir, "persistent-pm", "current");
  const sharedPublicDir = path.join(sharedOutputDir, "public");
  const sharedBootstrapDir = path.join(sharedOutputDir, "bootstrap");
  return {
    repoRoot: resolvedRepoRoot,
    gitCommonDir,
    outputDir,
    startHerePath: path.join(outputDir, "START_HERE.md"),
    statePath: path.join(outputDir, "state.json"),
    manifestPath: path.join(outputDir, "manifest.json"),
    workPath: path.join(outputDir, "work.json"),
    evidencePath: path.join(outputDir, "evidence.json"),
    decisionsPath: path.join(outputDir, "decisions.ndjson"),
    clientsPath: path.join(outputDir, "clients.json"),
    conflictsPath: path.join(outputDir, "conflicts.ndjson"),
    healthPath: path.join(outputDir, "health.json"),
    proposalsDir: path.join(outputDir, "proposals"),
    publicDir,
    publicStartHerePath: path.join(publicDir, "START_HERE.md"),
    publicStatePath: path.join(publicDir, "state.json"),
    publicWorkPath: path.join(publicDir, "work.json"),
    publicManifestPath: path.join(publicDir, "manifest.json"),
    publicHealthPath: path.join(publicDir, "health.json"),
    bootstrapDir,
    bootstrapReadmePath: path.join(bootstrapDir, "README.md"),
    sharedOutputDir,
    sharedStartHerePath: path.join(sharedOutputDir, "START_HERE.md"),
    sharedStatePath: path.join(sharedOutputDir, "state.json"),
    sharedManifestPath: path.join(sharedOutputDir, "manifest.json"),
    sharedWorkPath: path.join(sharedOutputDir, "work.json"),
    sharedEvidencePath: path.join(sharedOutputDir, "evidence.json"),
    sharedDecisionsPath: path.join(sharedOutputDir, "decisions.ndjson"),
    sharedClientsPath: path.join(sharedOutputDir, "clients.json"),
    sharedConflictsPath: path.join(sharedOutputDir, "conflicts.ndjson"),
    sharedHealthPath: path.join(sharedOutputDir, "health.json"),
    sharedProposalsDir: path.join(sharedOutputDir, "proposals"),
    sharedPublicDir,
    sharedPublicStartHerePath: path.join(sharedPublicDir, "START_HERE.md"),
    sharedPublicStatePath: path.join(sharedPublicDir, "state.json"),
    sharedPublicWorkPath: path.join(sharedPublicDir, "work.json"),
    sharedPublicManifestPath: path.join(sharedPublicDir, "manifest.json"),
    sharedPublicHealthPath: path.join(sharedPublicDir, "health.json"),
    sharedBootstrapDir,
    sharedBootstrapReadmePath: path.join(sharedBootstrapDir, "README.md"),
    productManagementPath: path.join(resolvedRepoRoot, "product-management", "START_HERE.md"),
    repoAgentsPath: path.join(resolvedRepoRoot, "AGENTS.md"),
    repoClaudePath: path.join(resolvedRepoRoot, "CLAUDE.md"),
  };
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function preferSharedPath(primaryPath, sharedPath) {
  return existsSync(sharedPath) ? sharedPath : primaryPath;
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`);
}

function writeJson(filePath, payload) {
  writeText(filePath, JSON.stringify(payload, null, 2));
}

function readText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function readJson(filePath) {
  const raw = readText(filePath);
  return raw ? JSON.parse(raw) : null;
}

function readNdjson(filePath) {
  const raw = readText(filePath);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function appendNdjsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath));
  appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
}

function syncMirroredText(primaryPath, sharedPath, defaultContent = "") {
  const sourcePath = preferSharedPath(primaryPath, sharedPath);
  const sourceContent = existsSync(sourcePath) ? readText(sourcePath) : defaultContent;
  writeText(sharedPath, sourceContent);
  writeText(primaryPath, sourceContent);
  return sourceContent;
}

function syncMirroredDir(primaryDir, sharedDir) {
  ensureDir(primaryDir);
  ensureDir(sharedDir);
  const names = new Set([...readdirSync(primaryDir), ...readdirSync(sharedDir)]);
  for (const name of names) {
    const primaryPath = path.join(primaryDir, name);
    const sharedPath = path.join(sharedDir, name);
    const sourcePath = preferSharedPath(primaryPath, sharedPath);
    if (!existsSync(sourcePath)) {
      continue;
    }
    const sourceContent = readText(sourcePath);
    writeText(sharedPath, sourceContent);
    writeText(primaryPath, sourceContent);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(secret, value) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function mergeOrderedUnique(...lists) {
  const merged = [];
  const seen = new Set();
  for (const list of lists) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      merged.push(entry);
    }
  }
  return merged;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function compactTimestamp(now = new Date()) {
  return safeNow(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function isoDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function ageSeconds(iso) {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
}

function ageHours(iso) {
  const seconds = ageSeconds(iso);
  if (seconds === null) {
    return null;
  }
  return Number((seconds / 3600).toFixed(1));
}

function parseLastUpdated(text) {
  const match = text.match(/^\*\*Last Updated:\*\*\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function readEnvValue(key) {
  if (process.env[key]) {
    return process.env[key];
  }

  const envPath = path.join(os.homedir(), ".codex", ".env");
  if (!existsSync(envPath)) {
    return "";
  }

  for (const line of readText(envPath).split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [candidateKey, ...rest] = line.split("=");
    if (candidateKey.trim() === key) {
      return rest.join("=").trim();
    }
  }

  return "";
}

function runGit(repoRoot, args, allowFailure = false) {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    throw error;
  }
}

export function isAncestor(repoRoot, ancestorSha, descendantSha = "HEAD") {
  if (!ancestorSha) {
    return false;
  }
  try {
    execFileSync("git", ["-C", repoRoot, "merge-base", "--is-ancestor", ancestorSha, descendantSha], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function getSigningSecret() {
  if (process.env.PM_SIGNING_SECRET) {
    return process.env.PM_SIGNING_SECRET;
  }

  const secretPath = path.join(os.homedir(), ".agent-core", "pm-signing.key");
  if (!existsSync(secretPath)) {
    ensureDir(path.dirname(secretPath));
    writeFileSync(secretPath, `${randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
    try {
      chmodSync(secretPath, 0o600);
    } catch {
      // Best effort only.
    }
  }

  return readText(secretPath).trim();
}

function signDecisionPayload(payload) {
  return {
    signature_mode: "hmac-sha256",
    signature: hmacSha256(getSigningSecret(), stableStringify(payload)),
  };
}

function detectPublicLeaks(text) {
  return PUBLIC_SCAN_PATTERNS.flatMap(({ label, pattern }) => {
    const matches = text.match(pattern) || [];
    return matches.map((match) => ({
      label,
      match,
    }));
  });
}

function validateNoPublicLeaks(relativePath, content) {
  const leaks = detectPublicLeaks(content);
  if (!leaks.length) {
    return;
  }

  const details = leaks.map((entry) => `${entry.label}: ${entry.match}`).join("; ");
  throw new Error(`Refused to generate public artifact ${relativePath} because it appears to leak private data (${details}).`);
}

function trustSortRank(trustLevel) {
  return {
    "first-class-writer": 0,
    "conditional-first-class-writer": 1,
    "mediated-writer": 2,
    "read-only": 3,
  }[trustLevel] ?? 99;
}

function summarizeTrustLadder(clientsRegistry) {
  const groups = {
    "first-class-writer": [],
    "conditional-first-class-writer": [],
    "mediated-writer": [],
    "read-only": [],
  };

  for (const client of clientsRegistry.clients) {
    groups[client.trustLevel] ||= [];
    groups[client.trustLevel].push(client.name);
  }

  return groups;
}

function validateClientsRegistry(clientsRegistry) {
  if (!clientsRegistry || typeof clientsRegistry !== "object") {
    throw new Error("docs/agent-context/clients.json is missing or invalid.");
  }
  if (!Array.isArray(clientsRegistry.clients) || !clientsRegistry.clients.length) {
    throw new Error("docs/agent-context/clients.json must contain a non-empty clients array.");
  }

  const seen = new Set();
  for (const client of clientsRegistry.clients) {
    if (!client.id || !client.name || !client.trustLevel || !client.bootstrapPath) {
      throw new Error(`Client registry entry is missing required fields: ${stableStringify(client)}`);
    }
    if (seen.has(client.id)) {
      throw new Error(`Duplicate client id detected in docs/agent-context/clients.json: ${client.id}`);
    }
    seen.add(client.id);
    if (!["first-class-writer", "conditional-first-class-writer", "mediated-writer", "read-only"].includes(client.trustLevel)) {
      throw new Error(`Unsupported trustLevel for client ${client.id}: ${client.trustLevel}`);
    }
    if (!client.bootstrapPath.startsWith("docs/agent-context/bootstrap/")) {
      throw new Error(`bootstrapPath for client ${client.id} must live under docs/agent-context/bootstrap/`);
    }
  }
}

function ensureClientsRegistry(paths, now) {
  const seedPayload = {
    ...DEFAULT_CLIENTS_REGISTRY,
    updatedAt: safeNow(now).toISOString(),
  };

  const existing = readJson(preferSharedPath(paths.clientsPath, paths.sharedClientsPath)) || {};
  const existingClients = Array.isArray(existing.clients) ? existing.clients : [];
  const defaultById = new Map(seedPayload.clients.map((client) => [client.id, client]));
  const mergedClients = existingClients.map((client) => ({
    ...(defaultById.get(client.id) || {}),
    ...client,
    readPaths: mergeOrderedUnique(defaultById.get(client.id)?.readPaths, client.readPaths),
    fallbackReadPaths: mergeOrderedUnique(defaultById.get(client.id)?.fallbackReadPaths, client.fallbackReadPaths),
    allowedTools:
      Array.isArray(client.allowedTools) &&
      client.allowedTools.length === 1 &&
      client.allowedTools[0] === "proposal-block"
        ? ["pm.proposeChange"]
        : mergeOrderedUnique(defaultById.get(client.id)?.allowedTools, client.allowedTools),
  }));

  for (const defaultClient of seedPayload.clients) {
    if (!mergedClients.some((client) => client.id === defaultClient.id)) {
      mergedClients.push(defaultClient);
    }
  }

  const merged = {
    ...seedPayload,
    ...existing,
    updatedAt: existing.updatedAt || seedPayload.updatedAt,
    clients: mergedClients,
  };

  if (
    stableStringify(merged) !== stableStringify(existing) ||
    !existsSync(paths.clientsPath) ||
    !existsSync(paths.sharedClientsPath)
  ) {
    writeJson(paths.sharedClientsPath, merged);
    writeJson(paths.clientsPath, merged);
  }
}

function seedStaticFiles(paths, now) {
  ensureClientsRegistry(paths, now);
  syncMirroredText(paths.decisionsPath, paths.sharedDecisionsPath, "");
  syncMirroredText(paths.conflictsPath, paths.sharedConflictsPath, "");
  syncMirroredDir(paths.proposalsDir, paths.sharedProposalsDir);
  writeText(paths.productManagementPath, LEGACY_REDIRECT_STUB);
}

function getGitSnapshot(repoRoot) {
  const recentCommits = runGit(
    repoRoot,
    ["log", "--since=2026-03-15", "--pretty=format:%ad%x09%H%x09%h%x09%s", "--date=short", "-n", "25"],
    true,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [date, headSha, shortSha, ...rest] = line.split("\t");
      return {
        date,
        head: headSha,
        sha: shortSha,
        subject: rest.join("\t"),
      };
    });

  return {
    branch: runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    head: runGit(repoRoot, ["rev-parse", "HEAD"]),
    shortHead: runGit(repoRoot, ["rev-parse", "--short", "HEAD"]),
    workingTreeDirty: Boolean(runGit(repoRoot, ["status", "--short"], true)),
    recentCommits,
  };
}

async function queryLinear(query, variables, options = {}) {
  const apiKey = options.apiKey || readEnvValue("LINEAR_API_KEY");
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured.");
  }

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const details = payload.errors?.map((error) => error.message).join("; ");
    throw new Error(details || `Linear request failed with status ${response.status}.`);
  }

  return payload.data;
}

function isTerpProject(node) {
  const text = `${node.name || ""} ${node.description || ""}`;
  return /\bterp\b|spreadsheet|sheet-native|orders|sales sheet|golden flows|recording backlog/i.test(text);
}

function pickActiveProjects(nodes) {
  const openProjects = nodes
    .filter((node) => !["completed", "canceled"].includes(String(node.state || "").toLowerCase()))
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));

  const terpProjects = openProjects.filter(isTerpProject);
  const source = terpProjects.length ? terpProjects : openProjects;

  return source.slice(0, 8).map((node) => ({
    id: node.id,
    name: node.name,
    state: node.state,
    updatedAt: node.updatedAt,
    url: node.url,
    description: node.description || "",
  }));
}

function pickRecentIssues(nodes) {
  return nodes
    .filter((node) => !["completed", "canceled"].includes(String(node.state?.type || "").toLowerCase()))
    .sort((a, b) => {
      const updatedDelta = Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }
      return (a.priority ?? 99) - (b.priority ?? 99);
    })
    .slice(0, 20)
    .map((node) => ({
      id: node.id,
      identifier: node.identifier,
      title: node.title,
      number: node.number,
      teamKey: node.team?.key || null,
      priority: priorityNames[node.priority] || String(node.priority ?? "unknown"),
      updatedAt: node.updatedAt,
      url: node.url,
      state: node.state?.name || "Unknown",
      stateType: node.state?.type || "unknown",
      project: node.project?.name || null,
    }));
}

export async function getLinearSnapshot(repoRoot, previousState, options = {}) {
  if (options.linearSnapshot) {
    return options.linearSnapshot;
  }
  if (options.skipLinear) {
    return {
      mode: "skipped",
      fetchedAt: null,
      latestIssueUpdatedAt: null,
      activeProjects: [],
      recentIssues: [],
      error: "Linear refresh skipped by caller.",
    };
  }

  const query = `
    query AgentContext($projectCount: Int!, $issueCount: Int!, $updatedAfter: DateTimeOrDuration!) {
      projects(first: $projectCount) {
        nodes { id name state updatedAt url description }
      }
      issues(first: $issueCount, orderBy: updatedAt, filter: { updatedAt: { gte: $updatedAfter } }) {
        nodes {
          id
          identifier
          title
          number
          priority
          updatedAt
          url
          state { name type }
          project { name }
          team { key }
        }
      }
    }
  `;

  const updatedAfter = new Date(Date.now() - LINEAR_LOOKBACK_DAYS * 86400000).toISOString();

  try {
    const data = await queryLinear(
      query,
      {
        projectCount: 30,
        issueCount: 80,
        updatedAfter,
      },
      options,
    );

    const activeProjects = pickActiveProjects(data.projects?.nodes || []);
    const recentIssues = pickRecentIssues(data.issues?.nodes || []);

    return {
      mode: "live",
      fetchedAt: new Date().toISOString(),
      latestIssueUpdatedAt: recentIssues[0]?.updatedAt || null,
      activeProjects,
      recentIssues,
      error: null,
    };
  } catch (error) {
    if (previousState?.linear) {
      return {
        ...previousState.linear,
        mode: "last-known",
        error: error.message,
      };
    }

    return {
      mode: "unavailable",
      fetchedAt: null,
      latestIssueUpdatedAt: null,
      activeProjects: [],
      recentIssues: [],
      error: error.message,
    };
  }
}

function scoreThemes(texts) {
  const themes = [
    ["persistent PM and handoff durability", [/\bpersistent\b/i, /\bhandoff\b/i, /\bpm\b/i, /\bcurrent truth\b/i]],
    ["spreadsheet-native rollout", [/\bspreadsheet-native\b/i, /\bsheet-native\b/i, /\bpowersheetgrid\b/i]],
    ["orders and order workflow", [/\border(s)?\b/i, /\border creator\b/i, /\bSALE-ORD\b/i, /\bTER-795\b/i]],
    ["inventory, intake, and purchase operations", [/\binventory\b/i, /\bintake\b/i, /\bpurchase order\b/i, /\bfulfillment\b/i]],
    ["accounting, payments, and ledger work", [/\baccounting\b/i, /\bpayments?\b/i, /\binvoices?\b/i, /\bledger\b/i, /\bbank\b/i]],
    ["QA, proof, and rollout hardening", [/\bqa\b/i, /\bparity\b/i, /\bproof\b/i, /\bhardening\b/i, /\btest\b/i]],
  ];

  return themes
    .map(([label, patterns]) => ({
      label,
      count: texts.reduce((total, text) => total + (patterns.some((pattern) => pattern.test(text)) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildDirection(git, linear, decisions) {
  const texts = [
    ...git.recentCommits.map((commit) => commit.subject),
    ...linear.activeProjects.map((project) => project.name),
    ...linear.recentIssues.map((issue) => issue.title),
    ...decisions.map((decision) => decision.summary || ""),
  ];

  const themeEvidence = scoreThemes(texts).slice(0, 6);
  const focusAreas = themeEvidence.slice(0, 4).map((entry) => entry.label);
  const summaryParts = [];

  if (focusAreas.length) {
    summaryParts.push(`Current TERP direction centers on ${focusAreas.slice(0, 2).join(" and ")}`);
  }
  if (git.recentCommits.length) {
    summaryParts.push(
      `recent git activity is anchored at ${git.shortHead} and led by ${git.recentCommits
        .slice(0, 4)
        .map((commit) => `\`${commit.subject}\``)
        .join(", ")}`,
    );
  }
  if (linear.activeProjects.length) {
    summaryParts.push(
      `Linear currently emphasizes ${linear.activeProjects
        .slice(0, 3)
        .map((project) => `\`${project.name}\``)
        .join(", ")}`,
    );
  }
  if (decisions.length) {
    summaryParts.push(
      `the PM decision log most recently settled ${decisions
        .slice(-3)
        .reverse()
        .map((decision) => `\`${decision.summary}\``)
        .join(", ")}`,
    );
  }

  return {
    focusAreas,
    summary: `${summaryParts.join("; ")}.`,
    themeEvidence,
  };
}

function getOrdersRuntimeSignal(repoRoot) {
  const filePath = path.join(
    repoRoot,
    "docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json",
  );
  const state = readJson(filePath);
  if (!state) {
    return null;
  }
  return {
    path: "docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json",
    gate: state.gate,
    gateVerdict: state.gate_verdict,
    updatedAt: state.updated_at,
    nextMove: state.next_move?.summary || "",
  };
}

function buildLegacyWarnings(repoRoot) {
  return LEGACY_DOCS.map(([relativePath, reason]) => {
    const filePath = path.join(repoRoot, relativePath);
    const text = readText(filePath);
    return {
      path: relativePath,
      reason,
      lastUpdated: parseLastUpdated(text),
      pointsToStartupContract: text.includes("docs/agent-context/START_HERE.md"),
      substantivePmContent:
        relativePath === "product-management/START_HERE.md"
          ? text.trim() !== LEGACY_REDIRECT_STUB.trim()
          : /\bsingle source of truth\b|\bcurrent startup truth\b|\bpersistent PM\b/i.test(text) &&
            !text.includes("docs/agent-context/START_HERE.md"),
    };
  });
}

function buildDecisionSummary(decisions) {
  const latest = decisions.slice(-8).reverse();
  return {
    total: decisions.length,
    latest,
    latestAt: latest[0]?.ts || null,
    latestByClient: latest[0]?.client_id || null,
  };
}

function deriveWorkItemReadiness(issue) {
  const stateType = String(issue.stateType || "").toLowerCase();
  if (stateType === "completed" || stateType === "canceled") {
    return "done";
  }
  if (stateType === "backlog" || /blocked/i.test(issue.state || "")) {
    return "blocked";
  }
  return "ready";
}

function buildWorkMap(linear, decisions, now) {
  const items = linear.recentIssues.map((issue, index) => {
    const readiness = deriveWorkItemReadiness(issue);
    const relatedDecisions = decisions.filter((decision) => decision.linear_refs?.includes(issue.identifier)).slice(-3);

    return {
      id: issue.identifier,
      linearId: issue.id,
      title: issue.title,
      state: issue.state,
      stateType: issue.stateType,
      priority: issue.priority,
      updatedAt: issue.updatedAt,
      project: issue.project || null,
      url: issue.url,
      readiness,
      blockerReason: readiness === "blocked" ? `Linear state is ${issue.state}.` : null,
      dependencyIds: [],
      decisionIds: relatedDecisions.map((decision) => decision.id),
      rank: index + 1,
      visibility: "public",
    };
  });

  const readyItems = items.filter((item) => item.readiness === "ready");
  const blockedItems = items.filter((item) => item.readiness === "blocked");
  const doneItems = items.filter((item) => item.readiness === "done");

  return {
    schemaVersion: WORK_SCHEMA_VERSION,
    generatedAt: safeNow(now).toISOString(),
    summary: {
      total: items.length,
      ready: readyItems.length,
      blocked: blockedItems.length,
      done: doneItems.length,
      topReady: readyItems.slice(0, 6).map((item) => ({
        id: item.id,
        title: item.title,
        priority: item.priority,
        project: item.project,
        url: item.url,
      })),
    },
    items,
  };
}

function buildEvidenceIndex(git, linear, decisions, activeLaneSignals, now) {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    generatedAt: safeNow(now).toISOString(),
    commits: git.recentCommits.slice(0, 12).map((commit) => ({
      sha: commit.sha,
      head: commit.head,
      date: commit.date,
      subject: commit.subject,
    })),
    recentIssues: linear.recentIssues.slice(0, 12).map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      updatedAt: issue.updatedAt,
      url: issue.url,
      state: issue.state,
    })),
    decisions: decisions.slice(-25).reverse().map((decision) => ({
      id: decision.id,
      ts: decision.ts,
      client_id: decision.client_id,
      summary: decision.summary,
      linear_refs: decision.linear_refs || [],
      based_on_sha: decision.based_on_sha,
    })),
    laneSignals: activeLaneSignals,
    sources: [
      "git HEAD and recent commits",
      "Linear active projects and recent issues",
      "append-only PM decision log",
    ],
  };
}

function buildConflictRecords(legacyWarnings, linear, clientsRegistry, now) {
  const records = [];

  for (const warning of legacyWarnings) {
    if (!warning.pointsToStartupContract || warning.substantivePmContent) {
      records.push({
        id: `legacy-${slugify(warning.path)}`,
        kind: "legacy-entrypoint-drift",
        severity: "high",
        status: "open",
        path: warning.path,
        summary: `Legacy PM source ${warning.path} no longer behaves like a redirect.`,
        detected_at: safeNow(now).toISOString(),
      });
    }
  }

  if (linear.mode !== "live") {
    records.push({
      id: "linear-not-live",
      kind: "tracker-freshness",
      severity: linear.mode === "last-known" ? "medium" : "high",
      status: "open",
      summary:
        linear.mode === "last-known"
          ? "Linear snapshot fell back to last-known state and should be refreshed before authoritative writes."
          : "Linear is unavailable, so tracker-derived PM state is degraded.",
      detected_at: safeNow(now).toISOString(),
    });
  }

  const missingBootstraps = clientsRegistry.clients.filter((client) => !client.bootstrapPath);
  for (const client of missingBootstraps) {
    records.push({
      id: `client-${client.id}-bootstrap-missing`,
      kind: "bootstrap-missing",
      severity: "high",
      status: "open",
      summary: `Client ${client.id} is missing a generated bootstrap path.`,
      detected_at: safeNow(now).toISOString(),
    });
  }

  return records;
}

function buildFreshnessNotes(git, linear, conflicts) {
  const notes = [];

  if (linear.mode === "live") {
    notes.push("Tracker data was refreshed live from Linear.");
  } else if (linear.mode === "last-known") {
    notes.push(
      `Linear could not be refreshed live, so tracker sections fell back to the last known snapshot (${linear.fetchedAt || "unknown date"}).`,
    );
  } else if (linear.mode === "skipped") {
    notes.push("Linear was intentionally skipped for this run, so tracker freshness is not authoritative.");
  } else {
    notes.push("Linear was unavailable; tracker sections are degraded until the next refresh.");
  }

  if (git.workingTreeDirty) {
    notes.push(
      "Working tree contains local edits. This bundle reports committed truth at HEAD and notes that local diffs exist.",
    );
  }

  if (conflicts.length) {
    notes.push("Attention-required conflicts are active. Read the Attention Required section before claiming startup truth is settled.");
  }

  return notes;
}

function buildDeepDiveDocs() {
  return [
    {
      path: "docs/agent-context/manifest.json",
      reason: "per-artifact freshness, hashes, schema versions, and TTLs",
    },
    {
      path: "docs/agent-context/work.json",
      reason: "remaining work queue, readiness, and issue ordering",
    },
    {
      path: "docs/agent-context/evidence.json",
      reason: "commits, issues, and decisions backing current PM claims",
    },
    {
      path: "docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json",
      reason: "machine-readable Orders runtime verdicts and next move",
    },
    {
      path: "docs/TESTING.md",
      reason: "canonical verification commands and E2E guidance",
    },
  ];
}

function buildState({
  git,
  linear,
  work,
  evidence,
  decisions,
  clientsRegistry,
  activeLaneSignals,
  legacyWarnings,
  conflicts,
  now,
  reason,
  paths,
}) {
  const trustLadder = summarizeTrustLadder(clientsRegistry);
  const freshnessNotes = buildFreshnessNotes(git, linear, conflicts);

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    generatedAt: safeNow(now).toISOString(),
    generator: {
      script: "scripts/agent-context/generate-agent-context.mjs",
      reason,
      linearLookbackDays: LINEAR_LOOKBACK_DAYS,
      artifactTtls: ARTIFACT_TTLS,
    },
    startupContract: {
      readFirst: [
        "AGENTS.md",
        "CLAUDE.md",
        `${paths.sharedOutputDir}/START_HERE.md`,
        `${paths.sharedOutputDir}/manifest.json`,
        "docs/agent-context/START_HERE.md",
        "docs/agent-context/manifest.json",
      ],
      entrypoint: "docs/agent-context/START_HERE.md",
      manifest: "docs/agent-context/manifest.json",
      machineState: "docs/agent-context/state.json",
      workMap: "docs/agent-context/work.json",
      decisionLog: "docs/agent-context/decisions.ndjson",
      clientsRegistry: "docs/agent-context/clients.json",
      evidenceIndex: "docs/agent-context/evidence.json",
      proposalsDir: "docs/agent-context/proposals",
      bootstrapsDir: "docs/agent-context/bootstrap",
      runbook: "docs/runbooks/PERSISTENT_PM_SYSTEM.md",
      sharedLiveBundleDir: paths.sharedOutputDir,
      sharedManifest: paths.sharedManifestPath,
      sharedEntryPoint: paths.sharedStartHerePath,
      sharedState: paths.sharedStatePath,
      sharedWorkMap: paths.sharedWorkPath,
      sharedLocatorCommand: "git rev-parse --git-common-dir",
      refreshCommand: "pnpm context:refresh",
      checkCommand: "pnpm context:check",
      checkpointCommand: "pnpm pm:checkpoint",
      onboardCommand: "pnpm pm:onboard -- <client-name>",
      servicesInstallCommand: "pnpm pm:services:install",
      doNotTreatAsCurrentTruth: LEGACY_DOCS.map(([relativePath]) => relativePath),
    },
    freshness: {
      status:
        linear.mode === "live" && !conflicts.length
          ? "fresh"
          : linear.mode === "live"
            ? "attention-required"
            : linear.mode === "last-known"
              ? "partial"
              : "degraded",
      notes: freshnessNotes,
    },
    git,
    linear,
    direction: buildDirection(git, linear, decisions),
    trustModel: {
      defaultNewClientTrust: clientsRegistry.defaultTrustLevel,
      firstClassWriters: trustLadder["first-class-writer"],
      conditionalFirstClassWriters: trustLadder["conditional-first-class-writer"],
      mediatedWriters: trustLadder["mediated-writer"],
      readOnly: trustLadder["read-only"],
    },
    decisions: buildDecisionSummary(decisions),
    work: {
      path: "docs/agent-context/work.json",
      summary: work.summary,
    },
    evidence: {
      path: "docs/agent-context/evidence.json",
      commits: evidence.commits.length,
      decisions: evidence.decisions.length,
      issues: evidence.recentIssues.length,
    },
    publicMirror: {
      path: "docs/agent-context/public",
      artifacts: [...PUBLIC_ARTIFACTS],
      workflow: ".github/workflows/agent-context-pages.yml",
    },
    mediator: {
      mcpServer: "scripts/agent-context/pm-mcp-server.mjs",
      linearReconciler: "scripts/agent-context/pm-linear-reconciler.mjs",
      publisher: "scripts/agent-context/pm-publisher.mjs",
      checkpointCli: "scripts/agent-context/pm-checkpoint.mjs",
    },
    repoTruthHierarchy: [
      "`docs/agent-context/manifest.json` for freshness and artifact integrity.",
      "`docs/agent-context/state.json` for machine-readable PM state and trust rules.",
      "`docs/agent-context/work.json` for remaining work order and blockers.",
      "`docs/agent-context/decisions.ndjson` for settled PM decisions and rationale.",
      "Current code, tests, git history, and runtime evidence when docs and tracker narratives disagree.",
      "Linear issue and project state for live execution direction.",
      "Legacy docs only as background, never as silent current truth.",
    ],
    attentionRequired: conflicts,
    activeLaneSignals: activeLaneSignals ? [activeLaneSignals] : [],
    deepDiveDocs: buildDeepDiveDocs(),
    legacyWarnings,
  };
}

function relativePathsForClients(clientsRegistry) {
  return clientsRegistry.clients
    .filter((client) => client.bootstrapPath)
    .sort((a, b) => trustSortRank(a.trustLevel) - trustSortRank(b.trustLevel) || a.name.localeCompare(b.name))
    .map((client) => ({
      name: client.name,
      path: client.bootstrapPath,
      trustLevel: client.trustLevel,
    }));
}

function formatProject(project) {
  return `- \`${project.name}\` [${project.state}] updated ${isoDate(project.updatedAt)} - ${project.url}`;
}

function formatIssue(issue) {
  const projectSuffix = issue.project ? ` | ${issue.project}` : "";
  return `- \`${issue.identifier}\` (${issue.priority}, ${isoDate(issue.updatedAt)}) - ${issue.title}${projectSuffix}`;
}

function formatLegacyWarning(warning) {
  const lastUpdated = warning.lastUpdated ? ` | declared last updated ${warning.lastUpdated}` : "";
  const redirectState = warning.pointsToStartupContract ? "redirects correctly" : "missing redirect";
  return `- \`${warning.path}\` - ${warning.reason}; ${redirectState}${lastUpdated}`;
}

function formatAttentionItem(conflict) {
  return `- [${conflict.severity}] ${conflict.summary}`;
}

function formatWorkItem(item) {
  return `- \`${item.id}\` (${item.priority}, ${item.readiness}) - ${item.title}${item.project ? ` | ${item.project}` : ""}`;
}

function formatTrustLadder(state) {
  const lines = [];
  if (state.trustModel.firstClassWriters.length) {
    lines.push(`- First-class writers: ${state.trustModel.firstClassWriters.join(", ")}`);
  }
  if (state.trustModel.conditionalFirstClassWriters.length) {
    lines.push(
      `- Conditional first-class writers: ${state.trustModel.conditionalFirstClassWriters.join(", ")} (drop to mediated-writer until local refresh/check support is validated).`,
    );
  }
  if (state.trustModel.mediatedWriters.length) {
    lines.push(`- Mediated writers: ${state.trustModel.mediatedWriters.join(", ")}`);
  }
  if (state.trustModel.readOnly.length) {
    lines.push(`- Read-only by default: ${state.trustModel.readOnly.join(", ")}`);
  }
  return lines.join("\n");
}

function renderPrivateStartHere(state, work, clientsRegistry) {
  const projectLines = state.linear.activeProjects.length
    ? state.linear.activeProjects.map(formatProject)
    : ["- No live project snapshot available in this refresh."];
  const issueLines = state.linear.recentIssues.length
    ? state.linear.recentIssues.map(formatIssue)
    : ["- No live issue snapshot available in this refresh."];
  const laneLines = state.activeLaneSignals.length
    ? state.activeLaneSignals.map((signal) => {
        return `- Orders runtime: \`${signal.gate}\` / \`${signal.gateVerdict}\` (updated ${signal.updatedAt}) - ${signal.nextMove}`;
      })
    : ["- No program-specific machine state was detected."];
  const attentionLines = state.attentionRequired.length
    ? state.attentionRequired.map(formatAttentionItem)
    : ["- No open PM conflicts are currently recorded."];
  const workLines = work.summary.topReady.length
    ? work.summary.topReady.map((item) => formatWorkItem({ ...item, readiness: "ready" }))
    : ["- No ready work items are currently surfaced."];

  return `# TERP Persistent PM

> Generated file. Manual edits will be overwritten by \`${state.generator.script}\`.

## Snapshot

- Generated: \`${state.generatedAt}\`
- Freshness status: \`${state.freshness.status}\`
- Manifest: \`${state.startupContract.manifest}\`
- Refresh command: \`${state.startupContract.refreshCommand}\`
- Drift check: \`${state.startupContract.checkCommand}\`
- Git anchor: \`${state.git.shortHead}\` on branch \`${state.git.branch}\`
- Working tree dirty: \`${state.git.workingTreeDirty}\`
- Linear mode: \`${state.linear.mode}\`
- Decision log count: \`${state.decisions.total}\`

## Canonical PM Bundle

- \`docs/agent-context/START_HERE.md\` - human-readable PM bootstrap
- \`docs/agent-context/manifest.json\` - freshness, TTLs, and artifact hashes
- \`docs/agent-context/state.json\` - machine-readable PM state and trust ladder
- \`docs/agent-context/work.json\` - remaining work queue and readiness ordering
- \`docs/agent-context/evidence.json\` - proof pointers backing current claims
- \`docs/agent-context/decisions.ndjson\` - append-only PM decision log
- \`docs/agent-context/clients.json\` - client registry and trust levels
- \`docs/agent-context/bootstrap/\` - per-surface startup instructions and paste-in prompts

## Shared Live Bundle For All TERP Worktrees

- Shared bundle root: \`${state.startupContract.sharedLiveBundleDir}\`
- Shared entrypoint: \`${state.startupContract.sharedEntryPoint}\`
- Shared manifest: \`${state.startupContract.sharedManifest}\`
- Shared machine state: \`${state.startupContract.sharedState}\`
- Shared work map: \`${state.startupContract.sharedWorkMap}\`
- Locator command: \`${state.startupContract.sharedLocatorCommand}\`

## Start Here

1. Read \`AGENTS.md\`.
2. Read \`CLAUDE.md\`.
3. If you are in any TERP worktree, prefer the shared live bundle under \`${state.startupContract.sharedLiveBundleDir}\`.
4. Read this file or the shared entrypoint.
5. Confirm freshness and hashes in the shared or repo-local \`manifest.json\`.
6. Use the shared or repo-local \`state.json\` and \`work.json\` for machine-readable truth.
7. If you are resuming from a hosted, cloud, or newly onboarded surface, load the matching file under \`docs/agent-context/bootstrap/\`.
8. Never treat \`product-management/START_HERE.md\`, \`docs/ACTIVE_SESSIONS.md\`, or old prompt-pack docs as authoritative PM state.

## Current Direction

${state.direction.summary}

${state.direction.focusAreas.map((focusArea) => `- ${focusArea}`).join("\n")}

## Trust Ladder

${formatTrustLadder(state)}

## Attention Required

${attentionLines.join("\n")}

## Freshness Notes

${state.freshness.notes.map((note) => `- ${note}`).join("\n")}

## Top Ready Work

${workLines.join("\n")}

## Active Projects

${projectLines.join("\n")}

## Recent High-Signal Issues

${issueLines.join("\n")}

## Program-Specific Machine State

${laneLines.join("\n")}

## Recent PM Bootstraps

${relativePathsForClients(clientsRegistry)
  .map((entry) => `- \`${entry.path}\` - ${entry.name} [${entry.trustLevel}]`)
  .join("\n")}

## What Not To Trust As Current Startup Truth

${state.legacyWarnings.map(formatLegacyWarning).join("\n")}

## Keep This Fresh

- Run \`${state.startupContract.refreshCommand}\` after meaningful checkpoints, before remote-agent handoff, and after merges to \`main\`.
- Run \`${state.startupContract.checkCommand}\` before claiming the PM bundle is fresh enough for authoritative work.
- Every refresh/checkpoint also updates the shared live bundle in \`${state.startupContract.sharedLiveBundleDir}\` so other TERP worktrees can see the same PM state.
- Never hand-edit \`state.json\`, \`work.json\`, \`evidence.json\`, or \`manifest.json\`.
- First-class writers should mutate PM state only through the mediator (\`pm.appendDecision\` / \`pm.checkpoint\`) or an intentional PR append to \`decisions.ndjson\`.
`;
}

function renderPublicStartHere(state, work, _clientsRegistry) {
  const attentionLines = state.attentionRequired.length
    ? state.attentionRequired.map(formatAttentionItem)
    : ["- No open PM conflicts are currently surfaced."];
  const workLines = work.summary.topReady.length
    ? work.summary.topReady.map((item) => formatWorkItem({ ...item, readiness: "ready" }))
    : ["- No ready work items are currently surfaced."];

  return `# TERP Persistent PM

> Sanitized public mirror. Generated from the repo-backed PM bundle.

## Snapshot

- Generated: \`${state.generatedAt}\`
- Freshness status: \`${state.freshness.status}\`
- Git anchor: \`${state.git.shortHead}\`
- Linear mode: \`${state.linear.mode}\`

## Public Read Order

1. Read \`manifest.json\` and confirm the PM bundle is fresh enough for your task.
2. Read this file.
3. Use \`state.json\` for machine-readable PM state and \`work.json\` for remaining work order.
4. If you are a hosted or newly onboarded surface, use the matching bootstrap file from the private repo or ask for the paste-in bootstrap packet.
5. If you need to change PM state from a hosted or read-only surface, emit a structured proposal instead of editing generated files directly.

## Current Direction

${state.direction.summary}

${state.direction.focusAreas.map((focusArea) => `- ${focusArea}`).join("\n")}

## Trust Ladder

${formatTrustLadder(state)}

## Attention Required

${attentionLines.join("\n")}

## Top Ready Work

${workLines.join("\n")}
`;
}

function buildProposalBlockExample() {
  return `PROPOSED_DECISION:
summary: <one sentence>
rationale: <why this should change PM state>
linear_refs:
  - TER-123
based_on_sha: <git sha you read from manifest or git>
visibility: private`;
}

function renderClientBootstrap(client, state) {
  const hostedNote = client.pushBeforeHosted
    ? "- Before switching to this hosted surface, push the relevant local branch to origin. Hosted reads only see pushed git state and the public mirror."
    : "";
  const readLines = client.readPaths.map((entry) => `- ${entry}`);
  const fallbackLines = client.fallbackReadPaths.map((entry) => `- ${entry}`);
  const startupSteps = client.readPaths.includes("shared-live-bundle")
    ? [
        `1. Resolve the shared TERP PM bundle from \`${state.startupContract.sharedLiveBundleDir}\` (discoverable from \`${state.startupContract.sharedLocatorCommand}\`).`,
        "2. Read the shared `manifest.json` and make sure the PM bundle is fresh enough for your task.",
        "3. Read the shared `START_HERE.md`.",
        "4. Read the shared `state.json` and `work.json`.",
        "5. If you need proof behind a PM claim, read `docs/agent-context/evidence.json` or the shared mirror.",
        "6. Do not treat `product-management/START_HERE.md`, legacy prompt packs, or chat memory as PM authority.",
      ]
    : [
        "1. Read `docs/agent-context/manifest.json` and make sure the PM bundle is fresh enough for your task.",
        "2. Read `docs/agent-context/START_HERE.md`.",
        "3. Read `docs/agent-context/state.json` and `docs/agent-context/work.json`.",
        "4. If you need proof behind a PM claim, read `docs/agent-context/evidence.json`.",
        "5. Do not treat `product-management/START_HERE.md`, legacy prompt packs, or chat memory as PM authority.",
      ];
  const writerInstructions =
    client.trustLevel === "read-only"
      ? [
          "- This surface is read-only by default. Do not edit generated PM files or claim authoritative PM writes from here.",
          `- If PM state must change, emit the following block for a trusted local writer to promote:\n\n\`\`\`text\n${buildProposalBlockExample()}\n\`\`\``,
        ]
      : client.trustLevel === "mediated-writer"
        ? [
            "- This surface is a mediated writer. Land PM-affecting changes through PRs or proposal files, not direct generated-file edits.",
            "- If you need to update PM state, append to `decisions.ndjson` through a PR or emit a proposal that a trusted local writer will promote.",
          ]
        : [
            "- This surface may write PM state only through the mediator (`pm.read`, `pm.appendDecision`, `pm.checkpoint`, `pm.proposeChange`) or a reviewed PR append to `decisions.ndjson`.",
            "- Never hand-edit `state.json`, `work.json`, `evidence.json`, `manifest.json`, or public mirror files.",
          ];

  return `# PM Bootstrap: ${client.name}

## Surface

- Client id: \`${client.id}\`
- Surface: \`${client.surface}\`
- Trust level: \`${client.trustLevel}\`
- Write mode: \`${client.writeMode}\`

## Read Order

${readLines.join("\n")}

## Fallback Read Order

${fallbackLines.join("\n")}

## Startup Steps

${startupSteps.join("\n")}

${hostedNote}

## Write Rules

${writerInstructions.join("\n")}

## Notes

- ${client.notes}
- If \`manifest.json\` or \`state.json\` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.

## Paste-In Prompt

\`\`\`text
You are resuming TERP using the repo-backed persistent PM system on the ${client.name} surface.

Source of truth:
- docs/agent-context/START_HERE.md
- docs/agent-context/manifest.json
- docs/agent-context/state.json
- docs/agent-context/work.json
- docs/agent-context/decisions.ndjson

Rules:
- Read START_HERE, manifest, state, and work before acting.
- Do not treat chat history, product-management/START_HERE.md, or legacy docs as PM authority.
- Trust level for this surface: ${client.trustLevel}.
- Write mode for this surface: ${client.writeMode}.
- Never hand-edit generated PM files.
- If PM state changes, route them through the allowed path for this surface.
- If the manifest is stale, degraded, or points at an older git SHA than the work you need, stop and refresh or request refreshed state before authoritative actions.

Current PM summary:
${state.direction.summary}
\`\`\`
`;
}

function renderBootstrapReadme(clientsRegistry) {
  return `# TERP PM Bootstraps

Generated bootstrap files for each PM-capable surface. Use the matching file whenever a client does not automatically inherit the local repo protocol or when you are handing the PM system to a hosted, remote, or newly onboarded model.

## Available Bootstraps

${relativePathsForClients(clientsRegistry).map((entry) => `- \`${entry.path}\` - ${entry.name}`).join("\n")}

## Universal Bootstrap

- \`docs/agent-context/bootstrap/any-llm.md\` - default read-only bootstrap for a newly onboarded model or any surface without a validated adapter.
`;
}

function buildInputsHash(git, linear, clientsRegistry, decisions, conflicts, activeLaneSignals) {
  return sha256(
    stableStringify({
      gitHead: git.head,
      gitBranch: git.branch,
      linearMode: linear.mode,
      linearLatestIssueUpdatedAt: linear.latestIssueUpdatedAt,
      clientsHash: sha256(stableStringify(clientsRegistry)),
      decisionsHash: sha256(stableStringify(decisions)),
      conflictsHash: sha256(stableStringify(conflicts)),
      activeLaneSignals,
    }),
  );
}

function buildArtifactEntry({
  relativePath: _relativePath,
  generatedAt,
  gitSha,
  inputsHash,
  schemaVersion,
  ttlSeconds,
  contentHash,
  visibility,
  selfHashStrategy = null,
}) {
  return {
    generated_at: generatedAt,
    git_sha: gitSha,
    inputs_hash: inputsHash,
    schema_version: schemaVersion,
    ttl_seconds: ttlSeconds,
    content_hash: contentHash,
    visibility,
    self_hash_strategy: selfHashStrategy,
  };
}

function renderManifestPayload(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function computeManifestSelfHash(text) {
  const parsed = JSON.parse(text);
  if (parsed.artifacts?.["manifest.json"]) {
    parsed.artifacts["manifest.json"].content_hash = null;
  }
  if (parsed.artifacts?.["public/manifest.json"]) {
    parsed.artifacts["public/manifest.json"].content_hash = null;
  }
  return sha256(renderManifestPayload(parsed));
}

function computePublicManifestSelfHash(text) {
  const parsed = JSON.parse(text);
  if (parsed.artifacts?.["manifest.json"]) {
    parsed.artifacts["manifest.json"].content_hash = null;
  }
  return sha256(renderManifestPayload(parsed));
}

function sanitizeStateForPublic(state) {
  return {
    schemaVersion: state.schemaVersion,
    generatedAt: state.generatedAt,
    startupContract: {
      entrypoint: "START_HERE.md",
      manifest: "manifest.json",
      machineState: "state.json",
      workMap: "work.json",
    },
    freshness: state.freshness,
    git: {
      branch: state.git.branch,
      head: state.git.head,
      shortHead: state.git.shortHead,
      workingTreeDirty: state.git.workingTreeDirty,
      recentCommits: state.git.recentCommits.slice(0, 10).map((commit) => ({
        date: commit.date,
        sha: commit.sha,
        subject: commit.subject,
      })),
    },
    linear: {
      mode: state.linear.mode,
      fetchedAt: state.linear.fetchedAt,
      latestIssueUpdatedAt: state.linear.latestIssueUpdatedAt,
      activeProjects: state.linear.activeProjects,
      recentIssues: state.linear.recentIssues.map((issue) => ({
        identifier: issue.identifier,
        title: issue.title,
        priority: issue.priority,
        updatedAt: issue.updatedAt,
        url: issue.url,
        state: issue.state,
        project: issue.project,
      })),
    },
    direction: state.direction,
    trustModel: state.trustModel,
    decisions: {
      total: state.decisions.total,
      latestAt: state.decisions.latestAt,
    },
    work: state.work,
    publicMirror: state.publicMirror,
    attentionRequired: state.attentionRequired,
  };
}

function sanitizeManifestForPublic(manifestPayload) {
  const publicArtifacts = {};
  for (const [relativePath, entry] of Object.entries(manifestPayload.artifacts)) {
    if (relativePath.startsWith("public/")) {
      publicArtifacts[relativePath.replace(/^public\//, "")] = {
        generated_at: entry.generated_at,
        git_sha: entry.git_sha,
        inputs_hash: entry.inputs_hash,
        schema_version: entry.schema_version,
        ttl_seconds: entry.ttl_seconds,
        content_hash: entry.content_hash,
        visibility: "public",
        self_hash_strategy: entry.self_hash_strategy ?? null,
      };
    }
  }

  return {
    schema_version: manifestPayload.schema_version,
    generated_at: manifestPayload.generated_at,
    git_sha: manifestPayload.git_sha,
    git_branch: manifestPayload.git_branch,
    inputs_hash: manifestPayload.inputs_hash,
    linear_mode: manifestPayload.linear_mode,
    linear_latest_issue_updated_at: manifestPayload.linear_latest_issue_updated_at,
    artifacts: publicArtifacts,
  };
}

function buildHealthPayload({ state, manifest, conflicts, now, previousHealth, publishAt }) {
  return {
    schemaVersion: HEALTH_SCHEMA_VERSION,
    generated_at: safeNow(now).toISOString(),
    last_generate: state.generatedAt,
    last_publish: publishAt ? safeNow(publishAt).toISOString() : previousHealth?.last_publish || state.generatedAt,
    conflicts_count: conflicts.length,
    stale_artifacts: Object.entries(manifest.artifacts)
      .filter(([, entry]) => entry.ttl_seconds && ageSeconds(entry.generated_at) > entry.ttl_seconds)
      .map(([relativePath]) => relativePath),
    mini_status: process.env.PM_MINI_STATUS || previousHealth?.mini_status || "unknown",
  };
}

function removeStaleGeneratedFiles(dirPath, desiredNames) {
  if (!existsSync(dirPath)) {
    return;
  }

  for (const entry of readdirSync(dirPath)) {
    if (!desiredNames.has(entry)) {
      rmSync(path.join(dirPath, entry), { recursive: true, force: true });
    }
  }
}

export async function buildContextBundle(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const now = safeNow(options.now);
  const reason = options.reason || "manual-refresh";
  const paths = getPmPaths(repoRoot);

  seedStaticFiles(paths, now);

  const previousState = readJson(preferSharedPath(paths.statePath, paths.sharedStatePath));
  const previousHealth = readJson(preferSharedPath(paths.healthPath, paths.sharedHealthPath));
  const clientsRegistry = readJson(preferSharedPath(paths.clientsPath, paths.sharedClientsPath));
  validateClientsRegistry(clientsRegistry);

  const decisions = readNdjson(preferSharedPath(paths.decisionsPath, paths.sharedDecisionsPath));
  const git = getGitSnapshot(repoRoot);
  const linear = await getLinearSnapshot(repoRoot, previousState, options);
  const activeLaneSignals = getOrdersRuntimeSignal(repoRoot);
  const legacyWarnings = buildLegacyWarnings(repoRoot);
  const conflicts = buildConflictRecords(legacyWarnings, linear, clientsRegistry, now);
  const work = buildWorkMap(linear, decisions, now);
  const evidence = buildEvidenceIndex(git, linear, decisions, activeLaneSignals ? [activeLaneSignals] : [], now);
  const state = buildState({
    git,
    linear,
    work,
    evidence,
    decisions,
    clientsRegistry,
    activeLaneSignals,
    legacyWarnings,
    conflicts,
    now,
    reason,
    paths,
  });
  const inputsHash = buildInputsHash(git, linear, clientsRegistry, decisions, conflicts, activeLaneSignals);

  const bootstrapFiles = {};
  for (const client of clientsRegistry.clients) {
    bootstrapFiles[client.bootstrapPath.replace(/^docs\/agent-context\//, "")] = renderClientBootstrap(client, state);
  }
  bootstrapFiles["bootstrap/README.md"] = renderBootstrapReadme(clientsRegistry);
  bootstrapFiles["bootstrap/any-llm.md"] = renderClientBootstrap(
    clientsRegistry.clients.find((client) => client.id === "new-model-template"),
    state,
  );

  const privateStartHere = renderPrivateStartHere(state, work, clientsRegistry);
  const publicStartHere = renderPublicStartHere(state, work, clientsRegistry);
  const publicState = sanitizeStateForPublic(state);
  const health = buildHealthPayload({
    state,
    manifest: { artifacts: {} },
    conflicts,
    now,
    previousHealth,
    publishAt: options.publishAt,
  });

  const fileContents = {
    "START_HERE.md": privateStartHere,
    "state.json": `${stableStringify(state)}\n`,
    "work.json": `${stableStringify(work)}\n`,
    "evidence.json": `${stableStringify(evidence)}\n`,
    "health.json": `${stableStringify(health)}\n`,
    "conflicts.ndjson": `${conflicts.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    ...Object.fromEntries(Object.entries(bootstrapFiles).map(([relativePath, content]) => [relativePath, `${content}\n`])),
    "public/START_HERE.md": publicStartHere,
    "public/state.json": `${stableStringify(publicState)}\n`,
    "public/work.json": `${stableStringify(work)}\n`,
    "public/health.json": `${stableStringify(health)}\n`,
  };

  validateNoPublicLeaks("public/START_HERE.md", fileContents["public/START_HERE.md"]);
  validateNoPublicLeaks("public/state.json", fileContents["public/state.json"]);
  validateNoPublicLeaks("public/work.json", fileContents["public/work.json"]);
  validateNoPublicLeaks("public/health.json", fileContents["public/health.json"]);

  const manifestArtifacts = {
    "START_HERE.md": buildArtifactEntry({
      relativePath: "START_HERE.md",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: STATE_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS["START_HERE.md"],
      contentHash: sha256(fileContents["START_HERE.md"]),
      visibility: "private",
    }),
    "state.json": buildArtifactEntry({
      relativePath: "state.json",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: STATE_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS["state.json"],
      contentHash: sha256(fileContents["state.json"]),
      visibility: "private",
    }),
    "work.json": buildArtifactEntry({
      relativePath: "work.json",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: WORK_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS["work.json"],
      contentHash: sha256(fileContents["work.json"]),
      visibility: "private",
    }),
    "evidence.json": buildArtifactEntry({
      relativePath: "evidence.json",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS["evidence.json"],
      contentHash: sha256(fileContents["evidence.json"]),
      visibility: "private",
    }),
    "health.json": buildArtifactEntry({
      relativePath: "health.json",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: HEALTH_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS["health.json"],
      contentHash: sha256(fileContents["health.json"]),
      visibility: "private",
    }),
    "clients.json": buildArtifactEntry({
      relativePath: "clients.json",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: CLIENTS_SCHEMA_VERSION,
      ttlSeconds: null,
      contentHash: sha256(readText(paths.clientsPath)),
      visibility: "private",
    }),
    "decisions.ndjson": buildArtifactEntry({
      relativePath: "decisions.ndjson",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: DECISION_SCHEMA_VERSION,
      ttlSeconds: null,
      contentHash: sha256(readText(paths.decisionsPath)),
      visibility: "private",
    }),
    "conflicts.ndjson": buildArtifactEntry({
      relativePath: "conflicts.ndjson",
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: WORK_SCHEMA_VERSION,
      ttlSeconds: null,
      contentHash: sha256(fileContents["conflicts.ndjson"]),
      visibility: "private",
    }),
  };

  for (const [relativePath, content] of Object.entries(bootstrapFiles)) {
    manifestArtifacts[relativePath] = buildArtifactEntry({
      relativePath,
      generatedAt: state.generatedAt,
      gitSha: git.head,
      inputsHash,
      schemaVersion: CLIENTS_SCHEMA_VERSION,
      ttlSeconds: ARTIFACT_TTLS[relativePath] || 3600,
      contentHash: sha256(`${content}\n`),
      visibility: "private",
    });
  }

  manifestArtifacts["public/START_HERE.md"] = buildArtifactEntry({
    relativePath: "public/START_HERE.md",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: STATE_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["public/START_HERE.md"],
    contentHash: sha256(fileContents["public/START_HERE.md"]),
    visibility: "public",
  });
  manifestArtifacts["public/state.json"] = buildArtifactEntry({
    relativePath: "public/state.json",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: STATE_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["public/state.json"],
    contentHash: sha256(fileContents["public/state.json"]),
    visibility: "public",
  });
  manifestArtifacts["public/work.json"] = buildArtifactEntry({
    relativePath: "public/work.json",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: WORK_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["public/work.json"],
    contentHash: sha256(fileContents["public/work.json"]),
    visibility: "public",
  });
  manifestArtifacts["public/health.json"] = buildArtifactEntry({
    relativePath: "public/health.json",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: HEALTH_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["public/health.json"],
    contentHash: sha256(fileContents["public/health.json"]),
    visibility: "public",
  });
  manifestArtifacts["manifest.json"] = buildArtifactEntry({
    relativePath: "manifest.json",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["manifest.json"],
    contentHash: null,
    visibility: "private",
    selfHashStrategy: "content-hash-null-placeholder",
  });
  manifestArtifacts["public/manifest.json"] = buildArtifactEntry({
    relativePath: "public/manifest.json",
    generatedAt: state.generatedAt,
    gitSha: git.head,
    inputsHash,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    ttlSeconds: ARTIFACT_TTLS["public/manifest.json"],
    contentHash: null,
    visibility: "public",
    selfHashStrategy: "content-hash-null-placeholder",
  });

  const manifestPayload = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    generated_at: state.generatedAt,
    git_sha: git.head,
    git_branch: git.branch,
    inputs_hash: inputsHash,
    linear_mode: linear.mode,
    linear_latest_issue_updated_at: linear.latestIssueUpdatedAt,
    artifacts: manifestArtifacts,
  };

  const manifestBaseText = renderManifestPayload(manifestPayload);
  const manifestHash = computeManifestSelfHash(manifestBaseText);
  manifestPayload.artifacts["manifest.json"].content_hash = manifestHash;

  const publicManifestPayload = sanitizeManifestForPublic(manifestPayload);
  const publicManifestBaseText = renderManifestPayload(publicManifestPayload);
  const publicManifestHash = computePublicManifestSelfHash(publicManifestBaseText);
  publicManifestPayload.artifacts["manifest.json"].content_hash = publicManifestHash;
  manifestPayload.artifacts["public/manifest.json"].content_hash = publicManifestHash;

  const finalManifestText = renderManifestPayload(manifestPayload);
  const finalPublicManifestText = renderManifestPayload(publicManifestPayload);

  fileContents["manifest.json"] = finalManifestText;
  fileContents["public/manifest.json"] = finalPublicManifestText;

  return {
    repoRoot,
    paths,
    git,
    linear,
    state,
    work,
    evidence,
    conflicts,
    health,
    clientsRegistry,
    decisions,
    manifest: manifestPayload,
    publicManifest: publicManifestPayload,
    fileContents,
  };
}

export function writeContextBundle(bundle) {
  const { paths, fileContents } = bundle;
  const bootstrapNames = new Set(
    Object.keys(fileContents)
      .filter((relativePath) => relativePath.startsWith("bootstrap/"))
      .map((relativePath) => relativePath.replace(/^bootstrap\//, "")),
  );
  const publicNames = new Set(
    Object.keys(fileContents)
      .filter((relativePath) => relativePath.startsWith("public/"))
      .map((relativePath) => relativePath.replace(/^public\//, "")),
  );

  removeStaleGeneratedFiles(paths.bootstrapDir, bootstrapNames);
  removeStaleGeneratedFiles(paths.sharedBootstrapDir, bootstrapNames);
  removeStaleGeneratedFiles(paths.publicDir, publicNames);
  removeStaleGeneratedFiles(paths.sharedPublicDir, publicNames);

  for (const [relativePath, content] of Object.entries(fileContents)) {
    const isPublic = relativePath.startsWith("public/");
    const isBootstrap = relativePath.startsWith("bootstrap/");
    const relativeLeaf = relativePath.replace(/^public\//, "").replace(/^bootstrap\//, "");
    const primaryTargetPath = isPublic
      ? path.join(paths.publicDir, relativeLeaf)
      : isBootstrap
        ? path.join(paths.bootstrapDir, relativeLeaf)
        : path.join(paths.outputDir, relativePath);
    const sharedTargetPath = isPublic
      ? path.join(paths.sharedPublicDir, relativeLeaf)
      : isBootstrap
        ? path.join(paths.sharedBootstrapDir, relativeLeaf)
        : path.join(paths.sharedOutputDir, relativePath);

    writeText(primaryTargetPath, content);
    writeText(sharedTargetPath, content);
  }

  syncMirroredText(paths.clientsPath, paths.sharedClientsPath, JSON.stringify(DEFAULT_CLIENTS_REGISTRY, null, 2));
  syncMirroredText(paths.decisionsPath, paths.sharedDecisionsPath, "");
  syncMirroredText(paths.conflictsPath, paths.sharedConflictsPath, "");
  syncMirroredDir(paths.proposalsDir, paths.sharedProposalsDir);
  writeText(paths.productManagementPath, LEGACY_REDIRECT_STUB);
}

async function generateContextUnlocked(options = {}) {
  const bundle = await buildContextBundle(options);
  writeContextBundle(bundle);
  return bundle;
}

export async function generateContext(options = {}) {
  if (options.skipWriteLock) {
    return generateContextUnlocked(options);
  }

  const task = await runExclusivePmTask({
    repoRoot: options.repoRoot,
    taskName: "pm-write",
    lockTtlSeconds: 900,
    waitTimeoutSeconds: 120,
    pollIntervalMs: 75,
    run: () =>
      generateContextUnlocked({
        ...options,
        skipWriteLock: true,
      }),
  });

  return task.result;
}

function normalizeLegacyDocCheck(repoRoot, relativePath) {
  const text = readText(path.join(repoRoot, relativePath));
  return {
    relativePath,
    exists: Boolean(text),
    pointsToStartup: text.includes("docs/agent-context/START_HERE.md"),
    isRedirectStub: relativePath === "product-management/START_HERE.md" ? text.trim() === LEGACY_REDIRECT_STUB.trim() : true,
  };
}

export async function validateContextBundle(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const paths = getPmPaths(repoRoot);

  const manifest = readJson(paths.manifestPath);
  const state = readJson(paths.statePath);
  const clientsRegistry = readJson(paths.clientsPath);
  const health = readJson(paths.healthPath);
  const sharedManifest = readJson(paths.sharedManifestPath);
  const sharedState = readJson(paths.sharedStatePath);
  const problems = [];
  const warnings = [];

  if (!manifest) {
    problems.push("Missing docs/agent-context/manifest.json. Run pnpm context:refresh first.");
    return { repoRoot, manifest, state, health, problems, warnings };
  }
  if (!state) {
    problems.push("Missing docs/agent-context/state.json. Run pnpm context:refresh first.");
    return { repoRoot, manifest, state, health, problems, warnings };
  }
  if (!sharedManifest) {
    problems.push("Missing shared PM manifest under the git common dir. Run pnpm context:refresh first.");
  }
  if (!sharedState) {
    problems.push("Missing shared PM state under the git common dir. Run pnpm context:refresh first.");
  }

  try {
    validateClientsRegistry(clientsRegistry);
  } catch (error) {
    problems.push(error.message);
  }

  for (const [relativePath, entry] of Object.entries(manifest.artifacts || {})) {
    const targetPath = relativePath.startsWith("public/")
      ? path.join(paths.publicDir, relativePath.replace(/^public\//, ""))
      : relativePath.startsWith("bootstrap/")
        ? path.join(paths.bootstrapDir, relativePath.replace(/^bootstrap\//, ""))
        : path.join(paths.outputDir, relativePath);

    if (!existsSync(targetPath)) {
      problems.push(`Manifest expects ${relativePath}, but the file is missing.`);
      continue;
    }

    if (entry.ttl_seconds && ageSeconds(entry.generated_at) > entry.ttl_seconds) {
      problems.push(`${relativePath} is stale (${ageSeconds(entry.generated_at)}s old, ttl ${entry.ttl_seconds}s).`);
    }

    const content = readText(targetPath);
    if (relativePath === "manifest.json") {
      const computed = computeManifestSelfHash(content);
      if (entry.content_hash && computed !== entry.content_hash) {
        problems.push(`Manifest self-hash drift detected for ${relativePath}.`);
      }
      continue;
    }
    if (relativePath === "public/manifest.json") {
      const computed = computePublicManifestSelfHash(content);
      if (entry.content_hash && computed !== entry.content_hash) {
        problems.push(`Manifest self-hash drift detected for ${relativePath}.`);
      }
      continue;
    }
    if (entry.content_hash && sha256(content) !== entry.content_hash) {
      problems.push(`Content hash drift detected for ${relativePath}.`);
    }
    if (relativePath.startsWith("public/")) {
      const leaks = detectPublicLeaks(content);
      if (leaks.length) {
        problems.push(
          `${relativePath} appears to leak private data (${leaks.map((leak) => `${leak.label}: ${leak.match}`).join("; ")}).`,
        );
      }
    }
  }

  const sharedMirrorChecks = [
    ["START_HERE.md", paths.startHerePath, paths.sharedStartHerePath],
    ["state.json", paths.statePath, paths.sharedStatePath],
    ["manifest.json", paths.manifestPath, paths.sharedManifestPath],
    ["work.json", paths.workPath, paths.sharedWorkPath],
    ["evidence.json", paths.evidencePath, paths.sharedEvidencePath],
    ["health.json", paths.healthPath, paths.sharedHealthPath],
    ["clients.json", paths.clientsPath, paths.sharedClientsPath],
    ["decisions.ndjson", paths.decisionsPath, paths.sharedDecisionsPath],
    ["conflicts.ndjson", paths.conflictsPath, paths.sharedConflictsPath],
  ];

  for (const [label, primaryPath, sharedPath] of sharedMirrorChecks) {
    if (!existsSync(sharedPath)) {
      problems.push(`Shared PM mirror is missing ${label}.`);
      continue;
    }
    if (readText(primaryPath) !== readText(sharedPath)) {
      problems.push(`Shared PM mirror drift detected for ${label}.`);
    }
  }

  const currentHead = runGit(repoRoot, ["rev-parse", "HEAD"], true);
  if (currentHead && manifest.git_sha && currentHead !== manifest.git_sha) {
    problems.push(`git HEAD moved from ${String(manifest.git_sha).slice(0, 7)} to ${currentHead.slice(0, 7)}`);
  }

  if (runGit(repoRoot, ["status", "--short"], true)) {
    warnings.push("working tree has local edits beyond the committed PM snapshot");
  }

  for (const [relativePath] of LEGACY_DOCS) {
    const legacyCheck = normalizeLegacyDocCheck(repoRoot, relativePath);
    if (!legacyCheck.exists) {
      continue;
    }
    if (!legacyCheck.pointsToStartup) {
      problems.push(`${relativePath} does not point agents back to docs/agent-context/START_HERE.md.`);
    }
    if (!legacyCheck.isRedirectStub) {
      problems.push(`${relativePath} contains substantive PM content instead of the required redirect stub.`);
    }
  }

  const repoAgents = readText(paths.repoAgentsPath);
  const repoClaude = readText(paths.repoClaudePath);
  if (!repoAgents.includes("docs/agent-context/START_HERE.md")) {
    problems.push("AGENTS.md no longer points to docs/agent-context/START_HERE.md as the TERP startup contract.");
  }
  if (!repoClaude.includes("docs/agent-context/START_HERE.md")) {
    problems.push("CLAUDE.md no longer points to docs/agent-context/START_HERE.md as the TERP startup contract.");
  }

  if (readEnvValue("LINEAR_API_KEY") && state.linear?.latestIssueUpdatedAt && !options.skipLinear) {
    const liveLinear = await getLinearSnapshot(repoRoot, state, options);
    if (
      liveLinear.mode === "live" &&
      liveLinear.latestIssueUpdatedAt &&
      Date.parse(liveLinear.latestIssueUpdatedAt) > Date.parse(state.linear.latestIssueUpdatedAt)
    ) {
      problems.push(
        `Linear has newer issue activity (${liveLinear.latestIssueUpdatedAt}) than this snapshot (${state.linear.latestIssueUpdatedAt}).`,
      );
    }
  } else {
    warnings.push("Linear freshness could not be verified live.");
  }

  return {
    repoRoot,
    manifest,
    state,
    health,
    problems,
    warnings,
  };
}

export async function checkContext(options = {}) {
  const result = await validateContextBundle(options);
  const snapshotAge = ageHours(result.state?.generatedAt);

  console.info(`Snapshot generated at: ${result.state?.generatedAt || "unknown"}`);
  console.info(`Snapshot git anchor: ${result.state?.git?.shortHead || "unknown"}`);
  console.info(`Snapshot age: ${snapshotAge ?? "unknown"}h`);

  if (result.warnings.length) {
    console.info("\nWarnings:");
    for (const warning of result.warnings) {
      console.info(`- ${warning}`);
    }
  }

  if (result.problems.length) {
    console.info("\nDrift detected:");
    for (const problem of result.problems) {
      console.info(`- ${problem}`);
    }
    process.exit(1);
  }

  console.info("\nContext bundle is fresh enough for startup use.");
}

function normalizeLinearRefs(linearRefs = []) {
  return [...new Set((linearRefs || []).map((entry) => String(entry).trim()).filter(Boolean))];
}

function buildDecisionId(now) {
  return `pmdec-${compactTimestamp(now)}-${randomUUID().slice(0, 8)}`;
}

function getClientById(clientsRegistry, clientId) {
  const client = clientsRegistry.clients.find((entry) => entry.id === clientId);
  if (!client) {
    throw new Error(`Unknown client_id ${clientId}. Add it to docs/agent-context/clients.json before using authoritative PM writes.`);
  }
  return client;
}

function ensureToolAllowed(client, toolName) {
  if (!client.allowedTools?.includes(toolName)) {
    throw new Error(`Client ${client.id} is not allowed to call ${toolName}. Current trust level is ${client.trustLevel}.`);
  }
}

function ensureAuthoritativeWriter(client, toolName) {
  ensureToolAllowed(client, toolName);
  if (!["first-class-writer", "conditional-first-class-writer"].includes(client.trustLevel)) {
    throw new Error(`Client ${client.id} is not an authoritative PM writer. Use proposals or PR-mediated writes instead.`);
  }
}

export async function resolveLinearIssue(ref, options = {}) {
  const normalized = String(ref || "").trim();
  if (!normalized) {
    return null;
  }

  if (/^[0-9a-fA-F-]{20,}$/.test(normalized)) {
    const data = await queryLinear(
      `
        query ResolveIssueById($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            url
          }
        }
      `,
      { id: normalized },
      options,
    );
    return data.issue || null;
  }

  const match = normalized.match(/^([A-Za-z]+)-(\d+)$/);
  if (!match) {
    return null;
  }

  const [, teamKey, number] = match;
  const data = await queryLinear(
    `
      query ResolveIssueByIdentifier($teamKey: String!, $number: Float!) {
        issues(first: 1, filter: { team: { key: { eq: $teamKey } }, number: { eq: $number } }) {
          nodes {
            id
            identifier
            title
            url
          }
        }
      }
    `,
    { teamKey, number: Number(number) },
    options,
  );

  return data.issues?.nodes?.[0] || null;
}

export async function writeLinearCheckpointComments({
  linearRefs = [],
  clientId,
  basedOnSha,
  summary,
  rationale = "",
  options = {},
}) {
  const normalizedRefs = normalizeLinearRefs(linearRefs);
  if (!normalizedRefs.length) {
    return [];
  }

  const body = [
    `PM checkpoint from \`${clientId}\``,
    "",
    `- based_on_sha: \`${String(basedOnSha).slice(0, 12)}\``,
    `- summary: ${summary}`,
    rationale ? `- rationale: ${rationale}` : null,
    "- bundle: `docs/agent-context/manifest.json` / `docs/agent-context/evidence.json`",
  ]
    .filter(Boolean)
    .join("\n");

  const outputs = [];
  for (const ref of normalizedRefs) {
    const issue = await resolveLinearIssue(ref, options);
    if (!issue?.id) {
      outputs.push({
        ref,
        status: "unresolved",
      });
      continue;
    }

    const data = await queryLinear(
      `
        mutation PmCheckpointComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
            comment {
              id
            }
          }
        }
      `,
      {
        issueId: issue.id,
        body,
      },
      options,
    );

    outputs.push({
      ref,
      issueId: issue.id,
      status: data.commentCreate?.success ? "commented" : "failed",
      commentId: data.commentCreate?.comment?.id || null,
    });
  }

  return outputs;
}

export async function appendDecision(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const task = await runExclusivePmTask({
    repoRoot,
    taskName: "pm-write",
    lockTtlSeconds: 900,
    waitTimeoutSeconds: 120,
    pollIntervalMs: 75,
    run: async () => {
      const now = safeNow(options.now);
      const paths = getPmPaths(repoRoot);
      seedStaticFiles(paths, now);

      const clientsRegistry = readJson(preferSharedPath(paths.clientsPath, paths.sharedClientsPath));
      validateClientsRegistry(clientsRegistry);

      const client = getClientById(clientsRegistry, options.clientId);
      ensureAuthoritativeWriter(client, "pm.appendDecision");

      const basedOnSha = options.basedOnSha || runGit(repoRoot, ["rev-parse", "HEAD"]);
      if (!isAncestor(repoRoot, basedOnSha, "HEAD")) {
        throw new Error(
          `based_on_sha ${basedOnSha} is not an ancestor of current HEAD. Refresh before writing authoritative PM state.`,
        );
      }

      const summary = String(options.summary || "").trim();
      const rationale = String(options.rationale || "").trim();
      if (!summary || !rationale) {
        throw new Error("pm.appendDecision requires both summary and rationale.");
      }

      const candidateText = `${summary}\n${rationale}`;
      const leaks = detectPublicLeaks(candidateText);
      if (leaks.length) {
        throw new Error(
          `Refused to append decision because it appears to include private routing data (${leaks[0].label}: ${leaks[0].match}).`,
        );
      }

      const decision = {
        schema_version: DECISION_SCHEMA_VERSION,
        id: options.id || buildDecisionId(now),
        ts: now.toISOString(),
        client_id: client.id,
        based_on_sha: basedOnSha,
        summary,
        rationale,
        linear_refs: normalizeLinearRefs(options.linearRefs),
        supersedes: options.supersedes || null,
        visibility: options.visibility || "private",
      };
      Object.assign(decision, signDecisionPayload(decision));

      appendNdjsonLine(paths.sharedDecisionsPath, decision);
      syncMirroredText(paths.decisionsPath, paths.sharedDecisionsPath, "");
      const bundle = await generateContext({
        repoRoot,
        now,
        reason: `decision:${decision.id}`,
        linearSnapshot: options.linearSnapshot,
        skipLinear: options.skipLinear,
        skipWriteLock: true,
      });

      return {
        decision,
        manifest: bundle.manifest,
        state: bundle.state,
      };
    },
  });

  return task.result;
}

export async function proposeChange(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const now = safeNow(options.now);
  const paths = getPmPaths(repoRoot);
  seedStaticFiles(paths, now);

  const clientsRegistry = readJson(preferSharedPath(paths.clientsPath, paths.sharedClientsPath));
  validateClientsRegistry(clientsRegistry);
  const client = getClientById(clientsRegistry, options.clientId);
  ensureToolAllowed(client, "pm.proposeChange");

  const basedOnSha = options.basedOnSha || runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (!isAncestor(repoRoot, basedOnSha, "HEAD")) {
    throw new Error(`based_on_sha ${basedOnSha} is not an ancestor of current HEAD. Refresh before submitting a mediated proposal.`);
  }

  const proposal = {
    schema_version: PROPOSAL_SCHEMA_VERSION,
    id: options.id || `proposal-${compactTimestamp(now)}-${randomUUID().slice(0, 6)}`,
    created_at: now.toISOString(),
    client_id: client.id,
    based_on_sha: basedOnSha,
    summary: String(options.summary || "").trim(),
    rationale: String(options.rationale || "").trim(),
    linear_refs: normalizeLinearRefs(options.linearRefs),
    visibility: options.visibility || "private",
    status: "proposed",
  };

  if (!proposal.summary) {
    throw new Error("pm.proposeChange requires a summary.");
  }

  const proposalRelativePath = `${slugify(proposal.id)}.json`;
  const proposalPath = path.join(paths.sharedProposalsDir, proposalRelativePath);
  const localProposalPath = path.join(paths.proposalsDir, proposalRelativePath);
  writeJson(proposalPath, proposal);
  writeJson(localProposalPath, proposal);
  return {
    proposal,
    proposalPath,
  };
}

export async function checkpointPm(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const now = safeNow(options.now);
  const paths = getPmPaths(repoRoot);
  seedStaticFiles(paths, now);

  const clientsRegistry = readJson(preferSharedPath(paths.clientsPath, paths.sharedClientsPath));
  validateClientsRegistry(clientsRegistry);
  const client = getClientById(clientsRegistry, options.clientId);
  ensureAuthoritativeWriter(client, "pm.checkpoint");

  const basedOnSha = options.basedOnSha || runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (!isAncestor(repoRoot, basedOnSha, "HEAD")) {
    throw new Error(`based_on_sha ${basedOnSha} is not an ancestor of current HEAD. Refresh before checkpointing.`);
  }

  const bundle = await generateContext({
    repoRoot,
    now,
    reason: `checkpoint:${client.id}`,
    linearSnapshot: options.linearSnapshot,
    skipLinear: options.skipLinear,
  });

  const linearWriteback =
    options.skipLinearWriteback || !normalizeLinearRefs(options.linearRefs).length
      ? []
      : await writeLinearCheckpointComments({
          linearRefs: options.linearRefs,
          clientId: client.id,
          basedOnSha,
          summary: String(options.summary || "Checkpoint refresh"),
          rationale: String(options.rationale || ""),
          options,
        });

  return {
    manifest: bundle.manifest,
    state: bundle.state,
    linearWriteback,
  };
}

export function readPmArtifact(options = {}) {
  const repoRoot = getRepoRoot(options.repoRoot);
  const paths = getPmPaths(repoRoot);
  const artifact = options.artifact || "summary";

  const map = {
    summary: preferSharedPath(paths.startHerePath, paths.sharedStartHerePath),
    manifest: preferSharedPath(paths.manifestPath, paths.sharedManifestPath),
    state: preferSharedPath(paths.statePath, paths.sharedStatePath),
    work: preferSharedPath(paths.workPath, paths.sharedWorkPath),
    evidence: preferSharedPath(paths.evidencePath, paths.sharedEvidencePath),
    decisions: preferSharedPath(paths.decisionsPath, paths.sharedDecisionsPath),
    clients: preferSharedPath(paths.clientsPath, paths.sharedClientsPath),
    health: preferSharedPath(paths.healthPath, paths.sharedHealthPath),
    "public-summary": preferSharedPath(paths.publicStartHerePath, paths.sharedPublicStartHerePath),
    "public-state": preferSharedPath(paths.publicStatePath, paths.sharedPublicStatePath),
    "public-work": preferSharedPath(paths.publicWorkPath, paths.sharedPublicWorkPath),
    "public-manifest": preferSharedPath(paths.publicManifestPath, paths.sharedPublicManifestPath),
    "public-health": preferSharedPath(paths.publicHealthPath, paths.sharedPublicHealthPath),
  };

  const targetPath = map[artifact];
  if (!targetPath) {
    throw new Error(`Unknown PM artifact "${artifact}".`);
  }

  const raw = readText(targetPath);
  return {
    artifact,
    path: path.relative(repoRoot, targetPath),
    raw,
    json:
      artifact === "summary" || artifact === "public-summary"
        ? null
        : artifact === "decisions"
          ? readNdjson(targetPath)
          : readJson(targetPath),
  };
}

function parseCliArgs(argv) {
  const args = {
    check: false,
    repoRoot: undefined,
    reason: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      args.check = true;
      continue;
    }
    if (arg === "--repo-root") {
      args.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--reason") {
      args.reason = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.check) {
    await checkContext({
      repoRoot: cli.repoRoot,
    });
    return;
  }

  const bundle = await generateContext({
    repoRoot: cli.repoRoot,
    reason: cli.reason || "manual-refresh",
  });
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.startHerePath)}`);
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.statePath)}`);
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.manifestPath)}`);
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.workPath)}`);
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.evidencePath)}`);
  console.info(`Wrote ${path.relative(bundle.repoRoot, bundle.paths.publicDir)}`);
  console.info(`Freshness: ${bundle.state.freshness.status}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

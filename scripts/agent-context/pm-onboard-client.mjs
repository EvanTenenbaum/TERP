import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CLIENTS_REGISTRY, generateContext, getPmPaths } from "./generate-agent-context.mjs";
import { runExclusivePmTask } from "./pm-runtime-utils.mjs";

const TRUST_LEVELS = new Set([
  "read-only",
  "mediated-writer",
  "first-class-writer",
  "conditional-first-class-writer",
]);

const CATEGORIES = new Set(["local", "hosted", "template"]);

function readJson(targetPath) {
  return JSON.parse(readFileSync(targetPath, "utf8"));
}

function writeJson(targetPath, payload) {
  writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseArgs(argv) {
  const options = {
    readPaths: [],
    fallbackReadPaths: [],
    allowedTools: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--") && !options.name) {
      options.name = arg;
      continue;
    }
    if (arg === "--name") {
      options.name = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--id") {
      options.id = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--surface") {
      options.surface = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--category") {
      options.category = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--trust") {
      options.trustLevel = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--read-path") {
      options.readPaths.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--fallback-read-path") {
      options.fallbackReadPaths.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--tool") {
      options.allowedTools.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--notes") {
      options.notes = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--repo-root") {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--bootstrap-path") {
      options.bootstrapPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--replace") {
      options.replace = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

function inferCategory(trustLevel, explicitCategory) {
  if (explicitCategory) {
    return explicitCategory;
  }
  if (trustLevel === "first-class-writer" || trustLevel === "conditional-first-class-writer") {
    return "local";
  }
  return "hosted";
}

function buildClientDefaults({ trustLevel, category }) {
  if (trustLevel === "first-class-writer" || trustLevel === "conditional-first-class-writer") {
    return {
      readPaths: ["shared-live-bundle", "local-files", "pm-mcp"],
      fallbackReadPaths: ["public-mirror"],
      writeMode: "pm-mcp",
      allowedTools: ["pm.read", "pm.appendDecision", "pm.checkpoint", "pm.proposeChange"],
      pushBeforeHosted: false,
      signingMode: "pm-mediator",
      signingKeyFingerprint: "managed-by-mediator",
      notes:
        trustLevel === "conditional-first-class-writer"
          ? "Promote this client to first-class writes only after end-to-end refresh/check validation."
          : "Only trust this client as a first-class writer on validated local infrastructure.",
    };
  }

  if (trustLevel === "mediated-writer") {
    return {
      readPaths: category === "local" ? ["shared-live-bundle", "local-files", "pm-mcp"] : ["git-clone", "public-mirror"],
      fallbackReadPaths: ["bootstrap-paste"],
      writeMode: category === "local" ? "proposal-only" : "pull-request",
      allowedTools: ["pm.read", "pm.proposeChange"],
      pushBeforeHosted: category !== "local",
      signingMode: category === "local" ? "pm-mediator" : "git-identity",
      signingKeyFingerprint: category === "local" ? "managed-by-mediator" : "pr-mediated",
      notes: "Use proposals or PR-mediated writes until this client is explicitly promoted.",
    };
  }

  return {
    readPaths: category === "local" ? ["shared-live-bundle", "local-files", "public-mirror"] : ["public-mirror", "bootstrap-paste"],
    fallbackReadPaths: ["manual-bootstrap"],
    writeMode: "proposal-only",
    allowedTools: ["pm.proposeChange"],
    pushBeforeHosted: category !== "local",
    signingMode: "none",
    signingKeyFingerprint: "read-only",
    notes: "Newly onboarded clients stay read-only until capability probes and adapter validation pass.",
  };
}

function ensureValidOptions(options) {
  if (!options.name) {
    throw new Error("pm:onboard requires a client name. Pass it as the first argument or with --name.");
  }
  if (!TRUST_LEVELS.has(options.trustLevel)) {
    throw new Error(`Unsupported trust level "${options.trustLevel}".`);
  }
  if (!CATEGORIES.has(options.category)) {
    throw new Error(`Unsupported category "${options.category}".`);
  }
}

async function main() {
  const rawOptions = parseArgs(process.argv.slice(2));
  rawOptions.trustLevel = rawOptions.trustLevel || "read-only";
  rawOptions.category = inferCategory(rawOptions.trustLevel, rawOptions.category);
  ensureValidOptions(rawOptions);

  const repoRoot = path.resolve(rawOptions.repoRoot || process.cwd());
  const paths = getPmPaths(repoRoot);
  if (!existsSync(paths.clientsPath) && !existsSync(paths.sharedClientsPath)) {
    await generateContext({
      repoRoot,
      skipLinear: true,
      reason: "pm-onboard-seed",
    });
  }

  const clientsRegistry = readJson(existsSync(paths.sharedClientsPath) ? paths.sharedClientsPath : paths.clientsPath);
  const defaults = buildClientDefaults(rawOptions);
  const id = rawOptions.id || slugify(rawOptions.name);
  const nextClient = {
    id,
    name: rawOptions.name,
    surface: rawOptions.surface || rawOptions.name,
    category: rawOptions.category,
    trustLevel: rawOptions.trustLevel,
    readPaths: rawOptions.readPaths.length ? rawOptions.readPaths : defaults.readPaths,
    fallbackReadPaths: rawOptions.fallbackReadPaths.length
      ? rawOptions.fallbackReadPaths
      : defaults.fallbackReadPaths,
    writeMode: defaults.writeMode,
    allowedTools: rawOptions.allowedTools.length ? rawOptions.allowedTools : defaults.allowedTools,
    bootstrapPath:
      rawOptions.bootstrapPath || `docs/agent-context/bootstrap/${slugify(rawOptions.name) || id}.md`,
    pushBeforeHosted: defaults.pushBeforeHosted,
    notes: rawOptions.notes || defaults.notes,
    signingMode: defaults.signingMode,
    signingKeyFingerprint: defaults.signingKeyFingerprint,
  };

  const existingIndex = clientsRegistry.clients.findIndex((client) => client.id === id);
  if (existingIndex >= 0 && !rawOptions.replace) {
    throw new Error(`Client "${id}" already exists. Re-run with --replace to update it.`);
  }

  const nextClients = [...clientsRegistry.clients];
  if (existingIndex >= 0) {
    nextClients[existingIndex] = nextClient;
  } else {
    const templateIndex = nextClients.findIndex((client) => client.id === "new-model-template");
    const insertIndex = templateIndex >= 0 ? templateIndex : nextClients.length;
    nextClients.splice(insertIndex, 0, nextClient);
  }

  const nextRegistry = {
    ...clientsRegistry,
    schemaVersion: clientsRegistry.schemaVersion || DEFAULT_CLIENTS_REGISTRY.schemaVersion,
    clients: nextClients,
  };

  if (!rawOptions.dryRun) {
    await runExclusivePmTask({
      repoRoot,
      taskName: "pm-write",
      lockTtlSeconds: 900,
      waitTimeoutSeconds: 120,
      pollIntervalMs: 75,
      run: async () => {
        writeJson(paths.sharedClientsPath, nextRegistry);
        writeJson(paths.clientsPath, nextRegistry);
        await generateContext({
          repoRoot,
          reason: `pm-onboard:${id}`,
          skipWriteLock: true,
        });
      },
    });
  }

  console.info(
    JSON.stringify(
      {
        status: rawOptions.dryRun ? "dry-run" : existingIndex >= 0 ? "updated" : "added",
        client: nextClient,
        bootstrapPath: nextClient.bootstrapPath,
        nextSteps: [
          "Run the matching bootstrap file for the new client surface.",
          "Validate read paths, write mode, and any MCP capability before promoting trust.",
          "Keep new clients read-only or mediated until they pass a full PM refresh/check workflow.",
        ],
      },
      null,
      2,
    ),
  );
}

await main();

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "docs", "agent-context");
const statePath = path.join(outputDir, "state.json");
const startHerePath = path.join(outputDir, "START_HERE.md");
const maxAgeHours = 72;
const linearLookbackDays = 21;

const legacyDocs = [
  ["docs/ACTIVE_SESSIONS.md", "stale session registry that still looks live"],
  ["docs/PROJECT_CONTEXT.md", "historical orientation snapshot, not current runtime truth"],
  ["docs/TERP_AGENT_INSTRUCTIONS.md", "older prompt-pack instructions that still point at legacy roadmap flow"],
  ["docs/ROADMAP_AGENT_GUIDE.md", "older roadmap guide that still says MASTER_ROADMAP is current"],
  ["product-management/START_HERE.md", "separate PM system entrypoint, not the live TERP repo startup contract"],
];

const priorityNames = { 0: "none", 1: "urgent", 2: "high", 3: "normal", 4: "low" };

function runGit(args, allowFailure = false) {
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

function readText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function readJson(filePath) {
  const raw = readText(filePath);
  return raw ? JSON.parse(raw) : null;
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

function parseLastUpdated(text) {
  const match = text.match(/^\*\*Last Updated:\*\*\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function ageHours(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  return Number(((Date.now() - ms) / 36e5).toFixed(1));
}

function isoDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getGitSnapshot() {
  const recentCommits = runGit(
    ["log", "--since=2026-03-15", "--pretty=format:%ad%x09%h%x09%s", "--date=short", "-n", "25"],
    true,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [date, sha, ...rest] = line.split("\t");
      return { date, sha, subject: rest.join("\t") };
    });

  return {
    branch: runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    head: runGit(["rev-parse", "HEAD"]),
    shortHead: runGit(["rev-parse", "--short", "HEAD"]),
    workingTreeDirty: Boolean(runGit(["status", "--short"], true)),
    recentCommits,
  };
}

async function queryLinear(query, variables) {
  const apiKey = readEnvValue("LINEAR_API_KEY");
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

  return source.slice(0, 6).map((node) => ({
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
    .slice(0, 12)
    .map((node) => ({
      identifier: node.identifier,
      title: node.title,
      priority: priorityNames[node.priority] || String(node.priority ?? "unknown"),
      updatedAt: node.updatedAt,
      url: node.url,
      state: node.state?.name || "Unknown",
      project: node.project?.name || null,
    }));
}

async function getLinearSnapshot(previousState) {
  const query = `
    query AgentContext($projectCount: Int!, $issueCount: Int!, $updatedAfter: DateTimeOrDuration!) {
      projects(first: $projectCount) {
        nodes { name state updatedAt url description }
      }
      issues(first: $issueCount, orderBy: updatedAt, filter: { updatedAt: { gte: $updatedAfter } }) {
        nodes {
          identifier
          title
          priority
          updatedAt
          url
          state { name type }
          project { name }
        }
      }
    }
  `;

  const updatedAfter = new Date(Date.now() - linearLookbackDays * 86400000).toISOString();

  try {
    const data = await queryLinear(query, {
      projectCount: 25,
      issueCount: 60,
      updatedAfter,
    });

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
    ["spreadsheet-native rollout", [/\bspreadsheet-native\b/i, /\bsheet-native\b/i, /\bpowersheetgrid\b/i]],
    ["unified operational surfaces", [/\bunified\b/i, /\bsurface(s)?\b/i]],
    ["orders and order workflow", [/\border(s)?\b/i, /\border creator\b/i, /\bSALE-ORD\b/i, /\bTER-795\b/i]],
    ["inventory, intake, and purchase operations", [/\binventory\b/i, /\bintake\b/i, /\bpurchase order\b/i, /\bpo\b/i, /\bfulfillment\b/i]],
    ["accounting, payments, and ledger work", [/\baccounting\b/i, /\bpayments?\b/i, /\binvoices?\b/i, /\bledger\b/i, /\bgl\b/i, /\bbank\b/i]],
    ["operator workflow polish", [/\bhuman-readable\b/i, /\bunified contact\b/i, /\bclient credit\b/i, /\bquick copy\b/i, /\bdashboard\b/i]],
    ["QA, parity proof, and rollout hardening", [/\bqa\b/i, /\bparity\b/i, /\bproof\b/i, /\bcoverage\b/i, /\bdogfood\b/i, /\bhardening\b/i, /\btest\b/i]],
  ];

  return themes
    .map(([label, patterns]) => ({
      label,
      count: texts.reduce((total, text) => total + (patterns.some((pattern) => pattern.test(text)) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildDirection(git, linear) {
  const texts = [
    ...git.recentCommits.map((commit) => commit.subject),
    ...linear.activeProjects.map((project) => project.name),
    ...linear.recentIssues.map((issue) => issue.title),
  ];

  const themeEvidence = scoreThemes(texts).slice(0, 6);
  const focusAreas = themeEvidence.slice(0, 4).map((entry) => entry.label);
  const summaryParts = [];

  if (focusAreas.length) {
    summaryParts.push(`Current TERP direction centers on ${focusAreas.slice(0, 2).join(" and ")}`);
  }
  if (git.recentCommits.length) {
    summaryParts.push(
      `recent git activity is anchored at ${git.shortHead} and is dominated by ${git.recentCommits
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

  return {
    focusAreas,
    summary: `${summaryParts.join("; ")}.`,
    themeEvidence,
  };
}

function getOrdersRuntimeSignal() {
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

function buildLegacyWarnings() {
  return legacyDocs.map(([relativePath, reason]) => {
    const text = readText(path.join(repoRoot, relativePath));
    return {
      path: relativePath,
      reason,
      lastUpdated: parseLastUpdated(text),
    };
  });
}

function buildState(previousState, git, linear) {
  const ordersRuntime = getOrdersRuntimeSignal();
  const notes = [];

  if (linear.mode === "live") {
    notes.push("Tracker data was refreshed live from Linear.");
  } else if (linear.mode === "last-known") {
    notes.push(
      `Linear could not be refreshed live, so the tracker section fell back to the last known snapshot (${linear.fetchedAt || "unknown date"}).`,
    );
  } else {
    notes.push("Linear was unavailable; tracker sections are empty until the next refresh.");
  }

  if (git.workingTreeDirty) {
    notes.push("Working tree contains local edits. This bundle captures committed truth at HEAD and reports that local diffs exist.");
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: {
      script: "scripts/agent-context/generate-agent-context.mjs",
      maxAgeHours,
      linearLookbackDays,
    },
    startupContract: {
      readFirst: ["AGENTS.md", "CLAUDE.md", "docs/agent-context/START_HERE.md"],
      entrypoint: "docs/agent-context/START_HERE.md",
      machineState: "docs/agent-context/state.json",
      refreshCommand: "pnpm context:refresh",
      checkCommand: "pnpm context:check",
      doNotTreatAsCurrentTruth: legacyDocs.map(([relativePath]) => relativePath),
    },
    freshness: {
      status: linear.mode === "live" ? "fresh" : linear.mode === "last-known" ? "partial" : "degraded",
      maxAgeHours,
      snapshotAgeHours: 0,
      notes,
    },
    git,
    linear,
    direction: buildDirection(git, linear),
    repoTruthHierarchy: [
      "`docs/agent-context/state.json` for startup truth, freshness, and where to drill deeper next.",
      "Program-specific machine state like `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` when working that exact lane.",
      "Current code, tests, and runtime evidence when docs and tracker narratives disagree.",
      "Linear project and issue state for live execution direction.",
      "Legacy docs only as historical background, never as silent current truth.",
    ],
    activeLaneSignals: ordersRuntime ? [ordersRuntime] : [],
    deepDiveDocs: [
      {
        path: "docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json",
        reason: "machine-readable Orders runtime verdicts and next move",
      },
      {
        path: "docs/roadmaps/orders-spreadsheet-runtime/README.md",
        reason: "Orders runtime gate roadmap and tranche layout",
      },
      {
        path: "docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-build-source-of-truth.md",
        reason: "broader spreadsheet-native preservation packet and source precedence rules",
      },
      {
        path: "docs/TESTING.md",
        reason: "canonical verification commands and E2E guidance",
      },
    ],
    legacyWarnings: buildLegacyWarnings(previousState),
  };
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
  return `- \`${warning.path}\` - ${warning.reason}${lastUpdated}`;
}

function renderMarkdown(state) {
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

  return `# TERP Agent Current Truth

> Generated file. Manual edits will be overwritten by \`${state.generator.script}\`.

## Snapshot

- Generated: \`${state.generatedAt}\`
- Freshness status: \`${state.freshness.status}\`
- Refresh command: \`${state.startupContract.refreshCommand}\`
- Drift check: \`${state.startupContract.checkCommand}\`
- Git anchor: \`${state.git.shortHead}\` on branch \`${state.git.branch}\`
- Working tree dirty: \`${state.git.workingTreeDirty}\`
- Linear mode: \`${state.linear.mode}\`

## Start Here

1. Read \`AGENTS.md\`.
2. Read \`CLAUDE.md\`.
3. Read this file, then use \`docs/agent-context/state.json\` if you need machine-readable truth.
4. If your work is in Orders runtime, jump to \`docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json\` next.
5. Do not start by scanning \`MASTER_ROADMAP.md\`, \`ACTIVE_SESSIONS.md\`, or old prompt-pack docs for current direction.

## Current Direction

${state.direction.summary}

${state.direction.focusAreas.map((focusArea) => `- ${focusArea}`).join("\n")}

## Freshness Notes

${state.freshness.notes.map((note) => `- ${note}`).join("\n")}

## Active Projects

${projectLines.join("\n")}

## Recent High-Signal Issues

${issueLines.join("\n")}

## Program-Specific Machine State

${laneLines.join("\n")}

## Recent Commits

${state.git.recentCommits.slice(0, 10).map((commit) => `- ${commit.date} \`${commit.sha}\` ${commit.subject}`).join("\n")}

## What Not To Trust As Current Startup Truth

${state.legacyWarnings.map(formatLegacyWarning).join("\n")}

## Drill Deeper Next

${state.deepDiveDocs.map((entry) => `- \`${entry.path}\` - ${entry.reason}`).join("\n")}

## Keep This Fresh

- Run \`${state.startupContract.refreshCommand}\` after meaningful tracker checkpoints, before remote-agent handoff, and after merges to \`main\`.
- Run \`${state.startupContract.checkCommand}\` when you want to know if this bundle has fallen behind git or Linear.
- If Linear cannot be refreshed, this file should say so explicitly instead of pretending the tracker snapshot is current.
`;
}

function writeOutputs(state) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  writeFileSync(startHerePath, `${renderMarkdown(state)}\n`);
}

async function generateContext() {
  const previousState = readJson(statePath);
  const git = getGitSnapshot();
  const linear = await getLinearSnapshot(previousState);
  const state = buildState(previousState, git, linear);
  writeOutputs(state);
  console.log(`Wrote ${path.relative(repoRoot, startHerePath)}`);
  console.log(`Wrote ${path.relative(repoRoot, statePath)}`);
  console.log(`Freshness: ${state.freshness.status}`);
}

async function checkContext() {
  const state = readJson(statePath);
  if (!state) {
    console.error("Missing docs/agent-context/state.json. Run pnpm context:refresh first.");
    process.exit(1);
  }

  const problems = [];
  const warnings = [];
  const snapshotAge = ageHours(state.generatedAt);
  const currentHead = runGit(["rev-parse", "HEAD"], true);

  if (snapshotAge !== null && snapshotAge > maxAgeHours) {
    problems.push(`snapshot is ${snapshotAge}h old (max ${maxAgeHours}h)`);
  }
  if (currentHead && state.git?.head && currentHead !== state.git.head) {
    problems.push(`git HEAD moved from ${state.git.shortHead} to ${currentHead.slice(0, 7)}`);
  }
  if (runGit(["status", "--short"], true)) {
    warnings.push("working tree has local edits beyond the committed snapshot");
  }

  if (readEnvValue("LINEAR_API_KEY") && state.linear?.latestIssueUpdatedAt) {
    const liveLinear = await getLinearSnapshot(state);
    if (
      liveLinear.mode === "live" &&
      liveLinear.latestIssueUpdatedAt &&
      Date.parse(liveLinear.latestIssueUpdatedAt) > Date.parse(state.linear.latestIssueUpdatedAt)
    ) {
      problems.push(
        `Linear has newer issue activity (${liveLinear.latestIssueUpdatedAt}) than this snapshot (${state.linear.latestIssueUpdatedAt})`,
      );
    }
  } else {
    warnings.push("Linear freshness could not be verified live");
  }

  console.log(`Snapshot generated at: ${state.generatedAt}`);
  console.log(`Snapshot git anchor: ${state.git?.shortHead || "unknown"}`);
  console.log(`Snapshot age: ${snapshotAge ?? "unknown"}h`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (problems.length) {
    console.log("\nDrift detected:");
    for (const problem of problems) {
      console.log(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log("\nContext bundle is fresh enough for startup use.");
}

const args = new Set(process.argv.slice(2));
if (args.has("--check")) {
  await checkContext();
} else {
  await generateContext();
}

#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { chromium } from "@playwright/test";

import {
  executeChain,
  createChainContext,
} from "../../tests-e2e/chains/chain-executor.ts";
import { getChainById } from "../../tests-e2e/chains/definitions/index.ts";
import {
  buildExecutionRecord,
  buildLiveTransactionSwarmPlan,
  type LiveTransactionBundleId,
  type LiveTransactionExecutionRecord,
  type LiveTransactionSwarmPlan,
} from "../../tests-e2e/chains/live-transaction-swarm.ts";

interface CliOptions {
  bundleId: LiveTransactionBundleId;
  planOnly: boolean;
  headless: boolean;
  maxTransactions?: number;
  outputDir?: string;
  baseUrl: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    bundleId: "full",
    planOnly: false,
    headless: true,
    baseUrl:
      process.env.PLAYWRIGHT_BASE_URL ||
      "https://terp-staging-yicld.ondigitalocean.app",
  };

  for (const arg of argv) {
    if (arg === "--plan") {
      options.planOnly = true;
      continue;
    }
    if (arg === "--headed") {
      options.headless = false;
      continue;
    }
    if (arg === "--headless") {
      options.headless = true;
      continue;
    }
    if (arg.startsWith("--bundle=")) {
      const bundleValue = arg.split("=")[1];
      if (bundleValue === "quick" || bundleValue === "full") {
        options.bundleId = bundleValue;
      }
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const raw = Number(arg.split("=")[1]);
      if (Number.isFinite(raw) && raw > 0) {
        options.maxTransactions = raw;
      }
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      options.outputDir = arg.split("=")[1];
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.split("=")[1];
    }
  }

  return options;
}

function createRunId(): string {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-");
  const millis = String(now.getMilliseconds()).padStart(3, "0");
  const nonce = Math.random().toString(36).slice(2, 6);
  return `ltx-swarm-${iso}-${millis}-${nonce}`;
}

function ensureRunDirs(rootDir: string): void {
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(path.join(rootDir, "transactions"), { recursive: true });
}

function renderPlanSummary(plan: LiveTransactionSwarmPlan): string {
  const laneSummary = Object.entries(plan.summary.byLane)
    .filter(([, count]) => count > 0)
    .map(([lane, count]) => `- ${lane}: ${count}`)
    .join("\n");

  const familySummary = Object.entries(plan.summary.byFamily)
    .map(([family, count]) => `- ${family}: ${count}`)
    .join("\n");

  const transactionRows = plan.transactions
    .map(
      transaction =>
        `| ${transaction.transactionId} | ${transaction.lane} | ${transaction.family} | ${transaction.chainId} | ${transaction.expectedArtifacts.join(", ")} |`
    )
    .join("\n");

  return [
    "# Live Transaction Swarm",
    "",
    `- Run ID: \`${plan.runId}\``,
    `- Bundle: \`${plan.bundleId}\``,
    `- Base URL: \`${plan.baseUrl}\``,
    `- Total transactions: \`${plan.summary.totalTransactions}\``,
    "",
    "## By Lane",
    laneSummary,
    "",
    "## By Family",
    familySummary,
    "",
    "## Transactions",
    "| Transaction ID | Lane | Family | Chain ID | Expected Artifacts |",
    "| --- | --- | --- | --- | --- |",
    transactionRows,
    "",
  ].join("\n");
}

function createLedgerCsv(records: LiveTransactionExecutionRecord[]): string {
  const header = [
    "transaction_id",
    "lane",
    "family",
    "chain_id",
    "status",
    "failure_type",
    "duration_ms",
    "identifiers",
    "checkpoint_summary",
  ];

  const rows = records.map(record => {
    const identifiers = Object.entries(record.extractedIdentifiers)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join("; ");
    const checkpointSummary = record.checkpoints
      .map(checkpoint => `${checkpoint.id}:${checkpoint.status}`)
      .join("; ");

    return [
      record.transactionId,
      record.lane,
      record.family,
      record.chainId,
      record.status,
      record.failureType ?? "",
      String(record.durationMs),
      identifiers,
      checkpointSummary,
    ]
      .map(value => `"${String(value).replaceAll('"', '""')}"`)
      .join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

function renderExecutionSummary(
  plan: LiveTransactionSwarmPlan,
  records: LiveTransactionExecutionRecord[]
): string {
  const passed = records.filter(record => record.status === "passed").length;
  const failed = records.length - passed;
  const failingRows = records
    .filter(record => record.status === "failed")
    .slice(0, 10)
    .map(
      record =>
        `- ${record.transactionId} \`${record.chainId}\` [${record.failureType ?? "unknown"}]: ${record.errors[0] ?? "No error captured"}`
    )
    .join("\n");

  return [
    renderPlanSummary(plan).trimEnd(),
    "## Execution",
    `- Passed: \`${passed}\``,
    `- Failed: \`${failed}\``,
    "",
    "## Failing Transactions",
    failingRows || "- None",
    "",
  ].join("\n");
}

function writePlanArtifacts(
  plan: LiveTransactionSwarmPlan,
  runDir: string
): void {
  writeFileSync(
    path.join(runDir, "manifest.json"),
    `${JSON.stringify(plan, null, 2)}\n`
  );
  writeFileSync(path.join(runDir, "summary.md"), renderPlanSummary(plan));
}

function writeExecutionArtifacts(
  plan: LiveTransactionSwarmPlan,
  records: LiveTransactionExecutionRecord[],
  runDir: string
): void {
  writeFileSync(
    path.join(runDir, "execution-records.json"),
    `${JSON.stringify(records, null, 2)}\n`
  );
  writeFileSync(path.join(runDir, "ledger.csv"), createLedgerCsv(records));
  writeFileSync(
    path.join(runDir, "summary.md"),
    renderExecutionSummary(plan, records)
  );
}

async function executeSwarm(
  plan: LiveTransactionSwarmPlan,
  runDir: string,
  headless: boolean
): Promise<LiveTransactionExecutionRecord[]> {
  process.env.PLAYWRIGHT_BASE_URL = plan.baseUrl;
  process.env.MEGA_QA_BASE_URL = plan.baseUrl;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    baseURL: plan.baseUrl,
    ignoreHTTPSErrors: true,
  });
  const records: LiveTransactionExecutionRecord[] = [];

  try {
    for (const transaction of plan.transactions) {
      const chain = getChainById(transaction.chainId);
      if (!chain) {
        records.push({
          transactionId: transaction.transactionId,
          templateId: transaction.templateId,
          chainId: transaction.chainId,
          title: transaction.title,
          family: transaction.family,
          lane: transaction.lane,
          objective: transaction.objective,
          moduleEdges: [...transaction.moduleEdges],
          expectedArtifacts: [...transaction.expectedArtifacts],
          status: "failed",
          failureType: "test_infra",
          durationMs: 0,
          checkpoints: transaction.checkpoints.map(checkpoint => ({
            id: checkpoint.id,
            label: checkpoint.label,
            status: checkpoint.id === "audit" ? "failed" : "not_applicable",
            evidence: `Missing chain definition for ${transaction.chainId}`,
          })),
          invariantSummary: { total: 0, passed: 0, failed: 0 },
          extractedIdentifiers: {},
          screenshots: [],
          errors: [`Missing chain definition for ${transaction.chainId}`],
        });
        continue;
      }

      const page = await context.newPage();
      const chainContext = createChainContext();
      chainContext.stored.swarmRunId = plan.runId;
      chainContext.stored.swarmTransactionId = transaction.transactionId;
      chainContext.stored.swarmLane = transaction.lane;
      chainContext.stored.swarmTemplateId = transaction.templateId;

      console.info(
        `[live-transaction-swarm] Running ${transaction.transactionId} ${transaction.chainId}`
      );

      try {
        const result = await executeChain(page, chain, chainContext);
        const record = buildExecutionRecord(transaction, result);
        records.push(record);

        writeFileSync(
          path.join(
            runDir,
            "transactions",
            `${transaction.transactionId}.json`
          ),
          `${JSON.stringify(record, null, 2)}\n`
        );
        writeExecutionArtifacts(plan, records, runDir);
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }

  return records;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runId = createRunId();
  const runDir =
    options.outputDir ??
    path.join(process.cwd(), "qa-results", "live-transaction-swarm", runId);
  const plan = buildLiveTransactionSwarmPlan(options.bundleId, {
    runId,
    baseUrl: options.baseUrl,
    maxTransactions: options.maxTransactions,
  });

  ensureRunDirs(runDir);
  writePlanArtifacts(plan, runDir);

  console.info("=".repeat(80));
  console.info("TERP Live Transaction Swarm");
  console.info("=".repeat(80));
  console.info(`Run ID:    ${plan.runId}`);
  console.info(`Bundle:    ${plan.bundleId}`);
  console.info(`Target:    ${plan.baseUrl}`);
  console.info(`Count:     ${plan.summary.totalTransactions}`);
  console.info(`Plan only: ${options.planOnly}`);
  console.info(`Output:    ${runDir}`);
  console.info("=".repeat(80));

  if (options.planOnly) {
    console.info("Plan artifacts written successfully.");
    return;
  }

  const records = await executeSwarm(plan, runDir, options.headless);
  const failed = records.filter(record => record.status === "failed").length;

  console.info("");
  console.info("Swarm execution complete.");
  console.info(`Passed: ${records.length - failed}`);
  console.info(`Failed: ${failed}`);
  console.info(`Artifacts: ${runDir}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();

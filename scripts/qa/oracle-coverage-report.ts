/**
 * Oracle Coverage Report Generator
 *
 * Analyzes oracle test coverage against USER_FLOW_MATRIX.csv
 * and generates a coverage report.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const FLOW_MATRIX_PATH = path.join(
  process.cwd(),
  "docs/reference/USER_FLOW_MATRIX.csv"
);
const ORACLES_DIR = path.join(process.cwd(), "tests-e2e/oracles");
const ORACLE_EXTENSION = ".oracle.yaml";

interface FlowMatrixRow {
  Domain: string;
  Entity: string;
  "Flow Name": string;
  Archetype: string;
  "tRPC Procedure": string;
  Type: string;
  Roles: string;
  "Implementation Status": string;
}

interface OracleSummary {
  flow_id: string;
  description: string;
  role: string;
  tags: string[];
}

interface CoverageReport {
  timestamp: string;
  summary: {
    totalFlows: number;
    clientWiredFlows: number;
    oraclesFound: number;
    tier1Coverage: number;
    tier2Coverage: number;
    overallCoverage: number;
  };
  byDomain: Record<
    string,
    {
      totalFlows: number;
      covered: number;
      percentage: number;
    }
  >;
  uncoveredFlows: string[];
  oracles: OracleSummary[];
}

/**
 * Parse CSV file
 */
function parseCSV(content: string): FlowMatrixRow[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row as FlowMatrixRow;
  });
}

/**
 * Load all oracles
 */
function loadOracles(dir: string): OracleSummary[] {
  const oracles: OracleSummary[] = [];

  if (!fs.existsSync(dir)) {
    return oracles;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory() && !file.name.startsWith("_")) {
      oracles.push(...loadOracles(filePath));
    } else if (file.name.endsWith(ORACLE_EXTENSION)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const oracle = yaml.load(content) as {
          flow_id: string;
          description: string;
          role: string;
          tags?: string[];
        };
        oracles.push({
          flow_id: oracle.flow_id,
          description: oracle.description,
          role: oracle.role,
          tags: oracle.tags || [],
        });
      } catch (error) {
        console.error(`Failed to load oracle ${filePath}:`, error);
      }
    }
  }

  return oracles;
}

/**
 * Generate coverage report
 */
function generateReport(): CoverageReport {
  // Load flow matrix
  const matrixContent = fs.readFileSync(FLOW_MATRIX_PATH, "utf-8");
  const flows = parseCSV(matrixContent);

  // Filter to client-wired flows (testable via UI)
  const clientWiredFlows = flows.filter(
    (f) =>
      f["Implementation Status"] === "Client-wired" &&
      f.Domain !== "Deprecated"
  );

  // Load oracles
  const oracles = loadOracles(ORACLES_DIR);

  // Build coverage map
  const coveredFlowIds = new Set(oracles.map((o) => o.flow_id));
  const tier1Oracles = oracles.filter((o) => o.tags.includes("tier1"));
  const tier2Oracles = oracles.filter((o) => o.tags.includes("tier2"));

  // Calculate by domain
  const byDomain: CoverageReport["byDomain"] = {};
  const uncoveredFlows: string[] = [];

  for (const flow of clientWiredFlows) {
    const domain = flow.Domain;
    const flowId = `${domain}.${flow.Entity}.${flow["Flow Name"].replace(/\s+/g, "")}`;

    if (!byDomain[domain]) {
      byDomain[domain] = { totalFlows: 0, covered: 0, percentage: 0 };
    }

    byDomain[domain].totalFlows++;

    // Check if this flow is covered
    const isCovered = oracles.some(
      (o) =>
        o.flow_id.startsWith(`${domain}.`) &&
        (o.flow_id.includes(flow["Flow Name"].replace(/\s+/g, "")) ||
          o.flow_id.includes(flow.Entity))
    );

    if (isCovered) {
      byDomain[domain].covered++;
    } else {
      uncoveredFlows.push(flowId);
    }
  }

  // Calculate percentages
  for (const domain of Object.keys(byDomain)) {
    byDomain[domain].percentage = Math.round(
      (byDomain[domain].covered / byDomain[domain].totalFlows) * 100
    );
  }

  const totalCovered = Object.values(byDomain).reduce(
    (sum, d) => sum + d.covered,
    0
  );

  const report: CoverageReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFlows: flows.length,
      clientWiredFlows: clientWiredFlows.length,
      oraclesFound: oracles.length,
      tier1Coverage: tier1Oracles.length,
      tier2Coverage: tier2Oracles.length,
      overallCoverage: Math.round(
        (totalCovered / clientWiredFlows.length) * 100
      ),
    },
    byDomain,
    uncoveredFlows: uncoveredFlows.slice(0, 50), // Limit to first 50
    oracles,
  };

  return report;
}

/**
 * Print report to console
 */
function printReport(report: CoverageReport): void {
  console.log("\n" + "=".repeat(70));
  console.log("ORACLE TEST COVERAGE REPORT");
  console.log("=".repeat(70));
  console.log(`Generated: ${report.timestamp}\n`);

  console.log("SUMMARY");
  console.log("-".repeat(40));
  console.log(`Total Flows in Matrix:     ${report.summary.totalFlows}`);
  console.log(`Client-Wired Flows:        ${report.summary.clientWiredFlows}`);
  console.log(`Oracles Created:           ${report.summary.oraclesFound}`);
  console.log(`Tier 1 Oracles:            ${report.summary.tier1Coverage}`);
  console.log(`Tier 2 Oracles:            ${report.summary.tier2Coverage}`);
  console.log(`Overall Coverage:          ${report.summary.overallCoverage}%`);

  console.log("\nCOVERAGE BY DOMAIN");
  console.log("-".repeat(40));

  const domains = Object.keys(report.byDomain).sort();
  for (const domain of domains) {
    const d = report.byDomain[domain];
    const bar = "█".repeat(Math.floor(d.percentage / 5));
    console.log(
      `${domain.padEnd(15)} ${d.covered}/${d.totalFlows} (${d.percentage}%) ${bar}`
    );
  }

  console.log("\nORACLES LOADED");
  console.log("-".repeat(40));
  for (const oracle of report.oracles) {
    const tags = oracle.tags.join(", ") || "no tags";
    console.log(`  ${oracle.flow_id}`);
    console.log(`    Role: ${oracle.role}, Tags: ${tags}`);
  }

  if (report.uncoveredFlows.length > 0) {
    console.log("\nUNCOVERED FLOWS (sample)");
    console.log("-".repeat(40));
    for (const flow of report.uncoveredFlows.slice(0, 20)) {
      console.log(`  - ${flow}`);
    }
    if (report.uncoveredFlows.length > 20) {
      console.log(`  ... and ${report.uncoveredFlows.length - 20} more`);
    }
  }

  console.log("\n" + "=".repeat(70));
}

// Main
const report = generateReport();
printReport(report);

// Save report as JSON
const reportPath = path.join(
  process.cwd(),
  "test-results",
  "oracle-coverage.json"
);
const reportDir = path.dirname(reportPath);
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nReport saved to: ${reportPath}`);

/**
 * Oracle Loader
 *
 * Loads and validates test oracle YAML files.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as yaml from "js-yaml";
import type { TestOracle, SeedProfile } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORACLES_DIR = path.join(__dirname, "..");
const ORACLE_EXTENSION = ".oracle.yaml";
const SEED_PROFILES_DIR = path.join(ORACLES_DIR, "oracles", "_seed-profiles");

/**
 * Load a single oracle file
 */
export function loadOracle(filePath: string): TestOracle {
  const content = fs.readFileSync(filePath, "utf-8");
  const oracle = yaml.load(content) as TestOracle;

  // Validate required fields
  validateOracle(oracle, filePath);

  return oracle;
}

/**
 * Load all oracles from a directory
 */
export function loadOraclesFromDir(dir: string): TestOracle[] {
  const oracles: TestOracle[] = [];

  if (!fs.existsSync(dir)) {
    return oracles;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      oracles.push(...loadOraclesFromDir(filePath));
    } else if (file.name.endsWith(ORACLE_EXTENSION)) {
      try {
        oracles.push(loadOracle(filePath));
      } catch (error) {
        console.error(`Failed to load oracle ${filePath}:`, error);
      }
    }
  }

  return oracles;
}

/**
 * Load oracles by domain
 */
export function loadOraclesByDomain(domain: string): TestOracle[] {
  const domainDir = path.join(ORACLES_DIR, "oracles", domain.toLowerCase());
  return loadOraclesFromDir(domainDir);
}

/**
 * Load oracles by tags
 */
export function loadOraclesByTags(
  tags: string[],
  matchAll = false
): TestOracle[] {
  const allOracles = loadOraclesFromDir(path.join(ORACLES_DIR, "oracles"));

  return allOracles.filter(oracle => {
    if (!oracle.tags || oracle.tags.length === 0) {
      return false;
    }
    const oracleTags = oracle.tags;

    if (matchAll) {
      return tags.every(tag => oracleTags.includes(tag));
    }

    return tags.some(tag => oracleTags.includes(tag));
  });
}

/**
 * Load Tier 1 (critical) oracles
 */
export function loadTier1Oracles(): TestOracle[] {
  return loadOraclesByTags(["tier1"]);
}

/**
 * Load Tier 2 (important) oracles
 */
export function loadTier2Oracles(): TestOracle[] {
  return loadOraclesByTags(["tier2"]);
}

/**
 * Load smoke test oracles
 */
export function loadSmokeOracles(): TestOracle[] {
  return loadOraclesByTags(["smoke"]);
}

/**
 * Load a seed profile
 */
export function loadSeedProfile(profileName: string): SeedProfile | null {
  const profilePath = path.join(SEED_PROFILES_DIR, `${profileName}.yaml`);

  if (!fs.existsSync(profilePath)) {
    return null;
  }

  const content = fs.readFileSync(profilePath, "utf-8");
  return yaml.load(content) as SeedProfile;
}

/**
 * Get all available oracle flow IDs
 */
export function getAllOracleIds(): string[] {
  const oracles = loadOraclesFromDir(path.join(ORACLES_DIR, "oracles"));
  return oracles.map(o => o.flow_id);
}

/**
 * Find oracle by flow ID
 */
export function findOracleById(flowId: string): TestOracle | null {
  const oracles = loadOraclesFromDir(path.join(ORACLES_DIR, "oracles"));
  return oracles.find(o => o.flow_id === flowId) || null;
}

/**
 * Validate oracle structure
 */
function validateOracle(oracle: TestOracle, filePath: string): void {
  const errors: string[] = [];

  if (!oracle.flow_id) {
    errors.push("Missing required field: flow_id");
  }

  if (!oracle.description) {
    errors.push("Missing required field: description");
  }

  if (!oracle.role) {
    errors.push("Missing required field: role");
  }

  if (!oracle.steps || oracle.steps.length === 0) {
    errors.push("Missing required field: steps (must have at least one step)");
  }

  if (!oracle.expected_ui && !oracle.expected_db) {
    errors.push("At least one of expected_ui or expected_db must be defined");
  }

  // Validate flow_id format
  if (
    oracle.flow_id &&
    !/^[A-Z][a-zA-Z]+\.[A-Z][a-zA-Z]+\.[A-Z][a-zA-Z]+/.test(oracle.flow_id)
  ) {
    errors.push(
      `Invalid flow_id format: ${oracle.flow_id}. Expected: Domain.Entity.FlowName`
    );
  }

  // Validate role
  const validRoles = [
    "SuperAdmin",
    "SalesManager",
    "SalesRep",
    "InventoryManager",
    "Fulfillment",
    "AccountingManager",
    "Auditor",
  ];
  if (oracle.role && !validRoles.includes(oracle.role)) {
    errors.push(
      `Invalid role: ${oracle.role}. Valid roles: ${validRoles.join(", ")}`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Oracle validation failed for ${filePath}:\n${errors.join("\n")}`
    );
  }
}

/**
 * Generate oracle summary for reporting
 */
export function generateOracleSummary(): {
  total: number;
  byDomain: Record<string, number>;
  byTier: Record<string, number>;
  byRole: Record<string, number>;
} {
  const oracles = loadOraclesFromDir(path.join(ORACLES_DIR, "oracles"));

  const byDomain: Record<string, number> = {};
  const byTier: Record<string, number> = { tier1: 0, tier2: 0, other: 0 };
  const byRole: Record<string, number> = {};

  for (const oracle of oracles) {
    // Extract domain from flow_id
    const domain = oracle.flow_id.split(".")[0];
    byDomain[domain] = (byDomain[domain] || 0) + 1;

    // Count by tier
    if (oracle.tags?.includes("tier1")) {
      byTier.tier1++;
    } else if (oracle.tags?.includes("tier2")) {
      byTier.tier2++;
    } else {
      byTier.other++;
    }

    // Count by role
    byRole[oracle.role] = (byRole[oracle.role] || 0) + 1;
  }

  return {
    total: oracles.length,
    byDomain,
    byTier,
    byRole,
  };
}

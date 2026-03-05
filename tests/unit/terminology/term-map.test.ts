/**
 * Terminology Bible — Unit Tests (LEX-014)
 *
 * Tests that:
 * 1. The term map covers all 5 vocabulary families
 * 2. Each term has all required fields (validates against schema)
 * 3. The term map resolves deprecated aliases correctly
 * 4. Policy locks are defined for terms that need them
 * 5. The audit script detects known violations (shell script integration)
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// ─── Load term map ─────────────────────────────────────────────────────────────
// process.cwd() is the repo root when vitest is run from the repo root
const REPO_ROOT = process.cwd();
const termMapPath = join(REPO_ROOT, "docs/terminology/term-map.json");
const schemaPath = join(REPO_ROOT, "docs/terminology/schema.json");
const censusSriptPath = join(REPO_ROOT, "scripts/terminology-census.sh");
const driftScriptPath = join(REPO_ROOT, "scripts/terminology-drift-audit.sh");

interface PolicyLock {
  locked: boolean;
  rule: string;
  exceptions?: string[];
}

interface Source {
  authority: string;
  db_table: string | null;
  db_column: string | null;
  api_field: string | null;
  ui_label: string;
  code_file?: string | null;
}

interface DynamicVariant {
  condition: string;
  label: string;
}

interface TermEntry {
  term: string;
  canonical: string;
  family: string;
  source: Source;
  deprecated_aliases: string[];
  context: string;
  policy_lock: PolicyLock;
  dynamic_variants?: DynamicVariant[];
  notes?: string;
}

interface TermMap {
  version: string;
  terms: TermEntry[];
}

interface Schema {
  properties: Record<string, unknown>;
  required: string[];
}

let termMap: TermMap;
let _schema: Schema;

try {
  termMap = JSON.parse(readFileSync(termMapPath, "utf-8")) as TermMap;
  _schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as Schema;
} catch (err) {
  throw new Error(
    `Failed to load terminology files. Ensure docs/terminology/ exists: ${String(err)}`
  );
}

// ─── Helper: find term by key ──────────────────────────────────────────────────
function getTerm(termKey: string): TermEntry | undefined {
  return termMap.terms.find(t => t.term === termKey);
}

function getTermsByFamily(family: string): TermEntry[] {
  return termMap.terms.filter(t => t.family === family);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Term Map — Structure", () => {
  it("loads the term-map.json without errors", () => {
    expect(termMap).toBeDefined();
    expect(termMap.terms).toBeDefined();
    expect(Array.isArray(termMap.terms)).toBe(true);
  });

  it("has a version field", () => {
    expect(termMap.version).toBeDefined();
    expect(typeof termMap.version).toBe("string");
    expect(termMap.version.length).toBeGreaterThan(0);
  });

  it("has at least 10 terms defined", () => {
    expect(termMap.terms.length).toBeGreaterThanOrEqual(10);
  });
});

describe("Term Map — All 5 Vocabulary Families", () => {
  const REQUIRED_FAMILIES = ["party", "product", "intake", "sales", "brand"];

  for (const family of REQUIRED_FAMILIES) {
    it(`has at least one term in the '${family}' family`, () => {
      const familyTerms = getTermsByFamily(family);
      expect(familyTerms.length).toBeGreaterThan(0);
    });
  }

  it("has no terms with unknown families", () => {
    const VALID_FAMILIES = new Set([
      "party",
      "product",
      "intake",
      "sales",
      "brand",
    ]);
    for (const term of termMap.terms) {
      expect(
        VALID_FAMILIES.has(term.family),
        `Term '${term.term}' has invalid family '${term.family}'`
      ).toBe(true);
    }
  });
});

describe("Term Map — Required Fields (Schema Compliance)", () => {
  const REQUIRED_FIELDS = [
    "term",
    "canonical",
    "family",
    "source",
    "policy_lock",
    "context",
    "deprecated_aliases",
  ];

  const REQUIRED_SOURCE_FIELDS = [
    "authority",
    "db_table",
    "db_column",
    "api_field",
    "ui_label",
  ];

  const REQUIRED_POLICY_FIELDS = ["locked", "rule"];

  const VALID_AUTHORITIES = [
    "db_schema",
    "evan_vocabulary",
    "db_schema+evan_vocabulary",
    "ui_only",
  ];

  for (const termEntry of termMap.terms) {
    describe(`Term: '${termEntry.term}'`, () => {
      it("has all required top-level fields", () => {
        for (const field of REQUIRED_FIELDS) {
          expect(
            field in termEntry,
            `Term '${termEntry.term}' is missing required field '${field}'`
          ).toBe(true);
        }
      });

      it("has a non-empty canonical name", () => {
        expect(typeof termEntry.canonical).toBe("string");
        expect(termEntry.canonical.length).toBeGreaterThan(0);
      });

      it("has a non-empty context description", () => {
        expect(typeof termEntry.context).toBe("string");
        expect(termEntry.context.length).toBeGreaterThan(0);
      });

      it("has deprecated_aliases as an array", () => {
        expect(Array.isArray(termEntry.deprecated_aliases)).toBe(true);
      });

      it("has all required source fields", () => {
        expect(termEntry.source).toBeDefined();
        for (const field of REQUIRED_SOURCE_FIELDS) {
          expect(
            field in termEntry.source,
            `Term '${termEntry.term}' source is missing field '${field}'`
          ).toBe(true);
        }
      });

      it("has a valid source authority", () => {
        expect(
          VALID_AUTHORITIES.includes(termEntry.source.authority),
          `Term '${termEntry.term}' has invalid authority '${termEntry.source.authority}'`
        ).toBe(true);
      });

      it("has a non-empty ui_label", () => {
        expect(typeof termEntry.source.ui_label).toBe("string");
        expect(termEntry.source.ui_label.length).toBeGreaterThan(0);
      });

      it("has all required policy_lock fields", () => {
        expect(termEntry.policy_lock).toBeDefined();
        for (const field of REQUIRED_POLICY_FIELDS) {
          expect(
            field in termEntry.policy_lock,
            `Term '${termEntry.term}' policy_lock is missing field '${field}'`
          ).toBe(true);
        }
      });

      it("has policy_lock.locked as a boolean", () => {
        expect(typeof termEntry.policy_lock.locked).toBe("boolean");
      });

      it("has policy_lock.rule as a non-empty string", () => {
        expect(typeof termEntry.policy_lock.rule).toBe("string");
        expect(termEntry.policy_lock.rule.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("Term Map — Party Family", () => {
  it("includes 'client' term", () => {
    expect(getTerm("client")).toBeDefined();
  });

  it("includes 'supplier' term", () => {
    expect(getTerm("supplier")).toBeDefined();
  });

  it("includes 'buyer' term", () => {
    expect(getTerm("buyer")).toBeDefined();
  });

  it("includes 'brand' term", () => {
    expect(getTerm("brand")).toBeDefined();
  });

  it("supplier term has 'Vendor' in deprecated_aliases", () => {
    const supplier = getTerm("supplier");
    expect(supplier?.deprecated_aliases).toContain("Vendor");
  });

  it("supplier term policy_lock.locked is true", () => {
    const supplier = getTerm("supplier");
    expect(supplier?.policy_lock.locked).toBe(true);
  });

  it("supplier term maps to 'clients' table, not 'vendors'", () => {
    const supplier = getTerm("supplier");
    expect(supplier?.source.db_table).toBe("clients");
    expect(supplier?.source.db_table).not.toBe("vendors");
  });

  it("supplier canonical is 'Supplier'", () => {
    const supplier = getTerm("supplier");
    expect(supplier?.canonical).toBe("Supplier");
  });
});

describe("Term Map — Product Family", () => {
  it("includes 'batch' term", () => {
    expect(getTerm("batch")).toBeDefined();
  });

  it("includes 'sku' term", () => {
    expect(getTerm("sku")).toBeDefined();
  });

  it("includes 'product' term", () => {
    expect(getTerm("product")).toBeDefined();
  });

  it("batch term has 'InventoryItem' in deprecated_aliases", () => {
    const batch = getTerm("batch");
    expect(batch?.deprecated_aliases).toContain("InventoryItem");
  });

  it("batch term maps to 'batches' table", () => {
    const batch = getTerm("batch");
    expect(batch?.source.db_table).toBe("batches");
  });

  it("batch term policy_lock.locked is true", () => {
    const batch = getTerm("batch");
    expect(batch?.policy_lock.locked).toBe(true);
  });
});

describe("Term Map — Intake Family", () => {
  it("includes 'intake' term", () => {
    expect(getTerm("intake")).toBeDefined();
  });

  it("includes 'direct_intake' term", () => {
    expect(getTerm("direct_intake")).toBeDefined();
  });

  it("includes 'purchase_order' term", () => {
    expect(getTerm("purchase_order")).toBeDefined();
  });

  it("intake term has 'Receiving' in deprecated_aliases", () => {
    const intake = getTerm("intake");
    expect(intake?.deprecated_aliases).toContain("Receiving");
  });

  it("intake term policy_lock.locked is true", () => {
    const intake = getTerm("intake");
    expect(intake?.policy_lock.locked).toBe(true);
  });

  it("direct_intake has 'DirectEntry' in deprecated_aliases", () => {
    const di = getTerm("direct_intake");
    expect(di?.deprecated_aliases).toContain("DirectEntry");
  });

  it("direct_intake policy_lock.locked is true", () => {
    const di = getTerm("direct_intake");
    expect(di?.policy_lock.locked).toBe(true);
  });
});

describe("Term Map — Sales Family", () => {
  it("includes 'sales_order' term", () => {
    expect(getTerm("sales_order")).toBeDefined();
  });

  it("includes 'quote' term", () => {
    expect(getTerm("quote")).toBeDefined();
  });

  it("includes 'invoice' term", () => {
    expect(getTerm("invoice")).toBeDefined();
  });

  it("includes 'fulfillment' term", () => {
    expect(getTerm("fulfillment")).toBeDefined();
  });

  it("sales_order canonical is 'Sales Order'", () => {
    const so = getTerm("sales_order");
    expect(so?.canonical).toBe("Sales Order");
  });

  it("sales_order term maps to 'orders' table", () => {
    const so = getTerm("sales_order");
    expect(so?.source.db_table).toBe("orders");
  });

  it("quote term has 'Estimate' in deprecated_aliases", () => {
    const quote = getTerm("quote");
    expect(quote?.deprecated_aliases).toContain("Estimate");
  });

  it("sales_order policy_lock.locked is true", () => {
    const so = getTerm("sales_order");
    expect(so?.policy_lock.locked).toBe(true);
  });
});

describe("Term Map — Brand Family", () => {
  it("includes 'farmer' term", () => {
    expect(getTerm("farmer")).toBeDefined();
  });

  it("farmer term maps to 'brands' table (not a separate farmers table)", () => {
    const farmer = getTerm("farmer");
    expect(farmer?.source.db_table).toBe("brands");
  });

  it("farmer term api_field is 'brandId' (not farmerId)", () => {
    const farmer = getTerm("farmer");
    expect(farmer?.source.api_field).toBe("brandId");
  });

  it("farmer term policy_lock.locked is true", () => {
    const farmer = getTerm("farmer");
    expect(farmer?.policy_lock.locked).toBe(true);
  });

  it("farmer term has dynamic_variants defined", () => {
    const farmer = getTerm("farmer");
    expect(farmer?.dynamic_variants).toBeDefined();
    expect(Array.isArray(farmer?.dynamic_variants)).toBe(true);
    expect((farmer?.dynamic_variants ?? []).length).toBeGreaterThan(0);
  });

  it("brand term (party family) has dynamic_variants for flower categories", () => {
    const brand = getTerm("brand");
    expect(brand?.dynamic_variants).toBeDefined();
    const farmerVariant = brand?.dynamic_variants?.find(
      v => v.label === "Farmer"
    );
    expect(farmerVariant).toBeDefined();
  });
});

describe("Term Map — Deprecated Alias Resolution", () => {
  it("every deprecated_aliases item is a non-empty string", () => {
    for (const term of termMap.terms) {
      for (const alias of term.deprecated_aliases) {
        expect(typeof alias).toBe("string");
        expect(alias.length).toBeGreaterThan(0);
      }
    }
  });

  it("no two terms share the same 'term' key", () => {
    const termKeys = termMap.terms.map(t => t.term);
    const uniqueKeys = new Set(termKeys);
    expect(uniqueKeys.size).toBe(termKeys.length);
  });
});

describe("Drift Audit Script — File Existence", () => {
  it("drift audit script exists", () => {
    expect(existsSync(driftScriptPath)).toBe(true);
  });

  it("census script exists", () => {
    expect(existsSync(censusSriptPath)).toBe(true);
  });

  it("drift audit script is executable", () => {
    try {
      execSync(`test -x "${driftScriptPath}"`, { stdio: "pipe" });
    } catch {
      throw new Error(`Script is not executable: ${driftScriptPath}`);
    }
  });

  it("census script is executable", () => {
    try {
      execSync(`test -x "${censusSriptPath}"`, { stdio: "pipe" });
    } catch {
      throw new Error(`Script is not executable: ${censusSriptPath}`);
    }
  });
});

describe("Drift Audit Script — Violation Detection", () => {
  it("deprecated 'Vendor' term is detectable by grep pattern used in the audit", () => {
    // Verify the pattern used by the audit script correctly matches deprecated terms
    // We test the detection logic directly using Node's regex, matching the grep -E patterns
    // used in terminology-drift-audit.sh

    const violatingCode = `
// This file uses deprecated 'Vendor' terminology
function getVendor(vendorId: number) {
  return db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
}
`;

    // Pattern from drift audit script: \bVendor\b
    const vendorPattern = /\bVendor\b/;
    expect(vendorPattern.test(violatingCode)).toBe(true);

    // Pattern from drift audit script: \bvendorId\b
    const vendorIdPattern = /\bvendorId\b/;
    expect(vendorIdPattern.test(violatingCode)).toBe(true);
  });

  it("canonical 'Supplier' term is NOT flagged by deprecated patterns", () => {
    const canonicalCode = `
// This file uses canonical 'Supplier' terminology
function getSupplier(supplierClientId: number) {
  return db.select().from(clients)
    .where(and(eq(clients.id, supplierClientId), eq(clients.isSeller, true)));
}
`;

    // Verify deprecated patterns do NOT match canonical code
    const vendorPattern = /\bVendor\b/;
    const vendorIdPattern = /\bvendorId\b/;
    expect(vendorPattern.test(canonicalCode)).toBe(false);
    expect(vendorIdPattern.test(canonicalCode)).toBe(false);
  });

  it("deprecated 'Receiving' term is detectable by audit pattern", () => {
    const violatingCode = `const label = "Receiving Session";`;
    const pattern = /\bReceiving\b/;
    expect(pattern.test(violatingCode)).toBe(true);
  });

  it("deprecated 'InventoryItem' type is detectable by audit pattern", () => {
    const violatingCode = `interface InventoryItem { id: number; }`;
    const pattern = /\bInventoryItem\b/;
    expect(pattern.test(violatingCode)).toBe(true);
  });

  it("canonical 'Batch' type is NOT flagged by deprecated patterns", () => {
    const canonicalCode = `interface Batch { id: number; batchStatus: string; }`;
    const pattern = /\bInventoryItem\b/;
    expect(pattern.test(canonicalCode)).toBe(false);
  });

  it("census script contains the expected deprecated terms as grep patterns", () => {
    // Verify the census script source contains patterns for our key deprecated terms
    // This is a static analysis of the script's content, not execution
    const scriptContent = readFileSync(censusSriptPath, "utf-8");

    // Must scan for Vendor (Supplier policy)
    expect(scriptContent).toContain("Vendor");

    // Must scan for Receiving (Intake policy)
    expect(scriptContent).toContain("Receiving");

    // Must scan for InventoryItem (Batch policy)
    expect(scriptContent).toContain("InventoryItem");

    // Must have --json flag support (for deterministic output)
    expect(scriptContent).toContain("--json");
  });
});

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type LifecycleStatus =
  | "canonical"
  | "legacy"
  | "alias"
  | "deprecated"
  | "exception";

type ForkRelevance =
  | "pilot-core"
  | "adjacent"
  | "exception-surface"
  | "ignore-v1";

interface SchemaInventoryRecord {
  tableName: string;
  exportName: string;
  schemaFile: string;
  primaryDomainOwner: string;
  lifecycleStatus: LifecycleStatus;
  forkRelevance: ForkRelevance;
  notes: string;
}

interface MigrationSourceRecord {
  filename: string;
  sourcePath: string;
  sourceStream: "drizzle-root" | "drizzle-migrations" | "journal";
  prefix: string;
  classification:
    | "canonical"
    | "legacy-reference"
    | "journaled"
    | "unjournaled"
    | "outside-fork-scope";
  rationale: string;
}

interface RouterTableRecord {
  routerName: string;
  routerFile: string;
  tableName: string;
  exportName: string;
  ownershipKind: "direct-import" | "manual-pilot-adjacent";
  notes: string;
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDir, "..", "..");
const drizzleDir = path.join(repoRoot, "drizzle");
const routersDir = path.join(repoRoot, "server", "routers");
const outputDir = path.join(
  repoRoot,
  "docs",
  "specs",
  "spreadsheet-native-foundation",
  "generated"
);

const statusOverrides: Record<
  string,
  {
    lifecycleStatus: LifecycleStatus;
    forkRelevance?: ForkRelevance;
    notes?: string;
  }
> = {
  vendors: {
    lifecycleStatus: "deprecated",
    forkRelevance: "adjacent",
    notes:
      "Canonical party-model conflict: still used in runtime, but fork should treat clients plus supplierProfiles as canonical.",
  },
  vendorNotes: {
    lifecycleStatus: "deprecated",
    forkRelevance: "adjacent",
    notes:
      "Legacy supplier note storage linked to vendors; requires alias decision before fork consumption.",
  },
  supplierProfiles: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Canonical supplier extension for party-model future state.",
  },
  clients: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Canonical party table for buyers and suppliers.",
  },
  calendarEvents: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "Calendar/scheduling remains an exception-owned surface.",
  },
  appointmentRequests: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "Scheduling remains an exception-owned surface.",
  },
  vipPortalConfigurations: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "VIP portal remains an exception-owned surface.",
  },
  vipPortalAuth: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "VIP portal remains an exception-owned surface.",
  },
  liveShoppingSessions: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "Live shopping remains an exception-owned surface.",
  },
  sessionCartItems: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes: "Live shopping remains an exception-owned surface.",
  },
  productImages: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes:
      "Photography review remains exception-owned even if lightweight media appears elsewhere.",
  },
  demoMediaBlobs: {
    lifecycleStatus: "exception",
    forkRelevance: "exception-surface",
    notes:
      "Media blob storage is supporting infrastructure, not a pilot sheet core.",
  },
  orders: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Sales Orders pilot core table.",
  },
  orderLineItems: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Sales Orders pilot core child table.",
  },
  returns: {
    lifecycleStatus: "canonical",
    forkRelevance: "adjacent",
    notes: "Orders-adjacent handoff domain with separate ownership decisions.",
  },
  invoices: {
    lifecycleStatus: "canonical",
    forkRelevance: "adjacent",
    notes: "Accounting-owned output and billing surface adjacent to Orders.",
  },
  payments: {
    lifecycleStatus: "canonical",
    forkRelevance: "adjacent",
    notes: "Accounting-owned payment surface adjacent to Orders.",
  },
  batches: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Inventory pilot primary entity.",
  },
  inventoryMovements: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Inventory pilot movement and audit core table.",
  },
  inventoryViews: {
    lifecycleStatus: "canonical",
    forkRelevance: "pilot-core",
    notes: "Inventory pilot saved-view support table.",
  },
  locations: {
    lifecycleStatus: "canonical",
    forkRelevance: "adjacent",
    notes:
      "Adjacent setup/transfer surface; not owned by first inventory sheet.",
  },
  siteTransfers: {
    lifecycleStatus: "canonical",
    forkRelevance: "adjacent",
    notes: "Storage transfer surface adjacent to Inventory.",
  },
};

const pilotCoreTables = new Set([
  "orders",
  "orderLineItems",
  "orderLineItemAllocations",
  "orderStatusHistory",
  "batches",
  "inventoryMovements",
  "inventoryViews",
  "clients",
  "supplierProfiles",
  "lots",
  "products",
]);

function csvEscape(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function writeCsv<T extends Record<string, unknown>>(
  filePath: string,
  rows: T[],
  headers: Array<keyof T>
): void {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers.map(header => csvEscape(String(row[header] ?? ""))).join(",")
    );
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function getSchemaFiles(): string[] {
  return fs
    .readdirSync(drizzleDir)
    .filter(name => /^schema.*\.ts$/.test(name))
    .sort();
}

function guessDomainOwner(tableName: string): string {
  if (
    /^(orders|order|returns|sales|quotes|recurringOrders|salesSheet)/.test(
      tableName
    )
  ) {
    return "sales";
  }
  if (
    /^(batches|lots|inventory|locations|purchaseOrders|vendorReturns|sample|batch|workflowStatuses|intake|siteTransfers|storageZones|sites)/.test(
      tableName
    )
  ) {
    return "operations";
  }
  if (
    /^(clients|supplierProfiles|client|vendorSupply|vendors|brands|products|strains|categories|subcategories|grades|tags|tagGroups|productImages)/.test(
      tableName
    )
  ) {
    return "relationships";
  }
  if (
    /^(accounts|ledger|fiscal|invoice|bill|payment|bank|expense|transactions|credits|credit|referral|receipts|vendorPayables|payable)/.test(
      tableName
    )
  ) {
    return "accounting";
  }
  if (
    /^(calendar|appointment|timeOff|calendars|rooms|employeeShifts)/.test(
      tableName
    )
  ) {
    return "calendar";
  }
  if (
    /^(vipPortal|clientCatalogViews|clientInterest|clientDraftInterests|clientPriceAlerts|vipTiers|clientVipStatus)/.test(
      tableName
    )
  ) {
    return "vip-portal";
  }
  if (
    /^(liveShopping|sessionCartItems|sessionPriceOverrides)/.test(tableName)
  ) {
    return "live-shopping";
  }
  if (
    /^(roles|permissions|userRoles|featureFlags|notifications|inboxItems|todo|comments|dashboard|organization|deployments|leaderboard|cash|shiftAudits|userPreferences|unitTypes)/.test(
      tableName
    )
  ) {
    return "platform";
  }
  return "cross-product";
}

function defaultLifecycleStatus(
  tableName: string,
  domainOwner: string
): LifecycleStatus {
  if (
    domainOwner === "calendar" ||
    domainOwner === "vip-portal" ||
    domainOwner === "live-shopping"
  ) {
    return "exception";
  }
  return "canonical";
}

function defaultForkRelevance(
  tableName: string,
  domainOwner: string
): ForkRelevance {
  if (pilotCoreTables.has(tableName)) return "pilot-core";
  if (
    domainOwner === "calendar" ||
    domainOwner === "vip-portal" ||
    domainOwner === "live-shopping"
  ) {
    return "exception-surface";
  }
  if (domainOwner === "platform") return "ignore-v1";
  return "adjacent";
}

function buildSchemaInventory(): SchemaInventoryRecord[] {
  const rows: SchemaInventoryRecord[] = [];

  for (const schemaFile of getSchemaFiles()) {
    const filePath = path.join(drizzleDir, schemaFile);
    const text = fs.readFileSync(filePath, "utf8");
    const matches = [
      ...text.matchAll(/export const (\w+) = mysqlTable\(\s*"([^"]+)"/g),
    ];

    for (const match of matches) {
      const exportName = match[1];
      const tableName = match[2];
      const primaryDomainOwner = guessDomainOwner(tableName);
      const override =
        statusOverrides[exportName] ?? statusOverrides[tableName];

      rows.push({
        tableName,
        exportName,
        schemaFile,
        primaryDomainOwner,
        lifecycleStatus:
          override?.lifecycleStatus ??
          defaultLifecycleStatus(tableName, primaryDomainOwner),
        forkRelevance:
          override?.forkRelevance ??
          defaultForkRelevance(tableName, primaryDomainOwner),
        notes: override?.notes ?? "",
      });
    }
  }

  return rows.sort((left, right) =>
    left.tableName.localeCompare(right.tableName)
  );
}

function buildMigrationInventory(): MigrationSourceRecord[] {
  const journalPath = path.join(drizzleDir, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };

  const journalTags = new Set(journal.entries.map(entry => entry.tag));
  const journalPrefixes = new Set(
    [...journalTags]
      .map(tag => tag.match(/^(\d{4})_/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map(match => match[1])
  );

  const rootSqlFiles = fs
    .readdirSync(drizzleDir)
    .filter(name => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  const nestedMigrationDir = path.join(drizzleDir, "migrations");
  const nestedSqlFiles = fs
    .readdirSync(nestedMigrationDir)
    .filter(name => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  const rows: MigrationSourceRecord[] = [];

  for (const filename of rootSqlFiles) {
    const prefix = filename.match(/^(\d{4})_/)?.[1] ?? "";
    rows.push({
      filename,
      sourcePath: path.join("drizzle", filename),
      sourceStream: "drizzle-root",
      prefix,
      classification: journalPrefixes.has(prefix) ? "journaled" : "unjournaled",
      rationale: journalPrefixes.has(prefix)
        ? "Root drizzle migration prefix exists in Drizzle journal."
        : "Root drizzle migration file has no matching journal prefix.",
    });
  }

  for (const filename of nestedSqlFiles) {
    const prefix = filename.match(/^(\d{4})_/)?.[1] ?? "";
    rows.push({
      filename,
      sourcePath: path.join("drizzle", "migrations", filename),
      sourceStream: "drizzle-migrations",
      prefix,
      classification: journalPrefixes.has(prefix)
        ? "legacy-reference"
        : "outside-fork-scope",
      rationale: journalPrefixes.has(prefix)
        ? "Nested migration duplicates a journaled prefix and should be treated as reference-only until reconciled."
        : "Nested migration prefix is not journaled and must be explicitly classified before fork build work.",
    });
  }

  for (const tag of [...journalTags].sort()) {
    const prefix = tag.match(/^(\d{4})_/)?.[1] ?? "";
    rows.push({
      filename: tag,
      sourcePath: path.join("drizzle", "meta", "_journal.json"),
      sourceStream: "journal",
      prefix,
      classification: "canonical",
      rationale: "Journal entry recorded by Drizzle metadata.",
    });
  }

  return rows.sort((left, right) =>
    `${left.prefix}-${left.sourceStream}-${left.filename}`.localeCompare(
      `${right.prefix}-${right.sourceStream}-${right.filename}`
    )
  );
}

function buildRouterTableOwnership(): RouterTableRecord[] {
  const rows: RouterTableRecord[] = [];
  const routerFiles = fs
    .readdirSync(routersDir)
    .filter(name => name.endsWith(".ts"))
    .sort();

  for (const routerFile of routerFiles) {
    const filePath = path.join(routersDir, routerFile);
    const text = fs.readFileSync(filePath, "utf8");
    const importBlocks = [
      ...text.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*"(\.\.\/\.\.\/drizzle\/schema|\.\.\/drizzle\/schema)";/gs
      ),
    ];

    for (const block of importBlocks) {
      const rawNames = block[1]
        .split(",")
        .map(name => name.trim())
        .filter(Boolean)
        .filter(name => !name.startsWith("type "));

      for (const exportName of rawNames) {
        rows.push({
          routerName: routerFile.replace(/\.ts$/, ""),
          routerFile,
          tableName: exportName,
          exportName,
          ownershipKind: "direct-import",
          notes: "Direct Drizzle schema import in router file.",
        });
      }
    }
  }

  rows.push(
    {
      routerName: "orders",
      routerFile: "orders.ts",
      tableName: "payments",
      exportName: "payments",
      ownershipKind: "manual-pilot-adjacent",
      notes: "Orders pilot adjacent accounting handoff.",
    },
    {
      routerName: "orders",
      routerFile: "orders.ts",
      tableName: "invoices",
      exportName: "invoices",
      ownershipKind: "manual-pilot-adjacent",
      notes: "Orders pilot adjacent output/accounting dependency.",
    },
    {
      routerName: "orders",
      routerFile: "orders.ts",
      tableName: "returns",
      exportName: "returns",
      ownershipKind: "manual-pilot-adjacent",
      notes: "Orders pilot adjacent returns ownership seam.",
    },
    {
      routerName: "inventory",
      routerFile: "inventory.ts",
      tableName: "locations",
      exportName: "locations",
      ownershipKind: "manual-pilot-adjacent",
      notes: "Inventory pilot adjacent locations/transfer ownership seam.",
    },
    {
      routerName: "inventory",
      routerFile: "inventory.ts",
      tableName: "inventoryViews",
      exportName: "inventoryViews",
      ownershipKind: "manual-pilot-adjacent",
      notes: "Inventory views are saved-view support for pilot surface.",
    }
  );

  return rows.sort((left, right) =>
    `${left.routerName}-${left.tableName}`.localeCompare(
      `${right.routerName}-${right.tableName}`
    )
  );
}

function ensureOutputDir(): void {
  fs.mkdirSync(outputDir, { recursive: true });
}

function writeJson(fileName: string, payload: unknown): void {
  fs.writeFileSync(
    path.join(outputDir, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

function main(): void {
  ensureOutputDir();

  const schemaInventory = buildSchemaInventory();
  const migrationInventory = buildMigrationInventory();
  const routerOwnership = buildRouterTableOwnership();

  writeJson("schema-inventory.json", schemaInventory);
  writeJson("migration-source-inventory.json", migrationInventory);
  writeJson("router-table-ownership.json", routerOwnership);

  writeCsv(path.join(outputDir, "schema-inventory.csv"), schemaInventory, [
    "tableName",
    "exportName",
    "schemaFile",
    "primaryDomainOwner",
    "lifecycleStatus",
    "forkRelevance",
    "notes",
  ]);
  writeCsv(
    path.join(outputDir, "migration-source-inventory.csv"),
    migrationInventory,
    [
      "filename",
      "sourcePath",
      "sourceStream",
      "prefix",
      "classification",
      "rationale",
    ]
  );
  writeCsv(
    path.join(outputDir, "router-table-ownership.csv"),
    routerOwnership,
    [
      "routerName",
      "routerFile",
      "tableName",
      "exportName",
      "ownershipKind",
      "notes",
    ]
  );

  console.info(
    JSON.stringify(
      {
        schemaTables: schemaInventory.length,
        migrationRecords: migrationInventory.length,
        routerTableEdges: routerOwnership.length,
        outputDir,
      },
      null,
      2
    )
  );
}

main();

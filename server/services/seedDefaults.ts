import { getDb } from "../db";
import { seedRBACDefaults } from "./seedRBAC";
import {
  locations,
  categories,
  subcategories,
  grades,
  expenseCategories,
  accounts,
} from "../../drizzle/schema";

/**
 * Seed default storage locations
 * Creates a main warehouse with zones, racks, shelves, and bins
 *
 * @deprecated This function uses the legacy SKIP_SEEDING bypass.
 * Use `pnpm seed:new` for production seeding instead.
 * See docs/deployment/SEEDING_RUNBOOK.md for production procedures.
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultLocations() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.warn("⚠️  DEPRECATED: SKIP_SEEDING is deprecated. Use `pnpm seed:new` instead.");
    console.warn("   See docs/deployment/SEEDING_RUNBOOK.md for production seeding procedures.");
    console.log("⏭️  SKIP_SEEDING is set - skipping location seeding");
    return;
  }

  console.log("🌱 Seeding default locations...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping location seeding");
    return;
  }

  // Check if locations already exist
  const existing = await db.select().from(locations).limit(1);
  if (existing.length > 0) {
    console.log("✅ Locations already seeded, skipping...");
    return;
  }

  // Create locations with flat hierarchy
  // Format: Site / Zone / Rack / Shelf / Bin
  const locationsData = [
    // Zone A
    {
      site: "Main Warehouse",
      zone: "Zone A",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 1",
    },
    {
      site: "Main Warehouse",
      zone: "Zone A",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 2",
    },
    {
      site: "Main Warehouse",
      zone: "Zone A",
      rack: "Rack 1",
      shelf: "Shelf 2",
      bin: "Bin 1",
    },

    // Zone B
    {
      site: "Main Warehouse",
      zone: "Zone B",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 1",
    },
    {
      site: "Main Warehouse",
      zone: "Zone B",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 2",
    },
    {
      site: "Main Warehouse",
      zone: "Zone B",
      rack: "Rack 1",
      shelf: "Shelf 2",
      bin: "Bin 1",
    },

    // Zone C
    {
      site: "Main Warehouse",
      zone: "Zone C",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 1",
    },
    {
      site: "Main Warehouse",
      zone: "Zone C",
      rack: "Rack 1",
      shelf: "Shelf 1",
      bin: "Bin 2",
    },
    {
      site: "Main Warehouse",
      zone: "Zone C",
      rack: "Rack 1",
      shelf: "Shelf 2",
      bin: "Bin 1",
    },
  ];

  for (const location of locationsData) {
    await db.insert(locations).values(location);
  }

  console.log("✅ Default locations seeded");
}

/**
 * Seed default product categories and subcategories
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultCategories() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.log("⏭️  SKIP_SEEDING is set - skipping category seeding");
    return;
  }

  console.log("🌱 Seeding default categories...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping category seeding");
    return;
  }

  // Check if categories already exist
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) {
    console.log("✅ Categories already seeded, skipping...");
    return;
  }

  // Define categories with their subcategories
  const categoriesData = [
    {
      name: "Flower",
      subcategories: ["Outdoor", "Deps", "Indoor", "Smalls", "Trim"],
    },
    {
      name: "Concentrates",
      subcategories: [
        "Shatter",
        "Wax",
        "Live Resin",
        "Rosin",
        "Distillate",
        "Crumble",
        "Budder",
      ],
    },
    {
      name: "Vapes",
      subcategories: ["Cartridge", "All in One"],
    },
    {
      name: "Bulk Oil",
      subcategories: [],
    },
    {
      name: "Manufactured Products",
      subcategories: ["Preroll", "Edible", "Tincture", "Topical", "Accessory"],
    },
  ];

  // Create categories and subcategories
  for (const categoryData of categoriesData) {
    const [category] = await db.insert(categories).values({
      name: categoryData.name,
    });

    const categoryId = category.insertId;

    for (const subName of categoryData.subcategories) {
      await db.insert(subcategories).values({
        name: subName,
        categoryId: categoryId,
      });
    }
  }

  console.log("✅ Default categories seeded");
}

/**
 * Seed default product grades
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultGrades() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.log("⏭️  SKIP_SEEDING is set - skipping grade seeding");
    return;
  }

  console.log("🌱 Seeding default grades...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping grade seeding");
    return;
  }

  // Check if grades already exist
  const existing = await db.select().from(grades).limit(1);
  if (existing.length > 0) {
    console.log("✅ Grades already seeded, skipping...");
    return;
  }

  const gradesData = [
    { name: "A", description: "Top shelf quality", sortOrder: 1 },
    { name: "B", description: "Mid-tier quality", sortOrder: 2 },
    { name: "C", description: "Budget quality", sortOrder: 3 },
    { name: "D", description: "Economy quality", sortOrder: 4 },
  ];

  for (const grade of gradesData) {
    await db.insert(grades).values(grade);
  }

  console.log("✅ Default grades seeded");
}

/**
 * Seed default expense categories with parent-child relationships
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultExpenseCategories() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.log("⏭️  SKIP_SEEDING is set - skipping expense category seeding");
    return;
  }

  console.log("🌱 Seeding default expense categories...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping expense category seeding");
    return;
  }

  // Check if expense categories already exist
  const existing = await db.select().from(expenseCategories).limit(1);
  if (existing.length > 0) {
    console.log("✅ Expense categories already seeded, skipping...");
    return;
  }

  // Define expense categories with optional children
  const expenseCategoriesData = [
    { name: "Rent/Lease", children: [] },
    {
      name: "Utilities",
      children: ["Electricity", "Water", "Gas", "Internet/Phone"],
    },
    {
      name: "Payroll/Wages",
      children: ["Salaries", "Benefits", "Payroll Taxes"],
    },
    {
      name: "Marketing/Advertising",
      children: [
        "Digital Advertising",
        "Print Advertising",
        "Events & Sponsorships",
      ],
    },
    { name: "Office Supplies", children: [] },
    { name: "Insurance", children: [] },
    {
      name: "Professional Services",
      children: ["Legal", "Accounting", "Consulting"],
    },
    { name: "Travel", children: [] },
    { name: "Maintenance/Repairs", children: [] },
  ];

  // Create expense categories
  for (const categoryData of expenseCategoriesData) {
    const [parent] = await db.insert(expenseCategories).values({
      categoryName: categoryData.name,
      parentCategoryId: null,
    });

    const parentId = parent.insertId;

    for (const childName of categoryData.children) {
      await db.insert(expenseCategories).values({
        categoryName: childName,
        parentCategoryId: parentId,
      });
    }
  }

  console.log("✅ Default expense categories seeded");
}

/**
 * Seed default chart of accounts
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultChartOfAccounts() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.log("⏭️  SKIP_SEEDING is set - skipping chart of accounts seeding");
    return;
  }

  console.log("🌱 Seeding default chart of accounts...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping chart of accounts seeding");
    return;
  }

  // Check if accounts already exist
  const existing = await db.select().from(accounts).limit(1);
  if (existing.length > 0) {
    console.log("✅ Chart of accounts already seeded, skipping...");
    return;
  }

  const accountsData = [
    // ASSETS
    {
      accountNumber: "1000",
      accountName: "Cash",
      accountType: "ASSET" as const,
      normalBalance: "DEBIT" as const,
    },
    {
      accountNumber: "1100",
      accountName: "Accounts Receivable",
      accountType: "ASSET" as const,
      normalBalance: "DEBIT" as const,
    },
    {
      accountNumber: "1200",
      accountName: "Inventory",
      accountType: "ASSET" as const,
      normalBalance: "DEBIT" as const,
    },

    // LIABILITIES
    {
      accountNumber: "2000",
      accountName: "Accounts Payable",
      accountType: "LIABILITY" as const,
      normalBalance: "CREDIT" as const,
    },

    // EQUITY
    {
      accountNumber: "3000",
      accountName: "Owner's Equity",
      accountType: "EQUITY" as const,
      normalBalance: "CREDIT" as const,
    },
    {
      accountNumber: "3100",
      accountName: "Retained Earnings",
      accountType: "EQUITY" as const,
      normalBalance: "CREDIT" as const,
    },

    // REVENUE
    {
      accountNumber: "4000",
      accountName: "Sales Revenue",
      accountType: "REVENUE" as const,
      normalBalance: "CREDIT" as const,
    },

    // EXPENSES
    {
      accountNumber: "5000",
      accountName: "Cost of Goods Sold",
      accountType: "EXPENSE" as const,
      normalBalance: "DEBIT" as const,
    },
    {
      accountNumber: "5100",
      accountName: "Operating Expenses",
      accountType: "EXPENSE" as const,
      normalBalance: "DEBIT" as const,
    },
  ];

  for (const account of accountsData) {
    await db.insert(accounts).values(account);
  }

  console.log("✅ Default chart of accounts seeded");
}

/**
 * Master function to seed all defaults
 * This is idempotent and safe to call multiple times
 *
 * IMPORTANT: This function is NON-FATAL - it will not crash the server if seeding fails.
 * This ensures the health check endpoints are always available during deployment.
 *
 * @deprecated This function uses the legacy SKIP_SEEDING bypass.
 * Use `pnpm seed:new` for production seeding instead.
 * See docs/deployment/SEEDING_RUNBOOK.md for production procedures.
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedAllDefaults() {
  // Bypass seeding if SKIP_SEEDING environment variable is set (case-insensitive)
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    console.warn("⚠️  DEPRECATED: SKIP_SEEDING is deprecated. Use `pnpm seed:new` instead.");
    console.warn("   See docs/deployment/SEEDING_RUNBOOK.md for production seeding procedures.");
    console.log("⏭️  SKIP_SEEDING is set - skipping all default data seeding");
    return;
  }

  console.log("🌱 Starting default data seeding...");

  try {
    // Seed RBAC first (roles and permissions must exist before user-role assignments)
    await seedRBACDefaults();

    await seedDefaultLocations();
    await seedDefaultCategories();
    await seedDefaultGrades();
    await seedDefaultExpenseCategories();
    await seedDefaultChartOfAccounts();

    console.log("✅ All defaults seeded successfully!");
  } catch (error) {
    // Log the error but DON'T throw - seeding failure should not crash the server
    // This is critical for deployment health checks to succeed
    console.error(
      "❌ Error seeding defaults (non-fatal, server will continue):",
      error
    );
    console.warn(
      "⚠️ Some default data may be missing - the app will still function but some features may be unavailable"
    );
  }
}

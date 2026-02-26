import { getDb } from "../db";
import { seedRBACDefaults } from "./seedRBAC";
import { logger } from "../_core/logger";
import {
  locations,
  categories,
  subcategories,
  grades,
  expenseCategories,
  accounts,
  unitTypes,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
    logger.warn(
      "⚠️  DEPRECATED: SKIP_SEEDING is deprecated. Use `pnpm seed:new` instead."
    );
    logger.warn(
      "   See docs/deployment/SEEDING_RUNBOOK.md for production seeding procedures."
    );
    logger.info("⏭️  SKIP_SEEDING is set - skipping location seeding");
    return;
  }

  logger.info("🌱 Seeding default locations...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping location seeding");
    return;
  }

  // Check if locations already exist
  const existing = await db.select().from(locations).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Locations already seeded, skipping...");
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

  // Insert locations with error handling
  for (const location of locationsData) {
    try {
      await db.insert(locations).values(location);
    } catch (error: unknown) {
      // If it's a duplicate, skip it (though locations don't have unique constraints)
      // Log other errors but continue
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        logger.warn({
          msg: "Failed to insert location",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info("✅ Default locations seeded");
}

/**
 * Seed default product categories and subcategories
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultCategories() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping category seeding");
    return;
  }

  logger.info("🌱 Seeding default categories...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping category seeding");
    return;
  }

  // Check if categories already exist
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Categories already seeded, skipping...");
    return;
  }

  // Define categories with their subcategories
  const categoriesData = [
    {
      name: "Flower",
      subcategories: [
        "Tops/Colas",
        "Smalls/Popcorn",
        "Trim",
        "Shake",
        "Larf",
        "Machine Trim",
        "Hand Trim",
        "Outdoor",
        "Deps",
        "Indoor",
      ],
    },
    {
      name: "Concentrates",
      subcategories: [
        "Shatter",
        "Wax",
        "Live Resin",
        "Rosin",
        "Diamonds",
        "Distillate",
        "Crumble",
        "Budder",
      ],
    },
    {
      name: "Edibles",
      subcategories: ["Gummies", "Chocolates", "Beverages", "Baked Goods"],
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
    // Insert category (idempotent - will be skipped if name already exists due to unique constraint)
    try {
      await db.insert(categories).values({
        name: categoryData.name,
      });
    } catch (error: unknown) {
      // If it's a duplicate key error, that's fine - category already exists
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        throw error;
      }
    }

    // Query back to get the category ID
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, categoryData.name))
      .limit(1);

    if (!category) {
      logger.error(`Failed to find category: ${categoryData.name}`);
      continue;
    }

    // Insert subcategories
    for (const subName of categoryData.subcategories) {
      try {
        await db.insert(subcategories).values({
          name: subName,
          categoryId: category.id,
        });
      } catch (error: unknown) {
        // If it's a duplicate, skip it
        if (
          !(
            error instanceof Error && error.message?.includes("Duplicate entry")
          )
        ) {
          logger.warn({
            msg: `Failed to insert subcategory ${subName}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  logger.info("✅ Default categories seeded");
}

/**
 * Seed default product grades
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultGrades() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping grade seeding");
    return;
  }

  logger.info("🌱 Seeding default grades...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping grade seeding");
    return;
  }

  // Check if grades already exist
  const existing = await db.select().from(grades).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Grades already seeded, skipping...");
    return;
  }

  const gradesData = [
    { name: "A", description: "Top shelf quality", sortOrder: 1 },
    { name: "B", description: "Mid-tier quality", sortOrder: 2 },
    { name: "C", description: "Budget quality", sortOrder: 3 },
    { name: "D", description: "Economy quality", sortOrder: 4 },
  ];

  // Insert grades with error handling (has unique constraint on name)
  for (const grade of gradesData) {
    try {
      await db.insert(grades).values(grade);
    } catch (error: unknown) {
      // If it's a duplicate, skip it
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        logger.warn({
          msg: `Failed to insert grade ${grade.name}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info("✅ Default grades seeded");
}

/**
 * Seed default expense categories with parent-child relationships
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultExpenseCategories() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping expense category seeding");
    return;
  }

  logger.info("🌱 Seeding default expense categories...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping expense category seeding");
    return;
  }

  // Check if expense categories already exist
  const existing = await db.select().from(expenseCategories).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Expense categories already seeded, skipping...");
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
    // Insert parent category (idempotent)
    try {
      await db.insert(expenseCategories).values({
        categoryName: categoryData.name,
        parentCategoryId: null,
      });
    } catch (error: unknown) {
      // If it's a duplicate, that's fine - category already exists
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        throw error;
      }
    }

    // Query back to get the parent category ID
    const [parent] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.categoryName, categoryData.name))
      .limit(1);

    if (!parent) {
      logger.error(`Failed to find expense category: ${categoryData.name}`);
      continue;
    }

    // Insert child categories
    for (const childName of categoryData.children) {
      try {
        await db.insert(expenseCategories).values({
          categoryName: childName,
          parentCategoryId: parent.id,
        });
      } catch (error: unknown) {
        // If it's a duplicate, skip it
        if (
          !(
            error instanceof Error && error.message?.includes("Duplicate entry")
          )
        ) {
          logger.warn({
            msg: `Failed to insert expense category ${childName}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  logger.info("✅ Default expense categories seeded");
}

/**
 * Seed default chart of accounts
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultChartOfAccounts() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping chart of accounts seeding");
    return;
  }

  logger.info("🌱 Seeding default chart of accounts...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping chart of accounts seeding");
    return;
  }

  // Check if accounts already exist
  const existing = await db.select().from(accounts).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Chart of accounts already seeded, skipping...");
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
    {
      accountNumber: "5200",
      accountName: "Bad Debt Expense",
      accountType: "EXPENSE" as const,
      normalBalance: "DEBIT" as const,
    },
  ];

  // Insert accounts with error handling (has unique constraint on accountNumber)
  for (const account of accountsData) {
    try {
      await db.insert(accounts).values(account);
    } catch (error: unknown) {
      // If it's a duplicate, skip it
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        logger.warn({
          msg: `Failed to insert account ${account.accountNumber}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info("✅ Default chart of accounts seeded");
}

/**
 * Seed default unit types including packaged units (FEAT-013)
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedDefaultUnitTypes() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping unit types seeding");
    return;
  }

  logger.info("🌱 Seeding default unit types...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping unit types seeding");
    return;
  }

  // Check if unit types already exist
  const existing = await db.select().from(unitTypes).limit(1);
  if (existing.length > 0) {
    logger.info("✅ Unit types already seeded, skipping...");
    return;
  }

  const unitTypesData = [
    // COUNT
    {
      code: "EA",
      name: "Each",
      description: "Individual unit count",
      category: "COUNT" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 10,
    },

    // WEIGHT
    {
      code: "G",
      name: "Gram",
      description: "Weight in grams",
      category: "WEIGHT" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 20,
    },
    {
      code: "OZ",
      name: "Ounce",
      description: "Weight in ounces (28.3495g)",
      category: "WEIGHT" as const,
      conversionFactor: "28.3495",
      baseUnitCode: "G",
      sortOrder: 30,
    },
    {
      code: "LB",
      name: "Pound",
      description: "Weight in pounds (453.592g)",
      category: "WEIGHT" as const,
      conversionFactor: "453.592",
      baseUnitCode: "G",
      sortOrder: 40,
    },
    {
      code: "KG",
      name: "Kilogram",
      description: "Weight in kilograms (1000g)",
      category: "WEIGHT" as const,
      conversionFactor: "1000",
      baseUnitCode: "G",
      sortOrder: 50,
    },

    // VOLUME
    {
      code: "ML",
      name: "Milliliter",
      description: "Volume in milliliters",
      category: "VOLUME" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 60,
    },
    {
      code: "L",
      name: "Liter",
      description: "Volume in liters (1000ml)",
      category: "VOLUME" as const,
      conversionFactor: "1000",
      baseUnitCode: "ML",
      sortOrder: 70,
    },

    // PACKAGED
    {
      code: "PKG",
      name: "Package",
      description: "Pre-packaged unit (variable contents)",
      category: "PACKAGED" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 80,
    },
    {
      code: "PK5",
      name: "Pack of 5",
      description: "5-unit package",
      category: "PACKAGED" as const,
      conversionFactor: "5",
      baseUnitCode: "EA",
      sortOrder: 85,
    },
    {
      code: "BOX",
      name: "Box",
      description: "Box container (packaged)",
      category: "PACKAGED" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 90,
    },
    {
      code: "PK10",
      name: "Pack of 10",
      description: "10-unit package",
      category: "PACKAGED" as const,
      conversionFactor: "10",
      baseUnitCode: "EA",
      sortOrder: 95,
    },
    {
      code: "CASE",
      name: "Case",
      description: "Case container (packaged)",
      category: "PACKAGED" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 100,
    },
    {
      code: "CASE24",
      name: "Case (24)",
      description: "Case containing 24 units",
      category: "PACKAGED" as const,
      conversionFactor: "24",
      baseUnitCode: "EA",
      sortOrder: 105,
    },
    {
      code: "PALLET",
      name: "Pallet",
      description: "Standard pallet (quantity varies by product)",
      category: "PACKAGED" as const,
      conversionFactor: "1",
      baseUnitCode: null,
      sortOrder: 110,
    },
  ];

  // Insert unit types with error handling (has unique constraint on code)
  for (const unitType of unitTypesData) {
    try {
      await db.insert(unitTypes).values(unitType);
    } catch (error: unknown) {
      // If it's a duplicate, skip it
      if (
        !(error instanceof Error && error.message?.includes("Duplicate entry"))
      ) {
        logger.warn({
          msg: `Failed to insert unit type ${unitType.code}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info("✅ Default unit types seeded");
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
    logger.warn(
      "⚠️  DEPRECATED: SKIP_SEEDING is deprecated. Use `pnpm seed:new` instead."
    );
    logger.warn(
      "   See docs/deployment/SEEDING_RUNBOOK.md for production seeding procedures."
    );
    logger.info("⏭️  SKIP_SEEDING is set - skipping all default data seeding");
    return;
  }

  logger.info("🌱 Starting default data seeding...");

  // Validate database connection first
  const db = await getDb();
  if (!db) {
    logger.error("❌ Database connection not available - skipping seeding");
    return;
  }

  const seedingResults = {
    rbac: false,
    locations: false,
    categories: false,
    grades: false,
    expenseCategories: false,
    accounts: false,
    unitTypes: false,
  };

  try {
    // Seed RBAC first (roles and permissions must exist before user-role assignments)
    logger.info("📝 Seeding RBAC...");
    await seedRBACDefaults();
    seedingResults.rbac = true;

    logger.info("📍 Seeding locations...");
    await seedDefaultLocations();
    seedingResults.locations = true;

    logger.info("📂 Seeding categories...");
    await seedDefaultCategories();
    seedingResults.categories = true;

    logger.info("🎯 Seeding grades...");
    await seedDefaultGrades();
    seedingResults.grades = true;

    logger.info("💰 Seeding expense categories...");
    await seedDefaultExpenseCategories();
    seedingResults.expenseCategories = true;

    logger.info("📊 Seeding chart of accounts...");
    await seedDefaultChartOfAccounts();
    seedingResults.accounts = true;

    logger.info("📦 Seeding unit types...");
    await seedDefaultUnitTypes();
    seedingResults.unitTypes = true;

    logger.info("✅ All defaults seeded successfully!");
    logger.info({ msg: "Seeding summary", results: seedingResults });
  } catch (error) {
    // Log the error but DON'T throw - seeding failure should not crash the server
    // This is critical for deployment health checks to succeed
    logger.error({
      msg: "Error seeding defaults (non-fatal, server will continue)",
      error: error instanceof Error ? error.message : String(error),
    });
    logger.warn(
      "⚠️ Some default data may be missing - the app will still function but some features may be unavailable"
    );
    logger.info({ msg: "Partial seeding summary", results: seedingResults });
  }
}

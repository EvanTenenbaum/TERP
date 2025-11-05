import { getDb } from "../db";
import { logger } from "../_core/logger";
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
 */
export async function seedDefaultLocations() {
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
    { site: "Main Warehouse", zone: "Zone A", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 1" },
    { site: "Main Warehouse", zone: "Zone A", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 2" },
    { site: "Main Warehouse", zone: "Zone A", rack: "Rack 1", shelf: "Shelf 2", bin: "Bin 1" },
    
    // Zone B
    { site: "Main Warehouse", zone: "Zone B", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 1" },
    { site: "Main Warehouse", zone: "Zone B", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 2" },
    { site: "Main Warehouse", zone: "Zone B", rack: "Rack 1", shelf: "Shelf 2", bin: "Bin 1" },
    
    // Zone C
    { site: "Main Warehouse", zone: "Zone C", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 1" },
    { site: "Main Warehouse", zone: "Zone C", rack: "Rack 1", shelf: "Shelf 1", bin: "Bin 2" },
    { site: "Main Warehouse", zone: "Zone C", rack: "Rack 1", shelf: "Shelf 2", bin: "Bin 1" },
  ];

  for (const location of locationsData) {
    await db.insert(locations).values(location);
  }

  logger.info("✅ Default locations seeded");
}

/**
 * Seed default product categories and subcategories
 */
export async function seedDefaultCategories() {
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

  logger.info("✅ Default categories seeded");
}

/**
 * Seed default product grades
 */
export async function seedDefaultGrades() {
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

  for (const grade of gradesData) {
    await db.insert(grades).values(grade);
  }

  logger.info("✅ Default grades seeded");
}

/**
 * Seed default expense categories with parent-child relationships
 */
export async function seedDefaultExpenseCategories() {
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

  logger.info("✅ Default expense categories seeded");
}

/**
 * Seed default chart of accounts
 */
export async function seedDefaultChartOfAccounts() {
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
    { accountNumber: "1000", accountName: "Cash", accountType: "ASSET" as const, normalBalance: "DEBIT" as const },
    { accountNumber: "1100", accountName: "Accounts Receivable", accountType: "ASSET" as const, normalBalance: "DEBIT" as const },
    { accountNumber: "1200", accountName: "Inventory", accountType: "ASSET" as const, normalBalance: "DEBIT" as const },

    // LIABILITIES
    { accountNumber: "2000", accountName: "Accounts Payable", accountType: "LIABILITY" as const, normalBalance: "CREDIT" as const },

    // EQUITY
    { accountNumber: "3000", accountName: "Owner's Equity", accountType: "EQUITY" as const, normalBalance: "CREDIT" as const },
    { accountNumber: "3100", accountName: "Retained Earnings", accountType: "EQUITY" as const, normalBalance: "CREDIT" as const },

    // REVENUE
    { accountNumber: "4000", accountName: "Sales Revenue", accountType: "REVENUE" as const, normalBalance: "CREDIT" as const },

    // EXPENSES
    { accountNumber: "5000", accountName: "Cost of Goods Sold", accountType: "EXPENSE" as const, normalBalance: "DEBIT" as const },
    { accountNumber: "5100", accountName: "Operating Expenses", accountType: "EXPENSE" as const, normalBalance: "DEBIT" as const },
  ];

  for (const account of accountsData) {
    await db.insert(accounts).values(account);
  }

  logger.info("✅ Default chart of accounts seeded");
}

/**
 * Master function to seed all defaults
 * This is idempotent and safe to call multiple times
 */
export async function seedAllDefaults() {
  logger.info("🌱 Starting default data seeding...");

  try {
    await seedDefaultLocations();
    await seedDefaultCategories();
    await seedDefaultGrades();
    await seedDefaultExpenseCategories();
    await seedDefaultChartOfAccounts();

    logger.info("✅ All defaults seeded successfully!");
  } catch (error) {
    logger.error("❌ Error seeding defaults:", error);
    throw error;
  }
}


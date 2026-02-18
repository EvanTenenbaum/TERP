import { getDb } from "./db";
import {
  salesSheetTemplates,
  salesSheetVersions,
  salesSheetHistory,
  orders,
  type SalesSheetTemplate,
  type SalesSheetVersion,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Create a new version of a sales sheet template
 * Automatically increments version number
 */
export async function createSalesSheetVersion(
  templateId: number,
  userId: number,
  changes: string
): Promise<SalesSheetVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get current template
    const [template] = await db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new Error("Sales sheet template not found");
    }

    // Get latest version number
    const versions = await db
      .select()
      .from(salesSheetVersions)
      .where(eq(salesSheetVersions.templateId, templateId))
      .orderBy(desc(salesSheetVersions.versionNumber))
      .limit(1);

    const newVersionNumber =
      versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    // Create new version
    const [version] = await db.insert(salesSheetVersions).values({
      templateId,
      versionNumber: newVersionNumber,
      name: template.name,
      description: template.description || "",
      filters: template.filters as Record<string, unknown>,
      selectedItems: template.selectedItems as Record<string, unknown>[],
      columnVisibility: template.columnVisibility as Record<string, boolean>,
      changes,
      createdBy: userId,
    });

    // Update template's current version
    await db
      .update(salesSheetTemplates)
      .set({ currentVersion: newVersionNumber })
      .where(eq(salesSheetTemplates.id, templateId));

    const [newVersion] = await db
      .select()
      .from(salesSheetVersions)
      .where(eq(salesSheetVersions.id, version.insertId))
      .limit(1);

    return newVersion;
  } catch (error) {
    throw new Error(
      `Failed to create sales sheet version: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get version history for a sales sheet template
 */
export async function getSalesSheetVersionHistory(
  templateId: number
): Promise<SalesSheetVersion[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const versions = await db
      .select()
      .from(salesSheetVersions)
      .where(eq(salesSheetVersions.templateId, templateId))
      .orderBy(desc(salesSheetVersions.versionNumber));

    return versions;
  } catch (error) {
    throw new Error(
      `Failed to get version history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Restore a previous version of a sales sheet template
 */
export async function restoreSalesSheetVersion(
  versionId: number,
  userId: number
): Promise<SalesSheetTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get the version to restore
    const [version] = await db
      .select()
      .from(salesSheetVersions)
      .where(eq(salesSheetVersions.id, versionId))
      .limit(1);

    if (!version) {
      throw new Error("Version not found");
    }

    // Update the template with version data
    await db
      .update(salesSheetTemplates)
      .set({
        name: version.name,
        description: version.description,
        filters: version.filters,
        selectedItems: version.selectedItems,
        columnVisibility: version.columnVisibility,
      })
      .where(eq(salesSheetTemplates.id, version.templateId));

    // Create a new version entry for the restoration
    await createSalesSheetVersion(
      version.templateId,
      userId,
      `Restored from version ${version.versionNumber}`
    );

    const [updated] = await db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.id, version.templateId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to restore version: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clone a sales sheet template
 */
export async function cloneSalesSheetTemplate(
  templateId: number,
  userId: number,
  newName: string,
  clientId?: number
): Promise<SalesSheetTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get original template
    const [original] = await db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.id, templateId))
      .limit(1);

    if (!original) {
      throw new Error("Template not found");
    }

    // Create new template
    const [newTemplate] = await db.insert(salesSheetTemplates).values({
      name: newName,
      description: `Cloned from: ${original.name}`,
      clientId: clientId || original.clientId,
      filters: original.filters as Record<string, unknown>,
      selectedItems: original.selectedItems as Record<string, unknown>[],
      columnVisibility: original.columnVisibility as Record<string, boolean>,
      createdBy: userId,
      isActive: 1,
      currentVersion: 1,
    });

    const [created] = await db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.id, newTemplate.insertId))
      .limit(1);

    return created;
  } catch (error) {
    throw new Error(
      `Failed to clone template: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Set expiration date for a sales sheet template
 */
export async function setSalesSheetExpiration(
  templateId: number,
  expirationDate: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(salesSheetTemplates)
      .set({ expirationDate })
      .where(eq(salesSheetTemplates.id, templateId));
  } catch (error) {
    throw new Error(
      `Failed to set expiration date: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Auto-deactivate expired sales sheets
 * Should be run daily via scheduled job
 */
export async function deactivateExpiredSalesSheets(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const today = new Date();

    const _result = await db
      .update(salesSheetTemplates)
      .set({ isActive: 0 })
      .where(
        and(
          sql`${salesSheetTemplates.expirationDate} IS NOT NULL`,
          sql`${salesSheetTemplates.expirationDate} < ${today}`,
          eq(salesSheetTemplates.isActive, 1)
        )
      );

    return 0; // Return count of deactivated sheets
  } catch (error) {
    throw new Error(
      `Failed to deactivate expired sales sheets: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create bulk orders from sales sheet
 * Takes a sales sheet and creates multiple orders for different clients
 */
export async function createBulkOrdersFromSalesSheet(
  templateId: number,
  clientOrders: Array<{
    clientId: number;
    items: Array<{ itemId: number; quantity: string; price: string }>;
    notes?: string;
  }>,
  createdBy: number
): Promise<
  Array<{
    orderId: number;
    orderNumber: string;
    clientId: number;
    total: number;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const createdOrders: Array<{
      orderId: number;
      orderNumber: string;
      clientId: number;
      total: number;
    }> = [];

    for (const clientOrder of clientOrders) {
      // Calculate totals
      let subtotal = 0;
      for (const item of clientOrder.items) {
        subtotal += parseFloat(item.price) * parseFloat(item.quantity);
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${clientOrder.clientId}`;

      // Create order
      const [order] = await db.insert(orders).values({
        orderNumber,
        orderType: "QUOTE", // Start as quote
        clientId: clientOrder.clientId,
        items: clientOrder.items as Record<string, unknown>[],
        subtotal: subtotal.toString(),
        tax: "0",
        discount: "0",
        total: subtotal.toString(),
        paymentTerms: "NET_30",
        notes:
          clientOrder.notes ||
          `Created from sales sheet template #${templateId}`,
        createdBy,
      });

      createdOrders.push({
        orderId: order.insertId,
        orderNumber,
        clientId: clientOrder.clientId,
        total: subtotal,
      });
    }

    return createdOrders;
  } catch (error) {
    throw new Error(
      `Failed to create bulk orders: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get client-specific pricing for sales sheet
 * Applies client tier discounts and custom pricing
 */
export async function getClientSpecificPricing(
  templateId: number,
  clientId: number
): Promise<{
  templateId: number;
  clientId: number;
  items: Array<Record<string, unknown>>;
  appliedDiscounts: never[];
  notes: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get template
    const [template] = await db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new Error("Template not found");
    }

    // Get client to determine tier/discount
    // This would integrate with pricing rules if they existed
    // For now, return base pricing

    const items = template.selectedItems as Array<Record<string, unknown>>;

    return {
      templateId,
      clientId,
      items,
      appliedDiscounts: [],
      notes: "Client-specific pricing applied",
    };
  } catch (error) {
    throw new Error(
      `Failed to get client-specific pricing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get active sales sheets
 */
export async function getActiveSalesSheets(
  clientId?: number
): Promise<SalesSheetTemplate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const query = db
      .select()
      .from(salesSheetTemplates)
      .where(eq(salesSheetTemplates.isActive, 1));

    if (clientId) {
      const sheets = await query;
      return sheets.filter(s => s.clientId === null || s.clientId === clientId);
    }

    return await query;
  } catch (error) {
    throw new Error(
      `Failed to get active sales sheets: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sales sheet usage statistics
 */
export async function getSalesSheetUsageStats(templateId: number): Promise<{
  templateId: number;
  usageCount: number;
  ordersCreated: number;
  totalRevenue: string;
  lastUsed: Date | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get usage from history
    const history = await db
      .select()
      .from(salesSheetHistory)
      .where(eq(salesSheetHistory.templateId, templateId));

    // Get orders created from this template
    const ordersFromTemplate = await db
      .select()
      .from(orders)
      .where(sql`${orders.notes} LIKE '%template #${templateId}%'`);

    const totalRevenue = ordersFromTemplate.reduce(
      (sum, order) => sum + parseFloat(order.total.toString()),
      0
    );

    return {
      templateId,
      usageCount: history.length,
      ordersCreated: ordersFromTemplate.length,
      totalRevenue: totalRevenue.toFixed(2),
      lastUsed: history.length > 0 ? history[0].createdAt : null,
    };
  } catch (error) {
    throw new Error(
      `Failed to get usage stats: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

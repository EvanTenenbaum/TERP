/**
 * Session Pick List Service (MEET-075-BE)
 *
 * Provides real-time pick list updates for warehouse staff during live shopping sessions.
 * This service manages:
 * - Real-time pick list generation from active sessions
 * - Warehouse notification of cart changes
 * - Pick list consolidation across multiple sessions
 * - Location-based picking guidance
 */
import { getDb } from "../../db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import {
  liveShoppingSessions,
  sessionCartItems,
} from "../../../drizzle/schema-live-shopping";
import {
  batches,
  products,
  batchLocations,
  clients,
} from "../../../drizzle/schema";
import { EventEmitter } from "events";
import { logger } from "../../_core/logger";

// Warehouse event emitter for pick list updates
class WarehouseEventManager extends EventEmitter {
  private static instance: WarehouseEventManager;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): WarehouseEventManager {
    if (!WarehouseEventManager.instance) {
      WarehouseEventManager.instance = new WarehouseEventManager();
    }
    return WarehouseEventManager.instance;
  }

  /**
   * Emit pick list update to warehouse
   */
  public emitPickListUpdate(data: PickListUpdate): void {
    this.emit("PICK_LIST_UPDATE", data);
    if (process.env.NODE_ENV === "development") {
      logger.debug({ msg: "Pick list update emitted", data });
    }
  }

  /**
   * Emit new item added to active session
   */
  public emitNewPickItem(sessionId: number, item: PickListItem): void {
    this.emit("NEW_PICK_ITEM", { sessionId, item });
  }

  /**
   * Emit item removed from session
   */
  public emitItemRemoved(sessionId: number, itemId: number): void {
    this.emit("ITEM_REMOVED", { sessionId, itemId });
  }

  /**
   * Subscribe to warehouse pick list events
   */
  public subscribe(
    listener: (event: { type: string; data: unknown }) => void
  ): void {
    this.on("PICK_LIST_UPDATE", data =>
      listener({ type: "PICK_LIST_UPDATE", data })
    );
    this.on("NEW_PICK_ITEM", data => listener({ type: "NEW_PICK_ITEM", data }));
    this.on("ITEM_REMOVED", data => listener({ type: "ITEM_REMOVED", data }));
  }

  /**
   * Unsubscribe from warehouse events
   */
  public unsubscribe(
    listener: (event: { type: string; data: unknown }) => void
  ): void {
    this.off("PICK_LIST_UPDATE", listener as (...args: unknown[]) => void);
    this.off("NEW_PICK_ITEM", listener as (...args: unknown[]) => void);
    this.off("ITEM_REMOVED", listener as (...args: unknown[]) => void);
  }
}

export const warehouseEventManager = WarehouseEventManager.getInstance();

export interface PickListItem {
  cartItemId: number;
  sessionId: number;
  productId: number;
  productName: string;
  batchId: number;
  batchCode: string;
  quantity: number;
  location: string | null;
  locationId: number | null;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  itemStatus: "SAMPLE_REQUEST" | "INTERESTED" | "TO_PURCHASE" | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  addedAt: Date;
  clientName: string;
  sessionTitle: string | null;
}

export interface PickListUpdate {
  type: "FULL_REFRESH" | "ITEM_ADDED" | "ITEM_REMOVED" | "ITEM_UPDATED";
  items?: PickListItem[];
  item?: PickListItem;
  itemId?: number;
  sessionId: number;
  timestamp: string;
}

export interface ConsolidatedPickList {
  items: PickListItem[];
  summary: {
    totalItems: number;
    bySession: Record<
      number,
      { count: number; clientName: string; sessionTitle: string | null }
    >;
    byLocation: Record<string, number>;
    byStatus: {
      sampleRequests: number;
      interested: number;
      toPurchase: number;
    };
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  generatedAt: string;
}

export const sessionPickListService = {
  /**
   * Get consolidated pick list for all active sessions
   * Used by warehouse staff to see all items that need to be picked
   */
  async getConsolidatedPickList(): Promise<ConsolidatedPickList> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all active/paused sessions with their cart items
    const items = await db
      .select({
        cartItemId: sessionCartItems.id,
        sessionId: sessionCartItems.sessionId,
        productId: sessionCartItems.productId,
        productName: products.nameCanonical,
        batchId: sessionCartItems.batchId,
        batchCode: batches.code,
        quantity: sessionCartItems.quantity,
        itemStatus: sessionCartItems.itemStatus,
        addedAt: sessionCartItems.createdAt,
        clientName: clients.name,
        sessionTitle: liveShoppingSessions.title,
        sessionStatus: liveShoppingSessions.status,
      })
      .from(sessionCartItems)
      .innerJoin(
        liveShoppingSessions,
        eq(sessionCartItems.sessionId, liveShoppingSessions.id)
      )
      .innerJoin(products, eq(sessionCartItems.productId, products.id))
      .innerJoin(batches, eq(sessionCartItems.batchId, batches.id))
      .innerJoin(clients, eq(liveShoppingSessions.clientId, clients.id))
      .where(
        and(
          inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]),
          sql`${sessionCartItems.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(sessionCartItems.createdAt));

    // Get location details for items from batchLocations table
    const batchIds = [...new Set(items.map(i => i.batchId))];

    const locationMap: Record<
      number,
      {
        site: string;
        zone: string | null;
        shelf: string | null;
        bin: string | null;
      }
    > = {};

    if (batchIds.length > 0) {
      const locationData = await db
        .select({
          batchId: batchLocations.batchId,
          site: batchLocations.site,
          zone: batchLocations.zone,
          shelf: batchLocations.shelf,
          bin: batchLocations.bin,
        })
        .from(batchLocations)
        .where(
          sql`${batchLocations.batchId} IN (${sql.join(
            batchIds.map(id => sql`${id}`),
            sql`, `
          )})`
        );

      // Use first location for each batch
      for (const loc of locationData) {
        if (!locationMap[loc.batchId]) {
          locationMap[loc.batchId] = {
            site: loc.site,
            zone: loc.zone,
            shelf: loc.shelf,
            bin: loc.bin,
          };
        }
      }
    }

    // Build pick list items with priority calculation
    const pickListItems: PickListItem[] = items.map(item => {
      const location = locationMap[item.batchId] || null;

      // Priority: TO_PURCHASE > INTERESTED > SAMPLE_REQUEST
      let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      if (item.itemStatus === "TO_PURCHASE") {
        priority = "HIGH";
      } else if (item.itemStatus === "SAMPLE_REQUEST") {
        priority = "LOW";
      }

      return {
        cartItemId: item.cartItemId,
        sessionId: item.sessionId,
        productId: item.productId,
        productName: item.productName || "Unknown Product",
        batchId: item.batchId,
        batchCode: item.batchCode || "",
        quantity: parseFloat(item.quantity?.toString() || "0"),
        location: location?.site || null,
        locationId: null, // Location is now looked up by batchId, not stored as ID
        aisle: location?.zone || null, // Using zone as aisle equivalent
        shelf: location?.shelf || null,
        bin: location?.bin || null,
        itemStatus: item.itemStatus,
        priority,
        addedAt: item.addedAt,
        clientName: item.clientName || "Unknown Client",
        sessionTitle: item.sessionTitle,
      };
    });

    // Sort by priority (HIGH first), then by location for efficient picking
    pickListItems.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Secondary sort by location
      const locA = `${a.aisle || "ZZZ"}-${a.shelf || "ZZZ"}-${a.bin || "ZZZ"}`;
      const locB = `${b.aisle || "ZZZ"}-${b.shelf || "ZZZ"}-${b.bin || "ZZZ"}`;
      return locA.localeCompare(locB);
    });

    // Build summary
    const summary = {
      totalItems: pickListItems.length,
      bySession: {} as Record<
        number,
        { count: number; clientName: string; sessionTitle: string | null }
      >,
      byLocation: {} as Record<string, number>,
      byStatus: {
        sampleRequests: 0,
        interested: 0,
        toPurchase: 0,
      },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    for (const item of pickListItems) {
      // By session
      if (!summary.bySession[item.sessionId]) {
        summary.bySession[item.sessionId] = {
          count: 0,
          clientName: item.clientName,
          sessionTitle: item.sessionTitle,
        };
      }
      summary.bySession[item.sessionId].count++;

      // By location
      const locKey = item.location || "Unassigned";
      summary.byLocation[locKey] = (summary.byLocation[locKey] || 0) + 1;

      // By status
      if (item.itemStatus === "SAMPLE_REQUEST") {
        summary.byStatus.sampleRequests++;
      } else if (item.itemStatus === "INTERESTED") {
        summary.byStatus.interested++;
      } else if (item.itemStatus === "TO_PURCHASE") {
        summary.byStatus.toPurchase++;
      }

      // By priority
      if (item.priority === "HIGH") {
        summary.byPriority.high++;
      } else if (item.priority === "MEDIUM") {
        summary.byPriority.medium++;
      } else {
        summary.byPriority.low++;
      }
    }

    return {
      items: pickListItems,
      summary,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get pick list for a specific session
   */
  async getSessionPickList(sessionId: number): Promise<PickListItem[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const items = await db
      .select({
        cartItemId: sessionCartItems.id,
        sessionId: sessionCartItems.sessionId,
        productId: sessionCartItems.productId,
        productName: products.nameCanonical,
        batchId: sessionCartItems.batchId,
        batchCode: batches.code,
        quantity: sessionCartItems.quantity,
        itemStatus: sessionCartItems.itemStatus,
        addedAt: sessionCartItems.createdAt,
        clientName: clients.name,
        sessionTitle: liveShoppingSessions.title,
      })
      .from(sessionCartItems)
      .innerJoin(
        liveShoppingSessions,
        eq(sessionCartItems.sessionId, liveShoppingSessions.id)
      )
      .innerJoin(products, eq(sessionCartItems.productId, products.id))
      .innerJoin(batches, eq(sessionCartItems.batchId, batches.id))
      .innerJoin(clients, eq(liveShoppingSessions.clientId, clients.id))
      .where(
        and(
          eq(sessionCartItems.sessionId, sessionId),
          sql`${sessionCartItems.deletedAt} IS NULL`
        )
      );

    // Get location details from batchLocations table
    const batchIds = [...new Set(items.map(i => i.batchId))];

    const locationMap: Record<
      number,
      {
        site: string;
        zone: string | null;
        shelf: string | null;
        bin: string | null;
      }
    > = {};

    if (batchIds.length > 0) {
      const locationData = await db
        .select({
          batchId: batchLocations.batchId,
          site: batchLocations.site,
          zone: batchLocations.zone,
          shelf: batchLocations.shelf,
          bin: batchLocations.bin,
        })
        .from(batchLocations)
        .where(
          sql`${batchLocations.batchId} IN (${sql.join(
            batchIds.map(id => sql`${id}`),
            sql`, `
          )})`
        );

      // Use first location for each batch
      for (const loc of locationData) {
        if (!locationMap[loc.batchId]) {
          locationMap[loc.batchId] = {
            site: loc.site,
            zone: loc.zone,
            shelf: loc.shelf,
            bin: loc.bin,
          };
        }
      }
    }

    return items.map(item => {
      const location = locationMap[item.batchId] || null;

      let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      if (item.itemStatus === "TO_PURCHASE") {
        priority = "HIGH";
      } else if (item.itemStatus === "SAMPLE_REQUEST") {
        priority = "LOW";
      }

      return {
        cartItemId: item.cartItemId,
        sessionId: item.sessionId,
        productId: item.productId,
        productName: item.productName || "Unknown Product",
        batchId: item.batchId,
        batchCode: item.batchCode || "",
        quantity: parseFloat(item.quantity?.toString() || "0"),
        location: location?.site || null,
        locationId: null, // Location is now looked up by batchId, not stored as ID
        aisle: location?.zone || null, // Using zone as aisle equivalent
        shelf: location?.shelf || null,
        bin: location?.bin || null,
        itemStatus: item.itemStatus,
        priority,
        addedAt: item.addedAt,
        clientName: item.clientName || "Unknown Client",
        sessionTitle: item.sessionTitle,
      };
    });
  },

  /**
   * Notify warehouse of pick list update
   * Called when cart changes occur
   */
  async notifyPickListUpdate(
    sessionId: number,
    updateType: "ITEM_ADDED" | "ITEM_REMOVED" | "ITEM_UPDATED",
    itemId?: number
  ): Promise<void> {
    const update: PickListUpdate = {
      type: updateType,
      sessionId,
      timestamp: new Date().toISOString(),
    };

    if (updateType === "ITEM_REMOVED" && itemId) {
      update.itemId = itemId;
      warehouseEventManager.emitItemRemoved(sessionId, itemId);
    } else if (updateType === "ITEM_ADDED" || updateType === "ITEM_UPDATED") {
      const items = await this.getSessionPickList(sessionId);
      const item = itemId
        ? items.find(i => i.cartItemId === itemId)
        : items[items.length - 1];
      if (item) {
        update.item = item;
        if (updateType === "ITEM_ADDED") {
          warehouseEventManager.emitNewPickItem(sessionId, item);
        }
      }
    }

    warehouseEventManager.emitPickListUpdate(update);
  },

  /**
   * Get active sessions summary for warehouse dashboard
   */
  async getActiveSessionsSummary(): Promise<{
    activeSessions: number;
    totalItemsAcrossSessions: number;
    sessions: Array<{
      sessionId: number;
      clientName: string;
      title: string | null;
      itemCount: number;
      status: string;
      startedAt: Date | null;
    }>;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const sessions = await db
      .select({
        sessionId: liveShoppingSessions.id,
        clientName: clients.name,
        title: liveShoppingSessions.title,
        status: liveShoppingSessions.status,
        startedAt: liveShoppingSessions.startedAt,
        itemCount: sql<number>`(SELECT COUNT(*) FROM ${sessionCartItems} WHERE ${sessionCartItems.sessionId} = ${liveShoppingSessions.id} AND ${sessionCartItems.deletedAt} IS NULL)`,
      })
      .from(liveShoppingSessions)
      .innerJoin(clients, eq(liveShoppingSessions.clientId, clients.id))
      .where(inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]))
      .orderBy(desc(liveShoppingSessions.startedAt));

    const totalItems = sessions.reduce((sum, s) => sum + (s.itemCount || 0), 0);

    return {
      activeSessions: sessions.length,
      totalItemsAcrossSessions: totalItems,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        clientName: s.clientName || "Unknown",
        title: s.title,
        itemCount: s.itemCount || 0,
        status: s.status || "ACTIVE",
        startedAt: s.startedAt,
      })),
    };
  },
};

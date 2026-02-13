import { getDb } from "./db";
import { orders, clientNeeds, clients } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { updateMatchAction, markMatchAsConverted } from "./matchRecordsDb";
import { logger } from "./_core/logger";
import type {
  Match,
  EnhancedBatchSourceData,
  EnhancedVendorSourceData,
} from "./matchingEngineEnhanced";

/**
 * Needs & Matching Service Layer
 * Business logic for complex workflows
 */

// Type guard to check if sourceData is batch data
function isBatchSourceData(
  data: Match["sourceData"]
): data is EnhancedBatchSourceData {
  return "batch" in data || "product" in data;
}

// Type guard to check if sourceData is vendor data
function isVendorSourceData(
  data: Match["sourceData"]
): data is EnhancedVendorSourceData {
  return (
    "vendorId" in data ||
    ("strain" in data && !("batch" in data) && !("client" in data))
  );
}

/**
 * Create a quote from a match
 * @param matchData - Match information
 * @param userId - User creating the quote
 * @returns Created order (quote)
 */
export async function createQuoteFromMatch(matchData: {
  clientId: number;
  clientNeedId?: number;
  matches: Match[];
  userId: number;
  matchRecordId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Prepare order items from matches
    const items = [];
    let subtotal = 0;

    for (const match of matchData.matches) {
      if (match.source === "INVENTORY" && isBatchSourceData(match.sourceData)) {
        const batch = match.sourceData.batch;
        const product = match.sourceData.product;

        const quantity = Math.min(
          match.availableQuantity || 1,
          10 // Default quantity, can be adjusted by user
        );

        const price = match.calculatedPrice || 0;
        const itemTotal = price * quantity;

        items.push({
          batchId: batch?.id ?? 0,
          productId: product?.id,
          productName: product?.nameCanonical || "Unknown Product",
          strain: product?.nameCanonical,
          category: product?.category,
          subcategory: product?.subcategory,
          grade: batch?.grade,
          quantity: quantity.toString(),
          price: price.toString(),
          total: itemTotal.toString(),
        });

        subtotal += itemTotal;
      } else if (
        match.source === "VENDOR" &&
        isVendorSourceData(match.sourceData)
      ) {
        const supply = match.sourceData;

        const quantity = Math.min(match.availableQuantity || 1, 10);

        const price = match.calculatedPrice || 0;
        const itemTotal = price * quantity;

        items.push({
          vendorSupplyId: supply.id,
          productName: `${supply.strain || ""} ${supply.category || ""}`.trim(),
          strain: supply.strain ?? undefined,
          category: supply.category ?? undefined,
          subcategory: supply.subcategory ?? undefined,
          grade: supply.grade ?? undefined,
          quantity: quantity.toString(),
          price: price.toString(),
          total: itemTotal.toString(),
          note: "From vendor supply",
        });

        subtotal += itemTotal;
      }
    }

    if (items.length === 0) {
      throw new Error("No valid items to create quote");
    }

    // Generate order number
    const orderNumber = `Q-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create quote
    const [inserted] = await db.insert(orders).values({
      orderNumber,
      orderType: "QUOTE",
      clientId: matchData.clientId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: items as any,
      subtotal: subtotal.toString(),
      tax: "0",
      discount: "0",
      total: subtotal.toString(),
      quoteStatus: "DRAFT",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentTerms: "NET_30",
      clientNeedId: matchData.clientNeedId, // Link to client need if exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const quoteId = inserted.insertId as number;

    // Update match record with action
    if (matchData.matchRecordId) {
      await updateMatchAction(
        matchData.matchRecordId,
        "CREATED_QUOTE",
        matchData.userId
      );
    }

    // Get created quote
    const [quote] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, quoteId));

    return {
      success: true,
      quote,
      message: `Quote ${orderNumber} created successfully`,
    };
  } catch (error) {
    logger.error({ error }, "Error creating quote from match");
    throw new Error(
      `Failed to create quote: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert quote to sale and mark match as converted
 * @param quoteId - Quote order ID
 * @param matchRecordId - Match record ID (optional)
 * @returns Updated sale order
 */
export async function convertQuoteToSale(
  quoteId: number,
  matchRecordId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get the quote
    const [quote] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, quoteId));

    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.orderType !== "QUOTE") {
      throw new Error("Order is not a quote");
    }

    // Update to sale
    await db
      .update(orders)
      .set({
        orderType: "SALE",
        quoteStatus: null,
      })
      .where(eq(orders.id, quoteId));

    // Mark match as converted if match record exists
    if (matchRecordId) {
      await markMatchAsConverted(matchRecordId, quoteId);
    }

    // Get updated order
    const [sale] = await db.select().from(orders).where(eq(orders.id, quoteId));

    return {
      success: true,
      sale,
      message: "Quote converted to sale successfully",
    };
  } catch (error) {
    logger.error({ error }, "Error converting quote to sale");
    throw new Error(
      `Failed to convert quote: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Dismiss a match
 * @param matchRecordId - Match record ID
 * @param userId - User dismissing the match
 * @returns Updated match record
 */
export async function dismissMatch(
  matchRecordId: number,
  userId: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    const updated = await updateMatchAction(matchRecordId, "DISMISSED", userId);

    return {
      success: true,
      matchRecord: updated,
      message: "Match dismissed",
    };
  } catch (error) {
    logger.error({ error }, "Error dismissing match");
    throw new Error(
      `Failed to dismiss match: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create need and immediately find matches
 * @param needData - Client need data
 * @returns Created need with matches
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createNeedAndFindMatches(needData: any): Promise<any> {
  const { createClientNeed } = await import("./clientNeedsDbEnhanced");
  const { findMatchesForNeed } = await import("./matchingEngineEnhanced");

  try {
    // Create the need
    const result = await createClientNeed(needData);

    if (result.isDuplicate) {
      // If duplicate, find matches for existing need
      const matches = await findMatchesForNeed(result.need.id);

      return {
        success: true,
        need: result.need,
        matches,
        isDuplicate: true,
        message: result.message,
      };
    }

    // Find matches for new need
    const matches = await findMatchesForNeed(result.need.id);

    return {
      success: true,
      need: result.need,
      matches,
      isDuplicate: false,
      message: `Need created. Found ${matches.matches.length} potential matches.`,
    };
  } catch (error) {
    logger.error({ error }, "Error creating need and finding matches");
    throw new Error(
      `Failed to create need and find matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Bulk create quotes from multiple matches
 * @param matchGroups - Array of match groups (one quote per group)
 * @param userId - User creating the quotes
 * @returns Array of created quotes
 */
export async function bulkCreateQuotesFromMatches(
  matchGroups: Array<{
    clientId: number;
    clientNeedId?: number;
    matches: Match[];
    matchRecordId?: number;
  }>,
  userId: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const quotes = [];

  for (const group of matchGroups) {
    try {
      const quote = await createQuoteFromMatch({
        ...group,
        userId,
      });
      quotes.push(quote);
    } catch (error) {
      logger.error(
        { clientId: group.clientId, error },
        "Error creating quote for client"
      );
      quotes.push({
        success: false,
        clientId: group.clientId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return quotes;
}

/**
 * Get smart opportunities (top matches across all active needs)
 * @param limit - Maximum number of opportunities to return
 * @returns Array of top opportunities with fields expected by SmartOpportunitiesWidget
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSmartOpportunities(limit: number = 5): Promise<any[]> {
  const { getAllActiveNeedsWithMatches } =
    await import("./matchingEngineEnhanced");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allMatches = await getAllActiveNeedsWithMatches();

    // Filter to only needs with matches
    const filteredMatches = allMatches
      .filter(m => m.matches.length > 0)
      .sort(
        (a, b) =>
          (b.matches[0]?.confidence || 0) - (a.matches[0]?.confidence || 0)
      )
      .slice(0, limit);

    // DATA-003 FIX: Fetch client names for the opportunities
    const clientIds = [...new Set(filteredMatches.map(m => m.clientId))];
    const clientNameMap = new Map<number, string>();

    if (clientIds.length > 0) {
      const clientRecords = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(inArray(clients.id, clientIds));

      for (const client of clientRecords) {
        clientNameMap.set(client.id, client.name || "");
      }
    }

    // FE-QA-FIX: Fetch need details (priority, notes) for the opportunities
    const needIds = filteredMatches
      .map(m => m.clientNeedId)
      .filter((id): id is number => id !== undefined);
    const needDataMap = new Map<
      number,
      {
        priority?: string;
        notes?: string;
        quantityMin?: string;
        priceMax?: string;
      }
    >();

    if (needIds.length > 0) {
      const needRecords = await db
        .select({
          id: clientNeeds.id,
          priority: clientNeeds.priority,
          notes: clientNeeds.notes,
          quantityMin: clientNeeds.quantityMin,
          priceMax: clientNeeds.priceMax,
        })
        .from(clientNeeds)
        .where(inArray(clientNeeds.id, needIds));

      for (const need of needRecords) {
        needDataMap.set(need.id, {
          priority: need.priority ?? undefined,
          notes: need.notes ?? undefined,
          quantityMin: need.quantityMin ?? undefined,
          priceMax: need.priceMax ?? undefined,
        });
      }
    }

    // FE-QA-FIX: Map to fields expected by SmartOpportunitiesWidget
    const opportunities = filteredMatches.map(m => {
      const needData = m.clientNeedId
        ? needDataMap.get(m.clientNeedId)
        : undefined;
      const topMatch = m.matches[0];

      // Calculate potential revenue from quantity and price
      let potentialRevenue: string | null = null;
      if (needData?.quantityMin && needData?.priceMax) {
        const qty = parseFloat(needData.quantityMin);
        const price = parseFloat(needData.priceMax);
        if (!isNaN(qty) && !isNaN(price)) {
          potentialRevenue = (qty * price).toFixed(2);
        }
      }

      return {
        clientNeedId: m.clientNeedId,
        clientId: m.clientId,
        clientName: clientNameMap.get(m.clientId) || null,
        matchCount: m.matches.length,
        // FE-QA-FIX: Return fields expected by SmartOpportunitiesWidget
        bestConfidence: topMatch?.confidence || 0,
        bestMatchType: topMatch?.type || null,
        priority: needData?.priority || null,
        needDescription: needData?.notes || null,
        potentialRevenue,
        // Keep legacy fields for backward compatibility
        topMatch,
        confidence: topMatch?.confidence || 0,
      };
    });

    return opportunities;
  } catch (error) {
    logger.error({ error }, "Error getting smart opportunities");
    throw new Error(
      `Failed to get smart opportunities: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

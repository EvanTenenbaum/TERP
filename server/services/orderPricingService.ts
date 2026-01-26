/**
 * Order Pricing Service (FEAT-004-BE)
 * Comprehensive pricing and credit logic for sales orders
 *
 * Implements:
 * - Client pricing context retrieval
 * - Order pricing calculation with all adjustment types
 * - Credit limit validation
 * - Price adjustment application and audit logging
 * - Variable markup rules (age/quantity)
 * - Price history tracking
 */

import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  clients,
  pricingProfiles,
  pricingRules,
  batches,
  products,
  orders,
  orderPriceAdjustments,
  creditOverrideRequests,
  variableMarkupRules,
  priceHistory,
  users,
} from "../../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface ClientPricingContext {
  client: {
    clientId: number;
    name: string;
    teriCode: string;
    pricingProfileId: number | null;
    pricingProfileName: string | null;
    pricingRules: Array<{
      ruleId: number;
      ruleName: string;
      adjustmentType: string;
      adjustmentValue: number;
      conditions: Record<string, unknown>;
    }>;
    cogsAdjustmentType: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT";
    cogsAdjustmentValue: number | null;
    creditLimit: number;
    totalOwed: number;
    availableCredit: number;
    oldestDebtDays: number;
    creditLimitSource: "CALCULATED" | "MANUAL";
  };
  userMaxDiscount: number;
  canOverrideCredit: boolean;
  variableMarkupRules: Array<{
    id: number;
    ruleType: "AGE" | "QUANTITY";
    thresholdMin: number;
    thresholdMax: number | null;
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
    category: string | null;
  }>;
}

export interface LineItemPricing {
  batchId: number;
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  basePrice: number;
  profilePrice: number;
  categoryAdjustment: number;
  itemAdjustment: number;
  ageAdjustment: number;
  quantityAdjustment: number;
  finalPrice: number;
  lineTotal: number;
  appliedRules: string[];
  batchAge: number; // days since creation
}

export interface OrderPricingResult {
  lineItems: LineItemPricing[];
  subtotal: number;
  categoryAdjustmentsTotal: number;
  orderAdjustmentTotal: number;
  ageAdjustmentsTotal: number;
  quantityDiscountsTotal: number;
  orderTotal: number;
  creditCheck: CreditCheckResult;
}

export interface CreditCheckResult {
  availableCredit: number;
  orderTotal: number;
  exceedsCredit: boolean;
  requiresOverride: boolean;
  shortfall: number;
}

export interface AdjustmentResult {
  adjustmentId: number;
  newTotal: number;
  creditCheck: CreditCheckResult;
}

// Role-based discount limits
export const DISCOUNT_LIMITS: Record<string, number> = {
  rep: 15,
  sales_rep: 15,
  manager: 25,
  admin: 100,
};

// ORD-004: Roles that can approve credit overrides
export const CREDIT_OVERRIDE_ROLES: string[] = ["admin", "manager", "finance"];

// ORD-004: Shortfall thresholds for tiered authorization
// Different shortfall amounts require different authority levels
export const CREDIT_OVERRIDE_THRESHOLDS: Record<string, number> = {
  rep: 0, // Reps cannot approve any override
  sales_rep: 0, // Sales reps cannot approve any override
  manager: 5000, // Managers can approve up to $5,000 shortfall
  finance: 25000, // Finance can approve up to $25,000
  admin: Infinity, // Admins can approve any amount
};

// ============================================================================
// CLIENT PRICING CONTEXT
// ============================================================================

/**
 * Get comprehensive pricing context for a client
 * Includes pricing profile, rules, credit info, and user permissions
 */
export async function getClientPricingContext(
  clientId: number,
  userId: number
): Promise<ClientPricingContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client with all pricing-related fields
  const clientResult = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!clientResult[0]) {
    throw new Error(`Client ${clientId} not found`);
  }

  const client = clientResult[0];

  // Get pricing profile if assigned
  let pricingProfileName: string | null = null;
  let pricingRulesArray: Array<{
    ruleId: number;
    ruleName: string;
    adjustmentType: string;
    adjustmentValue: number;
    conditions: Record<string, unknown>;
  }> = [];

  if (client.pricingProfileId) {
    const profileResult = await db
      .select()
      .from(pricingProfiles)
      .where(eq(pricingProfiles.id, client.pricingProfileId))
      .limit(1);

    if (profileResult[0]) {
      pricingProfileName = profileResult[0].name;

      // Get rules from profile
      const rulesConfig = profileResult[0].rules as Array<{
        ruleId: number;
        priority: number;
      }>;

      if (rulesConfig && rulesConfig.length > 0) {
        const ruleIds = rulesConfig.map(r => r.ruleId).filter(id => id > 0);

        if (ruleIds.length > 0) {
          const rules = await db
            .select()
            .from(pricingRules)
            .where(
              and(
                inArray(pricingRules.id, ruleIds),
                eq(pricingRules.isActive, true)
              )
            );

          pricingRulesArray = rules.map(rule => ({
            ruleId: rule.id,
            ruleName: rule.name,
            adjustmentType: rule.adjustmentType,
            adjustmentValue: parseFloat(rule.adjustmentValue.toString()),
            conditions: (rule.conditions as Record<string, unknown>) || {},
          }));
        }
      }
    }
  }

  // Get user role for discount limits
  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRole = userResult[0]?.role || "user";
  const userMaxDiscount = DISCOUNT_LIMITS[userRole] || 15;
  // ORD-004: Check if user role can approve credit overrides
  const canOverrideCredit = CREDIT_OVERRIDE_ROLES.includes(userRole);

  // Calculate available credit
  const creditLimit = parseFloat(client.creditLimit?.toString() || "0");
  const totalOwed = parseFloat(client.totalOwed?.toString() || "0");
  const availableCredit = creditLimit - totalOwed;

  // Get variable markup rules for this client's profile
  let variableRules: Array<{
    id: number;
    ruleType: "AGE" | "QUANTITY";
    thresholdMin: number;
    thresholdMax: number | null;
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
    category: string | null;
  }> = [];

  if (client.pricingProfileId) {
    const markupRules = await db
      .select()
      .from(variableMarkupRules)
      .where(
        and(
          eq(variableMarkupRules.profileId, client.pricingProfileId),
          eq(variableMarkupRules.isActive, true)
        )
      );

    variableRules = markupRules.map(rule => ({
      id: rule.id,
      ruleType: rule.ruleType as "AGE" | "QUANTITY",
      thresholdMin: rule.thresholdMin,
      thresholdMax: rule.thresholdMax,
      adjustmentMode: rule.adjustmentMode as "PERCENT" | "FIXED",
      adjustmentValue: parseFloat(rule.adjustmentValue.toString()),
      category: rule.category,
    }));
  }

  return {
    client: {
      clientId: client.id,
      name: client.name,
      teriCode: client.teriCode,
      pricingProfileId: client.pricingProfileId,
      pricingProfileName,
      pricingRules: pricingRulesArray,
      cogsAdjustmentType: (client.cogsAdjustmentType as "NONE" | "PERCENTAGE" | "FIXED_AMOUNT") || "NONE",
      cogsAdjustmentValue: client.cogsAdjustmentValue
        ? parseFloat(client.cogsAdjustmentValue.toString())
        : null,
      creditLimit,
      totalOwed,
      availableCredit,
      oldestDebtDays: client.oldestDebtDays || 0,
      creditLimitSource: (client.creditLimitSource as "CALCULATED" | "MANUAL") || "CALCULATED",
    },
    userMaxDiscount,
    canOverrideCredit,
    variableMarkupRules: variableRules,
  };
}

// ============================================================================
// ORDER PRICING CALCULATION
// ============================================================================

/**
 * Calculate complete order pricing with all adjustment types
 */
export async function calculateOrderPricing(params: {
  clientId: number;
  lineItems: Array<{
    batchId: number;
    quantity: number;
    priceOverride?: number;
  }>;
  categoryAdjustments?: Array<{
    category: string;
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
  }>;
  orderAdjustment?: {
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
  };
}): Promise<OrderPricingResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client context (includes pricing profile and rules)
  const clientResult = await db
    .select()
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!clientResult[0]) {
    throw new Error(`Client ${params.clientId} not found`);
  }

  const client = clientResult[0];

  // Get pricing rules for this client
  let pricingRulesArray: typeof pricingRules.$inferSelect[] = [];
  let variableRules: typeof variableMarkupRules.$inferSelect[] = [];

  if (client.pricingProfileId) {
    const profileResult = await db
      .select()
      .from(pricingProfiles)
      .where(eq(pricingProfiles.id, client.pricingProfileId))
      .limit(1);

    if (profileResult[0]) {
      const rulesConfig = profileResult[0].rules as Array<{
        ruleId: number;
        priority: number;
      }>;

      if (rulesConfig && rulesConfig.length > 0) {
        const ruleIds = rulesConfig.map(r => r.ruleId).filter(id => id > 0);
        if (ruleIds.length > 0) {
          pricingRulesArray = await db
            .select()
            .from(pricingRules)
            .where(
              and(
                inArray(pricingRules.id, ruleIds),
                eq(pricingRules.isActive, true)
              )
            );
        }
      }
    }

    // Get variable markup rules
    variableRules = await db
      .select()
      .from(variableMarkupRules)
      .where(
        and(
          eq(variableMarkupRules.profileId, client.pricingProfileId),
          eq(variableMarkupRules.isActive, true)
        )
      );
  }

  // Process each line item
  const lineItemResults: LineItemPricing[] = [];
  let categoryAdjustmentsTotal = 0;
  let ageAdjustmentsTotal = 0;
  let quantityDiscountsTotal = 0;

  for (const item of params.lineItems) {
    // Get batch with product info
    const batchResult = await db
      .select()
      .from(batches)
      .where(eq(batches.id, item.batchId))
      .limit(1);

    if (!batchResult[0]) {
      throw new Error(`Batch ${item.batchId} not found`);
    }

    const batch = batchResult[0];

    // Get product info
    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.id, batch.productId))
      .limit(1);

    const product = productResult[0];
    const productName = product?.nameCanonical || batch.sku;
    const category = product?.category || "OTHER";

    // Calculate base price (from batch or product)
    const basePrice = parseFloat(batch.unitCogs?.toString() || "0");

    // Apply pricing profile rules
    let profilePrice = basePrice;
    const appliedRules: string[] = [];

    for (const rule of pricingRulesArray) {
      if (matchesConditions(product, batch, rule.conditions as Record<string, unknown>, rule.logicType || "AND")) {
        const adjustment = applyAdjustment(
          profilePrice,
          rule.adjustmentType as "PERCENT_MARKUP" | "PERCENT_MARKDOWN" | "DOLLAR_MARKUP" | "DOLLAR_MARKDOWN",
          parseFloat(rule.adjustmentValue.toString())
        );
        profilePrice = adjustment;
        appliedRules.push(rule.name);
      }
    }

    // Calculate batch age
    const createdDate = batch.createdAt ? new Date(batch.createdAt) : new Date();
    const now = new Date();
    const batchAge = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Apply age-based adjustments (MEET-014)
    let ageAdjustment = 0;
    for (const rule of variableRules) {
      if (rule.ruleType !== "AGE") continue;
      if (rule.category && rule.category !== category) continue;

      const minOk = batchAge >= rule.thresholdMin;
      const maxOk = rule.thresholdMax === null || batchAge <= rule.thresholdMax;

      if (minOk && maxOk) {
        const adjValue = parseFloat(rule.adjustmentValue.toString());
        if (rule.adjustmentMode === "PERCENT") {
          ageAdjustment = profilePrice * (adjValue / 100);
        } else {
          ageAdjustment = adjValue;
        }
        break;
      }
    }

    // Apply quantity-based discounts (MEET-014)
    let quantityAdjustment = 0;
    for (const rule of variableRules) {
      if (rule.ruleType !== "QUANTITY") continue;
      if (rule.category && rule.category !== category) continue;

      const minOk = item.quantity >= rule.thresholdMin;
      const maxOk = rule.thresholdMax === null || item.quantity <= rule.thresholdMax;

      if (minOk && maxOk) {
        const adjValue = parseFloat(rule.adjustmentValue.toString());
        if (rule.adjustmentMode === "PERCENT") {
          quantityAdjustment = profilePrice * (adjValue / 100);
        } else {
          quantityAdjustment = adjValue;
        }
        break;
      }
    }

    // Apply category adjustment if provided
    let categoryAdjustment = 0;
    const categoryAdj = params.categoryAdjustments?.find(
      ca => ca.category === category
    );
    if (categoryAdj) {
      if (categoryAdj.adjustmentMode === "PERCENT") {
        categoryAdjustment = profilePrice * (categoryAdj.adjustmentValue / 100);
      } else {
        categoryAdjustment = categoryAdj.adjustmentValue;
      }
    }

    // Calculate price after profile rules and before item override
    const priceAfterAdjustments = profilePrice + categoryAdjustment + ageAdjustment + quantityAdjustment;

    // Apply item-level override if provided
    const itemAdjustment = item.priceOverride !== undefined
      ? item.priceOverride - priceAfterAdjustments
      : 0;

    // Final price (floor at $0.01)
    const finalPrice = Math.max(0.01, item.priceOverride ?? priceAfterAdjustments);
    const lineTotal = finalPrice * item.quantity;

    lineItemResults.push({
      batchId: item.batchId,
      productId: batch.productId,
      productName,
      category,
      quantity: item.quantity,
      basePrice,
      profilePrice,
      categoryAdjustment,
      itemAdjustment,
      ageAdjustment,
      quantityAdjustment,
      finalPrice,
      lineTotal,
      appliedRules,
      batchAge,
    });

    categoryAdjustmentsTotal += categoryAdjustment * item.quantity;
    ageAdjustmentsTotal += ageAdjustment * item.quantity;
    quantityDiscountsTotal += quantityAdjustment * item.quantity;
  }

  // Calculate subtotal
  const subtotal = lineItemResults.reduce((sum, li) => sum + li.lineTotal, 0);

  // Apply order-level adjustment
  let orderTotal = subtotal;
  let orderAdjustmentTotal = 0;

  if (params.orderAdjustment) {
    if (params.orderAdjustment.adjustmentMode === "PERCENT") {
      orderAdjustmentTotal = subtotal * (params.orderAdjustment.adjustmentValue / 100);
    } else {
      orderAdjustmentTotal = params.orderAdjustment.adjustmentValue;
    }
    orderTotal = subtotal + orderAdjustmentTotal;
  }

  // Ensure total is positive
  orderTotal = Math.max(0, orderTotal);

  // Credit check
  const creditCheck = await checkClientCredit(params.clientId, orderTotal);

  return {
    lineItems: lineItemResults,
    subtotal: Math.round(subtotal * 100) / 100,
    categoryAdjustmentsTotal: Math.round(categoryAdjustmentsTotal * 100) / 100,
    orderAdjustmentTotal: Math.round(orderAdjustmentTotal * 100) / 100,
    ageAdjustmentsTotal: Math.round(ageAdjustmentsTotal * 100) / 100,
    quantityDiscountsTotal: Math.round(quantityDiscountsTotal * 100) / 100,
    orderTotal: Math.round(orderTotal * 100) / 100,
    creditCheck,
  };
}

// ============================================================================
// CREDIT CHECKING
// ============================================================================

/**
 * Check if an order total exceeds client's available credit
 */
export async function checkClientCredit(
  clientId: number,
  orderTotal: number
): Promise<CreditCheckResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const clientResult = await db
    .select({
      creditLimit: clients.creditLimit,
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!clientResult[0]) {
    throw new Error(`Client ${clientId} not found`);
  }

  const creditLimit = parseFloat(clientResult[0].creditLimit?.toString() || "0");
  const totalOwed = parseFloat(clientResult[0].totalOwed?.toString() || "0");
  const availableCredit = creditLimit - totalOwed;

  // If credit limit is 0, treat as unlimited (allow all orders)
  const exceedsCredit = creditLimit > 0 && orderTotal > availableCredit;
  const shortfall = exceedsCredit ? orderTotal - availableCredit : 0;

  return {
    availableCredit: Math.round(availableCredit * 100) / 100,
    orderTotal: Math.round(orderTotal * 100) / 100,
    exceedsCredit,
    requiresOverride: exceedsCredit,
    shortfall: Math.round(shortfall * 100) / 100,
  };
}

// ============================================================================
// PRICE ADJUSTMENT APPLICATION
// ============================================================================

/**
 * Apply a price adjustment to an order and log it for audit
 */
export async function applyPriceAdjustment(params: {
  orderId: number;
  adjustmentType: "ITEM" | "CATEGORY" | "ORDER";
  targetId?: number;
  targetCategory?: string;
  adjustmentMode: "PERCENT" | "FIXED";
  adjustmentValue: number;
  reason?: string;
  notes?: string;
  userId: number;
  userRole: string;
}): Promise<AdjustmentResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate user's discount authority
  const maxDiscount = DISCOUNT_LIMITS[params.userRole] || 15;

  if (params.adjustmentMode === "PERCENT" && Math.abs(params.adjustmentValue) > maxDiscount) {
    throw new Error(
      `Discount exceeds your authority. Maximum: ${maxDiscount}%, Requested: ${Math.abs(params.adjustmentValue)}%`
    );
  }

  // SECURITY FIX: Also validate fixed-amount discounts by converting to effective percentage
  // This prevents bypassing discount limits by using fixed amounts instead of percentages

  // Get order
  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);

  if (!orderResult[0]) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const order = orderResult[0];

  // Parse items to calculate original price
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  let originalPrice: number | null = null;
  let adjustedPrice: number | null = null;

  if (params.adjustmentType === "ITEM" && params.targetId) {
    const item = items.find((i: { batchId: number; unitPrice?: number }) => i.batchId === params.targetId);
    if (item) {
      const itemOriginalPrice = item.unitPrice || 0;
      originalPrice = itemOriginalPrice;
      if (params.adjustmentMode === "PERCENT") {
        adjustedPrice = itemOriginalPrice * (1 + params.adjustmentValue / 100);
      } else {
        // SECURITY FIX: Validate fixed-amount discounts against max percentage limit
        if (itemOriginalPrice > 0 && params.adjustmentValue < 0) {
          const effectivePercent = (Math.abs(params.adjustmentValue) / itemOriginalPrice) * 100;
          if (effectivePercent > maxDiscount) {
            throw new Error(
              `Fixed discount exceeds your authority. Maximum: ${maxDiscount}% (${(itemOriginalPrice * maxDiscount / 100).toFixed(2)}), Requested: ${Math.abs(params.adjustmentValue).toFixed(2)} (${effectivePercent.toFixed(1)}%)`
            );
          }
        }
        adjustedPrice = itemOriginalPrice + params.adjustmentValue;
      }
    }
  }

  // Insert adjustment record
  const [result] = await db.insert(orderPriceAdjustments).values({
    orderId: params.orderId,
    adjustmentType: params.adjustmentType,
    targetId: params.targetId || null,
    targetCategory: params.targetCategory || null,
    adjustmentMode: params.adjustmentMode,
    adjustmentValue: params.adjustmentValue.toString(),
    originalPrice: originalPrice?.toString() || null,
    adjustedPrice: adjustedPrice?.toString() || null,
    reason: params.reason || null,
    notes: params.notes || null,
    adjustedBy: params.userId,
  });

  const adjustmentId = result.insertId;

  // Recalculate order total
  const newTotal = await recalculateOrderTotal(params.orderId);

  // Check credit
  const creditCheck = await checkClientCredit(order.clientId, newTotal);

  return {
    adjustmentId,
    newTotal: Math.round(newTotal * 100) / 100,
    creditCheck,
  };
}

// ============================================================================
// CREDIT OVERRIDE
// ============================================================================

/**
 * Request credit override for an order exceeding limit
 */
export async function requestCreditOverride(params: {
  orderId: number;
  reason: string;
  userId: number;
}): Promise<{ requested: boolean; overrideId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get order
  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);

  if (!orderResult[0]) {
    throw new Error(`Order ${params.orderId} not found`);
  }

  const order = orderResult[0];
  const orderTotal = parseFloat(order.total?.toString() || "0");

  // Check credit
  const creditCheck = await checkClientCredit(order.clientId, orderTotal);

  if (!creditCheck.exceedsCredit) {
    throw new Error("Order does not exceed credit limit - no override needed");
  }

  // Create override request
  const [result] = await db.insert(creditOverrideRequests).values({
    orderId: params.orderId,
    clientId: order.clientId,
    requestedAmount: orderTotal.toString(),
    availableCredit: creditCheck.availableCredit.toString(),
    shortfall: creditCheck.shortfall.toString(),
    reason: params.reason,
    status: "PENDING",
    requestedBy: params.userId,
  });

  return {
    requested: true,
    overrideId: result.insertId,
  };
}

/**
 * ORD-004: Check if a user can approve credit override for a given shortfall
 */
export async function canApproveCreditOverride(
  userId: number,
  shortfallAmount: number
): Promise<{ canApprove: boolean; reason?: string; maxShortfall: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get user role
  const userResult = await db
    .select({ role: users.role, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRole = userResult[0]?.role || "user";

  // Check if role can approve credit overrides at all
  if (!CREDIT_OVERRIDE_ROLES.includes(userRole)) {
    return {
      canApprove: false,
      reason: `Role '${userRole}' is not authorized to approve credit overrides. Required roles: ${CREDIT_OVERRIDE_ROLES.join(", ")}`,
      maxShortfall: 0,
    };
  }

  // Check shortfall threshold for this role
  const maxShortfall = CREDIT_OVERRIDE_THRESHOLDS[userRole] || 0;

  if (shortfallAmount > maxShortfall) {
    return {
      canApprove: false,
      reason: `Shortfall of $${shortfallAmount.toFixed(2)} exceeds your authority limit of $${maxShortfall.toFixed(2)}. Please escalate to a higher authority.`,
      maxShortfall,
    };
  }

  return { canApprove: true, maxShortfall };
}

/**
 * Approve or reject a credit override request
 * ORD-004: Enhanced with proper authorization checks
 */
export async function approveCreditOverride(params: {
  orderId: number;
  approved: boolean;
  note?: string;
  userId: number;
}): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find pending override request
  const requestResult = await db
    .select()
    .from(creditOverrideRequests)
    .where(
      and(
        eq(creditOverrideRequests.orderId, params.orderId),
        eq(creditOverrideRequests.status, "PENDING")
      )
    )
    .limit(1);

  if (!requestResult[0]) {
    throw new Error(`No pending credit override request for order ${params.orderId}`);
  }

  const overrideRequest = requestResult[0];

  // ORD-004: Check if user has authority to approve this override
  if (params.approved) {
    const shortfall = parseFloat(overrideRequest.shortfall?.toString() || "0");
    const authCheck = await canApproveCreditOverride(params.userId, shortfall);

    if (!authCheck.canApprove) {
      throw new Error(
        `Credit override authorization failed: ${authCheck.reason}`
      );
    }
  }

  // Update request status
  await db
    .update(creditOverrideRequests)
    .set({
      status: params.approved ? "APPROVED" : "REJECTED",
      reviewedBy: params.userId,
      reviewNotes: params.note || null,
      reviewedAt: new Date(),
    })
    .where(eq(creditOverrideRequests.id, requestResult[0].id));

  // If approved, update order
  if (params.approved) {
    await db
      .update(orders)
      .set({
        creditOverrideApproved: true,
        creditOverrideBy: params.userId,
        creditOverrideReason: params.note || requestResult[0].reason,
        creditOverrideRequestId: requestResult[0].id,
      })
      .where(eq(orders.id, params.orderId));
  }

  return { success: true };
}

// ============================================================================
// PRICE HISTORY (MEET-061, MEET-062)
// ============================================================================

/**
 * Get suggested purchase price based on history
 */
export async function getSuggestedPurchasePrice(params: {
  productId: number;
  supplierId?: number;
}): Promise<{
  suggestedPrice: number | null;
  lastPrice: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  historyCount: number;
  priceHistory: Array<{
    date: Date;
    price: number;
    quantity: number;
    supplierId: number | null;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    eq(priceHistory.productId, params.productId),
    eq(priceHistory.transactionType, "PURCHASE"),
  ];

  if (params.supplierId) {
    conditions.push(eq(priceHistory.supplierId, params.supplierId));
  }

  const history = await db
    .select()
    .from(priceHistory)
    .where(and(...conditions))
    .orderBy(desc(priceHistory.createdAt))
    .limit(50);

  if (history.length === 0) {
    return {
      suggestedPrice: null,
      lastPrice: null,
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      historyCount: 0,
      priceHistory: [],
    };
  }

  const prices = history.map(h => parseFloat(h.unitPrice.toString()));
  const lastPrice = prices[0];
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Suggested price: weighted average of recent and average
  const suggestedPrice = lastPrice * 0.6 + avgPrice * 0.4;

  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    lastPrice: Math.round(lastPrice * 100) / 100,
    avgPrice: Math.round(avgPrice * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    historyCount: history.length,
    priceHistory: history.map(h => ({
      date: h.createdAt!,
      price: parseFloat(h.unitPrice.toString()),
      quantity: parseFloat(h.quantity.toString()),
      supplierId: h.supplierId,
    })),
  };
}

/**
 * Get last sale price for a product (to client or overall)
 */
export async function getLastSalePrice(params: {
  productId: number;
  clientId?: number;
}): Promise<{
  lastPriceToClient: number | null;
  lastPriceOverall: number | null;
  clientPriceHistory: Array<{ date: Date; price: number; quantity: number }>;
  overallPriceHistory: Array<{ date: Date; price: number; quantity: number }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get last price to this specific client
  let lastPriceToClient: number | null = null;
  let clientPriceHistory: Array<{ date: Date; price: number; quantity: number }> = [];

  if (params.clientId) {
    const clientHistory = await db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.productId, params.productId),
          eq(priceHistory.clientId, params.clientId),
          eq(priceHistory.transactionType, "SALE")
        )
      )
      .orderBy(desc(priceHistory.createdAt))
      .limit(10);

    if (clientHistory.length > 0) {
      lastPriceToClient = parseFloat(clientHistory[0].unitPrice.toString());
      clientPriceHistory = clientHistory.map(h => ({
        date: h.createdAt!,
        price: parseFloat(h.unitPrice.toString()),
        quantity: parseFloat(h.quantity.toString()),
      }));
    }
  }

  // Get last price overall
  const overallHistory = await db
    .select()
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.productId, params.productId),
        eq(priceHistory.transactionType, "SALE")
      )
    )
    .orderBy(desc(priceHistory.createdAt))
    .limit(10);

  let lastPriceOverall: number | null = null;
  let overallPriceHistoryResult: Array<{ date: Date; price: number; quantity: number }> = [];

  if (overallHistory.length > 0) {
    lastPriceOverall = parseFloat(overallHistory[0].unitPrice.toString());
    overallPriceHistoryResult = overallHistory.map(h => ({
      date: h.createdAt!,
      price: parseFloat(h.unitPrice.toString()),
      quantity: parseFloat(h.quantity.toString()),
    }));
  }

  return {
    lastPriceToClient: lastPriceToClient ? Math.round(lastPriceToClient * 100) / 100 : null,
    lastPriceOverall: lastPriceOverall ? Math.round(lastPriceOverall * 100) / 100 : null,
    clientPriceHistory,
    overallPriceHistory: overallPriceHistoryResult,
  };
}

/**
 * Record price history entry
 */
export async function recordPriceHistory(params: {
  productId: number;
  batchId?: number;
  clientId?: number;
  orderId?: number;
  transactionType: "PURCHASE" | "SALE";
  unitPrice: number;
  quantity: number;
  supplierId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(priceHistory).values({
    productId: params.productId,
    batchId: params.batchId || null,
    clientId: params.clientId || null,
    orderId: params.orderId || null,
    transactionType: params.transactionType,
    unitPrice: params.unitPrice.toString(),
    quantity: params.quantity.toString(),
    totalPrice: (params.unitPrice * params.quantity).toString(),
    supplierId: params.supplierId || null,
  });
}

// ============================================================================
// FARMER RECEIPT HISTORY (MEET-063)
// ============================================================================

/**
 * Get farmer/supplier receipt history for pricing reference
 */
export async function getSupplierReceiptHistory(params: {
  supplierId: number;
  productId?: number;
  limit?: number;
}): Promise<Array<{
  id: number;
  productId: number;
  productName: string;
  batchId: number | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  date: Date;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    eq(priceHistory.supplierId, params.supplierId),
    eq(priceHistory.transactionType, "PURCHASE"),
  ];

  if (params.productId) {
    conditions.push(eq(priceHistory.productId, params.productId));
  }

  const history = await db
    .select({
      id: priceHistory.id,
      productId: priceHistory.productId,
      batchId: priceHistory.batchId,
      unitPrice: priceHistory.unitPrice,
      quantity: priceHistory.quantity,
      totalPrice: priceHistory.totalPrice,
      createdAt: priceHistory.createdAt,
    })
    .from(priceHistory)
    .where(and(...conditions))
    .orderBy(desc(priceHistory.createdAt))
    .limit(params.limit || 20);

  // Get product names
  const productIds = [...new Set(history.map(h => h.productId))];
  const productNames = new Map<number, string>();

  if (productIds.length > 0) {
    const productsResult = await db
      .select({ id: products.id, nameCanonical: products.nameCanonical })
      .from(products)
      .where(inArray(products.id, productIds));

    for (const p of productsResult) {
      productNames.set(p.id, p.nameCanonical);
    }
  }

  return history.map(h => ({
    id: h.id,
    productId: h.productId,
    productName: productNames.get(h.productId) || "Unknown Product",
    batchId: h.batchId,
    unitPrice: parseFloat(h.unitPrice.toString()),
    quantity: parseFloat(h.quantity.toString()),
    totalPrice: parseFloat(h.totalPrice.toString()),
    date: h.createdAt!,
  }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a product/batch matches pricing rule conditions
 */
function matchesConditions(
  product: typeof products.$inferSelect | undefined,
  batch: typeof batches.$inferSelect,
  conditions: Record<string, unknown>,
  logicType: string
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions = matches all
  }

  const checks: boolean[] = [];

  // Category check
  if (conditions.category !== undefined) {
    checks.push(product?.category === conditions.category);
  }

  // Subcategory check
  if (conditions.subcategory !== undefined) {
    checks.push(product?.subcategory === conditions.subcategory);
  }

  // Grade check (on batch)
  if (conditions.grade !== undefined) {
    const batchGrade = (batch as unknown as { grade?: string }).grade;
    checks.push(batchGrade === conditions.grade);
  }

  // Vendor check (on batch)
  if (conditions.vendor !== undefined) {
    const batchVendor = (batch as unknown as { vendorId?: number }).vendorId;
    checks.push(batchVendor === conditions.vendor);
  }

  // Price range check
  if (conditions.priceMin !== undefined || conditions.priceMax !== undefined) {
    const price = parseFloat(batch.unitCogs?.toString() || "0");
    const minCheck = conditions.priceMin !== undefined ? price >= (conditions.priceMin as number) : true;
    const maxCheck = conditions.priceMax !== undefined ? price <= (conditions.priceMax as number) : true;
    checks.push(minCheck && maxCheck);
  }

  if (checks.length === 0) return true;

  return logicType === "AND" ? checks.every(c => c) : checks.some(c => c);
}

/**
 * Apply a pricing adjustment
 */
function applyAdjustment(
  basePrice: number,
  adjustmentType: "PERCENT_MARKUP" | "PERCENT_MARKDOWN" | "DOLLAR_MARKUP" | "DOLLAR_MARKDOWN",
  adjustmentValue: number
): number {
  switch (adjustmentType) {
    case "PERCENT_MARKUP":
      return basePrice * (1 + adjustmentValue / 100);
    case "PERCENT_MARKDOWN":
      return basePrice * (1 - adjustmentValue / 100);
    case "DOLLAR_MARKUP":
      return basePrice + adjustmentValue;
    case "DOLLAR_MARKDOWN":
      return basePrice - adjustmentValue;
    default:
      return basePrice;
  }
}

/**
 * Recalculate order total after adjustments
 */
async function recalculateOrderTotal(orderId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!orderResult[0]) {
    throw new Error(`Order ${orderId} not found`);
  }

  const order = orderResult[0];
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

  // Get all adjustments for this order
  const adjustments = await db
    .select()
    .from(orderPriceAdjustments)
    .where(eq(orderPriceAdjustments.orderId, orderId));

  // Calculate base total from items
  let total = 0;
  for (const item of items) {
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;

    // Find item-level adjustments
    const itemAdj = adjustments.find(
      a => a.adjustmentType === "ITEM" && a.targetId === item.batchId
    );

    let adjustedPrice = unitPrice;
    if (itemAdj) {
      const adjValue = parseFloat(itemAdj.adjustmentValue.toString());
      if (itemAdj.adjustmentMode === "PERCENT") {
        adjustedPrice = unitPrice * (1 + adjValue / 100);
      } else {
        adjustedPrice = unitPrice + adjValue;
      }
    }

    total += adjustedPrice * quantity;
  }

  // Apply order-level adjustments
  const orderAdj = adjustments.find(a => a.adjustmentType === "ORDER");
  if (orderAdj) {
    const adjValue = parseFloat(orderAdj.adjustmentValue.toString());
    if (orderAdj.adjustmentMode === "PERCENT") {
      total = total * (1 + adjValue / 100);
    } else {
      total = total + adjValue;
    }
  }

  // Update order total
  await db
    .update(orders)
    .set({ total: total.toString() })
    .where(eq(orders.id, orderId));

  return total;
}

/**
 * Get order adjustments for display
 */
export async function getOrderAdjustments(orderId: number): Promise<Array<{
  id: number;
  adjustmentType: string;
  targetId: number | null;
  targetCategory: string | null;
  adjustmentMode: string;
  adjustmentValue: number;
  originalPrice: number | null;
  adjustedPrice: number | null;
  reason: string | null;
  notes: string | null;
  adjustedByName: string | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const adjustments = await db
    .select({
      id: orderPriceAdjustments.id,
      adjustmentType: orderPriceAdjustments.adjustmentType,
      targetId: orderPriceAdjustments.targetId,
      targetCategory: orderPriceAdjustments.targetCategory,
      adjustmentMode: orderPriceAdjustments.adjustmentMode,
      adjustmentValue: orderPriceAdjustments.adjustmentValue,
      originalPrice: orderPriceAdjustments.originalPrice,
      adjustedPrice: orderPriceAdjustments.adjustedPrice,
      reason: orderPriceAdjustments.reason,
      notes: orderPriceAdjustments.notes,
      adjustedBy: orderPriceAdjustments.adjustedBy,
      adjustedByName: users.name,
      createdAt: orderPriceAdjustments.createdAt,
    })
    .from(orderPriceAdjustments)
    .leftJoin(users, eq(orderPriceAdjustments.adjustedBy, users.id))
    .where(eq(orderPriceAdjustments.orderId, orderId))
    .orderBy(orderPriceAdjustments.createdAt);

  return adjustments.map(a => ({
    id: a.id,
    adjustmentType: a.adjustmentType,
    targetId: a.targetId,
    targetCategory: a.targetCategory,
    adjustmentMode: a.adjustmentMode,
    adjustmentValue: parseFloat(a.adjustmentValue.toString()),
    originalPrice: a.originalPrice ? parseFloat(a.originalPrice.toString()) : null,
    adjustedPrice: a.adjustedPrice ? parseFloat(a.adjustedPrice.toString()) : null,
    reason: a.reason,
    notes: a.notes,
    adjustedByName: a.adjustedByName,
    createdAt: a.createdAt!,
  }));
}

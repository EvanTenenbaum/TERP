# QUAL-003 Wave 3C: Matching Engine & Services

**Wave:** 3 (Features & Polish)  
**Agent:** 3C (Matching)  
**Priority:** 🟡 MEDIUM - Feature completion  
**Estimated Time:** 4 hours  
**Dependencies:** Wave 2 complete

---

## Mission

Complete the matching engine implementation including full matching logic, predictive analytics stubs, buyer matching, and live catalog service data queries.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/matchingEnhanced.ts` | Lines 143, 173, 199, 219 |
| `server/matchingEngine.ts` | Line 25 |
| `server/matchingEngineEnhanced.ts` | Lines 31, 577 |
| `server/services/liveCatalogService.ts` | Lines 236, 238, 250, 297, 307 |

---

## Task W3-C1: Full Matching Logic (Line 143)

**Current Code:**
```typescript
// TODO: Implement full matching logic
```

**Implementation:**

```typescript
import { db } from "../_core/db";
import { batches, products, clients, clientPreferences } from "../../drizzle/schema";
import { eq, and, gte, lte, like, inArray, sql } from "drizzle-orm";

interface MatchCriteria {
  productType?: string;
  strainType?: string;
  minThc?: number;
  maxThc?: number;
  minCbd?: number;
  maxCbd?: number;
  priceRange?: { min: number; max: number };
  quantity?: number;
  terpeneProfile?: string[];
}

interface MatchResult {
  batchId: number;
  productId: number;
  productName: string;
  score: number;
  matchReasons: string[];
  price: number;
  quantityAvailable: number;
}

async function findMatches(
  criteria: MatchCriteria,
  limit: number = 20
): Promise<MatchResult[]> {
  // 1. Build base query with filters
  const conditions = [
    eq(batches.status, "LIVE"),
    gte(batches.quantityAvailable, criteria.quantity ?? 1),
  ];

  if (criteria.minThc) {
    conditions.push(gte(batches.thcPercentage, criteria.minThc));
  }
  if (criteria.maxThc) {
    conditions.push(lte(batches.thcPercentage, criteria.maxThc));
  }
  if (criteria.minCbd) {
    conditions.push(gte(batches.cbdPercentage, criteria.minCbd));
  }
  if (criteria.maxCbd) {
    conditions.push(lte(batches.cbdPercentage, criteria.maxCbd));
  }

  // 2. Query matching batches
  const matchingBatches = await db.query.batches.findMany({
    where: and(...conditions),
    with: {
      product: true,
    },
    limit: limit * 2, // Get extra for scoring
  });

  // 3. Score each match
  const scoredMatches = matchingBatches.map((batch) => {
    const { score, reasons } = calculateMatchScore(batch, criteria);
    return {
      batchId: batch.id,
      productId: batch.productId,
      productName: batch.product?.name ?? "Unknown",
      score,
      matchReasons: reasons,
      price: batch.pricePerUnit ?? 0,
      quantityAvailable: batch.quantityAvailable ?? 0,
    };
  });

  // 4. Sort by score and return top matches
  return scoredMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function calculateMatchScore(
  batch: Batch,
  criteria: MatchCriteria
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // THC match (0-30 points)
  if (criteria.minThc && batch.thcPercentage >= criteria.minThc) {
    score += 15;
    reasons.push(`THC ${batch.thcPercentage}% meets minimum`);
  }
  if (criteria.maxThc && batch.thcPercentage <= criteria.maxThc) {
    score += 15;
    reasons.push(`THC ${batch.thcPercentage}% within range`);
  }

  // CBD match (0-20 points)
  if (criteria.minCbd && batch.cbdPercentage >= criteria.minCbd) {
    score += 10;
    reasons.push(`CBD ${batch.cbdPercentage}% meets minimum`);
  }

  // Price match (0-25 points)
  if (criteria.priceRange) {
    const price = batch.pricePerUnit ?? 0;
    if (price >= criteria.priceRange.min && price <= criteria.priceRange.max) {
      score += 25;
      reasons.push(`Price $${price} within budget`);
    }
  }

  // Quantity availability (0-15 points)
  if (criteria.quantity && batch.quantityAvailable >= criteria.quantity) {
    score += 15;
    reasons.push(`${batch.quantityAvailable} units available`);
  }

  // Strain type match (0-10 points)
  if (criteria.strainType && batch.product?.strainType === criteria.strainType) {
    score += 10;
    reasons.push(`Strain type: ${criteria.strainType}`);
  }

  return { score, reasons };
}
```

---

## Task W3-C2: Predictive Analytics Stub (Line 173)

**Current Code:**
```typescript
// TODO: Implement predictive analytics
```

**Implementation:**

```typescript
interface PredictiveInsight {
  type: "demand" | "price" | "availability";
  prediction: string;
  confidence: number;
  basedOn: string;
}

// Predictive analytics stub - returns basic insights based on historical data
async function getPredictiveInsights(
  productId: number
): Promise<PredictiveInsight[]> {
  const insights: PredictiveInsight[] = [];

  // 1. Get historical order data
  const orderHistory = await db
    .select({
      month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
      totalQuantity: sql<number>`SUM(quantity)`,
      avgPrice: sql<number>`AVG(unit_price)`,
    })
    .from(orderItems)
    .where(eq(orderItems.productId, productId))
    .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m') DESC`)
    .limit(6);

  if (orderHistory.length >= 3) {
    // Simple trend analysis
    const recentAvg = orderHistory.slice(0, 3).reduce((sum, m) => sum + m.totalQuantity, 0) / 3;
    const olderAvg = orderHistory.slice(3).reduce((sum, m) => sum + m.totalQuantity, 0) / Math.max(orderHistory.length - 3, 1);

    if (recentAvg > olderAvg * 1.2) {
      insights.push({
        type: "demand",
        prediction: "Demand trending upward",
        confidence: 0.7,
        basedOn: "3-month moving average comparison",
      });
    } else if (recentAvg < olderAvg * 0.8) {
      insights.push({
        type: "demand",
        prediction: "Demand trending downward",
        confidence: 0.7,
        basedOn: "3-month moving average comparison",
      });
    }
  }

  // 2. Check current inventory levels
  const inventory = await db.query.batches.findMany({
    where: and(
      eq(batches.productId, productId),
      eq(batches.status, "LIVE")
    ),
  });

  const totalAvailable = inventory.reduce((sum, b) => sum + (b.quantityAvailable ?? 0), 0);
  
  if (totalAvailable < 100) {
    insights.push({
      type: "availability",
      prediction: "Low inventory - may sell out soon",
      confidence: 0.8,
      basedOn: `Only ${totalAvailable} units available`,
    });
  }

  return insights;
}
```

---

## Task W3-C3: Buyer Matching (Lines 199, 219)

**Current Code (Line 199):**
```typescript
// TODO: Implement buyer matching logic
```

**Current Code (Line 219):**
```typescript
// TODO: Implement buyer matching logic
```

**Implementation:**

```typescript
interface BuyerMatch {
  clientId: number;
  clientName: string;
  matchScore: number;
  matchReasons: string[];
  preferenceMatch: boolean;
  purchaseHistory: boolean;
}

// Find buyers who might be interested in a batch
async function findBuyersForBatch(
  batchId: number,
  limit: number = 20
): Promise<BuyerMatch[]> {
  // 1. Get batch details
  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
    with: { product: true },
  });

  if (!batch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
  }

  // 2. Find clients with matching preferences
  const clientsWithPrefs = await db.query.clients.findMany({
    where: and(
      eq(clients.isBuyer, true),
      isNull(clients.deletedAt)
    ),
    with: {
      preferences: true,
      orders: {
        limit: 10,
        orderBy: [desc(orders.createdAt)],
        with: {
          items: {
            where: eq(orderItems.productId, batch.productId),
          },
        },
      },
    },
  });

  // 3. Score each client
  const scoredBuyers = clientsWithPrefs.map((client) => {
    const { score, reasons } = scoreBuyerMatch(client, batch);
    return {
      clientId: client.id,
      clientName: client.name,
      matchScore: score,
      matchReasons: reasons,
      preferenceMatch: hasPreferenceMatch(client.preferences, batch),
      purchaseHistory: hasPurchasedProduct(client.orders, batch.productId),
    };
  });

  // 4. Return top matches
  return scoredBuyers
    .filter((b) => b.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function scoreBuyerMatch(client: Client, batch: Batch): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Previous purchase of same product (high signal)
  const hasPurchased = client.orders?.some((o) => 
    o.items?.some((i) => i.productId === batch.productId)
  );
  if (hasPurchased) {
    score += 40;
    reasons.push("Previously purchased this product");
  }

  // Preference match
  const prefs = client.preferences;
  if (prefs) {
    if (prefs.preferredStrainTypes?.includes(batch.product?.strainType)) {
      score += 20;
      reasons.push(`Prefers ${batch.product?.strainType} strains`);
    }
    if (prefs.minThc && batch.thcPercentage >= prefs.minThc) {
      score += 15;
      reasons.push("Meets THC preference");
    }
  }

  // Recent activity (active buyer)
  const recentOrder = client.orders?.[0];
  if (recentOrder) {
    const daysSinceOrder = differenceInDays(new Date(), recentOrder.createdAt);
    if (daysSinceOrder < 30) {
      score += 15;
      reasons.push("Active buyer (ordered in last 30 days)");
    }
  }

  return { score, reasons };
}
```

---

## Task W3-C4: Fix Typing in matchingEngine.ts (Line 25)

**Current Code:**
```typescript
// TODO: Improve typing - replace any with proper type
```

**Implementation:**

```typescript
// Before:
function processMatch(data: any): any {
  // ...
}

// After:
interface MatchInput {
  criteria: MatchCriteria;
  options?: {
    limit?: number;
    includeOutOfStock?: boolean;
    sortBy?: "score" | "price" | "quantity";
  };
}

interface MatchOutput {
  matches: MatchResult[];
  totalFound: number;
  searchCriteria: MatchCriteria;
  executionTimeMs: number;
}

function processMatch(data: MatchInput): Promise<MatchOutput> {
  const startTime = Date.now();
  
  // ... implementation
  
  return {
    matches,
    totalFound: matches.length,
    searchCriteria: data.criteria,
    executionTimeMs: Date.now() - startTime,
  };
}
```

---

## Task W3-C5: Fix Typing and Strain Lookup in matchingEngineEnhanced.ts (Lines 31, 577)

**Current Code (Line 31):**
```typescript
// TODO: Improve typing
```

**Current Code (Line 577):**
```typescript
// TODO: Implement strain lookup
```

**Implementation:**

```typescript
// Line 31 - Fix typing:
interface EnhancedMatchConfig {
  weights: {
    thc: number;
    cbd: number;
    price: number;
    terpenes: number;
    availability: number;
  };
  filters: {
    minScore: number;
    maxResults: number;
  };
}

// Line 577 - Strain lookup:
async function lookupStrainInfo(strainName: string): Promise<StrainInfo | null> {
  // Check local database first
  const localStrain = await db.query.strains.findFirst({
    where: like(strains.name, `%${strainName}%`),
  });

  if (localStrain) {
    return {
      name: localStrain.name,
      type: localStrain.type,
      thcRange: { min: localStrain.thcMin, max: localStrain.thcMax },
      cbdRange: { min: localStrain.cbdMin, max: localStrain.cbdMax },
      effects: localStrain.effects ?? [],
      terpenes: localStrain.dominantTerpenes ?? [],
    };
  }

  // Fallback to product data
  const product = await db.query.products.findFirst({
    where: like(products.strainName, `%${strainName}%`),
  });

  if (product) {
    return {
      name: product.strainName ?? strainName,
      type: product.strainType ?? "unknown",
      thcRange: null,
      cbdRange: null,
      effects: [],
      terpenes: [],
    };
  }

  return null;
}

interface StrainInfo {
  name: string;
  type: string;
  thcRange: { min: number; max: number } | null;
  cbdRange: { min: number; max: number } | null;
  effects: string[];
  terpenes: string[];
}
```

---

## Task W3-C6: Complete Live Catalog Service (Lines 236, 238, 250, 297, 307)

**Current Code snippets:**
```typescript
// TODO: Query actual catalog data
// TODO: Implement filtering
// TODO: Add pagination
```

**Implementation:**

```typescript
// server/services/liveCatalogService.ts

import { db } from "../_core/db";
import { batches, products, brands } from "../../drizzle/schema";
import { eq, and, gte, lte, like, isNull, sql, desc, asc } from "drizzle-orm";

interface CatalogFilters {
  search?: string;
  productType?: string;
  strainType?: string;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  minThc?: number;
  maxThc?: number;
  inStockOnly?: boolean;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: "name" | "price" | "thc" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// Line 236, 238 - Query actual catalog data with filtering
export async function getCatalogItems(
  filters: CatalogFilters,
  pagination: PaginationOptions
): Promise<{ items: CatalogItem[]; total: number }> {
  const conditions = [
    eq(batches.status, "LIVE"),
    isNull(batches.deletedAt),
  ];

  // Apply filters
  if (filters.inStockOnly !== false) {
    conditions.push(gte(batches.quantityAvailable, 1));
  }
  if (filters.minPrice) {
    conditions.push(gte(batches.pricePerUnit, filters.minPrice));
  }
  if (filters.maxPrice) {
    conditions.push(lte(batches.pricePerUnit, filters.maxPrice));
  }
  if (filters.minThc) {
    conditions.push(gte(batches.thcPercentage, filters.minThc));
  }
  if (filters.maxThc) {
    conditions.push(lte(batches.thcPercentage, filters.maxThc));
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(batches)
    .innerJoin(products, eq(batches.productId, products.id))
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated items
  const offset = (pagination.page - 1) * pagination.pageSize;
  
  const items = await db.query.batches.findMany({
    where: and(...conditions),
    with: {
      product: {
        with: { brand: true },
      },
    },
    limit: pagination.pageSize,
    offset,
    orderBy: getSortOrder(pagination.sortBy, pagination.sortOrder),
  });

  return {
    items: items.map(formatCatalogItem),
    total,
  };
}

// Line 250 - Add pagination helper
function getSortOrder(sortBy?: string, sortOrder?: string) {
  const order = sortOrder === "desc" ? desc : asc;
  
  switch (sortBy) {
    case "price":
      return [order(batches.pricePerUnit)];
    case "thc":
      return [order(batches.thcPercentage)];
    case "createdAt":
      return [order(batches.createdAt)];
    case "name":
    default:
      return [order(products.name)];
  }
}

// Line 297, 307 - Format catalog item
function formatCatalogItem(batch: BatchWithProduct): CatalogItem {
  return {
    id: batch.id,
    productId: batch.productId,
    productName: batch.product?.name ?? "Unknown",
    brandName: batch.product?.brand?.name ?? "Unknown",
    strainType: batch.product?.strainType,
    thcPercentage: batch.thcPercentage,
    cbdPercentage: batch.cbdPercentage,
    pricePerUnit: batch.pricePerUnit,
    quantityAvailable: batch.quantityAvailable,
    imageUrl: batch.product?.imageUrl,
    description: batch.product?.description,
  };
}

interface CatalogItem {
  id: number;
  productId: number;
  productName: string;
  brandName: string;
  strainType?: string;
  thcPercentage?: number;
  cbdPercentage?: number;
  pricePerUnit?: number;
  quantityAvailable?: number;
  imageUrl?: string;
  description?: string;
}
```

---

## Deliverables Checklist

- [ ] `matchingEnhanced.ts` - Line 143: Full matching logic with scoring
- [ ] `matchingEnhanced.ts` - Line 173: Predictive analytics stub
- [ ] `matchingEnhanced.ts` - Lines 199, 219: Buyer matching implemented
- [ ] `matchingEngine.ts` - Line 25: Proper TypeScript types
- [ ] `matchingEngineEnhanced.ts` - Line 31: Improved typing
- [ ] `matchingEngineEnhanced.ts` - Line 577: Strain lookup implemented
- [ ] `liveCatalogService.ts` - Lines 236, 238, 250, 297, 307: Catalog queries complete
- [ ] All TODO comments removed from all files

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" server/routers/matchingEnhanced.ts server/matchingEngine.ts server/matchingEngineEnhanced.ts server/services/liveCatalogService.ts
# Should return nothing (or only unrelated TODOs)

# 4. Run tests
pnpm test matching liveCatalog

# 5. Integration test
# - Search for matches with criteria
# - Verify scoring is consistent
# - Test buyer matching
# - Test catalog pagination
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Use `any` types (the whole point is to fix these)
- ❌ Make external API calls for strain data (use local DB)
- ❌ Introduce new TODOs
- ❌ Skip null checks

---

## Success Criteria

Your work is complete when:

- [ ] All 11 TODOs resolved across 4 files
- [ ] Matching engine returns scored results
- [ ] Buyer matching works
- [ ] Live catalog has filtering and pagination
- [ ] No `any` types remain in these files
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main

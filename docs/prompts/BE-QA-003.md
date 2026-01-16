# BE-QA-003: Fix Vendor Supply Matching Empty Results

<!-- METADATA (for validation) -->
<!-- TASK_ID: BE-QA-003 -->
<!-- TASK_TITLE: Fix Vendor Supply Matching Empty Results -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** BE-QA-003
**Estimated Time:** 8h
**Module:** `server/services/matchingEngineReverseSimplified.ts`

## Context

**Background:**
The vendor supply matching function at `server/services/matchingEngineReverseSimplified.ts:142-148` always returns empty results. This means:
- Vendors cannot see matching client needs
- No reverse matching functionality
- Feature appears broken

**Goal:**
Implement actual vendor supply matching logic.

**Success Criteria:**
- Vendor supplies matched to client needs
- Relevant matches returned
- Matching criteria configurable

## Implementation Guide

### Step 1: Understand Current Placeholder

The code likely looks like:
```typescript
export async function findMatchesForVendorSupply(supplyId: number) {
  // TODO: Implement
  return [];
}
```

### Step 2: Define Matching Criteria

Vendor supply should match client needs based on:
- Product category
- Strain name/type
- Quantity range
- Price range
- Quality grade

### Step 3: Implement Matching Logic

```typescript
// server/services/matchingEngineReverseSimplified.ts

export async function findMatchesForVendorSupply(supplyId: number) {
  const db = await getDb();

  // Get the supply details
  const [supply] = await db.select()
    .from(vendorSupplies)
    .where(eq(vendorSupplies.id, supplyId));

  if (!supply) return [];

  // Find matching client needs
  const matches = await db.select({
    need: clientNeeds,
    client: {
      id: clients.id,
      name: clients.name,
      company: clients.company
    },
    matchScore: sql<number>`
      CASE
        WHEN ${clientNeeds.category} = ${supply.category} THEN 40
        ELSE 0
      END +
      CASE
        WHEN ${clientNeeds.strain} = ${supply.strain} THEN 30
        ELSE 0
      END +
      CASE
        WHEN ${clientNeeds.maxPrice} >= ${supply.price} THEN 20
        ELSE 0
      END +
      CASE
        WHEN ${clientNeeds.quantity} <= ${supply.availableQuantity} THEN 10
        ELSE 0
      END
    `.as("match_score")
  })
  .from(clientNeeds)
  .innerJoin(clients, eq(clientNeeds.clientId, clients.id))
  .where(
    and(
      eq(clientNeeds.status, "active"),
      isNull(clientNeeds.fulfilledAt),
      // At least category should match
      eq(clientNeeds.category, supply.category)
    )
  )
  .orderBy(desc(sql`match_score`))
  .limit(50);

  return matches.filter(m => m.matchScore > 0);
}
```

### Step 4: Add Configurable Weights

```typescript
interface MatchingConfig {
  categoryWeight: number;  // Default: 40
  strainWeight: number;    // Default: 30
  priceWeight: number;     // Default: 20
  quantityWeight: number;  // Default: 10
}

export async function findMatchesForVendorSupply(
  supplyId: number,
  config?: MatchingConfig
) {
  const weights = {
    categoryWeight: 40,
    strainWeight: 30,
    priceWeight: 20,
    quantityWeight: 10,
    ...config
  };
  // Use weights in query...
}
```

### Step 5: Add Tests

Create tests for:
- Perfect match (all criteria)
- Partial matches
- No matches
- Edge cases

## Deliverables

- [ ] Implement findMatchesForVendorSupply
- [ ] Add match scoring algorithm
- [ ] Make weights configurable
- [ ] Add unit tests
- [ ] Update API to return results
- [ ] Test with real data

## Quick Reference

**File to modify:** `server/services/matchingEngineReverseSimplified.ts:142-148`

**Related tables:**
- `vendorSupplies` - Vendor offerings
- `clientNeeds` - Client requirements
- `clients` - Client details

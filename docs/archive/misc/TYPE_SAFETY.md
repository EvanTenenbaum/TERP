# Type Safety Improvements - Implementation Guide

**Priority:** 🟡 HIGH
**Effort:** 1-2 weeks
**Impact:** Code reliability, maintainability

---

## Problem Overview

**691 uses of `any` type** across 153 files, reducing TypeScript's type safety benefits.

### Why This Matters

1. **Compile-Time Safety:** Lose type checking
2. **IDE Support:** No autocomplete or hints
3. **Refactoring Risk:** Breaking changes not caught
4. **Bug Prevention:** Runtime errors that could be caught at compile-time

---

## Current Usage Analysis

### Category Breakdown

| Category | Count | Priority |
|----------|-------|----------|
| Router inputs | ~50 | 🔴 High |
| Database queries | ~100 | 🟡 Medium |
| Component props | ~80 | 🟡 Medium |
| Utility functions | ~60 | 🟢 Low |
| Type casts | ~200 | 🟡 Medium |
| Unknown/Complex | ~201 | 🟢 Low |

---

## Strategy: Replace `any` with Proper Types

### Phase 1: Define Core Types (2 days)

#### 1.1 Create Extended Schema Types

**File:** `server/types/extended.ts` (NEW)

```typescript
import type {
  Batch,
  Product,
  Client,
  Order,
  Invoice,
  Strain,
} from '../drizzle/schema';

// Batch with joined data
export interface BatchWithRelations extends Batch {
  product: Product | null;
  lot: {
    id: number;
    code: string;
    vendor: {
      id: number;
      name: string;
    } | null;
  } | null;
}

// Order with items
export interface OrderWithItems extends Order {
  items: Array<{
    id: number;
    batchId: number;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
  client: {
    id: number;
    name: string;
  } | null;
}

// Invoice with line items
export interface InvoiceWithLineItems extends Invoice {
  lineItems: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>;
}

// Add more as needed
```

---

#### 1.2 Define API Response Types

**File:** `shared/types/api.ts` (NEW)

```typescript
// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Match result types
export interface MatchResult {
  clientNeedId?: number;
  clientId: number;
  matches: Match[];
}

export interface Match {
  type: 'EXACT' | 'CLOSE' | 'HISTORICAL';
  confidence: number;
  reasons: string[];
  source: 'INVENTORY' | 'VENDOR' | 'HISTORICAL';
  sourceId: number;
  sourceData: any; // TODO: Define specific types per source
  calculatedPrice?: number;
  availableQuantity?: number;
}
```

---

### Phase 2: Replace `any` in Routers (3 days)

#### Pattern: Router Input/Output Types

**Before (using `any`):**
```typescript
// ❌ BAD
export const clientNeedsRouter = router({
  create: publicProcedure
    .input(z.object({ /* ... */ }))
    .mutation(async ({ input }) => {
      const result = await clientNeedsDb.createClientNeed({
        ...input,
        neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
      } as any); // ❌ Type safety lost

      return result;
    }),
});
```

**After (properly typed):**
```typescript
// ✅ GOOD
import { ApiResponse } from '@shared/types/api';
import type { ClientNeed } from '../drizzle/schema';

// Define input type
interface CreateClientNeedInput {
  clientId: number;
  strain?: string;
  strainId?: number;
  category?: string;
  // ... all fields
  createdBy: number;
}

// Define return type
interface CreateClientNeedResult {
  need: ClientNeed;
  isDuplicate: boolean;
  message?: string;
}

export const clientNeedsRouter = router({
  create: publicProcedure
    .input(z.object({ /* ... */ }))
    .mutation(async ({ input }): Promise<ApiResponse<CreateClientNeedResult>> => {
      // Map input to properly typed object
      const needInput: CreateClientNeedInput = {
        ...input,
        neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
      };

      const result = await clientNeedsDb.createClientNeed(needInput);

      return {
        success: true,
        data: result,
      };
    }),
});
```

---

#### Systematic Approach for Each Router

**For each `any` usage in routers:**

1. **Identify the type:**
   - Is it input? Define input interface
   - Is it output? Define return type
   - Is it intermediate? Define local type

2. **Create type definition:**
   ```typescript
   interface MyType {
     field1: string;
     field2: number;
     // etc.
   }
   ```

3. **Replace `any` with type:**
   ```typescript
   // Before
   const data: any = await fetchData();

   // After
   const data: MyType = await fetchData();
   ```

4. **Fix any resulting errors:**
   - Add missing fields
   - Correct field types
   - Add null checks

---

### Phase 3: Database Query Return Types (3 days)

#### Pattern: Drizzle Query Types

**Problem:** Drizzle queries return complex types, often cast to `any`.

**Solution:** Use Drizzle's type inference:

```typescript
// ❌ BEFORE
async function getBatch(id: number): Promise<any> {
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, id));
  return batch;
}

// ✅ AFTER
import type { Batch } from '../drizzle/schema';

async function getBatch(id: number): Promise<Batch | undefined> {
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, id));
  return batch;
}

// ✅ BETTER - For joined queries
async function getBatchWithProduct(
  id: number
): Promise<BatchWithRelations | undefined> {
  const [result] = await db
    .select({
      batch: batches,
      product: products,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(eq(batches.id, id));

  if (!result) return undefined;

  return {
    ...result.batch,
    product: result.product,
  };
}
```

---

#### Pattern: Complex Aggregations

```typescript
// ❌ BEFORE
async function getOrderStats(clientId: number): Promise<any> {
  const result = await db
    .select({
      total: sql`SUM(${orders.subtotal})`,
      count: sql`COUNT(*)`,
    })
    .from(orders)
    .where(eq(orders.clientId, clientId));

  return result[0];
}

// ✅ AFTER
interface OrderStats {
  total: string; // MySQL returns decimals as strings
  count: number;
}

async function getOrderStats(clientId: number): Promise<OrderStats> {
  const [result] = await db
    .select({
      total: sql<string>`SUM(${orders.subtotal})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(eq(orders.clientId, clientId));

  return result || { total: '0', count: 0 };
}
```

---

### Phase 4: Component Props (2 days)

#### Pattern: React Component Props

**Before:**
```typescript
// ❌ BAD
interface MyComponentProps {
  data: any;
  onSelect: (item: any) => void;
}

function MyComponent({ data, onSelect }: MyComponentProps) {
  return (
    <div onClick={() => onSelect(data)}>
      {data.name}
    </div>
  );
}
```

**After:**
```typescript
// ✅ GOOD
import type { Batch } from '@/drizzle/schema';

interface MyComponentProps {
  data: Batch;
  onSelect: (item: Batch) => void;
}

function MyComponent({ data, onSelect }: MyComponentProps) {
  return (
    <div onClick={() => onSelect(data)}>
      {data.code} {/* Now type-safe! */}
    </div>
  );
}
```

---

### Phase 5: Utility Functions (2 days)

#### Pattern: Generic Functions

```typescript
// ❌ BEFORE
function mapData(data: any): any {
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
  }));
}

// ✅ AFTER - Use generics
interface Identifiable {
  id: number;
  name: string;
}

function mapData<T extends Identifiable>(data: T[]): Array<Pick<T, 'id' | 'name'>> {
  return data.map(item => ({
    id: item.id,
    name: item.name,
  }));
}

// ✅ BETTER - More specific
function mapBatchesToOptions(batches: Batch[]): Array<{ id: number; name: string }> {
  return batches.map(batch => ({
    id: batch.id,
    name: batch.code,
  }));
}
```

---

## Special Cases

### Case 1: Truly Unknown Types

When type is legitimately unknown:

```typescript
// ❌ WRONG
function processData(data: any) {
  // No safety
}

// ✅ CORRECT - Use unknown
function processData(data: unknown) {
  // Must check type before use
  if (typeof data === 'object' && data !== null) {
    if ('id' in data && typeof data.id === 'number') {
      // Now safe to use
      console.log(data.id);
    }
  }
}

// ✅ BETTER - Use type guard
function isBatch(data: unknown): data is Batch {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'code' in data &&
    'sku' in data
  );
}

function processData(data: unknown) {
  if (isBatch(data)) {
    // TypeScript knows it's a Batch now
    console.log(data.code);
  }
}
```

---

### Case 2: Third-Party Library Types

```typescript
// ❌ BEFORE
const result: any = await externalLibrary.fetch();

// ✅ AFTER - Define expected shape
interface ExternalLibraryResult {
  data: unknown;
  status: number;
  headers: Record<string, string>;
}

const result = await externalLibrary.fetch() as ExternalLibraryResult;

// ✅ BETTER - Create type definition file
// Create: types/external-library.d.ts
declare module 'external-library' {
  export function fetch(): Promise<ExternalLibraryResult>;
}
```

---

### Case 3: JSON Fields

```typescript
// ❌ BEFORE
interface Batch {
  metadata: any; // JSON field
}

// ✅ AFTER - Define JSON structure
interface BatchMetadata {
  testResults?: {
    thc?: number;
    cbd?: number;
    testDate?: string;
  };
  harvestCode?: string;
  coaUrl?: string;
}

interface Batch {
  metadata: string; // Stored as JSON string
}

// Helper to parse
function parseBatchMetadata(metadataStr: string | null): BatchMetadata | null {
  if (!metadataStr) return null;
  try {
    return JSON.parse(metadataStr) as BatchMetadata;
  } catch {
    return null;
  }
}

// Usage
const batch = await getBatch(id);
const metadata = parseBatchMetadata(batch.metadata);
if (metadata?.testResults?.thc) {
  // Type-safe access
  console.log(`THC: ${metadata.testResults.thc}%`);
}
```

---

## Configuration Changes

### Enable Stricter TypeScript

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    // Enable these progressively
    "noImplicitAny": true,           // ← Start here
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Eventually enable full strict mode
    // "strict": true,
  }
}
```

**Rollout Strategy:**
1. Enable `noImplicitAny` → Fix errors
2. Enable `strictNullChecks` → Fix errors
3. Enable other strict flags one by one
4. Eventually enable `strict: true`

---

## File Priority Matrix

### Tier 1: Critical (Do First)

These affect core business logic and API contracts:

```
✅ server/routers/clientNeedsEnhanced.ts
✅ server/matchingEngineEnhanced.ts
✅ server/needsMatchingService.ts
✅ server/ordersDb.ts
✅ server/pricingEngine.ts
✅ server/creditsDb.ts
```

### Tier 2: High Impact

```
✅ server/inventoryDb.ts
✅ server/accountingDb.ts
✅ server/clientsDb.ts
✅ All routers in server/routers/
```

### Tier 3: Components

```
✅ client/src/components/needs/
✅ client/src/components/orders/
✅ client/src/components/inventory/
✅ client/src/pages/
```

### Tier 4: Utilities

```
✅ server/utils/
✅ client/src/lib/
✅ client/src/hooks/
```

### Tier 5: Scripts (Lower Priority)

```
→ scripts/
→ Test files (ok to keep some `any`)
```

---

## Testing Strategy

### 1. After Each File

```bash
# Check TypeScript
pnpm run check

# Run relevant tests
pnpm test -- matchingEngine.test.ts

# Manual test in browser
pnpm dev
```

### 2. Verify Type Safety

```typescript
// Add test to verify types are enforced
import type { Batch } from './drizzle/schema';

// This should error:
const batch: Batch = {
  id: 1,
  // Missing required fields - TypeScript should catch
};

// This should work:
const batch: Batch = {
  id: 1,
  code: 'BATCH-001',
  sku: 'SKU-001',
  // ... all required fields
};
```

---

## Tracking Progress

Create a checklist file to track progress:

**File:** `docs/type-safety-progress.md`

```markdown
# Type Safety Improvement Progress

## Phase 1: Core Types (2 days)
- [x] Create extended schema types
- [x] Create API response types
- [x] Create match result types

## Phase 2: Routers (3 days)
- [ ] clientNeedsEnhanced.ts (50 any → 0)
- [ ] matchingEnhanced.ts (30 any → 0)
- [ ] orders.ts (20 any → 0)
...

## Phase 3: Database (3 days)
- [ ] matchingEngineEnhanced.ts (40 any → 0)
- [ ] ordersDb.ts (35 any → 0)
...

Total Progress: 0 / 691 (0%)
```

---

## Success Criteria

✅ `pnpm run check` with `noImplicitAny: true` passes
✅ All router inputs/outputs properly typed
✅ All database queries return proper types
✅ All component props properly typed
✅ Less than 50 remaining `any` uses (legitimate cases)
✅ Full `strict: true` mode enabled
✅ All tests passing

---

## Estimated Timeline

- **Week 1, Days 1-2:** Core type definitions
- **Week 1, Days 3-5:** Routers (Tier 1 + 2)
- **Week 2, Days 1-3:** Database queries
- **Week 2, Days 4-5:** Components (Tier 3)

**Total: 1.5-2 weeks**

---

## Notes for AI Developer

### Flexibility
- Start with high-impact files
- Can skip scripts/tests initially
- Can do incrementally over multiple PRs
- Adjust types based on actual usage patterns

### Watch Out For
- Database types are tricky (strings for decimals)
- Drizzle type inference is powerful - use it
- JSON fields need parsing helpers
- Third-party libraries may need type definitions

### Quick Wins
- Start with routers (clear input/output)
- Use existing schema types
- Create extended types as needed
- Test after each major change

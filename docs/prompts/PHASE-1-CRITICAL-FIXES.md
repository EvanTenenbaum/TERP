# TERP Phase 1: Critical Fixes (P0)

## Agent Onboarding

### Project Overview

You are working on **TERP**, a cannabis ERP (Enterprise Resource Planning) system. TERP is a full-stack web application that manages:

- **Inventory**: Cannabis product batches, quantities, locations, pricing
- **Orders**: Sales orders, quotes, invoices, fulfillment
- **Clients**: Customer management, credit limits, debt tracking
- **Accounting**: AR/AP, payments, COGS, financial reporting
- **VIP Portal**: Customer-facing portal for live shopping and appointments

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Deployment** | DigitalOcean App Platform |

### Repository Setup

```bash
# Clone the repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Key Directories

```
TERP/
├── client/src/           # React frontend
│   ├── pages/            # Page components
│   ├── components/       # Reusable components
│   ├── hooks/            # Custom React hooks
│   └── contexts/         # React contexts
├── server/               # Backend
│   ├── routers/          # tRPC routers (API endpoints)
│   ├── services/         # Business logic
│   └── *Db.ts            # Database access layer
├── drizzle/              # Database schema
├── docs/                 # Documentation
│   ├── roadmaps/         # Roadmaps and plans
│   ├── specs/            # Feature specifications
│   └── testing/          # Test reports
└── tests/                # Test files
```

### Important Documentation

Before starting, review these documents:

1. **Strategic Plan**: `docs/roadmaps/STRATEGIC_COMPLETION_PLAN.md`
2. **Master Roadmap**: `docs/roadmaps/MASTER_ROADMAP.md`
3. **Chaos Testing Report**: `docs/testing/CHAOS_TESTING_EXHAUSTIVE_REPORT.md`
4. **Gemini API Usage**: `docs/GEMINI_API_USAGE.md`

### Mandatory: Use Gemini API for Code Generation

All code generation and complex reasoning MUST use the Google Gemini API:

```python
from google import genai
import os

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Your prompt here"
)
```

### Live Site

- **Production URL**: https://terp-app-b9s35.ondigitalocean.app
- **Status**: ✅ Operational (all endpoints responding 200)

---

## Phase 1 Objective

**Goal**: Fix all 4 P0 critical bugs that block core workflows

**Timeline**: 1 week (16 hours estimated)

**Success Criteria**:
- [ ] All P0 issues resolved and verified
- [ ] Core workflows (Orders, Inventory, POs) fully functional
- [ ] No crashes on any main page
- [ ] TypeScript check passes (`pnpm check`)
- [ ] Unit tests pass (`pnpm test`)

---

## Task 1: CHAOS-001 - Fix Inventory Table Data Not Rendering

### Problem Description

The inventory table on `/inventory` page sometimes fails to render data. Users see an empty table or loading state that never resolves.

### Files to Investigate

```
client/src/pages/Inventory.tsx
client/src/pages/InventoryPage.tsx
server/routers/inventory.ts
server/inventoryDb.ts
```

### Root Cause Analysis Steps

1. Check the tRPC query in the Inventory page component
2. Verify the backend router returns data correctly
3. Check for React rendering issues (conditional rendering, key props)
4. Look for race conditions in data fetching

### Debugging Commands

```bash
# Check for console errors in the component
grep -n "console\." client/src/pages/Inventory*.tsx

# Check the inventory router for potential issues
grep -n "getAll\|list" server/routers/inventory.ts

# Run TypeScript check
pnpm check

# Run inventory-related tests
pnpm test -- inventory
```

### Expected Fix

- Ensure data fetching completes before rendering
- Add proper loading and error states
- Fix any null/undefined data handling

### Verification

1. Navigate to `/inventory` on the live site
2. Verify data loads and displays correctly
3. Refresh the page multiple times to ensure consistency
4. Check browser console for errors

---

## Task 2: CHAOS-002 - Fix Order Item Addition Race Condition

### Problem Description

The "Add Item" button in OrderCreator sometimes shows a JavaScript error: "Cannot read properties of undefined (reading 'id')". This blocks order creation entirely.

### Files to Investigate

```
client/src/pages/OrderCreatorPage.tsx
client/src/components/orders/InventoryBrowser.tsx
client/src/components/orders/LineItemTable.tsx
server/routers/orders.ts
```

### Root Cause Analysis Steps

1. Identify where the 'id' property is accessed
2. Check if inventory data is loaded before the button is enabled
3. Look for async state updates that may cause race conditions
4. Verify product selection logic handles edge cases

### Debugging Commands

```bash
# Find where 'id' is accessed in order components
grep -rn "\.id" client/src/pages/OrderCreatorPage.tsx client/src/components/orders/

# Check for potential null access
grep -rn "item\." client/src/components/orders/InventoryBrowser.tsx

# Run order-related tests
pnpm test -- order
```

### Expected Fix

```typescript
// Add null checks before accessing properties
const handleAddItem = (item: InventoryItem | null) => {
  if (!item || !item.id) {
    console.warn('Cannot add item: item or item.id is undefined');
    return;
  }
  // ... rest of logic
};

// Disable button until data is loaded
<Button 
  disabled={!selectedItem || isLoading}
  onClick={() => handleAddItem(selectedItem)}
>
  Add Item
</Button>
```

### Verification

1. Navigate to `/orders/create`
2. Select a client
3. Attempt to add multiple items rapidly
4. Verify no JavaScript errors occur
5. Complete a full order creation flow

---

## Task 3: CHAOS-003 - Fix Purchase Orders Page Crash

### Problem Description

Navigating to `/purchase-orders` causes the app to crash. The error is related to the `paymentTerms` field in the database schema.

### Files to Investigate

```
client/src/pages/PurchaseOrdersPage.tsx
server/routers/purchaseOrders.ts
server/purchaseOrdersDb.ts
drizzle/schema.ts
```

### Root Cause Analysis Steps

1. Check the database schema for `paymentTerms` field definition
2. Verify the field exists in the database
3. Check if a migration is needed
4. Look for type mismatches between schema and queries

### Debugging Commands

```bash
# Check schema for paymentTerms
grep -rn "paymentTerms" drizzle/

# Check router for the field usage
grep -rn "paymentTerms" server/routers/purchaseOrders.ts

# Check for pending migrations
ls -la drizzle/migrations/

# Run purchase order tests
pnpm test -- purchaseOrder
```

### Expected Fix

Option A: Add missing migration
```bash
# Generate migration if schema changed
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push
```

Option B: Fix schema/query mismatch
```typescript
// Ensure paymentTerms has a default value
paymentTerms: varchar('payment_terms', { length: 50 }).default('Net 30'),
```

### Verification

1. Navigate to `/purchase-orders`
2. Verify page loads without crashing
3. Create a new purchase order
4. Edit an existing purchase order
5. Verify all CRUD operations work

---

## Task 4: CHAOS-004 - Add Negative Quantity Validation

### Problem Description

Inventory intake forms accept negative quantities without validation, which could corrupt inventory data and cause calculation errors.

### Files to Investigate

```
client/src/components/inventory/InventoryIntakeForm.tsx
client/src/components/forms/AmountInput.tsx
server/routers/inventory.ts
server/services/inventoryService.ts
```

### Root Cause Analysis Steps

1. Find all quantity input fields in inventory forms
2. Check for existing validation logic
3. Identify backend validation (if any)
4. Plan both frontend and backend validation

### Debugging Commands

```bash
# Find quantity inputs
grep -rn "quantity\|amount" client/src/components/inventory/

# Check for existing validation
grep -rn "min=\|validation\|validate" client/src/components/inventory/

# Check backend validation
grep -rn "quantity" server/routers/inventory.ts
```

### Expected Fix

**Frontend (React)**:
```tsx
// In quantity input component
<Input
  type="number"
  min={1}
  value={quantity}
  onChange={(e) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) {
      setQuantity(value);
    }
  }}
/>

// Or with react-hook-form
<FormField
  control={form.control}
  name="quantity"
  rules={{
    required: "Quantity is required",
    min: { value: 1, message: "Quantity must be at least 1" }
  }}
  render={({ field }) => (
    <Input type="number" min={1} {...field} />
  )}
/>
```

**Backend (tRPC)**:
```typescript
// In inventory router
import { z } from 'zod';

const intakeSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  // ... other fields
});

export const inventoryRouter = createTRPCRouter({
  intake: protectedProcedure
    .input(intakeSchema)
    .mutation(async ({ input }) => {
      // Validation is automatic via Zod
      // ...
    }),
});
```

### Verification

1. Navigate to inventory intake form
2. Attempt to enter negative quantity (-5)
3. Verify validation error is shown
4. Attempt to enter zero (0)
5. Verify validation error is shown
6. Enter valid quantity (5)
7. Verify form submits successfully

---

## Completion Checklist

### Before Starting

- [ ] Clone repository and install dependencies
- [ ] Read Strategic Completion Plan
- [ ] Read Chaos Testing Report (Section D - Issues)
- [ ] Verify local development environment works (`pnpm dev`)

### During Development

- [ ] Create feature branch: `git checkout -b fix/phase-1-critical-fixes`
- [ ] Fix CHAOS-001: Inventory table rendering
- [ ] Fix CHAOS-002: Order item addition race condition
- [ ] Fix CHAOS-003: Purchase orders page crash
- [ ] Fix CHAOS-004: Negative quantity validation
- [ ] Run `pnpm check` - no TypeScript errors
- [ ] Run `pnpm test` - all tests pass
- [ ] Test fixes on local development server

### Submission

- [ ] Commit changes with descriptive messages
- [ ] Push branch to origin
- [ ] Create Pull Request with this template:

```markdown
## Summary
Fixes Phase 1 P0 critical issues from chaos testing report.

## Changes
- CHAOS-001: Fixed inventory table data rendering
- CHAOS-002: Added null checks to prevent order item race condition
- CHAOS-003: Fixed purchase orders page crash (paymentTerms)
- CHAOS-004: Added quantity validation (min=1) on frontend and backend

## Testing
- [ ] Inventory page loads and displays data
- [ ] Order creation works without errors
- [ ] Purchase orders page loads without crashing
- [ ] Negative quantities are rejected

## Related
- Chaos Testing Report: docs/testing/CHAOS_TESTING_EXHAUSTIVE_REPORT.md
- Strategic Plan: docs/roadmaps/STRATEGIC_COMPLETION_PLAN.md
```

### Post-Submission

- [ ] Request code review
- [ ] Address review feedback
- [ ] Merge to main (after approval)
- [ ] Verify fixes on production site
- [ ] Update roadmap status to ✅ COMPLETE

---

## Support Resources

### Getting Help

- **Roadmap Questions**: Check `docs/roadmaps/MASTER_ROADMAP.md`
- **Code Patterns**: Look at similar components in the codebase
- **API Documentation**: tRPC routers are self-documenting via TypeScript

### Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm check            # TypeScript check
pnpm lint             # ESLint check
pnpm test             # Run all tests
pnpm test -- <name>   # Run specific tests

# Database
pnpm drizzle-kit generate  # Generate migration
pnpm drizzle-kit push      # Apply migration
pnpm drizzle-kit studio    # Database GUI

# Git
git checkout -b fix/branch-name   # Create branch
git add .                          # Stage changes
git commit -m "fix: description"   # Commit
git push -u origin branch-name     # Push
```

### Commit Message Format

```
<type>(<scope>): <description>

Types: fix, feat, docs, style, refactor, test, chore
Scope: inventory, orders, clients, accounting, etc.

Examples:
fix(inventory): resolve table data rendering issue
fix(orders): add null checks to prevent race condition
fix(purchase-orders): fix paymentTerms schema migration
fix(inventory): add quantity validation (min=1)
```

---

**Good luck! Focus on fixing these 4 critical issues before moving to Phase 2.**

# Full QA Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For tasks within the same wave marked ⚡ PARALLEL, use superpowers:dispatching-parallel-agents.

**Goal:** Fix all 78 bugs identified in the 2026-03-26 QA audit so that no bug can be reproduced in a live browser on staging.

**Architecture:** 6 sequential deploy waves, each ending with Playwright browser verification against the live staging URL. A wave is not complete until the browser verification gate passes — implementation alone is insufficient. Tasks within a wave marked ⚡ PARALLEL can be dispatched concurrently (they touch independent files).

**Tech Stack:** React 19 + wouter (routing), tRPC, Drizzle ORM (MySQL), AG Grid (spreadsheets), Playwright (browser verification), Vitest (unit tests), shadcn/ui

**Linear tickets:** TER-850 through TER-868 in project TERP - Golden Flows Beta

**Staging URL:** `https://terp-staging-yicld.ondigitalocean.app`

---

## Critical Pre-Work: Understand the DEV-gate leak

Before starting Wave 1, verify whether staging is built in dev mode. The DigitalOcean App Platform uses `dockerfile_path: Dockerfile` (not a `build_command`), so **the Dockerfile is the correct investigation target**:

```bash
# Check the Dockerfile — this controls what runs in staging
grep -n "CMD\|RUN.*build\|RUN.*dev\|NODE_ENV" Dockerfile

# Also check for env var overrides in the app spec
grep -A 5 "NODE_ENV\|envs" .do/app.yaml
```

If the Dockerfile runs `CMD ["pnpm", "dev"]` or `RUN pnpm dev`, that explains why `import.meta.env.DEV === true` in staging (B-22, B-13 debug metrics). Fix: update `CMD` to use the production start command. Document the finding before proceeding — the Wave 1 dev-artifacts task (Task 1.2) must account for it.

---

## Wave 1 — Remove Dev Artifacts + Fix Dead Routes

**Tickets:** TER-859, TER-860
**Autonomy Mode:** SAFE
**Risk:** Low — text removal and route redirects only
**Expected duration:** 1–2 hours of work, 1 deploy cycle

---

### Task 1.1 ⚡ PARALLEL — Fix broken 404 routes (TER-859)

**Files:**
- Modify: `client/src/App.tsx`

**Bugs addressed:** B-42 (`/suppliers`), B-49 (`/accounts-receivable`), B-50 (`/payments`), B-70 (`/admin`), B-09 ("View AR" goes to wrong page)

Current state:
- `/suppliers` → no route
- `/accounts-receivable` → no route
- `/payments` → no route (but `/accounting/payments` exists at line 437)
- `/admin` → no route (only `/admin-setup` exists at line 314)

- [ ] **Step 1: Locate the route block in App.tsx**

```bash
grep -n "path=\"/suppliers\"\|path=\"/admin\"\|path=\"/payments\"\|accounts-receivable" client/src/App.tsx
```

Expected: no matches (confirming routes don't exist).

- [ ] **Step 2: Add redirects for dead routes**

The existing codebase uses a `RedirectWithTab` helper that preserves tab state — use it instead of raw `<Redirect>` where applicable. Check the existing pattern first:

```bash
grep -n "RedirectWithTab\|function RedirectWithTab" client/src/App.tsx | head -5
```

Find the redirect block in `client/src/App.tsx` (search for `RedirectWithTab` or other `Redirect` usages). Add the following four route entries in the appropriate location (alongside other redirects, before the 404 catch-all):

```tsx
{/* B-42: /suppliers redirect */}
<Route path="/suppliers">
  <RedirectWithTab to="/relationships" tab="suppliers" />
</Route>

{/* B-49: /accounts-receivable redirect */}
<Route path="/accounts-receivable">
  <RedirectWithTab to="/accounting" tab="invoices" />
</Route>

{/* B-50: /payments redirect */}
<Route path="/payments">
  <RedirectWithTab to="/accounting" tab="payments" />
</Route>

{/* B-70: /admin redirect — no tab equivalent, use plain Redirect */}
<Route path="/admin">
  <Redirect to="/settings" />
</Route>
```

If `RedirectWithTab` doesn't support the exact `tab=` parameter shape used above, check its signature in `App.tsx` and match it. The point is to use the same pattern as the rest of the file — not a raw `<Redirect>` that ignores tab state.

Note: Import `Redirect` from wouter if not already imported:
```tsx
import { Route, Switch, Redirect } from "wouter";
```

- [ ] **Step 3: Fix "View AR" button navigation (B-09)**

Search for the "View AR" button in the dashboard components:
```bash
grep -rn "View AR\|viewAR\|view-ar" client/src --include="*.tsx"
```

Find the `onClick` or `href` that navigates to the Accounting Dashboard. Change it to navigate to `/accounting?tab=invoices` instead of `/accounting`.

- [ ] **Step 4: Run TypeScript check**

```bash
pnpm check
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx
git commit -m "fix(routing): add redirects for dead routes /suppliers /accounts-receivable /payments /admin (TER-859)"
```

---

### Task 1.2 ⚡ PARALLEL — Strip engineering artifacts from production UI (TER-860)

**Files:**
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- Modify: `client/src/components/spreadsheet-native/PowersheetGrid.tsx`
- Modify: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx` (if contains same patterns)
- Modify: `client/src/components/spreadsheet-native/QuotesPilotSurface.tsx` (if contains same patterns)
- Modify: `client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx` (if contains same patterns)
- Modify: `client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx` (if contains same patterns)
- Investigate: `.do/app.yaml` or `package.json` build script for DEV-gate leak

**Bugs addressed:** B-13 (release gate notes), B-20 (dev text wall), B-21 (Pilot badge), B-22 (debug metrics bar)

**Key finding from code review:**
- `PowersheetGrid.tsx` lines 100–104: release gates, selection summary, affordances are already `import.meta.env.DEV`-gated
- `OrdersSheetPilotSurface.tsx` line ~505: `"Queue evaluation active"` text is rendered **unconditionally** (not DEV-gated) — this is the B-20 unconditional text
- The DEV-gated content appears in staging likely because staging runs a dev build

- [ ] **Step 1: Audit all unconditional dev strings in spreadsheet surfaces**

```bash
grep -n "Queue evaluation\|Workflow target\|Primary actions\|Release gate\|Pilot: queue\|antiDrift\|workflowAction\|queue + document" \
  client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
```

Also run against other surfaces:
```bash
grep -rn "Queue evaluation\|Workflow target\|Primary actions\|Release gate\|Pilot: queue" \
  client/src/components/spreadsheet-native/ --include="*.tsx"
```

- [ ] **Step 2: Remove/replace unconditional dev text in OrdersSheetPilotSurface.tsx**

The `"Queue evaluation active"` text at approximately line 505 appears in a status bar like:
```tsx
<span className="text-sm font-medium text-foreground">
  {selectedOrderRow
    ? `${selectedOrderRow.orderNumber} selected`
    : "Queue evaluation active"}
</span>
```

Replace "Queue evaluation active" with a user-friendly fallback:
```tsx
<span className="text-sm font-medium text-foreground">
  {selectedOrderRow
    ? `${selectedOrderRow.orderNumber} selected`
    : "Select an order to begin"}
</span>
```

- [ ] **Step 3: Remove `releaseGateIds` props from all PowersheetGrid usages**

In `OrdersSheetPilotSurface.tsx`, remove `releaseGateIds={[...]}` from all `<PowersheetGrid>` usages. The rendered output is already DEV-gated in PowersheetGrid, but removing the prop is cleaner and prevents any future leak:

```bash
# Find all releaseGateIds usages
grep -n "releaseGateIds" client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
```

Change:
```tsx
<PowersheetGrid
  releaseGateIds={["SALE-ORD-019", "SALE-ORD-023", "SALE-ORD-024", "SALE-ORD-026", "SALE-ORD-027"]}
  antiDriftSummary="Queue release gates: spreadsheet selection parity, discoverability, and explicit workflow actions."
  ...
```

To:
```tsx
<PowersheetGrid
  ...
```

(Remove both `releaseGateIds` and `antiDriftSummary` props from all `<PowersheetGrid>` usages in this file.)

- [ ] **Step 4: Remove releaseGateIds from all other pilot surfaces**

```bash
grep -rn "releaseGateIds\|antiDriftSummary" client/src/components/spreadsheet-native/ --include="*.tsx"
```

Remove `releaseGateIds={[...]}` and `antiDriftSummary="..."` props from every surface that has them. These were internal tracking props, not user-facing.

- [ ] **Step 5: Check the build mode for staging (DEV-gate investigation)**

The correct investigation target is the **Dockerfile**, not `.do/app.yaml` — DigitalOcean App Platform uses `dockerfile_path: Dockerfile` (not `build_command`) so the Dockerfile controls what runs.

```bash
# Check the Dockerfile for dev vs production mode
grep -n "CMD\|RUN\|NODE_ENV\|pnpm\|npm run\|build\|dev" Dockerfile

# Also check .do/app.yaml for any environment variable overrides
grep -A 5 "envs\|NODE_ENV" .do/app.yaml
```

If the Dockerfile runs `pnpm run dev` or sets `NODE_ENV=development`, that is why `import.meta.env.DEV === true` in staging. Fix: change the `CMD` or `RUN` line in the Dockerfile to use `pnpm build && pnpm start` (or the production equivalent), NOT `pnpm dev`.

If DigitalOcean is injecting `NODE_ENV=development` via the app spec env section, remove or override it to `NODE_ENV=production`.

This ensures `import.meta.env.DEV === false` in the staging build, removing ALL DEV-gated content.

- [ ] **Step 6: Remove `releaseGateIds` prop type from PowersheetGrid**

Now that no callers use it, clean up the prop definition in `PowersheetGrid.tsx`:

In `PowersheetGrid.tsx`, remove:
```tsx
releaseGateIds?: string[];
```
from the `PowersheetGridProps` interface, and remove the `releaseGateIds = []` parameter and all rendering logic that uses it (the `renderedReleaseGates` block).

- [ ] **Step 7: Run tests and type check**

```bash
pnpm check
pnpm test -- PowersheetGrid
```

Expected: all pass. If tests reference `releaseGateIds`, update them to remove the prop.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/spreadsheet-native/
git add .do/app.yaml  # only if build command was changed
git commit -m "fix(ui): remove engineering artifacts from production UI — dev text walls, release gates, debug metrics (TER-860)"
```

---

### Wave 1 Deploy + Browser Verification Gate

- [ ] **Step 1: Merge to main and wait for staging deploy**

```bash
git push origin fix/2026-03-26-qa-remediation
# Open PR, merge to main, wait ~5 minutes for staging deploy
```

- [ ] **Step 2: Browser verification — dead routes**

```bash
# Set up Playwright (if not installed)
pnpm test:e2e -- --project=deep --grep "route" || true

# Manual playwright verification:
NODE_TLS_REJECT_UNAUTHORIZED=0 SKIP_E2E_SETUP=1 \
  PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
  npx playwright test --project=chromium --reporter=list
```

**Manual browser checks (open staging in browser):**

Navigate to each URL and verify no 404:
- `https://terp-staging-yicld.ondigitalocean.app/suppliers` → should redirect to Relationships/Suppliers tab ✓
- `https://terp-staging-yicld.ondigitalocean.app/accounts-receivable` → should redirect to Accounting/Invoices ✓
- `https://terp-staging-yicld.ondigitalocean.app/payments` → should redirect to Accounting/Payments ✓
- `https://terp-staging-yicld.ondigitalocean.app/admin` → should redirect to Settings ✓
- Dashboard → click "View AR" → should land on Accounting with invoices tab active ✓

**Manual browser checks — dev artifacts:**
- Open Sales → Orders sheet — should see NO "Queue evaluation active" text, NO release gate notes, NO debug metrics bar (0 selected cells), NO "Pilot: queue + document + handoffs" badge
- If any DEV-gated content is still visible, the build mode issue was not resolved

**Wave 1 is complete when:** All 4 dead routes redirect correctly AND no engineering text is visible to any user on the Orders/Sales surface.

---

## Wave 2 — P0 Spreadsheet + Notification Deep Links

**Tickets:** TER-851, TER-852, TER-853, TER-854
**Autonomy Mode:** STRICT
**Risk:** Medium — interaction model changes
**Expected duration:** 1–2 days

---

### Task 2.1 ⚡ PARALLEL — Fix notification deep links → 404 (TER-851)

**Files:**
- Modify: `server/services/notificationTriggers.ts`
- Modify: `client/src/components/notifications/NotificationBell.tsx`
- Test: `server/services/notificationTriggers.test.ts` (create if missing)

**Bugs addressed:** B-04

**Root cause:** `notificationTriggers.ts` generates `link: \`/orders/${order.id}\`` using numeric DB IDs. There is no `/orders/:id` route in `App.tsx` — the app routes orders through the workspace at `/sales?tab=orders`. So every notification deep link hits a 404.

- [ ] **Step 1: Audit all link generation in notificationTriggers.ts**

```bash
grep -n "link:" server/services/notificationTriggers.ts
```

Expected output lists all `link:` assignments. Look for patterns like:
- `link: \`/orders/${order.id}\`` → broken (no such route)
- `link: \`/invoices/${invoice.id}\`` → check if this route exists
- `link: \`/orders\`` → these work (they're just the orders list page)

- [ ] **Step 2: Check which routes actually exist for deep links**

```bash
grep -n "path=\"/orders\|path=\"/invoices\|path=\"/quotes\|path=\"/purchase-orders" client/src/App.tsx
```

Note which ID-based routes exist and which don't.

- [ ] **Step 3: Fix order notification links**

In `notificationTriggers.ts`, change every `link: \`/orders/${order.id}\`` to the workspace path with the order pre-selected. Check `client/src/lib/workspaceRoutes.ts` for the correct URL builder:

```bash
grep -n "buildSalesWorkspacePath\|buildSheetNativeOrdersPath\|orderId\|selected" client/src/lib/workspaceRoutes.ts | head -20
```

If a route like `/sales?orderId=X` or `/sales?tab=orders&selected=X` is supported, use it. Otherwise, use the safe fallback:

Change:
```typescript
link: `/orders/${order.id}`,
```
To:
```typescript
link: `/sales?tab=orders`,
```

For invoices — check if `/accounting?tab=invoices&invoiceId=${invoice.id}` is a supported route. If not, use:
```typescript
link: `/accounting?tab=invoices`,
```

- [ ] **Step 4: Write unit test**

In `server/services/notificationTriggers.test.ts` (create if not exists):

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildOrderNotificationLink, buildInvoiceNotificationLink } from "./notificationTriggers";
// (adjust the import path and export names to match what you actually wrote in Step 3)

describe("notification link generation", () => {
  it("order notification links use workspace path, not /orders/:id", () => {
    const link = buildOrderNotificationLink({ id: 42 });
    expect(link).not.toMatch(/^\/orders\/\d+$/);
    expect(link).toMatch(/^\/sales/);
  });

  it("invoice notification links use /accounting, not /invoices/:id", () => {
    const link = buildInvoiceNotificationLink({ id: 99 });
    expect(link).toMatch(/^\/accounting/);
    expect(link).not.toMatch(/^\/invoices\/\d+$/);
  });
});
```

**IMPORTANT:** The test must call actual functions from the module under test — not hardcode the expected strings directly. A test that only asserts `"/sales?tab=orders"` against itself always passes regardless of what `notificationTriggers.ts` actually does.

- [ ] **Step 5: Run tests**

```bash
pnpm test -- notificationTriggers
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add server/services/notificationTriggers.ts server/services/notificationTriggers.test.ts
git commit -m "fix(notifications): fix notification deep links — use workspace routes instead of /orders/:id (TER-851)"
```

---

### Task 2.2 ⚡ PARALLEL — Fix spreadsheet single-click behavior (TER-853)

**Files:**
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- Test: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`

**Bugs addressed:** B-14 (single click opens drawer instead of selecting cell)

**Root cause:** `onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}` fires on single click, immediately setting `selectedOrderId`, which causes the detail panel to render. The detail panel opening should require a deliberate action — double-click or explicit button press.

- [ ] **Step 1: Read the existing click + detail panel rendering logic**

```bash
sed -n '120,135p' client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
sed -n '620,640p' client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
sed -n '720,745p' client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
```

Understand:
1. What prop sets `selectedOrderId` (currently `onSelectedRowChange`)
2. Where the detail panel is rendered (conditional on `selectedOrderId`)

- [ ] **Step 2: Add a separate `openDetailId` state distinct from selection**

The key principle: row **selection** (highlighted, actions available) is separate from **opening the detail panel**. Single click = select. Double-click = open detail.

In `OrdersSheetPilotSurface.tsx`, add a separate state for the explicitly-opened detail:

```typescript
// Existing: tracks which row is selected (for toolbar actions)
const { selectedId: selectedOrderId, setSelectedId: setSelectedOrderId } = ...

// New: tracks which row has its detail panel open (requires explicit action)
const [detailOpenOrderId, setDetailOpenOrderId] = useState<string | null>(null);
```

- [ ] **Step 3: Wire single-click to selection only — and thread onRowDoubleClick through the full prop chain**

The `onSelectedRowChange` prop should continue setting `selectedOrderId` (for toolbar action state), but NOT automatically open the detail panel.

**The prop chain is 3 layers deep** — you must add `onRowDoubleClick` to ALL of them:

**Layer 1: `SpreadsheetPilotGrid.tsx`** — add to `SpreadsheetPilotGridProps<Row>` interface and wire to `AgGridReact`:
```tsx
// In SpreadsheetPilotGridProps interface:
onRowDoubleClick?: (row: Row | null) => void;

// In AgGridReact JSX props:
onRowDoubleClicked={event => {
  onRowDoubleClick?.(event.data ?? null);
}}
```

**Layer 2: `PowersheetGrid.tsx`** — add to its props interface and pass through to `SpreadsheetPilotGrid`:
```tsx
// In PowersheetGridProps interface:
onRowDoubleClick?: (row: Row | null) => void;

// In SpreadsheetPilotGrid JSX:
onRowDoubleClick={onRowDoubleClick}
```

**Layer 3: `OrdersSheetPilotSurface.tsx`** — pass the handler to `PowersheetGrid` (done in Step 4 below).

```bash
# Verify the prop chain files:
grep -n "onRowDoubleClick\|onRowDoubleClicked" \
  client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx \
  client/src/components/spreadsheet-native/PowersheetGrid.tsx
```

- [ ] **Step 4: Wire double-click to open detail in OrdersSheetPilotSurface**

```tsx
<SpreadsheetPilotGrid
  ...
  onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
  onRowDoubleClick={row => {
    if (row?.orderId) setDetailOpenOrderId(row.orderId);
  }}
/>
```

Update the detail panel conditional to use `detailOpenOrderId` instead of (or in addition to) `selectedOrderId`.

- [ ] **Step 5: Keep "Open Detail" button working**

The existing "Open" or document mode button at line ~495 should also set `detailOpenOrderId`:
```tsx
<Button size="sm" onClick={() => {
  if (selectedOrderId) setDetailOpenOrderId(selectedOrderId);
  openDocumentMode();
}}>
```

- [ ] **Step 6: Write test**

In `OrdersSheetPilotSurface.test.tsx`, add:

```typescript
it("single click on row selects it but does not open the detail panel", async () => {
  // render component with mock data
  // simulate single click on a row
  // assert: row is selected (selectedOrderId state set)
  // assert: detail panel is NOT rendered (detailOpenOrderId not set)
});

it("double click on row opens the detail panel", async () => {
  // simulate double click
  // assert: detail panel IS rendered
});
```

- [ ] **Step 7: Run tests**

```bash
pnpm test -- OrdersSheetPilot
pnpm check
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/spreadsheet-native/
git commit -m "fix(spreadsheet): single-click selects row, double-click opens detail panel (TER-853)"
```

---

### Task 2.3 ⚡ PARALLEL — Fix Orders row click hang (TER-852)

**Files:**
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- Investigate: `server/routers/orders.ts` (getOrderWithLineItems procedure)

**Bugs addressed:** B-12 (row click causes 60s browser hang)

**Root cause:** When `selectedOrderId` is set by a single click, **4 separate queries fire immediately** — not just `getOrderWithLineItems`. From code review, setting `selectedOrderId` triggers:
1. `trpc.orders.getOrderWithLineItems.useQuery` (the main detail query)
2. `trpc.orders.getOrderDocuments.useQuery` (documents for detail panel)
3. `trpc.orders.getOrderHistory.useQuery` (activity log)
4. `trpc.orders.getOrderWorkflowState.useQuery` (workflow status)

All 4 fire on every single click. If any one is slow or hangs, the UI freezes.

**Fix strategy:** After Task 2.2 adds `detailOpenOrderId`, all 4 queries must be gated on `!!detailOpenOrderId` (NOT `!!selectedOrderId`). This prevents them from firing on single-click.

- [ ] **Step 1: Check the getOrderWithLineItems query**

```bash
grep -n "getOrderWithLineItems" server/routers/orders.ts | head -10
```

Then read the full procedure:
```bash
grep -n "getOrderWithLineItems" server/routers/orders.ts
# Note the line number and read ~50 lines around it
```

Look for:
- Are there proper `WHERE` clauses? Is `deletedAt` filtering applied?
- Are there JOINs that could be slow without indexes?
- Is there an infinite loop or recursive query?

- [ ] **Step 2: Check for relevant DB indexes**

```bash
grep -n "index\|Index" drizzle/schema.ts | grep -i "order"
```

If `orders.id` and `orderLineItems.orderId` don't have indexes, the JOIN is a full table scan.

- [ ] **Step 3: Gate ALL 4 queries on `detailOpenOrderId` (not `selectedOrderId`)**

After Task 2.2 creates `detailOpenOrderId`, update ALL 4 queries to use it as the `enabled` guard:

```typescript
// BEFORE (fires on single click — causes hang):
const detailQuery = trpc.orders.getOrderWithLineItems.useQuery(
  { orderId: selectedOrderId! },
  { enabled: !!selectedOrderId }
);

// AFTER (only fires when detail panel is explicitly opened):
const detailQuery = trpc.orders.getOrderWithLineItems.useQuery(
  { orderId: detailOpenOrderId! },
  { enabled: !!detailOpenOrderId, staleTime: 30_000 }
);
```

Find ALL 4 queries that use `selectedOrderId` as their `enabled` guard and update them to `detailOpenOrderId`. Use:
```bash
grep -n "enabled.*selectedOrderId\|selectedOrderId.*enabled" \
  client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
```

NOTE: `retry: 1, retryDelay: 500` alone does NOT fix a hang — it only limits retries after failure. The root cause is the queries firing on every single click. Gating on `detailOpenOrderId` is the actual fix.

- [ ] **Step 4: Add missing DB indexes if needed**

If `orderLineItems.orderId` lacks an index, create a migration:
```bash
# Only if investigation confirms missing indexes
# Use Drizzle Kit — never raw SQL
```

In `drizzle/schema.ts`, find the `orderLineItems` table and add index if missing:
```typescript
orderLineItemsOrderIdIdx: index("order_line_items_order_id_idx").on(table.orderId),
```

Then generate and run migration:
```bash
pnpm db:generate
pnpm db:migrate
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- orders
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
git add drizzle/  # only if migrations added
git commit -m "fix(orders): resolve row click hang — query retry config + index guard (TER-852)"
```

---

### Task 2.4 ⚡ PARALLEL — Fix Intake spreadsheet column headers, warehouse selector, CCOK (TER-854)

**Files:**
- Modify: `client/src/components/spreadsheet-native/IntakePilotSurface.tsx`
- Investigate: `client/src/lib/spreadsheet-native/intakeColumns.ts` (if it exists)

**Bugs addressed:** B-36 (unreadable column headers Y, T, IT), B-37 (warehouse name repeated 5x), B-38 (CCOK button unexplained)

- [ ] **Step 1: Locate column header definitions**

```bash
# Check if separate column file exists
ls client/src/lib/spreadsheet-native/ 2>/dev/null
grep -n "headerName\|field:\|colDef\|columnDef\|Y\|T\|IT\|COGI" client/src/components/spreadsheet-native/IntakePilotSurface.tsx | head -30
```

- [ ] **Step 2: Read the column definitions**

Read the full column definition array in IntakePilotSurface.tsx. Find all `headerName` values that are single letters (Y, T) or abbreviations (IT, COGI) and replace them with human-readable names.

Common intake column meanings in cannabis context:
- `Y` → likely "Yield" or "Quantity"
- `T` → likely "Total" or "Type"
- `IT` → likely "Item Type" or "In Transit"
- `COGI` → likely "Cost of Goods In" or "COGS Item"

Verify against the server router to confirm actual column semantics:
```bash
grep -n "columnDefs\|intake\|batch\|yield\|quantity\|total\|cogi" client/src/components/spreadsheet-native/IntakePilotSurface.tsx | head -30
```

Change each `headerName: "Y"` to `headerName: "Yield"` (or the confirmed name), etc.

- [ ] **Step 3: Fix warehouse selector rendering (B-37)**

Find the warehouse/location selector:
```bash
grep -n "warehouse\|location\|LocationSelector\|selector\|repeat\|concat" client/src/components/spreadsheet-native/IntakePilotSurface.tsx | head -20
```

The bug: `"Main WarehouseMain WarehouseMain WarehouseMain Warehouse"` — name concatenated 5 times. Likely a `.map()` that joins without a separator or a template string called in a loop.

Look for patterns like:
```tsx
// Bug: location names concatenated
{locations.map(loc => loc.name)}
// or
{`${location.name}${location.name}...`}
```

Fix to use proper rendering:
```tsx
{location.name}
```

- [ ] **Step 4: Fix or label CCOK button (B-38)**

```bash
grep -n "CCOK\|ccok\|CC OK\|cc-ok" client/src/components/spreadsheet-native/IntakePilotSurface.tsx
```

Add a tooltip explaining what CCOK does, using the shadcn Tooltip component:
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

<Tooltip>
  <TooltipTrigger asChild>
    <Button size="sm" onClick={handleCCOK}>CCOK</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Confirm Compliance OK — marks batch as compliance-approved</p>
  </TooltipContent>
</Tooltip>
```

(Verify the actual meaning by searching the handler or router.)

- [ ] **Step 5: Run tests**

```bash
pnpm test -- IntakePilot
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/IntakePilotSurface.tsx
git commit -m "fix(inventory): fix intake spreadsheet column headers, warehouse selector rendering, add CCOK tooltip (TER-854)"
```

---

### Wave 2 Deploy + Browser Verification Gate

- [ ] **Step 1: Merge to main, wait for staging deploy (~5 min)**

- [ ] **Step 2: Browser verification**

**Notifications (B-04):**
1. Log into staging, observe the notification bell
2. Click any notification in the dropdown
3. Verify: page navigates somewhere valid (not 404) ✓

**Spreadsheet click (B-14):**
1. Navigate to Sales → Orders (sheet-native)
2. Single-click any row
3. Verify: row highlights but NO detail panel opens ✓
4. Double-click the same row
5. Verify: detail panel opens ✓

**Orders hang (B-12):**
1. Navigate to Sales → Orders (sheet-native)
2. Single-click a row — verify: page does NOT hang, no spinner after 3 seconds ✓
3. Verify: single click did NOT open the detail panel (only selected the row) ✓
4. Double-click the same row — verify: detail panel opens ✓
5. Verify: page does not hang when detail panel opens (responds within 5 seconds) ✓

**Intake spreadsheet (B-36, B-37, B-38):**
1. Navigate to Inventory → Intake
2. Verify: column headers are human-readable (not single letters) ✓
3. Verify: warehouse selector shows "Main Warehouse" exactly once ✓
4. Hover over CCOK button — verify tooltip appears ✓

**Wave 2 is complete when:** All 4 verifications pass in the live browser.

---

## Wave 3 — Fix Global Search + Quotes + User Roles Loading

**Tickets:** TER-850, TER-855, TER-857
**Autonomy Mode:** STRICT
**Risk:** Medium — search and quotes involve routing/query changes

---

### Task 3.1 ⚡ PARALLEL — Fix global search returning zero results (TER-850)

**Files:**
- Modify: `server/routers/search.ts`
- Modify: `client/src/pages/SearchResultsPage.tsx`
- Test: `server/routers/search.test.ts`

**Bugs addressed:** B-07

**Root cause hypothesis:** All search queries in `search.ts` are wrapped in individual try/catch blocks that silently log errors via `logger.warn(...)` and continue with an empty results array. If the `db` connection fails or ANY query throws, the user sees zero results with no error. The client has no visibility into failures.

- [ ] **Step 1: Add error surfacing to the search router**

Read the full search router to understand which queries exist:
```bash
wc -l server/routers/search.ts
cat server/routers/search.ts | grep -n "try\|catch\|allResults.push\|logger.warn\|return allResults"
```

Add a top-level error flag and expose it to the client:

In `search.ts`, change the return to include a `hadErrors` flag:
```typescript
const searchErrors: string[] = [];

// In each catch block, change:
// logger.warn({ msg: "Quote search failed", error });
// To:
logger.warn({ msg: "Quote search failed", error });
searchErrors.push("quotes");

// At the end, return:
return {
  results: allResults.sort((a, b) => b.relevance - a.relevance),
  total: allResults.length,
  hadErrors: searchErrors.length > 0,
  failedTypes: searchErrors,
};
```

- [ ] **Step 2: Debug why queries fail**

Add a test that verifies search works end-to-end. Run it against the DB to see if the query itself fails:

```bash
# Check search.test.ts for existing tests
cat server/routers/search.test.ts | head -60
```

Write a minimal test:
```typescript
it("searches clients by name and returns results", async () => {
  // Seed a test client named "Test Client Corp"
  // Call trpc.search.global({ query: "Test Client", types: ["customer"] })
  // Expect: results.length > 0
  // Expect: results[0].title contains "Test Client"
});
```

Run:
```bash
pnpm test -- search
```

If the test fails, the DB query is broken. Check if:
- The `clients` table query column names match the Drizzle schema (e.g., `clients.name` vs `clients.company_name`)
- The `db` connection is available in the test context
- The LIKE query is properly formed

- [ ] **Step 3: Fix the failing query (if found)**

Most likely fix — verify column names match schema:
```bash
grep -n "name\|email\|phone\|teriCode" drizzle/schema.ts | grep -i "clients" | head -10
```

If the schema uses `companyName` but the search uses `clients.name`, update the search queries to use the correct column.

- [ ] **Step 4: Update SearchResultsPage to show error state**

In `SearchResultsPage.tsx`, handle the new `hadErrors` field:
```tsx
{data?.hadErrors && (
  <div className="text-sm text-amber-600 mb-2">
    Some search sources are temporarily unavailable.
  </div>
)}
```

- [ ] **Step 5: Run full test suite**

```bash
pnpm test -- search
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add server/routers/search.ts client/src/pages/SearchResultsPage.tsx server/routers/search.test.ts
git commit -m "fix(search): surface search errors to client, fix query column mapping (TER-850)"
```

---

### Task 3.2 ⚡ PARALLEL — Fix "New Quote" creating an Order (TER-855)

**Files:**
- Modify: `client/src/components/work-surface/QuotesWorkSurface.tsx`

**Bugs addressed:** B-15 (New Quote creates Order), B-16 (New Order = New Draft)

**Root cause:** `QuotesWorkSurface.tsx` line ~704:
```tsx
onClick={() => setLocation(buildSalesWorkspacePath("create-order"))}
```
The "New Quote" button navigates to `create-order` — the same as "New Order."

- [ ] **Step 1: Read the full button handler and form options**

```bash
grep -n "New Quote\|New Order\|New Draft\|create-order\|create-quote\|buildSalesWorkspacePath\|setLocation" \
  client/src/components/work-surface/QuotesWorkSurface.tsx
grep -n "create-quote\|createQuote\|QUOTE\|orderType.*QUOTE\|tab.*quote" \
  client/src/lib/workspaceRoutes.ts
```

Check if there's a `create-quote` path or a way to pre-set `orderType=QUOTE` in the create form.

- [ ] **Step 2: Check if the create order form supports orderType pre-selection**

```bash
grep -rn "orderType\|QUOTE\|tab=create\|initialOrderType\|defaultOrderType" \
  client/src/components/work-surface/OrdersWorkSurface.tsx \
  client/src/pages/SalesWorkspacePage.tsx | head -20
```

If the form accepts `orderType` as a query param or prop, use it:
```tsx
// Option A: navigate to create-order with orderType=QUOTE
onClick={() => setLocation(buildSalesWorkspacePath("create-order") + "?orderType=QUOTE")}
```

If the form doesn't support it yet, add a `defaultOrderType` param to the create form.

- [ ] **Step 3: Fix the "New Quote" button**

Change `QuotesWorkSurface.tsx`:
```tsx
// Before:
onClick={() => setLocation(buildSalesWorkspacePath("create-order"))}

// After (if orderType param is supported):
onClick={() => setLocation(`${buildSalesWorkspacePath("create-order")}?orderType=QUOTE`)}
```

If the `create-order` form needs to accept and use `orderType`, update it to pre-select "Quote" when `?orderType=QUOTE` is present in the URL.

- [ ] **Step 4: Fix "New Order" vs "New Draft" confusion (B-16)**

```bash
grep -n "New Order\|New Draft\|newOrder\|newDraft" \
  client/src/components/work-surface/OrdersWorkSurface.tsx | head -20
```

If both navigate to the same URL with no distinction, either:
- Remove the "New Draft" button entirely (if drafts are just the initial state of all orders, which is already clear from the order status)
- OR add a `?status=DRAFT` param that pre-sets the order to draft status

The simplest fix: rename "New Draft" to "New Order (Draft)" or remove it if redundant with "New Order."

- [ ] **Step 5: Write test**

In `QuotesWorkSurface.test.tsx` (or create):
```typescript
it("New Quote button navigates with orderType=QUOTE", () => {
  render(<QuotesWorkSurface />);
  const btn = screen.getByRole("button", { name: /new quote/i });
  fireEvent.click(btn);
  expect(mockSetLocation).toHaveBeenCalledWith(
    expect.stringContaining("orderType=QUOTE")
  );
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm test -- --testPathPattern="QuotesWork"
pnpm check
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/work-surface/QuotesWorkSurface.tsx
git commit -m "fix(quotes): New Quote button creates quote (orderType=QUOTE), clarify New Draft vs New Order (TER-855)"
```

---

### Task 3.3 ⚡ PARALLEL — Fix User Roles infinite loading (TER-857)

**Files:**
- Modify: `client/src/components/settings/rbac/UserRoleManagement.tsx`
- Investigate: `server/routers/rbac-users.ts`

**Bugs addressed:** B-67

**Root cause:** `UserRoleManagement.tsx` line 164: `if (usersLoading || rolesLoading) { return <loading spinner> }`. If either `usersData` or `rolesData` query fails (error or no data), `isLoading` remains true and the spinner never resolves. No error state is shown.

- [ ] **Step 1: Read the full component loading logic**

```bash
sed -n '80,180p' client/src/components/settings/rbac/UserRoleManagement.tsx
```

Note the queries and their `isLoading`/`isError` destructuring.

- [ ] **Step 2: Add error destructuring to both queries**

```typescript
// Before:
const { data: usersData, isLoading: usersLoading } =
  trpc.rbacUsers.listUsersWithRoles.useQuery(...);

const { data: rolesData, isLoading: rolesLoading } =
  trpc.rbacUsers.listRoles.useQuery(...);

// After:
const { data: usersData, isLoading: usersLoading, error: usersError } =
  trpc.rbacUsers.listUsersWithRoles.useQuery(...);

const { data: rolesData, isLoading: rolesLoading, error: rolesError } =
  trpc.rbacUsers.listRoles.useQuery(...);
```

- [ ] **Step 3: Add error state to the render**

```tsx
if (usersError || rolesError) {
  return (
    <div className="p-4 text-destructive">
      Failed to load user roles. {(usersError || rolesError)?.message}
    </div>
  );
}

if (usersLoading || rolesLoading) {
  return (
    <div className="text-muted-foreground">Loading users and roles...</div>
  );
}
```

- [ ] **Step 4: Investigate why the query fails on staging**

Check if the `listUsersWithRoles` procedure requires permissions that the test user doesn't have:
```bash
grep -n "protectedProcedure\|hasPermission\|requireRole\|auth" server/routers/rbac-users.ts | head -10
```

If the procedure isn't using `protectedProcedure`, add it. If it requires a specific role, verify the test user has that role.

Also check if the DB query itself is correct — if `userRoles` table is empty, it should return `{ users: [] }`, not hang:
```bash
sed -n '40,120p' server/routers/rbac-users.ts
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- rbac
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/settings/rbac/UserRoleManagement.tsx
git commit -m "fix(settings): add error state to User Roles tab, prevent infinite loading spinner (TER-857)"
```

---

### Task 3.4 ⚡ PARALLEL — Fix customer search combobox unreliable (TER-850 supplementary)

**Files:**
- Investigate: `client/src/components/` (customer search combobox — different from header search bar)
- Modify: whichever combobox component uses a customer search query

**Bugs addressed:** B-17 (customer search combobox returns no results in key flows like Receive Payment, Create Invoice, New Order)

**IMPORTANT:** B-17 is a completely different component from B-07 (global header search bar). B-07 is fixed in Task 3.1. B-17 is the inline customer search combobox that appears inside modals (Create Order, Receive Payment, Create Invoice). Fixing the header search does NOT fix this.

- [ ] **Step 1: Find the customer search combobox**

```bash
grep -rn "customer.*search\|searchCustomer\|clientSearch\|ComboboxCustomer\|CustomerCombobox\|getClients.*query\|useDebounce.*client" \
  client/src/components/ --include="*.tsx" | grep -v test | head -20
```

Also check modal-level search:
```bash
grep -rn "search.*client\|client.*combobox\|Combobox.*client" \
  client/src/components/accounting/ client/src/components/orders/ \
  client/src/components/work-surface/ --include="*.tsx" | head -15
```

- [ ] **Step 2: Identify the failing query**

The combobox likely uses a search procedure like `trpc.clients.search.useQuery` or `trpc.clients.list.useQuery`. Find which one:

```bash
grep -n "trpc.clients\|clients.search\|clients.list\|getClients" \
  client/src/components/ -r --include="*.tsx" | head -15
```

Check if that procedure:
a) Is wrapped in a try/catch that silently fails (like the global search — Task 3.1)
b) Uses a minimum character threshold that's too high (e.g., requires 3+ chars to trigger)
c) Uses a different table/column name that doesn't exist

- [ ] **Step 3: Fix the underlying query**

Most likely fix — if it shares the same silent-catch pattern as `search.ts`, apply the same error-surfacing fix (expose `hadErrors`, log properly).

If it's a minimum-chars threshold: lower it to 1 character minimum.

If it's a column name mismatch: verify against the schema:
```bash
grep -n "name\|companyName\|company_name" drizzle/schema.ts | grep -i client | head -10
```

- [ ] **Step 4: Test in a modal context**

```bash
pnpm test -- CustomerCombobox
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/  # whichever combobox files were changed
git commit -m "fix(search): fix customer search combobox returning no results in modal flows (TER-850, B-17)"
```

---

### Wave 3 Deploy + Browser Verification Gate

- [ ] **Merge to main, wait for staging deploy**

- [ ] **Browser verification — search (B-07):**
1. Before testing: log into staging and note an actual client name or product name that exists in staging data (check the Clients list or Products list first)
2. Use the header search bar, type the first 3 characters of a known client/product name
3. Verify: results appear (not "No results found") ✓
4. Press Enter → navigate to `/search` → verify results page shows matches ✓

Note: Do NOT hardcode "Blue Dream" or "Mendocino" as test terms — these may not exist in staging. Always use a name confirmed to exist in the live staging DB.

- [ ] **Browser verification — New Quote (B-15):**
1. Navigate to Sales → Quotes tab
2. Click "New Quote"
3. Verify: form that opens is a Quote form (not "Create Sales Order") ✓
4. Verify: "New Order" and "New Draft" have clearly distinct purposes or "New Draft" is removed ✓

- [ ] **Browser verification — User Roles (B-67):**
1. Navigate to Settings → User Roles tab
2. Verify: page loads (no infinite spinner) ✓
3. If an error appears, the error message is visible (not a blank spinner) ✓

- [ ] **Browser verification — Customer search combobox (B-17):**
1. Open Create Order (or Receive Payment) → in the customer search combobox, type 3 characters of a known client name
2. Verify: matching clients appear in the dropdown (not empty) ✓
3. Select a client — verify it populates correctly ✓

**Wave 3 is complete when:** Search returns results, New Quote opens quote form, User Roles loads without infinite spinner, and customer combobox returns results in modal flows.

---

## Wave 4 — P1 Workflow: Payment Flow, PO Features, Notification System

**Tickets:** TER-856, TER-861, TER-862
**Autonomy Mode:** STRICT
**Risk:** Medium-High — payment flow and PO detail page are core workflows

---

### Task 4.1 ⚡ PARALLEL — Fix Receive Payment modal (TER-856)

**Files:**
- Modify: `client/src/components/accounting/ReceivePaymentModal.tsx`
- Modify: `server/routers/accounting.ts` (if `getRecentClients` procedure is broken)
- Test: existing modal test or create new

**Bugs addressed:** B-52

**Root cause:** `getRecentClients.useQuery` with `{ enabled: open && step === 1 }` may fail silently. If `loadingClients` stays `true` (query never resolves), the client Select renders a spinner and never shows options — so the user can never select a client, and `step` never advances from 1 to 2.

- [ ] **Step 1: Read and understand the getRecentClients procedure**

```bash
grep -n "getRecentClients" server/routers/accounting.ts
sed -n '1855,1920p' server/routers/accounting.ts
```

Check: does it have proper DB connection, proper WHERE clause, does it return `{ clients: [...] }` or just `[...]`?

- [ ] **Step 2: Add error handling to the modal**

```tsx
const { data: recentClients, isLoading: loadingClients, error: clientsError } =
  trpc.accounting.quickActions.getRecentClients.useQuery(
    { limit: 10 },
    { enabled: open && step === 1, retry: 1 }
  );
```

In the render, handle the error:
```tsx
{clientsError ? (
  <div className="text-sm text-destructive">
    Could not load clients. Please try again.
    <button onClick={() => utils.accounting.quickActions.getRecentClients.invalidate()}>
      Retry
    </button>
  </div>
) : loadingClients ? (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading clients...
  </div>
) : (
  <Select ...>
```

- [ ] **Step 3: Verify the procedure returns data**

In `accounting.test.ts`, add:
```typescript
it("getRecentClients returns an array of clients", async () => {
  const result = await caller.accounting.quickActions.getRecentClients({ limit: 5 });
  expect(Array.isArray(result)).toBe(true);
});
```

```bash
pnpm test -- accounting
```

If the test fails, fix the procedure to return the correct shape.

- [ ] **Step 4: Run tests and type check**

```bash
pnpm check
pnpm test -- ReceivePayment
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/accounting/ReceivePaymentModal.tsx
git add server/routers/accounting.ts  # if procedure was fixed
git commit -m "fix(accounting): fix Receive Payment modal — handle loading/error state for client list (TER-856)"
```

---

### Task 4.2 ⚡ PARALLEL — Fix Purchase Orders: naming, validation, detail page (TER-861)

**Files:**
- Modify: `client/src/pages/ProcurementWorkspacePage.tsx` — fix "Procurement" vs "Purchase Orders" naming
- Modify: `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx` — fix validation error display
- Create: `client/src/pages/PurchaseOrderDetailPage.tsx` — new PO detail page
- Modify: `client/src/App.tsx` — add `/purchase-orders/:id` route
- Test: `client/src/pages/PurchaseOrderDetailPage.test.tsx`

**Bugs addressed:** B-28 (naming), B-29 (no detail page), B-30 (silent validation)

- [ ] **Step 1: Fix "Procurement" vs "Purchase Orders" naming (B-28)**

```bash
grep -rn "Procurement\|procurement" client/src/pages/ProcurementWorkspacePage.tsx | head -10
```

Change the page `<title>` and `<h1>` from "Procurement" to "Purchase Orders":
```tsx
// Change:
<h1 className="...">Procurement</h1>
// To:
<h1 className="...">Purchase Orders</h1>
```

Also update any breadcrumb that says "Procurement":
```bash
grep -rn "Procurement" client/src --include="*.tsx" | grep -v "test\|spec"
```

- [ ] **Step 2: Fix silent PO create validation (B-30)**

In `PurchaseOrdersWorkSurface.tsx`, find the PO create form submission:
```bash
grep -n "handleSubmit\|onSubmit\|supplier\|required\|toast\|error" \
  client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx | head -20
```

Add explicit validation before submission:
```tsx
const handleSubmit = () => {
  if (!selectedSupplierId) {
    toast({
      title: "Validation Error",
      description: "Please select a supplier before creating a Purchase Order.",
      variant: "destructive",
    });
    setSupplierError("Supplier is required");
    return;
  }
  // proceed with mutation
};
```

And add visual error indicator to the supplier field:
```tsx
<Select ...>
  ...
</Select>
{supplierError && (
  <p className="text-sm text-destructive mt-1">{supplierError}</p>
)}
```

- [ ] **Step 3: Create PO detail page**

Create `client/src/pages/PurchaseOrderDetailPage.tsx`:
```tsx
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
// ... other imports

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: po, isLoading, error } = trpc.purchaseOrders.getById.useQuery(
    { id: parseInt(id) },
    { enabled: !!id }
  );

  if (isLoading) return <LoadingState />;
  if (error || !po) return <ErrorState message={error?.message} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PO #{po.poNumber}</h1>
          <p className="text-muted-foreground">{po.supplierName}</p>
        </div>
        <Badge>{po.status}</Badge>
      </div>

      {/* Line items table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Unit Cost</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems?.map(item => (
              <tr key={item.id} className="border-b">
                <td className="p-3">{item.productName}</td>
                <td className="p-3 text-right">{item.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(item.unitCost)}</td>
                <td className="p-3 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="p-3 text-right font-medium">Total</td>
              <td className="p-3 text-right font-bold">{formatCurrency(po.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Check if getById procedure exists in purchaseOrders router**

```bash
grep -n "getById\|findById\|getPO\|getOne" server/routers/purchaseOrders.ts | head -10
```

If it doesn't exist, add it:
```typescript
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    const db = await getDb();
    const po = await db.query.purchaseOrders.findFirst({
      where: and(
        eq(purchaseOrders.id, input.id),
        isNull(purchaseOrders.deletedAt)
      ),
      with: { lineItems: true },
    });
    if (!po) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase order not found" });
    return po;
  }),
```

- [ ] **Step 5: Add route in App.tsx**

```tsx
<Route path="/purchase-orders/:id" component={PurchaseOrderDetailPage} />
```

Import at the top:
```tsx
import { PurchaseOrderDetailPage } from "@/pages/PurchaseOrderDetailPage";
```

- [ ] **Step 6: Wire PO rows to navigate to detail on double-click**

Use `onRowDoubleClick` (the same prop added in Task 2.2) to navigate to the detail page — **not** `onSelectedRowChange`. Single-click should only select the row; double-click navigates.

In `PurchaseOrdersPilotSurface.tsx` or `PurchaseOrdersWorkSurface.tsx`:
```bash
grep -n "onRowDoubleClick\|onSelectedRowChange\|selectedPO\|handleRow" \
  client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx | head -10
```

Add:
```tsx
onSelectedRowChange={row => setSelectedPoId(row?.id ?? null)}  // selection only
onRowDoubleClick={row => {
  if (row?.id) setLocation(`/purchase-orders/${row.id}`);
}}
```

- [ ] **Step 7: Write tests**

```typescript
// client/src/pages/PurchaseOrderDetailPage.test.tsx
it("renders PO detail with line items", async () => {
  // mock trpc.purchaseOrders.getById to return a PO with 2 line items
  // render PurchaseOrderDetailPage with id param
  // expect PO number to be visible
  // expect 2 line items rendered
});

it("shows error state if PO not found", async () => {
  // mock to return error
  // expect error message shown
});
```

- [ ] **Step 8: Run tests**

```bash
pnpm test -- PurchaseOrder
pnpm check
```

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/PurchaseOrderDetailPage.tsx
git add client/src/App.tsx
git add client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx
git add client/src/pages/ProcurementWorkspacePage.tsx
git add server/routers/purchaseOrders.ts  # if getById was added
git commit -m "fix(procurement): add PO detail page, fix validation errors, fix Procurement/Purchase Orders naming (TER-861)"
```

---

### Task 4.3 ⚡ PARALLEL — Fix notification system: count, client names, page sync (TER-862)

**Files:**
- Modify: `client/src/components/notifications/NotificationBell.tsx`
- Modify: `client/src/pages/NotificationsPage.tsx`
- Modify: `server/services/notificationService.ts`
- Test: existing test files

**Bugs addressed:** B-01 (count caps at 9+), B-02 (raw client IDs), B-77 (page/bell out of sync)

- [ ] **Step 1: Fix notification count display (B-01)**

In `NotificationBell.tsx`, find the badge count rendering:
```bash
grep -n "9+\|badge\|count\|unread\|length" client/src/components/notifications/NotificationBell.tsx | head -15
```

Change cap from "9+" to "99+":
```tsx
// Before:
{unreadCount > 9 ? "9+" : unreadCount}

// After:
{unreadCount > 99 ? "99+" : unreadCount}
```

- [ ] **Step 2: Fix raw client ID in notification messages (B-02)**

In `notificationService.ts`, find where notification messages are created with `Client #${id}`:
```bash
grep -n "Client #\|client.*id\|entityId\|clientId" server/services/notificationService.ts | head -20
```

The service creates messages like `"created for Client #${clientId}"`. It needs to look up the client name. Add a client name lookup:

```typescript
// In the notification creation function, accept clientName as a parameter
// or look it up from the DB before creating the notification

// Change:
message: `New order created for Client #${clientId}`
// To:
message: `New order created for ${clientName}`
```

Update `notificationTriggers.ts` to pass the client name when triggering notifications:
```bash
grep -n "clientId\|client.*name\|clientName" server/services/notificationTriggers.ts | head -20
```

Orders already have a `clientId` — look up `clients.name` when building the notification:
```typescript
const client = await db.query.clients.findFirst({
  where: eq(clients.id, order.clientId),
  columns: { name: true }
});
const clientName = client?.name ?? `Client #${order.clientId}`;
```

- [ ] **Step 3: Sync NotificationsPage with NotificationBell (B-77)**

Check what data source each uses:
```bash
grep -n "trpc\.\|useQuery\|notifications\." client/src/components/notifications/NotificationBell.tsx | head -10
grep -n "trpc\.\|useQuery\|notifications\." client/src/pages/NotificationsPage.tsx | head -10
```

If they call different procedures (e.g., bell uses `getUnread` and page uses `getInbox`), make them both use the same procedure or at least the same data source:
- Both should use `trpc.notifications.list.useQuery({ limit: 50 })` or equivalent
- Both should invalidate the same cache key when marking as read

- [ ] **Step 4: Run tests**

```bash
pnpm test -- notification
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/notifications/ client/src/pages/NotificationsPage.tsx server/services/
git commit -m "fix(notifications): show actual count (99+), use client names, sync page and bell (TER-862)"
```

---

### Wave 4 Deploy + Browser Verification Gate

- [ ] **Merge to main, wait for staging deploy**

- [ ] **Browser verification — Receive Payment (B-52):**
1. Log in as a user with `accounting:read` permission (check that your test account has it)
2. Navigate to Accounting → click "Receive Payment"
3. Verify: client dropdown loads (if it shows a spinner forever, the `accounting:read` permission is missing for your test user)
4. Select a client from the dropdown
5. Verify: form advances to step 2 (amount field appears) ✓
6. Enter an amount and submit — verify payment records successfully ✓

If step 3 fails (spinner won't stop): check the test user's RBAC roles in Settings → User Roles and confirm `accounting:read` is assigned.

- [ ] **Browser verification — PO detail (B-28, B-29, B-30):**
1. Navigate to Purchase Orders (verify title says "Purchase Orders" not "Procurement") ✓
2. Click any PO row
3. Verify: navigates to `/purchase-orders/:id` with PO details visible ✓
4. Open Create PO modal, click submit without a supplier
5. Verify: error message appears (not silent failure) ✓

- [ ] **Browser verification — Notifications (B-01, B-02, B-77):**
1. Verify bell badge shows a number greater than "9+" (e.g., "119") ✓
2. Open notification panel — verify messages say client names not "Client #203" ✓
3. Navigate to `/notifications` — verify inbox matches what bell shows ✓

**Wave 4 is complete when:** Payment flow completes end-to-end, PO detail page loads, notifications are accurate.

---

## Wave 5 — P2: Relationships UX + Accounting UI + GL Investigation

**Tickets:** TER-863, TER-864, TER-858
**Autonomy Mode:** TER-858 is RED (requires Evan approval before any DB writes), TER-863/864 are STRICT

---

### Task 5.1 ⚡ PARALLEL — Fix Relationships/Clients UX (TER-863)

**Files:**
- Modify: `client/src/components/work-surface/ClientsWorkSurface.tsx`
- Modify: `client/src/components/clients/QuickCreateClient.tsx`
- Modify: `client/src/pages/RelationshipsWorkspacePage.tsx`

**Bugs addressed:** B-43 (drawer only — navigate to full client page), B-44 (wrong client drawer), B-45 (Code Name label), B-46 (supplier rows do nothing), B-47 (breadcrumb hierarchy)

**Critical note on B-43:** The adversarial review confirmed that `ClientProfilePage` and the `/clients/:id` route ALREADY EXIST in `App.tsx` (around line 504). This is NOT a "larger feature to build" — it is a ~10-line wire-up of the row click to navigate to the existing page. Do not defer this.

- [ ] **Step 1: Wire client rows to navigate to /clients/:id (B-43)**

```bash
# Confirm the route exists:
grep -n "clients/:id\|ClientProfilePage" client/src/App.tsx
```

Expected: a route like `<Route path="/clients/:id" component={ClientProfilePage} />` at line ~504.

In `ClientsWorkSurface.tsx`, find the row click handler and change from "open drawer" to "navigate":

```tsx
// Replace drawer-opening handler:
onSelectedRowChange={row => setSelectedClient(row)}

// With navigation:
onSelectedRowChange={row => {
  if (row?.id) setLocation(`/clients/${row.id}`);
}}
```

Import `useLocation` from wouter if not present:
```tsx
import { useLocation } from "wouter";
const [, setLocation] = useLocation();
```

- [ ] **Step 2: Fix off-by-one client drawer (B-44)**

```bash
grep -n "selectedClient\|selectedRow\|onClick\|handleRowClick\|setSelected" \
  client/src/components/work-surface/ClientsWorkSurface.tsx | head -20
```

Check how the selected client ID is tracked. A common off-by-one: row index used instead of row data ID. Fix:
```tsx
// Wrong: using array index
onSelectedRowChange={row => setSelectedClient(clients[rowIndex])}

// Correct: use the row data directly
onSelectedRowChange={row => setSelectedClient(row)}
```

- [ ] **Step 2: Fix supplier rows doing nothing (B-46)**

Find the Suppliers tab component:
```bash
grep -n "supplier\|Supplier\|onRowClick\|handleRow\|isSeller" \
  client/src/pages/RelationshipsWorkspacePage.tsx | head -20
```

Add an `onSelectedRowChange` handler to the suppliers table that opens a supplier detail drawer:
```tsx
onSelectedRowChange={row => {
  if (row?.id) setSelectedSupplierId(row.id);
}}
```

- [ ] **Step 3: Rename "Code Name" to "Client Name" (B-45)**

In `QuickCreateClient.tsx`:
```bash
grep -n "Code Name\|codeName\|code name\|description.*code" \
  client/src/components/clients/QuickCreateClient.tsx
```

Change `"Code Name"` to `"Client Name"` and update the description text from the spy codename language:
```tsx
// Before:
<Label>Code Name <span className="text-destructive">*</span></Label>
// description = "Capture the code name and a reachable handle now..."

// After:
<Label>Client Name <span className="text-destructive">*</span></Label>
// description = "Enter the client's business name. Fill in additional details later."
```

- [ ] **Step 4: Fix breadcrumb hierarchy confusion (B-47)**

```bash
grep -n "breadcrumb\|Breadcrumb\|Archived Accounts\|Clients.*Suppliers" \
  client/src/pages/RelationshipsWorkspacePage.tsx | head -15
```

The breadcrumb should not include tab names as hierarchy steps. Fix the breadcrumb to show only the page name:
```tsx
// Before:
<Breadcrumb>
  <BreadcrumbItem>Relationships</BreadcrumbItem>
  <BreadcrumbItem>Clients (active)</BreadcrumbItem>
  <BreadcrumbItem>Archived Accounts</BreadcrumbItem>
</Breadcrumb>

// After:
<Breadcrumb>
  <BreadcrumbItem>Relationships</BreadcrumbItem>
</Breadcrumb>
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- Relationships
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/work-surface/ClientsWorkSurface.tsx \
  client/src/components/clients/QuickCreateClient.tsx \
  client/src/pages/RelationshipsWorkspacePage.tsx
git commit -m "fix(relationships): fix wrong client drawer, supplier rows, Code Name label, breadcrumb (TER-863)"
```

---

### Task 5.2 ⚡ PARALLEL — Fix accounting UI issues (TER-864)

**Files:**
- Modify: `client/src/pages/accounting/` (accounting page tabs)
- Modify: `client/src/components/accounting/ReceivePaymentModal.tsx` (already touched in Wave 4)
- Modify: `client/src/components/accounting/PaySupplierModal.tsx` (if exists)

**Bugs addressed:** B-51, B-56, B-57, B-58, B-59, B-60, B-61

- [ ] **Step 1: Fix invoice rows non-navigable in Classic view (B-51)**

```bash
grep -rn "classic\|Classic\|invoice.*click\|handleInvoice\|onRowClick" \
  client/src/pages/accounting/ --include="*.tsx" | head -15
```

Add click handler to classic invoice rows:
```tsx
<TableRow
  key={invoice.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => setSelectedInvoiceId(invoice.id)}
>
```

Or navigate to a detail route if one exists.

- [ ] **Step 2: Fix accounting tab overflow (B-56)**

```bash
grep -rn "tab\|Tab\|overflow\|scroll" client/src/pages/accounting/ --include="*.tsx" | grep -i "overdue\|analysis\|queues" | head -10
```

Options:
a) Add `overflow-x-auto` to the tab list container
b) Consolidate tabs (e.g., "Overdue Invoices" and "Invoices" into one with a filter)
c) Move "Keep queues in focus" and "Open analysis" out of the tab list (they're not tabs — see B-57)

- [ ] **Step 3: Fix ARIA role errors (B-57)**

```bash
grep -rn "Keep queues in focus\|Open analysis" client/src/pages/accounting/ --include="*.tsx" | head -5
```

Change `role="tab"` to `role="link"` or render as `<Button>` or `<a>` elements, not `<TabsTrigger>`:
```tsx
// Before (wrong — makes it a tab):
<TabsTrigger value="queues-focus">Keep queues in focus</TabsTrigger>

// After (correct — navigation link inside the tab area):
<Button variant="ghost" size="sm" onClick={handleQueuesInFocus}>
  Keep queues in focus
</Button>
```

- [ ] **Step 4: Fix Pay Supplier modal (B-58)**

```bash
find client/src/components/accounting -name "PaySupplier*" 2>/dev/null
grep -rn "Pay Supplier\|PaySupplier\|paySup" client/src --include="*.tsx" | head -5
```

Add minimum required fields (amount, payment date) to the modal:
```tsx
{/* Add after supplier select */}
<div className="space-y-2">
  <Label>Amount ($)</Label>
  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
</div>
<div className="space-y-2">
  <Label>Payment Date</Label>
  <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
</div>
```

- [ ] **Step 5: Fix Create Invoice modal (B-59)**

⚠️ **RED-adjacent:** Adding financial fields (amount, line items) to an invoice modal touches accounting data integrity. Before writing code, read the existing invoice creation mutation in `server/routers/accounting.ts` to understand what fields are already accepted and validated. Do NOT add client-side-only amount fields that bypass server validation.

```bash
grep -n "createInvoice\|invoice.*create\|amount.*invoice" server/routers/accounting.ts | head -10
```

If the server procedure already accepts `amount` — just add the UI field and wire it to the existing mutation input. That's SAFE.

If it doesn't accept `amount` — this is a schema change and must be treated as STRICT mode (full verification cycle). Do NOT add the field without also adding server-side validation.

Add line items section to the Create Invoice modal:
```tsx
<div className="space-y-2">
  <Label>Amount ($)</Label>
  <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
</div>
```

- [ ] **Step 6: Fix Bills amount formatting (B-61)**

```bash
grep -rn "bills\|Bills\|total.*amount\|formatCurrency\|toLocaleString" \
  client/src/pages/accounting/ --include="*.tsx" | head -10
```

Find the bills total rendering and ensure `formatCurrency` is used:
```tsx
// Wrong — may produce "1,863,464761":
{total.toFixed(2)}

// Correct:
{formatCurrency(total)}
```

- [ ] **Step 7: Add counts to invoice status filter chips (B-60)**

```bash
grep -n "Draft\|Sent\|Viewed\|Partial\|Paid\|Overdue.*chip\|filter.*chip\|StatusChip" \
  client/src/pages/accounting/ -r --include="*.tsx" | head -10
```

Add counts from the invoice data:
```tsx
const draftCount = invoices?.filter(i => i.status === "DRAFT").length ?? 0;

<Button
  variant={statusFilter === "DRAFT" ? "default" : "outline"}
  size="sm"
  onClick={() => setStatusFilter("DRAFT")}
>
  Draft ({draftCount})
</Button>
```

- [ ] **Step 8: Run tests**

```bash
pnpm test -- accounting
pnpm check
```

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/accounting/ client/src/components/accounting/
git commit -m "fix(accounting): fix invoice navigation, tab overflow, ARIA roles, modal fields, number formatting (TER-864)"
```

---

### Task 5.3 — GL Investigation (TER-858)

**⚠️ AUTONOMY MODE: RED — requires Evan approval before any database writes or migrations**

**Files:**
- Investigate: `server/routers/accounting.ts`
- Investigate: `server/accountingDb.ts`
- Investigate: `server/accountingHooks.ts`

**Bugs addressed:** B-53 (GL empty), B-54 (bank transactions empty), B-55 (fiscal periods empty)

- [ ] **Step 1: Read the GL query procedure**

```bash
grep -n "getLedgerEntries\|journalEntries\|getGL\|listEntries" server/routers/accounting.ts | head -10
# Then read the full procedure
```

- [ ] **Step 2: Check if GL entries exist in the DB**

```bash
# Run a quick count query via the existing DB scripts
grep -rn "journalEntries\|journal_entries" drizzle/schema.ts | head -5
```

If the schema has a `journalEntries` table, verify the tRPC query is:
1. Looking at the right table
2. Not filtered too aggressively (e.g., requiring a fiscal period that doesn't exist)
3. Not returning empty due to a WHERE clause on missing `deletedAt` where entries have no `deletedAt` column

- [ ] **Step 3: Check accountingHooks.ts for GL posting**

```bash
grep -n "journalEntry\|createEntry\|postToGL\|createJournalEntry" server/accountingHooks.ts | head -10
```

Verify that hooks fire correctly when a payment is received or invoice is created. If hooks are not being called, the GL will be empty.

- [ ] **Step 4: Document findings**

Write the findings to a short investigation report:
```
docs/investigations/2026-03-26-gl-empty-investigation.md
```

Include:
- Number of records in `journalEntries` table (from direct query)
- Whether GL posting hooks fire on payment creation
- Whether the GL query has any filtering bugs
- Whether fiscal periods are required for GL display

- [ ] **Step 5: ⚠️ STOP — present findings to Evan before writing any fix**

The GL investigation (B-53) is RED mode. Present the findings document to Evan. Do NOT apply fixes involving:
- Schema migrations
- Backfilling GL entries
- Changes to accounting logic

Evan will approve the specific fix approach before implementation proceeds.

- [ ] **Step 6: Commit investigation docs only**

```bash
git add docs/investigations/2026-03-26-gl-empty-investigation.md
git commit -m "docs: GL investigation findings — root cause identified, pending approval for fix (TER-858)"
```

---

### Wave 5 Deploy + Browser Verification Gate

- [ ] **Merge to main, wait for staging deploy**

- [ ] **Browser verification — Relationships (B-44, B-45, B-46):**
1. Navigate to Relationships → Clients
2. Click on the second client in the list
3. Verify: drawer that opens is for the SECOND client (not first) ✓
4. Open Quick Add modal — verify field label says "Client Name" not "Code Name" ✓
5. Click a supplier row — verify something happens (drawer or detail) ✓

- [ ] **Browser verification — Accounting UI (B-51, B-56, B-57, B-58, B-61):**
1. Navigate to Accounting → Invoices (classic view) → click an invoice row
2. Verify: something navigates or opens a detail ✓
3. Verify: tab bar doesn't overflow, Overdue Invoices tab is reachable ✓
4. Verify: "Keep queues in focus" is not a broken tab ✓
5. Navigate to Pay Supplier — verify amount and date fields are present ✓
6. Check Bills total — verify "$1,863,464,761" format (comma in right place) ✓

**Wave 5 is complete when:** Client rows open correct clients, supplier rows respond, accounting UI improvements are live.

---

## Wave 6 — P3: Navigation Polish, Mobile, Minor Fixes, Cosmetics

**Tickets:** TER-865, TER-866, TER-867, TER-868
**Autonomy Mode:** SAFE
**Risk:** Low — UI text and responsiveness changes

---

### Task 6.1 ⚡ PARALLEL — Navigation & naming cleanup (TER-865)

**Bugs:** B-05, B-08, B-09, B-18, B-19, B-23, B-24, B-25, B-26, B-27, B-71, B-72, B-73, B-76

**Files:**
- Modify: `client/src/config/navigation.consolidation.ts` or equivalent nav config
- Modify: `client/src/components/layout/AppSidebar.tsx` or equivalent
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx` (breadcrumb text)

- [ ] **Step 1: Fix nav section grouping (B-71)**

```bash
grep -rn "ADMIN\|OPERATIONS\|BUY\|section\|group" client/src/config/ --include="*.ts" --include="*.tsx"
```

Move Calendar/Settings/Notifications out of "ADMIN". Move Bills/Suppliers into "BUY". Add Receiving/Shipping to "OPERATIONS".

- [ ] **Step 2: Align "Reports" / "Analytics" naming (B-72)**

```bash
grep -rn "Reports\|Analytics\|\"Reports\"\|\"Analytics\"" client/src --include="*.tsx" --include="*.ts" | grep -v test | head -20
```

Choose one name (recommend "Analytics") and update all occurrences.

- [ ] **Step 3: Fix sidebar link tooltips (B-73)**

```bash
grep -rn "tooltip\|Tooltip\|title=.*Manage\|title=.*workspace" client/src/components/layout/ --include="*.tsx" | head -10
```

Shorten all sidebar tooltips to ≤3 words:
```tsx
// Before:
title="Manage orders, quotes, returns, sales catalogues, and live shopping in a unified sales workspace."

// After:
title="Sales workspace"
```

- [ ] **Step 4: Fix internal breadcrumb jargon (B-18)**

```bash
grep -rn "Sheet-Native Pilot\|Sheet-native Overflow\|Document mode" client/src --include="*.tsx" | grep -v test | head -10
```

Replace with user-friendly language:
```tsx
// "Sheet-Native Pilot" → "Sales"
// "Sheet-native Overflow" → "Orders"
// "Document mode" → "Order Detail"
```

- [ ] **Step 5: Fix "View AR" button navigation (B-08)**

B-08 (listed as B-09 in the original QA numbering) — "View AR" on the dashboard navigates to the Accounting page but lands on the wrong tab. The fix from Task 1.1 adds the redirect, but the dashboard button also needs to be updated to navigate directly to `/accounting?tab=invoices`.

```bash
grep -rn "View AR\|viewAR\|view.*AR\|accounts.*receivable.*button" \
  client/src/pages/DashboardPage.tsx client/src/components/ --include="*.tsx" | head -10
```

Change the button's click handler:
```tsx
// Before (navigates to /accounting without tab):
onClick={() => setLocation("/accounting")}

// After:
onClick={() => setLocation("/accounting?tab=invoices")}
```

- [ ] **Step 6: Fix truncated column tooltips (B-23, B-24)**

```bash
grep -n "tooltipValueGetter\|cellTooltip\|tooltip.*order\|orderNumber\|Next.*column" \
  client/src/lib/spreadsheet-native/index.ts | head -10
```

Add `tooltipValueGetter` to the Order ID and "Next" column definitions:
```typescript
{
  headerName: "Order",
  field: "orderNumber",
  tooltipValueGetter: (params) => params.value,
  // ...
},
{
  headerName: "Next Action",
  field: "nextAction",
  tooltipValueGetter: (params) => params.value,
  // ...
},
```

- [ ] **Step 7: Commit**

```bash
git add client/src/config/ client/src/components/layout/ \
  client/src/lib/spreadsheet-native/ \
  client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx \
  client/src/pages/DashboardPage.tsx
git commit -m "fix(nav): align naming, fix section grouping, shorten tooltips, fix breadcrumb jargon, fix View AR button (TER-865)"
```

---

### Task 6.2 ⚡ PARALLEL — Fix mobile layout (TER-866)

**Bugs:** B-74, B-75

**Files:**
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- Modify: `client/src/pages/SalesWorkspacePage.tsx`

- [ ] **Step 1: Hide dev text wall on mobile (B-74)**

The "Queue evaluation active" status bar is already being cleaned up in Wave 1. For any remaining full text blocks, add responsive hiding:
```tsx
<div className="hidden md:flex flex-wrap items-center gap-2 ...">
  {/* only show this extended status bar on desktop */}
</div>
```

- [ ] **Step 2: Make Sheet-Native/Classic toggle compact on mobile (B-75)**

```bash
grep -n "Sheet-Native Pilot\|Classic Surface\|surfaceMode\|toggle" \
  client/src/pages/SalesWorkspacePage.tsx | head -10
```

```tsx
// Wrap the toggle with responsive styling:
<div className="flex items-center gap-1 sm:gap-2">
  <Button
    size="sm"
    variant={surfaceMode === "sheet-native" ? "default" : "outline"}
    className="text-xs sm:text-sm px-2 sm:px-3"
    onClick={() => setSurfaceMode("sheet-native")}
  >
    <span className="hidden sm:inline">Sheet-Native Pilot</span>
    <span className="sm:hidden">Grid</span>
  </Button>
  <Button
    size="sm"
    variant={surfaceMode === "classic" ? "default" : "outline"}
    className="text-xs sm:text-sm px-2 sm:px-3"
    onClick={() => setSurfaceMode("classic")}
  >
    <span className="hidden sm:inline">Classic Surface</span>
    <span className="sm:hidden">Classic</span>
  </Button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SalesWorkspacePage.tsx \
  client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx
git commit -m "fix(mobile): hide dev text wall and compact toggle on small viewports (TER-866)"
```

---

### Task 6.3 ⚡ PARALLEL — D&S, Returns, and Settings minor fixes (TER-867)

**Bugs:** B-62, B-63, B-64, B-65, B-66, B-68, B-69

**Files:**
- Modify: `client/src/pages/ReturnsManagementPage.tsx` or equivalent
- Modify: `client/src/components/returns/ProcessReturnModal.tsx` or equivalent
- Modify: `client/src/pages/DemandSupplyPage.tsx` or equivalent
- Modify: `client/src/pages/Settings.tsx`

- [ ] **Step 1: Fix Returns row click (B-62, B-63)**

```bash
grep -rn "Returns\|return\|ReturnManagement\|ProcessReturn" \
  client/src/pages/ --include="*.tsx" -l
```

Add `onClick` to returns table rows that opens a detail drawer.

- [ ] **Step 2: Fix Process Return modal order ID (B-64)**

```bash
grep -rn "Order #1\|orderId\|order_id\|orderNumber.*return" client/src --include="*.tsx" | head -10
```

Change the modal to look up the human-readable order number:
```tsx
// Before:
<span>Order #{return.orderId}</span>

// After:
<span>{return.orderNumber || `Order #${return.orderId}`}</span>
```

- [ ] **Step 3: Fix Matchmaking counter (B-65)**

```bash
grep -rn "Active Needs\|activeNeeds\|matchmaking\|clientNeeds" \
  client/src/pages/DemandSupplyPage.tsx --include="*.tsx" | head -10
```

Find the counter and ensure it uses the same data source as the Client Needs tab:
```tsx
// Should be:
const activeNeedsCount = clientNeeds?.filter(n => n.status === "active").length ?? 0;
// NOT a separate query that returns 0
```

- [ ] **Step 4: Fix "Add Need" button (B-66)**

```bash
grep -rn "Add Need\|addNeed\|handleAddNeed" client/src --include="*.tsx" | head -5
```

If the button has an empty `onClick`, wire it to open a modal or navigate to the need creation form.

- [ ] **Step 5: Fix Strains tab click (B-69)**

```bash
grep -rn "Strains\|strains\|MasterData\|master.*data.*tab" \
  client/src/pages/Settings.tsx | head -10
```

If the Strains tab trigger is incorrectly disabled or has a bug, fix it:
```tsx
// Check for disabled={true} or onClick returning early
<TabsTrigger value="strains">Strains</TabsTrigger>
// Ensure it's not wrapped in a condition that disables it
```

- [ ] **Step 6: Add password requirements display (B-68)**

```bash
grep -rn "Create.*User\|CreateUser\|newUser\|password.*field" \
  client/src/pages/Settings.tsx | head -10
```

Add helper text below the password field:
```tsx
<p className="text-xs text-muted-foreground mt-1">
  Minimum 8 characters
</p>
```

- [ ] **Step 7: Run tests**

```bash
pnpm test -- Settings
pnpm check
```

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/
git commit -m "fix(misc): fix Returns clicks, matchmaking counter, Add Need button, Strains tab, password hint (TER-867)"
```

---

### Task 6.4 ⚡ PARALLEL — Cosmetic polish (TER-868)

**Bugs:** B-03, B-06, B-10, B-11, B-31, B-32, B-33, B-34, B-35, B-39, B-40, B-41, B-48, B-78

- [ ] **Step 1: Fix bell icon stays active after close (B-06)**

```bash
grep -n "active\|border.*bell\|bell.*active\|open.*bell" \
  client/src/components/notifications/NotificationBell.tsx | head -10
```

Reset bell visual state when dropdown closes:
```tsx
const [isOpen, setIsOpen] = useState(false);
// Ensure className only applies active styles when isOpen is true
className={isOpen ? "border-primary" : "border-transparent"}
```

- [ ] **Step 2: Remove mysterious orange notification dots (B-03)**

```bash
grep -n "orange\|amber.*dot\|dot.*orange\|bullet" \
  client/src/components/notifications/ -r | head -10
```

Remove the orange dot or add a comment explaining its purpose. If it's a CSS rendering artifact, remove the stray element.

- [ ] **Step 3: Fix Dashboard Today's Orders $0 (B-11)**

```bash
grep -rn "Today.*Orders\|todayOrders\|today.*revenue\|today.*filter" \
  client/src/pages/DashboardPage.tsx --include="*.tsx" | head -10
```

Check if the date filter uses UTC vs local timezone. A common bug: `new Date().toISOString()` produces UTC dates that may not match local "today":
```tsx
// Wrong:
where: gte(orders.createdAt, new Date().toISOString().split("T")[0])

// Correct (use start of local day):
const today = new Date();
today.setHours(0, 0, 0, 0);
where: gte(orders.createdAt, today)
```

- [ ] **Step 4: Fix supplier and shipping queue test data pollution (B-31, B-40)**

**B-31 — supplier search test data:**
```bash
grep -rn "ELi Item\|seed.*supplier\|Stage Quick Add" scripts/ --include="*.ts" --include="*.py" | head -5
```

If test data can't be removed from staging, add a filter in the PO supplier search to exclude entries matching test data patterns (e.g., entries with `name LIKE '%ELi Item%'`).

**B-40 — shipping queue test data:**
```bash
grep -rn "shipping.*seed\|seed.*shipping\|TEST.*shipment\|shipment.*test" \
  scripts/ --include="*.ts" --include="*.py" | head -5
```

Find how fake shipments were seeded into staging. Either:
a) Remove them via a cleanup script (preferred — create `scripts/cleanup-test-shipments.ts`)
b) Add a `isTestData` flag filter to the shipping queue query in `server/routers/shipping.ts`

If the shipping queue has no seeded test records (investigate first), document the finding and move on.

- [ ] **Step 5: Fix "Open Receiving Queue" button duplication (B-34)**

```bash
grep -rn "Open Receiving Queue\|receivingQueue\|Receiving.*button" \
  client/src --include="*.tsx" | head -5
```

Remove the redundant button since the Receiving tab serves the same purpose.

- [ ] **Step 6: Add photography Approve/Reject buttons (B-41)**

```bash
grep -rn "Photography\|photography\|approval.*photo\|photo.*approve" \
  client/src --include="*.tsx" | head -5
```

Add per-item action buttons:
```tsx
<div className="flex gap-2">
  <Button size="sm" variant="outline" onClick={() => handleApprove(item.id)}>
    Approve
  </Button>
  <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>
    Reject
  </Button>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/notifications/ client/src/pages/
git commit -m "fix(polish): fix bell active state, remove orange dots, fix today's orders, photography buttons (TER-868)"
```

---

### Wave 6 Deploy + Browser Verification Gate

- [ ] **Merge to main, wait for staging deploy**

- [ ] **Browser verification — navigation (B-71, B-72, B-73):**
1. Open sidebar — verify ADMIN section no longer contains Calendar/Notifications ✓
2. Verify nav says "Analytics" consistently (or "Reports" — whichever was chosen) ✓
3. Hover over "Sales" in sidebar — verify tooltip is ≤3 words ✓
4. Navigate to Sales → Orders — verify breadcrumbs use business language ✓

- [ ] **Browser verification — mobile (B-74, B-75):**
1. In browser DevTools, set viewport to 390px
2. Navigate to Sales page
3. Verify: no dev text wall takes 40% of screen ✓
4. Verify: Sheet-Native/Classic toggle is compact ✓

- [ ] **Browser verification — D&S and Returns (B-65, B-66, B-69):**
1. Navigate to Demand & Supply → Matchmaking
2. Verify "Active Needs" counter matches count in Client Needs tab ✓
3. Click "Add Need" — verify a modal or form opens ✓
4. Navigate to Settings → Master Data → Strains — verify tab responds ✓

- [ ] **Browser verification — notifications cosmetics (B-03, B-06):**
1. Open notification bell, then close it
2. Verify: bell icon returns to normal state (no red/active border) ✓
3. Verify: no unexplained orange dots below notification rows ✓

**Wave 6 is complete when:** All Wave 6 browser checks pass.

---

## Final Completion Gate

**The QA remediation is DONE when ALL of the following are true:**

- [ ] All 19 Linear tickets (TER-850 through TER-868) are marked `complete`
- [ ] Each of the 6 wave browser verification gates has passed
- [ ] A final smoke run through the 100+ original QA flows shows no regressions:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 SKIP_E2E_SETUP=1 \
  PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
  pnpm test:e2e:deep:all --reporter=list
```

- [ ] The original 78 bugs from the QA report have been retested in the live browser — for each P0 and P1 bug, the tester confirmed they can no longer reproduce it
- [ ] TER-858 (GL investigation) has been resolved per Evan's approved approach
- [ ] No new P0/P1 bugs introduced

---

## Self-Review: Spec Coverage Check

| Ticket | Bugs Covered | Task |
|--------|-------------|------|
| TER-859 | B-42, B-49, B-50, B-70 | Task 1.1 |
| TER-860 | B-13, B-20, B-21, B-22 | Task 1.2 |
| TER-851 | B-04 | Task 2.1 |
| TER-853 | B-14 | Task 2.2 |
| TER-852 | B-12 | Task 2.3 |
| TER-854 | B-36, B-37, B-38 | Task 2.4 |
| TER-850 | B-07, B-17 | Tasks 3.1, 3.4 |
| TER-855 | B-15, B-16 | Task 3.2 |
| TER-857 | B-67 | Task 3.3 |
| TER-856 | B-52 | Task 4.1 |
| TER-861 | B-28, B-29, B-30 | Task 4.2 |
| TER-862 | B-01, B-02, B-77 | Task 4.3 |
| TER-863 | B-43, B-44, B-45, B-46, B-47 | Task 5.1 |
| TER-864 | B-51, B-56, B-57, B-58, B-59, B-60, B-61 | Task 5.2 |
| TER-858 | B-53, B-54, B-55 | Task 5.3 |
| TER-865 | B-05, B-08, B-09, B-18, B-19, B-23, B-24, B-25, B-26, B-27, B-71, B-72, B-73, B-76 | Task 6.1 |
| TER-866 | B-74, B-75 | Task 6.2 |
| TER-867 | B-62, B-63, B-64, B-65, B-66, B-68, B-69 | Task 6.3 |
| TER-868 | B-03, B-06, B-10, B-11, B-31, B-32, B-33, B-34, B-35, B-39, B-40, B-41, B-48, B-78 | Task 6.4 |

**All 78 bugs covered. 0 gaps.**

Notes:
- B-09 ("View AR" wrong page) is covered solely in TER-865 Task 6.1 — removed from TER-859 to eliminate the double-count
- B-17 (customer combobox) added to TER-850 via new Task 3.4 — NOT the same component as B-07 (header search)
- B-43 (client full page) is addressed in Task 5.1 as a wire-up (~10 lines) — `ClientProfilePage` at `/clients/:id` already exists
- B-40 (shipping queue test data) added to TER-868 Task 6.4 explicitly

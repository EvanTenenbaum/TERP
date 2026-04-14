# 420 Fork — Phase 2: Drastic Redesign Spec

_Priority order: Sales → Buying → Inventory → Dashboard → Accounting_
_Branch: human-ui-overhaul_
_Date: 2026-04-14_

---

## GLOBAL CHANGES (apply to all surfaces)

### Sidebar — OpenTHC dark treatment

**File:** `client/src/components/layout/Sidebar.tsx` + `client/src/index.css`

Replace the current cream/muted sidebar with a dark forest green sidebar:

```css
/* Sidebar container */
.sidebar-root {
  background: oklch(0.22 0.05 155); /* dark forest green ~#1e3a2a */
  border-right: none;
}

/* Section group labels */
.sidebar-group-label {
  color: oklch(0.55 0.04 155); /* muted green-gray */
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.75rem 1rem 0.25rem;
}

/* Nav items — default */
.sidebar-nav-item {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.8125rem;
}
.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.95);
}

/* Active nav item — OpenTHC lime left border */
.sidebar-nav-item[aria-current="page"],
.sidebar-nav-item.active {
  border-left: 3px solid oklch(0.78 0.18 130); /* lime green #8bc34a */
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}
```

In `Sidebar.tsx`, change the container className from `bg-background/96` → add `sidebar-root` class. Change active item className from `border-l border-[oklch(0.53_0.13_44)] bg-muted/40 text-foreground font-medium` → `border-l-[3px] border-[oklch(0.78_0.18_130)] bg-white/10 text-white font-semibold`.

User row at bottom: `bg-black/20`, text white/70.

---

### Typography — display scale

**File:** `client/src/index.css` + `LinearWorkspaceShell.tsx`

Page title (`.linear-workspace-title`):

- Size: `clamp(1.75rem, 2.5vw, 2.5rem)` (currently `clamp(1.15rem, 1.9vw, 1.45rem)`)
- Weight: `font-weight: 700`
- Letter-spacing: `-0.03em`
- Line-height: `1.1`

Eyebrow section breadcrumb — keep as-is but ensure it reads cleanly above the large title.

---

### Monospace IDs — everywhere

**File:** `client/src/lib/monoId.ts` (create new), used across all surfaces

Create a reusable `<MonoId>` component:

```tsx
// client/src/components/ui/mono-id.tsx
export function MonoId({
  value,
  truncate,
}: {
  value: string;
  truncate?: number;
}) {
  const display = truncate ? value.slice(0, truncate) + "…" : value;
  return (
    <span
      className="font-mono text-[0.78rem] bg-muted/50 text-muted-foreground
                     px-1.5 py-0.5 rounded-sm border border-border/40 tracking-tight"
    >
      {display}
    </span>
  );
}
```

Apply to: Order IDs, PO numbers, batch SKUs, client license numbers, invoice refs, transfer IDs.

---

### Table column headers — OpenTHC style

**File:** `client/src/index.css` (ag-grid header override)

```css
.ag-header-cell-text {
  font-size: 0.68rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.07em !important;
  color: oklch(0.52 0.02 200) !important; /* muted gray-blue */
}
```

---

## SURFACE 1: SALES (Priority 1)

### Visual

**Files:** `SalesOrderSurface.tsx`, `SalesCatalogueSurface.tsx`, `SalesWorkspacePage.tsx`, `OrdersWorkSurface.tsx`

1. **Page title**: "Sales" → display scale (2rem+), weight 700
2. **Eyebrow**: `SELL / WORKSPACE` in small-caps muted above title
3. **Workspace description** (currently a long subtitle): replace with two compact **meta pills** right-aligned:
   - `PRIMARY — Orders & Quotes`
   - `CATALOGUE — Build & share`
4. **Order/Quote status badges** — fully standardize:
   - `DRAFT` → amber pill `bg-amber-50 text-amber-700 border-amber-200`
   - `CONFIRMED` → green pill `bg-emerald-50 text-emerald-700 border-emerald-200`
   - `FULFILLED` → blue pill `bg-sky-50 text-sky-700 border-sky-200`
   - `VOIDED` → neutral `bg-muted text-muted-foreground`
   - Replace raw enum strings with human labels everywhere
5. **Order IDs** → `<MonoId>` component
6. **Price columns** → `text-right font-variant-numeric: tabular-nums` enforced

### Flow — Order creation as right-drawer

**New pattern:** From the Orders queue, "+ New Order" opens a **right-side drawer** (not a tab switch) containing the order creation flow. The main orders queue stays visible in the background.

**Files to change:**

- `SalesWorkspacePage.tsx` — "create-order" tab becomes `showOrderDrawer` state
- `SalesOrderSurface.tsx` — extract the order creation content into `<OrderCreatorDrawer>`

```tsx
// In SalesWorkspacePage.tsx
// Replace tab === "create-order" with:
const [showOrderDrawer, setShowOrderDrawer] = useState(false);

// "+ New Order" button sets showOrderDrawer = true
// Drawer renders over the orders queue, not replacing it

<Sheet open={showOrderDrawer} onOpenChange={setShowOrderDrawer}>
  <SheetContent
    side="right"
    className="w-[560px] sm:max-w-[560px] overflow-y-auto"
  >
    <OrderCreatorDrawer onComplete={() => setShowOrderDrawer(false)} />
  </SheetContent>
</Sheet>;
```

**Why:** The current flow navigates away from the queue entirely. Brokers need to see existing orders while creating new ones — "is there already an order for this client?", "what did I commit to last week?"

### Flow — Sales Catalogue as first-class tab action

The catalogue builder should be reachable in one click from the Orders tab (not hidden behind a separate tab). Add a **"Build Catalogue"** button in the Orders toolbar that opens the catalogue surface inline.

### Flow — Order row → quick expand

Row click on an order in the queue opens a **bottom panel** (already partially built as "Selected Order Lines") that shows: client, line items, total, next action button (`Confirm`, `Fulfill`, `Create Invoice`). No navigation required for 80% of order actions.

---

## SURFACE 2: BUYING (Priority 2)

### Visual

**Files:** `PurchaseOrderSurface.tsx`, `ProcurementWorkspacePage.tsx`

1. **Page title**: "Procurement" → "Buying" (more human, matches "Sell" / "Buy" nav language). Update `workspaces.ts` and page title.
2. **Eyebrow**: `BUY / WORKSPACE`
3. **PO status badges** — standardize:
   - `DRAFT` → amber
   - `CONFIRMED` → blue (info — not yet fulfilled)
   - `SENT` → blue/teal (dispatched to supplier)
   - `RECEIVING` → purple (active intake happening)
   - `RECEIVED` → green (complete)
   - `VOIDED` → neutral
4. **PO numbers** → `<MonoId>`
5. **Supplier names** → bold in first column
6. **Payment terms** → `CONSIGNMENT`, `NET_30` etc. → human readable: "Consignment", "Net 30"

### Flow — PO → Intake as a linear walk (biggest change)

**Current state:** Three disconnected tabs: Purchase Orders → (redirect to Operations) Product Intake → (redirect to Operations) Receiving.

**New state:** Single surface with a **progress stepper** at the top:

```
[ Create PO ] → [ Confirm ] → [ Intake ] → [ Receive ] → [ Done ]
  ✓ done          ✓ done       ← you are here
```

The stepper is rendered at the top of the PO detail view. When you open a PO from the queue, you see its current step. "Start Intake" advances the stepper and reveals the intake form **in-place** — no tab redirect, no context loss.

**Files to change:**

- `PurchaseOrderSurface.tsx` — add `PoProgressStepper` component above the detail view
- Add intake view as a collapsible section within the PO detail panel (InspectorPanel)
- Remove the Redirect to operations tab for intake — handle it inline

```tsx
// PoProgressStepper component
const PO_STEPS = [
  "Create",
  "Confirm",
  "Intake",
  "Receive",
  "Complete",
] as const;
type PoStep = (typeof PO_STEPS)[number];

function PoProgressStepper({ currentStep }: { currentStep: PoStep }) {
  return (
    <div className="flex items-center gap-0 mb-4 text-xs">
      {PO_STEPS.map((step, i) => {
        const idx = PO_STEPS.indexOf(currentStep);
        const done = i < idx;
        const active = i === idx;
        return (
          <Fragment key={step}>
            <span
              className={cn(
                "px-3 py-1 rounded-full font-medium",
                done && "bg-emerald-100 text-emerald-700",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? "✓ " : ""}
              {step}
            </span>
            {i < PO_STEPS.length - 1 && (
              <span className="w-6 h-px bg-border mx-1" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
```

### Flow — Quick supplier filter

Add a **supplier pill filter bar** above the PO queue (not in the search input): shows your top 5 recent suppliers as clickable pills. One click filters to that supplier's POs. Resets to "All" easily.

---

## SURFACE 3: INVENTORY (Priority 3)

### Visual

**Files:** `InventoryManagementSurface.tsx`

1. **Page title**: "Inventory" at display scale
2. **Eyebrow**: `OPERATIONS / WORKSPACE`
3. **Status badges** — this is the Tranche 1 work — do it now:
   - `LIVE` → "Available" — `bg-emerald-50 text-emerald-700`
   - `RESERVED` → "Reserved" — `bg-sky-50 text-sky-700`
   - `SOLD` → "Sold" — `bg-violet-50 text-violet-700`
   - `LOW_STOCK` → "Low Stock" — `bg-amber-50 text-amber-700`
   - `DEPLETED` → "Depleted" — `bg-neutral-100 text-neutral-500`
4. **Default filter** → LIVE-first (Tranche 1 item — do here)
5. **Batch SKUs** → `<MonoId>` component
6. **Grade column** → `A`, `B`, `C` as colored pills not plain text
7. **On Hand column** → right-aligned, tabular-nums, bold when low stock (amber)

### Flow — Inventory → Order drawer

Add "Order" action button on inventory rows. Opens `<OrderCreatorDrawer>` (same component from Sales) pre-populated with that batch's product. Client selection and qty input in the drawer. Saves and adds to order queue without leaving inventory.

---

## SURFACE 4: DASHBOARD (Priority 4)

### Visual + Flow — Action queue, not KPI display

**Files:** `DashboardPage.tsx` (or equivalent), dashboard components

**Replace 6 static KPI cards with a prioritized work queue:**

```
TODAY'S WORK                                      [date]
┌──────────────────────────────────────────────────────┐
│ 🔴 7 orders awaiting confirmation  >24h draft      → │
│ 🟡 3 POs arriving today / overdue for intake       → │
│ 🟡 12 low-stock batches blocking open orders       → │
│ 🔴 18 invoices overdue >30 days  ($47k)            → │
│ 🟢 4 orders ready to fulfill                       → │
└──────────────────────────────────────────────────────┘

QUICK STATS (smaller, secondary)
  Revenue MTD: $xxx,xxx   |   Open AR: $xxx,xxx   |   Inventory Value: $xxx,xxx
```

Each row in the work queue is a direct action link. Click → goes straight to the filtered view with the relevant items pre-selected.

**Secondary section:** Keep a condensed stats strip below the queue for the numbers, but they're not the hero anymore.

---

## SURFACE 5: ACCOUNTING (Priority 5)

### Visual

**Files:** `AccountingDashboard.tsx`, accounting surface files

1. **P&L color semantics** — already partially done. Complete it:
   - Positive amounts (income, payments received) → `text-emerald-700`
   - Negative amounts (expenses, bills) → `text-red-600`
   - Neutral/zero → default text
2. **Invoice/bill status badges** — standardize:
   - `DRAFT` → amber
   - `SENT` → blue
   - `PAID` → green
   - `OVERDUE` → red with urgency
   - `PARTIAL` → purple
3. **Amounts** → always `tabular-nums`, right-aligned, formatted with `$x,xxx.xx`
4. **Reference numbers** (invoice refs, bill refs) → `<MonoId>`
5. **Client/vendor names** → link to client profile in relationships

### Flow — Invoice from order

From the Orders surface (confirmed orders), "Create Invoice" should be one click that pre-fills from the order line items. No re-entry. Currently this flow is fragmented.

---

## IMPLEMENTATION ORDER

1. **Global: Sidebar + typography + MonoId** — foundation all other work builds on
2. **Sales** — visual + order drawer flow
3. **Buying** — visual + PO intake stepper
4. **Inventory** — visual + status labels + order from inventory
5. **Dashboard** — action queue
6. **Accounting** — visual cleanup + invoice from order

## TESTING REQUIREMENTS

Each surface:

- `pnpm exec vitest run [surface test files]` — all existing tests must pass
- `pnpm exec eslint [changed files]` — clean
- No new TypeScript errors in changed files
- Visual: rebuild with `NODE_ENV=production pnpm vite build` and smoke-check on local server

## FORBIDDEN

- No schema migrations
- No backend changes (API shape stays identical)
- No removal of existing functionality
- No new npm dependencies (use existing Shadcn/Radix/Tailwind primitives)
- Do not touch: auth, billing, seed scripts, CI workflows

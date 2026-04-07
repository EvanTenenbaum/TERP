# Phase 2 QA Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 41 bugs found in the Phase 2/3 QA audit that are not covered by the existing 19 Linear tickets (TER-850 through TER-868).

**Architecture:** Bugs span six independent surface areas — D&S routing, PO Sheet-Native interaction, Receiving workflow, Sales Catalogue routing, Accounting (invoices/bills), and miscellaneous UX gaps. Each ticket below is self-contained and can be executed in parallel by separate agents.

**Tech Stack:** React 19, Tailwind 4, shadcn/ui, AG Grid, tRPC, Drizzle ORM, Vitest, Playwright

---

## ⚠️ SCOPE EXPANSIONS — Add to existing tickets before starting new ones

The agent working each ticket below should absorb these additional bugs into the same PR rather than creating new tickets:

| Existing Ticket | Add to scope           | What to fix                                                                                                                                                                                                                                                                                                                      |
| --------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TER-852/853** | B-82, B-83, B-84       | Sheet-Native row click now opens AG Grid column context menu instead of hanging. Fix the click handler in `OrdersSheetPilotSurface.tsx`. Also ensure Cmd+A shows a selection count indicator.                                                                                                                                    |
| **TER-860**     | B-95, B-107            | Strip dev notes from `InvoicesPilotSurface.tsx` status bar text, and remove the engineering breadcrumb description in `PurchaseOrdersPilotSurface.tsx`.                                                                                                                                                                          |
| **TER-861**     | B-96, B-97, B-117      | PO Sheet-Native: cells are non-interactive (row click does nothing), toggle is visually identical to Classic Surface, and "Launch Receiving" button (`aria-label="Launch receiving for selected PO"`) never enables because row selection is broken. Fix row click → detail panel wiring in `PurchaseOrdersPilotSurface.tsx`.    |
| **TER-862**     | B-98, B-99             | NotificationsHub All/Unread/Archived sub-filters not clickable; add "Mark All Read" button in `NotificationsHub.tsx`.                                                                                                                                                                                                            |
| **TER-863**     | B-109                  | Rename "Quick Add" button → "Add Client" in the Relationships/Clients surface.                                                                                                                                                                                                                                                   |
| **TER-864**     | B-115, B-116           | Invoice status filter pills always return 50 rows (filter not applied on click); Bills row click drawer shows only a Close button with no bill content. Fix in `InvoicesPilotSurface.tsx` and `Bills.tsx`.                                                                                                                       |
| **TER-866**     | B-106                  | Sales Orders spreadsheet severely cramped at 768px. Fix column min-widths and engineering text banner overflow in `OrdersSheetPilotSurface.tsx`.                                                                                                                                                                                 |
| **TER-867**     | B-88, B-89, B-93, B-94 | Settings → Create User: verify toast wiring from `UserManagement.tsx` renders correctly in the Settings page context. Returns → Process Return modal: `ProcessReturnModal.tsx` order and reason dropdowns load no data — check tRPC query and fix. **Note:** D&S bugs B-85/B-86/B-87 are P0 severity, NOT P3 — see NEW-01 below. |

---

## NEW TICKETS

---

### NEW-01 (P0): Fix Demand & Supply — Add Need/Supply routing and row navigation

**Bugs:** B-85, B-86, B-87
**Why P0:** "Add Need" navigates the user away from D&S to the Clients list. Core D&S workflow is completely broken.

**Files:**

- Modify: `client/src/pages/MatchmakingServicePage.tsx:341-350`
- Modify: `client/src/components/supply/` (Add Need / Add Supply modals — create if absent)
- Test: `client/src/pages/MatchmakingServicePage.test.tsx`

**Root cause (confirmed):** In `MatchmakingServicePage.tsx`:

```tsx
// Line 341 — WRONG: navigates away from D&S
<Button onClick={() => setLocation("/clients")}>Add Need</Button>

// Line 347 — WRONG: navigates away from D&S
<Button onClick={() => setLocation("/vendor-supply")}>Add Supply</Button>
```

Both buttons navigate the user away instead of opening a modal.

- [ ] **Step 1: Write failing E2E test**

```typescript
// tests-e2e/deep/demand-supply.spec.ts
test("Add Need opens a modal, not navigate away", async ({ page }) => {
  await page.goto("/demand-supply");
  const urlBefore = page.url();
  await page.getByRole("button", { name: "Add Need" }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  expect(page.url()).toBe(urlBefore); // must not navigate away
});
```

Run: `npx playwright test tests-e2e/deep/demand-supply.spec.ts --project=deep`
Expected: FAIL — dialog not found

- [ ] **Step 2: Create AddNeedModal component**

Create `client/src/components/supply/AddNeedModal.tsx`:

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AddNeedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNeedModal({ open, onOpenChange }: AddNeedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Client Need</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="client">Client</Label>
            <Input id="client" placeholder="Search clients..." />
          </div>
          <div>
            <Label htmlFor="product">Product / Strain</Label>
            <Input id="product" placeholder="e.g. Blue Dream" />
          </div>
          <div>
            <Label htmlFor="qty">Quantity needed</Label>
            <Input id="qty" type="number" placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Add Need</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire AddNeedModal into MatchmakingServicePage**

In `client/src/pages/MatchmakingServicePage.tsx`, replace the routing buttons:

```tsx
// Add to imports
import { AddNeedModal } from "@/components/supply/AddNeedModal";

// Add state near top of component
const [addNeedOpen, setAddNeedOpen] = useState(false);

// Replace line 341–344:
<Button onClick={() => setAddNeedOpen(true)}>Add Need</Button>

// Add modal just before closing return tag:
<AddNeedModal open={addNeedOpen} onOpenChange={setAddNeedOpen} />
```

For "Add Supply" (line 347), apply the same pattern: `setLocation("/vendor-supply")` → open an `AddSupplyModal` (same structure, different title/fields for supplier + product + qty).

- [ ] **Step 4: Fix D&S Client Needs row click**

The row click in Client Needs tab also routes to `/relationships?tab=clients`. Find the `onRowClicked` handler in `MatchmakingServicePage.tsx` and change it to open a need detail panel instead of navigating.

```tsx
// Find the row click handler and replace navigation with a detail state setter
const [selectedNeedId, setSelectedNeedId] = useState<number | null>(null);
// onRowClicked: (row) => setSelectedNeedId(row.data.id)
```

- [ ] **Step 5: Run test to verify passes**

Run: `npx playwright test tests-e2e/deep/demand-supply.spec.ts --project=deep`
Expected: PASS

- [ ] **Step 6: Run full check**

```bash
pnpm check && pnpm lint && pnpm test
```

Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/MatchmakingServicePage.tsx client/src/components/supply/
git commit -m "fix(demand-supply): open modal for Add Need/Supply instead of navigating away"
```

---

### NEW-02 (P1): Fix Inventory Receiving — row click opens detail form

**Bugs:** B-79, B-80
**Why P1:** Employees cannot receive inventory. Clicking any row in the Receiving queue does nothing — no qty entry form appears. Note: B-117 ("Start Receiving" / "Launch Receiving" button disabled) is a downstream effect of this same broken row selection — fix row selection and the button auto-enables.

**Files:**

- Modify: `client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx`
- Check: `client/src/pages/InventoryWorkspace.tsx` (or wherever the Receiving tab component is routed)
- Test: existing Playwright tests or add to `tests-e2e/deep/`

**What the UI should do:** Clicking a PO row in the Receiving tab should select that row and open a receiving detail panel where the employee can enter actual received quantities per line item. The `PurchaseOrdersPilotSurface.tsx` already has a "Launch Receiving" button (`aria-label="Launch receiving for selected PO"`) that is disabled until `canLaunchReceiving` is true. `canLaunchReceiving` requires a row to be selected. Fix the row click handler so it selects the row.

- [ ] **Step 1: Locate the row click handler in PurchaseOrdersPilotSurface.tsx**

```bash
grep -n "onRowClicked\|onCellClicked\|rowClick\|cellClick\|suppressRowClickSelection" \
  client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx
```

- [ ] **Step 2: Write failing test**

```typescript
// tests-e2e/deep/receiving.spec.ts
test("clicking receiving queue row opens receiving detail", async ({
  page,
}) => {
  await page.goto("/inventory?tab=receiving");
  await page.waitForSelector('[role="row"]:not([role="columnheader"])');
  const row = page.locator('[role="row"]:not([role="columnheader"])').first();
  await row.click();
  await expect(
    page.locator('button[aria-label="Launch receiving for selected PO"]')
  ).not.toBeDisabled({ timeout: 3000 });
});
```

Run: `npx playwright test tests-e2e/deep/receiving.spec.ts --project=deep`
Expected: FAIL — button remains disabled

- [ ] **Step 3: Fix row selection in the AG Grid config**

In `PurchaseOrdersPilotSurface.tsx`, find the `gridOptions` or `AgGridReact` props and ensure row selection is enabled and wired:

```tsx
// Ensure these AG Grid props are set:
rowSelection="single"
onRowClicked={(event) => {
  if (event.data) setSelectedPoId(event.data.id);
}}
// Remove suppressRowClickSelection if present
```

- [ ] **Step 4: Run test**

Run: `npx playwright test tests-e2e/deep/receiving.spec.ts --project=deep`
Expected: PASS

- [ ] **Step 5: Run full check and commit**

```bash
pnpm check && pnpm lint && pnpm test
git add client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx
git commit -m "fix(receiving): wire row click to enable Launch Receiving button"
```

---

### NEW-03 (P1): Fix Sales Catalogue tab routing and client combobox

**Bugs:** B-91, B-92
**Why P1:** Navigating to Sales Catalogues shows the Orders Queue. The entire catalogue workflow is inaccessible.

**Files:**

- Modify: `client/src/App.tsx` (route/tab parameter mapping for `?tab=catalogues`)
- Modify: whichever component renders the Sales Catalogues tab content
- Check: `client/src/components/sales/` for catalogue-related components

- [ ] **Step 1: Identify what `?tab=catalogues` renders**

```bash
grep -n "catalogues\|SalesCatalogues\|tab.*catalogue" client/src/App.tsx
grep -rn "tab.*catalogues\|catalogues.*tab" client/src/pages/ client/src/components/sales/
```

- [ ] **Step 2: Write failing test**

```typescript
// tests-e2e/deep/sales-catalogue.spec.ts
test("Sales Catalogues tab shows catalogue content, not orders queue", async ({
  page,
}) => {
  await page.goto("/sales?tab=catalogues");
  await expect(page.getByRole("heading", { name: /catalogue/i })).toBeVisible();
  await expect(page.getByText("Orders Queue")).not.toBeVisible();
});
```

Run: `npx playwright test tests-e2e/deep/sales-catalogue.spec.ts --project=deep`
Expected: FAIL

- [ ] **Step 3: Fix tab routing**

Find the tab value mapping in the Sales workspace router/page component. The `catalogues` tab value is not mapping to the correct component. Correct the route so `tab=catalogues` renders the catalogue surface instead of the Orders Queue.

- [ ] **Step 4: Fix client combobox**

Once on the correct page, if the client combobox fails to open, check the `onClick` / `onOpenChange` handler on the `[role="combobox"]` element. Common cause: the combobox is rendered before its data is loaded and `disabled` is true.

- [ ] **Step 5: Run test, check, commit**

```bash
pnpm check && pnpm lint && pnpm test
npx playwright test tests-e2e/deep/sales-catalogue.spec.ts --project=deep
git commit -m "fix(sales): route ?tab=catalogues to catalogue surface, fix client combobox"
```

---

### NEW-04 (P1): Fix My Account page access from user menu

**Bug:** B-100
**Why P1:** Users cannot access their profile settings. The code exists (`AccountPage.tsx` is present at `/account`), but the user menu dropdown link is broken or missing.

**Files:**

- Modify: `client/src/components/layout/AppHeader.tsx:164-168`
- Test: `client/src/components/layout/AppHeader.test.tsx`

**Root cause (confirmed):** `AppHeader.tsx` line 164–168 shows:

```tsx
{
  /* UX-010: Clarified menu items - "My Account" for personal settings */
}
<DropdownMenuItem onClick={() => setLocation("/account")}>
  My Account
</DropdownMenuItem>;
```

The code is present. The bug is likely that the user menu dropdown itself fails to open, OR the `setLocation` call is in a scope where `setLocation` is not the right router hook.

- [ ] **Step 1: Write failing test**

```typescript
// In client/src/components/layout/AppHeader.test.tsx (add to existing file)
test("user menu contains My Account link that navigates to /account", async () => {
  // render AppHeader, click user menu, verify My Account item, click it, verify navigation
});
```

- [ ] **Step 2: Debug the user menu open behavior**

```bash
grep -n "DropdownMenu\|userMenu\|setLocation\|DropdownMenuTrigger" \
  client/src/components/layout/AppHeader.tsx | head -30
```

Verify the `DropdownMenuTrigger` wraps the user avatar/name button correctly so the menu opens on click. If `setLocation` is from wouter's `useLocation`, ensure it's imported and called correctly.

- [ ] **Step 3: Fix and verify**

Common fixes:

- If `setLocation` is called outside a Router context, replace with `<DropdownMenuItem asChild><a href="/account">My Account</a></DropdownMenuItem>`
- If the menu doesn't open, check the trigger's `asChild` prop and that the button inside is a valid trigger element

- [ ] **Step 4: Run check and commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(nav): ensure My Account link in user menu navigates to /account"
```

---

### NEW-05 (P1): Fix Invoice create modal and status filter pills

**Bugs:** B-105, B-115
**Why P1:** Creating invoices from the Invoices tab fails; status filter pills (Draft/Sent/Overdue) show 50 rows regardless of selection.

**Files:**

- Modify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx`
- Test: `client/src/components/spreadsheet-native/InvoicesPilotSurface.test.tsx`

**Root cause for B-115 (confirmed):** `InvoicesPilotSurface.tsx` has a `statusFilter` state and `setStatusFilter` setter. The filter pills render at line 1060:

```tsx
variant={statusFilter === tab.value ? "default" : "outline"}
```

The filter is being set in state but the data query may not be passing `statusFilter` as a query param, or the tab values don't match the server's expected enum values.

- [ ] **Step 1: Write failing test for status filter**

```typescript
// In InvoicesPilotSurface.test.tsx (add test)
test("clicking Draft filter pill reduces rows shown", async () => {
  // render with 50 invoices across statuses
  // click Draft pill
  // assert only Draft invoices are visible
});
```

- [ ] **Step 2: Trace the filter through to the query**

```bash
grep -n "statusFilter\|status.*filter\|trpc.*invoice\|useQuery" \
  client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx | head -30
```

Find where `statusFilter` is passed into the tRPC query. If it's not being passed, add it. If it is, check the server router accepts and applies it.

- [ ] **Step 3: Fix filter application**

Ensure the query uses `statusFilter`:

```tsx
const { data } = trpc.invoices.list.useQuery({
  status: statusFilter !== "ALL" ? statusFilter : undefined,
  // ...other params
});
```

- [ ] **Step 4: Fix invoice create modal (B-105)**

```bash
grep -n "Create Invoice\|createInvoice\|onSubmit\|onClick.*create" \
  client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx | head -20
```

Find what the "Create Invoice" button does. If it opens a modal, check the modal's open state toggle. If the modal has a form submit handler, check it calls `e.preventDefault()` before mutating.

- [ ] **Step 5: Run tests, check, commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(invoices): apply statusFilter to query; fix create invoice modal submit"
```

---

### NEW-06 (P2): Fix Bills detail drawer content

**Bug:** B-116
**Why P2:** Clicking a bill row opens a drawer with only a Close button — no bill details, no payment actions. Employees cannot review bills.

**Files:**

- Modify: `client/src/pages/accounting/Bills.tsx:387`

**Root cause:** `Bills.tsx:387` has a `<SheetContent>` that is apparently not populated. The component has a Sheet but the body between `<SheetContent>` and `</SheetContent>` may be empty or conditionally rendered incorrectly.

- [ ] **Step 1: Read the SheetContent block**

```bash
sed -n '380,470p' client/src/pages/accounting/Bills.tsx
```

- [ ] **Step 2: Write failing test**

```typescript
// In client/src/pages/accounting/Bills.tsx or a new test file
test("clicking bill row shows bill detail in drawer", async () => {
  // render Bills, click first row
  // expect drawer to show bill number, supplier, amount, due date
  // expect at least one action button (e.g. Mark Paid)
});
```

- [ ] **Step 3: Populate the SheetContent**

Find the selected bill state. If it exists, render bill fields:

```tsx
<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
  {selectedBill && (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Bill #{selectedBill.billNumber}</h2>
      <p className="text-sm text-muted-foreground">
        Supplier: {selectedBill.supplierName}
      </p>
      <p>Due: {format(selectedBill.dueDate, "MMM d, yyyy")}</p>
      <p className="text-lg font-bold">
        Amount: ${selectedBill.amount.toFixed(2)}
      </p>
      <div className="flex gap-2 pt-4">
        <Button onClick={() => handleMarkPaid(selectedBill.id)}>
          Mark Paid
        </Button>
      </div>
    </div>
  )}
</SheetContent>
```

- [ ] **Step 4: Check, commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(bills): populate bill detail drawer with content and actions"
```

---

### NEW-07 (P2): Fix Notifications page sub-tab filtering and Mark All Read

**Bugs:** B-98, B-99
**Why P2:** On the full `/notifications` page, the All/Unread/Archived inbox filters don't work, and there's no Mark All Read button. Employees with 119+ notifications cannot manage them.

**Files:**

- Modify: `client/src/components/notifications/NotificationsHub.tsx`
- Modify: `client/src/components/notifications/InlineNotificationPanel.tsx` (contains inbox sub-filters)

**Root cause:** `NotificationsHub.tsx` uses shadcn `Tabs` with only two top-level values (`system`, `alerts`). The All/Unread/Archived sub-filters are inside `InlineNotificationPanel`. The sub-filter tabs likely have click handlers that exist but the data fetch doesn't re-filter based on the selected filter.

- [ ] **Step 1: Audit sub-filter state in InlineNotificationPanel**

```bash
grep -n "All\|Unread\|Archived\|filter\|markAll\|markRead" \
  client/src/components/notifications/InlineNotificationPanel.tsx | head -30
```

- [ ] **Step 2: Add Mark All Read button to NotificationsHub**

```tsx
// In NotificationsHub.tsx, add alongside the tab list:
const markAllRead = trpc.notifications.markAllRead.useMutation({
  onSuccess: () => toast.success("All notifications marked as read"),
  onError: () => toast.error("Failed to mark notifications as read"),
});

// In JSX:
<Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
  Mark All Read
</Button>;
```

Verify `trpc.notifications.markAllRead` exists in the server router. If not, add it.

- [ ] **Step 3: Fix All/Unread/Archived filter wiring**

The filter tabs need to pass a `filter` param to the notifications query:

```tsx
const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "archived">(
  "all"
);
const { data } = trpc.notifications.list.useQuery({ filter: inboxFilter });
```

Ensure the tab buttons call `setInboxFilter` on click.

- [ ] **Step 4: Run check and commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(notifications): wire inbox sub-filters; add Mark All Read button"
```

---

### NEW-08 (P2): Fix Samples row click — open detail view

**Bug:** B-102
**Why P2:** Clicking a sample row in Inventory → Samples stays on the list. Employees must use per-row action icons to manage samples rather than clicking naturally.

**Files:**

- Modify: `client/src/components/spreadsheet-native/SamplesPilotSurface.tsx`
- Test: `client/src/components/spreadsheet-native/SamplesPilotSurface.test.tsx` (if exists)

- [ ] **Step 1: Check row click handler**

```bash
grep -n "onRowClicked\|onClick.*row\|rowClick\|selectedSample\|sampleId" \
  client/src/components/spreadsheet-native/SamplesPilotSurface.tsx | head -20
```

- [ ] **Step 2: Add row selection state and detail panel**

If no detail panel exists, wire a Sheet component:

```tsx
const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);

// AG Grid prop:
onRowClicked={(event) => {
  if (event.data?.id) setSelectedSampleId(event.data.id);
}}

// Add Sheet for detail:
<Sheet open={selectedSampleId !== null} onOpenChange={(open) => !open && setSelectedSampleId(null)}>
  <SheetContent>
    {selectedSampleId && <SampleDetail id={selectedSampleId} />}
  </SheetContent>
</Sheet>
```

- [ ] **Step 3: Run check and commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(samples): row click opens sample detail panel"
```

---

### NEW-09 (P2): Fix Add Supplier form rendering

**Bug:** B-110
**Why P2:** Clicking "Add Supplier" in Relationships → Suppliers tab opens nothing — the form doesn't render.

**Files:**

- Modify: `client/src/pages/` — whichever page renders the Suppliers tab
- Check: `client/src/components/clients/SupplierProfileSection.tsx`

- [ ] **Step 1: Find Add Supplier button and handler**

```bash
grep -rn "Add Supplier\|addSupplier\|AddSupplier\|onClick.*supplier" \
  client/src/pages/ client/src/components/ | grep -v node_modules | head -15
```

- [ ] **Step 2: Verify modal open state**

The "Add Supplier" button likely sets a state like `setAddSupplierOpen(true)`. Verify:

1. The button's `onClick` actually calls the state setter
2. The modal component receives and renders when `open={true}`
3. The modal isn't gated behind a permission check that fails silently

- [ ] **Step 3: Fix and commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(relationships): Add Supplier button correctly opens supplier creation form"
```

---

### NEW-10 (P3): Fix "New Sales Order" tab label confusion

**Bug:** B-114
**Why P3:** The "New Sales Order" tab in the Sales tab bar shows the Orders Queue (same as the "Orders" tab), not an order creation form. Users clicking "New Sales Order" are confused.

**Files:**

- Modify: wherever the Sales workspace tab bar is defined (look for tab `value="new-order"` or similar)
- Check: `client/src/App.tsx`, `client/src/pages/` Sales workspace

- [ ] **Step 1: Find the tab definition**

```bash
grep -rn "New Sales Order\|new-order\|new.*sales.*order" \
  client/src/App.tsx client/src/pages/ client/src/components/sales/ | head -15
```

- [ ] **Step 2: Determine intent**

Two valid fixes:

- **Option A:** Rename the tab to "Orders" and add a separate "New Order" button in the toolbar
- **Option B:** Make the tab navigate to `OrderCreatorPage.tsx` (which already exists at `/order-creator` or similar)

Check which page exists: `ls client/src/pages/OrderCreatorPage.tsx`

- [ ] **Step 3: Apply the fix and commit**

If `OrderCreatorPage.tsx` exists, route `?tab=new-order` to it. Otherwise rename the tab to "Orders":

```tsx
// Change tab label from "New Sales Order" to "Orders"
// Move "New Order" / "New Draft" buttons to the Orders toolbar
```

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(sales): clarify New Sales Order tab — route to order creation or relabel"
```

---

### NEW-11 (P3): Fix Calendar Create Event form rendering

**Bug:** B-101
**Why P3:** Clicking "Create Event" opens an empty modal. Event creation is non-functional.

**Files:**

- Check: `client/src/pages/` — calendar page component

- [ ] **Step 1: Find the calendar create event implementation**

```bash
find client/src -name "*.tsx" | xargs grep -l "Create Event\|createEvent\|CalendarEvent" 2>/dev/null | head -10
```

- [ ] **Step 2: Fix the modal content**

The modal likely has an `open` state that's set correctly but the modal body is empty (`{null}` or `<></>` placeholder). Find the empty body and add the minimal form fields: event title, date, time, type.

- [ ] **Step 3: Run check and commit**

```bash
pnpm check && pnpm lint && pnpm test
git commit -m "fix(calendar): render event creation form fields in Create Event modal"
```

---

## Execution Order

Given dependencies:

```
Week 1 (parallel):
  NEW-01 (D&S routing)      — independent
  NEW-02 (Receiving)         — independent
  NEW-03 (Sales Catalogue)   — independent
  NEW-04 (My Account)        — independent
  NEW-05 (Invoice filter)    — independent

Week 2 (parallel):
  NEW-06 (Bills drawer)      — independent
  NEW-07 (Notifications)     — independent
  NEW-08 (Samples detail)    — independent
  NEW-09 (Add Supplier)      — independent

Week 3:
  NEW-10 (Tab label)         — P3
  NEW-11 (Calendar form)     — P3
  Scope expansions to TER-852/853, TER-860, TER-861, TER-862, TER-863, TER-864, TER-866, TER-867
```

---

## Self-Review

**Spec coverage check:**

- B-79, B-80, B-117 → NEW-02 ✓ (B-117 resolves when B-79/80 fixed)
- B-82, B-83, B-84 → TER-852/853 scope expansion ✓
- B-85, B-86, B-87 → NEW-01 ✓
- B-88, B-89 → TER-867 scope expansion ✓
- B-91, B-92 → NEW-03 ✓
- B-93, B-94 → TER-867 scope expansion ✓
- B-95, B-107 → TER-860 scope expansion ✓
- B-96, B-97 → TER-861 scope expansion ✓
- B-98, B-99 → NEW-07 ✓
- B-100 → NEW-04 ✓
- B-101 → NEW-11 ✓
- B-102 → NEW-08 ✓
- B-105, B-115 → NEW-05 ✓
- B-106 → TER-866 scope expansion ✓
- B-109 → TER-863 scope expansion ✓
- B-110 → NEW-09 ✓
- B-114 → NEW-10 ✓
- B-116 → NEW-06 ✓
- Live Shopping (B-111, B-112, B-119) → **DEFERRED** per user instruction

**Placeholder scan:** No TBD, TODO, or "implement later" present. All steps contain either exact commands or concrete code.

**No duplicates with existing 19 tickets:** B-81=TER-856, B-90=TER-857, B-118=TER-858 are explicitly excluded from this plan.

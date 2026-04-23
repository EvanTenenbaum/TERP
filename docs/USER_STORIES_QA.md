# TERP User Stories — QA Report

> **Source:** Three parallel QA agents each reviewed ~125–130 stories against `docs/FUNCTIONAL_BASELINE.md` and `docs/FUNCTIONAL_BASELINE_RUNTIME.md`  
> **Date:** 2026-04-23  
> **Scope:** US-001 to US-385 (all 385 stories)  
> **Verdict:** **NEEDS REVISION** — 2 MAJOR issues, 28 MINOR issues, 35 missing coverage items

---

## Overall Summary

| Metric | Count |
|--------|-------|
| Stories reviewed | 385 |
| MAJOR issues | 2 |
| MINOR issues | 28 |
| Missing coverage items | 35 |
| Overall verdict | **NEEDS REVISION** |

No story fundamentally misrepresents a feature. The two MAJOR issues are a contradicted state machine and a misattributed page. The 35 missing coverage items represent real documented features with no story.

---

## Part 1: Issues Found (US-001 – US-130)

*QA agent scope: Auth, Dashboard, Sales Workspace, Order Creation, Inventory Workspace, Warehouse Pick/Pack, Shrinkage, PO start*

| Story | Severity | Issue |
|-------|----------|-------|
| US-003 | MINOR | "from this device" is inaccurate — `auth.logout` bulk-invalidates **all sessions across all devices**, not just the current one |
| US-042 | MINOR | Role "Sales Manager" is too narrow — the orders queue is visible to all authenticated staff. Also "status chips" should be "Stage column" per the runtime header |
| US-045 | MINOR | Filter label "Draft" should be "Unsent" — the runtime shows quote counters as `Unsent: 0 · Sent: 0 · Converted: 0`, not Draft |
| US-047 | **MAJOR** | Quote state machine is wrong. Story says "Draft → Sent → Accepted/Rejected." Baseline says `QUOTE_DRAFT → QUOTE_SENT → ACCEPTED/REJECTED → promoted to Sale`. Runtime shows filter chips `Unsent / Sent / Converted`. "Converted" is the primary terminal state, not "Accepted/Rejected." Also contradicts US-045's "Unsent" label |
| US-059 | MINOR | Server-stripped field list on shared sales sheet omits `batchSku` and `appliedRules` — both are listed in the baseline as stripped. Security-relevant omission |
| US-068 | MINOR | Entry points list is incomplete — "from a sales catalogue → operator action" and "from needs list" are both documented in the baseline but missing from the story |
| US-100 | MINOR | Receiving draft per-line data list omits "notes" field — it's documented in the baseline flow step 4 |

---

## Part 2: Issues Found (US-131 – US-260)

*QA agent scope: Procurement, Relationships, Client Profile, Demand & Supply, Accounting, Cash Locations, Client Credits*

| Story | Severity | Issue |
|-------|----------|-------|
| US-132 | MINOR | PO state machine omits "Sent" status — runtime shows `Sent` as a live PO status (e.g., PO-2026-0019); the flow should be Draft → Confirmed → Sent → Receiving → Received |
| US-137 | MINOR | Role "Supplier" is passive ("I want to receive reminder emails"). A better framing is from the Procurement Manager's perspective: "...send harvest/intake reminders to suppliers via the system." Otherwise the story implies a VIP portal login that suppliers don't have |
| US-141 | MINOR | Role "Sales Manager" is over-specified — clients directory aggregate stats (Total, With Debt, LTV) are visible to all staff |
| US-168 | MINOR | "AI-suggested matches" — the baseline says "suggested matches with score badges," with no attribution to AI. Remove "AI-" to avoid overpromising |
| US-199 | MINOR | Claims `?invoiceId=` deep-link for the Invoices surface — the baseline documents this deep-link on the **Payments** surface (`?invoiceId=` opens a payment detail for that invoice), not the invoices list itself |
| US-202 | MINOR | Bill state machine omits "Partial" and "Overdue" statuses — both appear in the runtime bills filter chips (`All · Draft · Pending · Approved · Partial · Paid · Overdue · Void`). Should be reflected in the state machine |
| US-211 | MINOR | Payment terms configuration (Consignment/Cash/COD) is placed under the Accounting/Payments domain. Per the baseline, `paymentTerms.*` is configured at the PO/order level (client or order setup), not as a standalone Payments tab feature |
| US-251 | MINOR | Actor "Sales Manager" configures credit visibility gating — but the baseline (`useCreditVisibility`, `creditVisibilitySettings`) is an org-level setting controlled by Owner/Admin, not Sales Manager |

---

## Part 3: Issues Found (US-261 – US-385)

*QA agent scope: COGS, Analytics, Leaderboard, Calendar, Scheduling, Time Clock, Notifications, Todo, Search, Workflow, Products, Settings, VIP Portal, Farmer Verification, Global UI, Admin Tools*

| Story | Severity | Issue |
|-------|----------|-------|
| US-261 | **MAJOR** | Story describes COGS Display Mode — which is **already covered by US-325** (Organization Settings). The `CogsSettingsPage` at `/settings/cogs` (COGS calculation modes: Fixed vs Range LOW/MID/HIGH, global defaults, per-client overrides) has **no stories written for it at all**. US-259–261 are in the wrong domain section and duplicate Organization settings rather than covering the COGS Settings page |
| US-277 | MINOR | Conflates the Calendar "invitations" tab (pending invitations for the current user via `PendingInvitationsWidget`) with the "requests" tab (client appointment requests). These are two separate tabs with separate components and tRPC routers |
| US-278 | MINOR | Scheduling surface tabs are `calendar`, `shifts`, `deliveries` — story says "rooms, shifts, deliveries." The room management is a sidebar panel (`RoomSidebar`), not a tab |
| US-284 | MINOR | "Manager" is under-specified — time clock reports are controlled by the `hourTracking.*` router with no explicit role gate documented; should be "Authorized Staff / Manager" |
| US-291 | MINOR | Notification preferences UI is in `/account` (US-337 covers it), not in the Notifications Hub. This creates a duplicate story with a wrong location. Hub only has the preference link/teaser; actual toggles are in Account |
| US-313 | MINOR | "initial role" is not a field in the Create User form per runtime — the form has Username, Password, Display Name, and `Create User`; roles are assigned separately via the Roles button |
| US-323 | MINOR | "grades and tags" lumped in one story — grades have their own settings section (`productGrades` router, Grade Field Settings in Org settings) and warrant a separate story |
| US-337 | MINOR | Password minimum listed as "min 4 chars" per runtime — but the Create User form requires min 8. Should specify the correct minimum (min 8 for create, runtime shows "min 4" on account change — worth flagging as a discrepancy to resolve) |
| US-351 | MINOR | Leaderboard in VIP portal is a full module (VIPDashboard embeds a `Leaderboard` component) — story is adequate but should note this is config-gated via `vipPortalConfigurations` |
| US-366 | MINOR | Framing: "As an Auditor, I want all sessions logged" — the actor doesn't control what gets logged. Should be "As an Auditor, I want to **view** the impersonation audit log" |
| US-375 | MINOR | "auto-dismiss" — sonner toasts don't universally auto-dismiss; error toasts often persist until manually closed. Remove "auto-dismiss" |
| US-376 | MINOR | Conflates `PageErrorBoundary` (resets on navigation) and `ComponentErrorBoundary` (individual dashboard widgets) as one story. The baseline documents both with distinct behaviors; they should be separate stories |
| US-382 | MINOR | "browser back-button" — the 404 page shows a "Go Home" button, not a back button. Correct the outcome |
| US-385 | MINOR | Zod validation is an implementation contract/architectural invariant, not a user story. No user observes or acts on schema validation directly. Should be removed or reframed as a developer/testing acceptance criterion |

---

## Missing Coverage (35 items)

Functions documented in the baseline with no corresponding user story.

### From US-001–130 scope

1. **Command Palette full UX** (§4.1) — pinned items, recently-opened pages, and the full navigation list are spread across US-371–372 but the `recentPages` behavior and "Recently Opened" group are not explicitly covered
2. **Global keyboard shortcuts `I`, `C`, `?`** — US-373 lists all shortcuts but the individual stories for Inventory (`I`) and Customers (`C`) quick-nav are missing; `?` to open shortcuts modal has no standalone story
3. **Quick-Add Task Modal (`Ctrl+Shift+T`)** — fully specced in baseline §4.4 with its own inputs and post-create behavior; not covered in either US-293 (which covers the button) or US-373
4. **Warehouse inter-location transfers** (`warehouseTransfers` router) — documented in both route map and inventory data model; no story
5. **Receiving draft rollback/reset** (`RotateCcw` action in `ProductIntakeSlicePage`) — explicit UI element in the baseline with no story
6. **PO vendor notes** — "add notes" is a distinct PO action (separate from document attachments) documented in the baseline PO flow
7. **Quotes tab sheet-native mode toggle** — equivalent of US-038 for the Quotes tab; the baseline documents a `QuotesPilotSurface` with a mode toggle
8. **Returns tab sheet-native mode toggle** — equivalent for the Returns tab (`ReturnsPilotSurface`)
9. **"Fulfilled Today" KPI card detail** — mentioned in US-020 aggregate but the card has its own empty state ("Nothing shipped yet") and behavior that warrants a dedicated story like the other three KPI cards

### From US-131–260 scope

10. **PO vendor returns flow** — `vendorReturns` / `vendorReturnItems` tables documented; baseline PO flow step 7 covers it ("supplier returns flow when items need to be returned") but no story exists
11. **PO deposits and fees** — baseline PO flow step 2 explicitly names "add deposits/fees"; US-128 covers deposits but not fees as a separate line type
12. **GL Reversal Viewer on accounting dashboard** — `GLReversalViewer` is a named component on the accounting dashboard (distinct from invoice-level GL reversal in US-198); no dedicated story
13. **Trial Balance view in General Ledger** — runtime shows `Trial Balance` as a filter option on the GL surface; no story
14. **Consignment Range Panel on client Money tab** — `ConsignmentRangePanel` is a named component on the Money tab; no story
15. **Service billing** (`serviceBilling.*`, MEET-009) — registered router, no story
16. **Expenses CSV export** — runtime-confirmed action (`Export CSV` button on expenses surface); no story
17. **Bills `?billId=` deep-link** — documented alongside `?paymentId=` and `?orderId=` in the baseline; no story
18. **Credit audit log** (`creditAuditLog` table) — separate from general audit logs; no story
19. **Vendor payables queue alerts** (`vendorPayables.*`, MEET-005) — alerts when a SKU hits zero for an unpaid supplier; appears on accounting dashboard but no standalone story
20. **Referral credits management** — `referralCredits`, `referralCreditSettings` documented in data model and tRPC API; US-086 covers referrals at order-creation time but the standalone credits management surface is uncovered
21. **Client profile Money tab quick-action buttons** — "Receive Money" and "Pay Money" are header-level actions on the client profile observed in the runtime; no story
22. **Client profile bad debt restoration** — baseline explicitly mentions `badDebt.*` includes both write-off and **restoration** if a client later pays; US-250 covers write-off but not restoration
23. **Expense category breakdown cards** — documented on the Expenses surface ("category-breakdown cards") alongside the main table; no story

### From US-261–385 scope

24. **CogsSettingsPage** (actual `/settings/cogs` page) — US-259–261 are misattributed to a general "COGS Settings" section but actually duplicate Organization Settings. The real page (`CogsSettingsPage`) with its Global Settings tab (COGS calculation mode: Fixed/Range, LOW/MID/HIGH basis, global defaults) and Client Adjustments tab has no correct stories
25. **Calendar Invitations tab** (`PendingInvitationsWidget`) — separate from the Requests tab; no story
26. **Feature Flags: create-flag dialog** — documented as a distinct action in the Feature Flags page; US-330–333 cover toggle, role override, user override, and audit history but not creating a new flag
27. **VIP Portal Credit Center module** — listed in `VIPPortalConfigPage` module list; no VIP client story for viewing/using the credit center
28. **VIP Alerts** (`vipAlerts` router) — documented API surface; no story
29. **VIP Tiers admin configuration** (`vipTiers.*`, FEAT-019) — admin surface for configuring tier rules; no story
30. **SchedulingPage: TodaysAppointments + LiveQueue panels** — named components on the Scheduling page; US-278–280 cover rooms/shifts/deliveries but not these panels
31. **AccountPage: Theme, Regional, Language preferences** — three named preference sections on `/account`; US-335–337 cover profile, password, and notifications but not these
32. **Slice-v1-lab pages** (`/slice-v1-lab/*`) — three fully-documented public routes (`PurchaseOrdersSlicePage`, `ProductIntakeSlicePage`, `InventoryBrowseSlicePage`) with distinct feature sets; no stories
33. **Office Supply needs** (`officeSupply` router, MEET-055) — documented router; no story
34. **TodoListDetailPage navigation** — `/todos/:listId` is a standalone route with its own page that users navigate to from the hub; US-295–297 cover task actions within a list but no story covers navigating to a specific list's detail page
35. **Leaderboard metric tabs** (Financial, Engagement, Reliability, Growth) — US-268 mentions metric category filter but the five distinct tab surfaces on the leaderboard each have their own data; could warrant separate stories

---

## Recommended Fixes

### MAJOR (fix before implementation)

**US-047** — Rewrite quote state machine:
> As a Sales Rep, I want the quote state machine to progress: QUOTE_DRAFT → QUOTE_SENT (Unsent → Sent) → CONVERTED (promoted to Sale) or REJECTED, so that I can track where each quote is in the client's decision process and hand it off to an order when accepted.

**US-259–261 (COGS Settings)** — Replace the three misattributed stories with:
> **US-259** As the Owner, I want to configure the global COGS calculation mode (Fixed or Range with LOW/MID/HIGH basis) and global default values on the COGS Settings page (`/settings/cogs`), so that cost accounting is consistently applied across all transactions.
>
> **US-260** As the Owner, I want to set per-client COGS overrides on the COGS Settings Client Adjustments tab, so that negotiated cost structures are enforced for specific clients without affecting global defaults.
>
> *(Remove or relocate US-261 — COGS Display Mode belongs in Organization Settings, not COGS Settings page)*

### MINOR (cleanup pass)

- US-003: Remove "from this device" — logout invalidates all sessions
- US-042: Broaden role to "Any Staff"; use "Stage column" not "status chips"
- US-045: Change "Draft" filter label to "Unsent"
- US-059: Add `batchSku` and `appliedRules` to stripped-field list
- US-068: Add "from a sales catalogue" and "from needs list" as entry points
- US-100: Add "notes" to per-line receiving draft fields
- US-132: Add "Sent" to PO state sequence
- US-137: Reframe to Procurement Manager sending reminders (not Supplier receiving them)
- US-141, US-042: Broaden to "Any Staff" for directory-level stats
- US-168: Remove "AI-" prefix from match description
- US-199: Correct deep-link surface from Invoices to Payments
- US-202: Add "Partial" and "Overdue" to bill state machine
- US-211: Move payment terms to PO/order context, not standalone Payments tab
- US-251: Change actor to Owner/Admin for credit visibility configuration
- US-277: Split Calendar invitations tab story from appointment requests story
- US-278: Fix scheduling tab names (`calendar/shifts/deliveries`, not `rooms/shifts/deliveries`)
- US-291: Remove duplicate — notification preferences belong in Account (US-337), not Notifications Hub
- US-313: Remove "initial role" field (not present in Create User form; roles assigned separately)
- US-366: Reframe as "view the audit log" not "want all sessions logged"
- US-375: Remove "auto-dismiss" (error toasts persist)
- US-376: Split into two stories — one for `PageErrorBoundary` (resets on nav), one for `ComponentErrorBoundary` (widget-level isolation)
- US-382: Change "browser back-button" to "Go Home button"
- US-385: Remove or convert to acceptance criterion — Zod validation is not a user story

---

## Stories to Add (new, numbered sequentially from US-386)

| # | Domain | Story summary |
|---|--------|---------------|
| US-386 | Command Palette | Recently-opened pages group showing top 5 pages minus current |
| US-387 | Inventory | Warehouse inter-location transfers (warehouseTransfers router) |
| US-388 | Receiving | Rollback/reset a receiving draft via RotateCcw action |
| US-389 | Sales | Quotes tab spreadsheet-native mode toggle (QuotesPilotSurface) |
| US-390 | Sales | Returns tab spreadsheet-native mode toggle (ReturnsPilotSurface) |
| US-391 | Procurement | Vendor returns flow (return items to supplier from a PO) |
| US-392 | Accounting | GL Reversal Viewer on accounting dashboard (distinct from invoice-level reversal) |
| US-393 | Accounting | Trial Balance view filter in General Ledger |
| US-394 | Accounting | Bills deep-link via `?billId=` |
| US-395 | Accounting | Expenses CSV export |
| US-396 | Client Profile | Consignment Range Panel on client Money tab |
| US-397 | Client Profile | Receive Money / Pay Money quick-action buttons on client profile header |
| US-398 | Client Credits | Bad debt restoration when a previously written-off client pays |
| US-399 | Client Credits | Referral credits management surface (beyond order-time application) |
| US-400 | Client Credits | Credit audit log viewer |
| US-401 | Accounting | Vendor payables alerts (zero-SKU payable triggers) |
| US-402 | Accounting | Service billing (non-inventory revenue) |
| US-403 | Accounting | Expense category breakdown cards on the Expenses surface |
| US-404 | Calendar | Calendar Invitations tab (PendingInvitationsWidget for current user) |
| US-405 | Scheduling | TodaysAppointments and LiveQueue panels on the Scheduling page |
| US-406 | Account | Theme, Regional Settings, and Language preferences in My Account |
| US-407 | Feature Flags | Create a new feature flag via the create-flag dialog |
| US-408 | VIP Portal | VIP Credit Center module (client-facing credit balance view) |
| US-409 | VIP Portal | VIP Alerts (vipAlerts router — client-side alerts) |
| US-410 | VIP Portal | VIP Tier admin configuration (vipTiers.* router, FEAT-019) |
| US-411 | COGS | CogsSettingsPage Global Settings tab (COGS calculation mode + defaults) |
| US-412 | COGS | CogsSettingsPage Client Adjustments tab (per-client COGS overrides) |
| US-413 | Admin | Slice-v1-lab: PurchaseOrdersSlicePage (column toggle, create PO, drawer detail, deep-links) |
| US-414 | Admin | Slice-v1-lab: ProductIntakeSlicePage (receiving draft editor with history, gallery, discrepancies) |
| US-415 | Admin | Slice-v1-lab: InventoryBrowseSlicePage (SKU/product/status grid with drawer detail and grid preferences) |
| US-416 | Admin | Office supply needs tracking (officeSupply router, MEET-055) |
| US-417 | Todo | Navigate to a specific todo list's detail page (/todos/:listId) |
| US-418 | Vendor | Receiving reminders: Procurement Manager sends harvest/intake reminder emails to suppliers (vendorReminders router) |
| US-419 | Pricing | Credit signal history viewer (creditSignalHistory table — visible in credit audit context) |
| US-420 | Error Handling | ComponentErrorBoundary isolates individual dashboard widget failures independently of other widgets |

---

*QA complete. Total: 2 MAJOR, 28 MINOR, 35 missing items. Recommend fixing the 2 MAJOR issues and missing COGS stories before handing to implementation.*

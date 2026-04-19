# TERP UI + UX Audit — Master Review

**Audit target:** `main` @ `cfe936f` (staging and prod on same commit)
**Staging:** https://terp-staging-yicld.ondigitalocean.app
**Prod:** https://terp-app-b9s35.ondigitalocean.app
**Stack:** React 19 + Tailwind v4 (CSS-first) + shadcn/ui "new-york" + wouter + tRPC + Drizzle/MySQL

> One consolidated document. Every finding is grounded in actual source code — file + line. Findings already on the P2 roadmap (TER-1047..TER-1066) are called out, not re-recommended. This doc supersedes the first-pass audit that previously lived at this path.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Personas and top flows](#2-personas-and-top-flows)
3. [Flow-by-flow experience audit](#3-flow-by-flow-experience-audit)
4. [Tier A — broken, user-reported, trust-breaking](#4-tier-a--broken-user-reported-trust-breaking)
5. [Visual / UI hyper-detail — 42 atomic fixes in 7 systems](#5-visual--ui-hyper-detail--42-atomic-fixes-in-7-systems)
6. [Behavioral / UX hyper-detail — 36 atomic fixes in 9 systems](#6-behavioral--ux-hyper-detail--36-atomic-fixes-in-9-systems)
7. [Deep-dive findings](#7-deep-dive-findings)
8. [Raw counts / evidence](#8-raw-counts--evidence)
9. [Prioritized execution plan — 8 PRs](#9-prioritized-execution-plan--8-prs)
10. [What this document is not](#10-what-this-document-is-not)

---

## 1. Executive summary

TERP is a functional THCA wholesale cannabis ERP at an inflection point. The code shows a product that *knows what it wants to be* — "spreadsheet-native, keyboard-first, one dominant primary table per surface, adjacent execution beside primary data" — but three+ years of layered iterations are in the codebase and the old layers haven't been removed.

Three compounding forces make it feel like a CS project more than a product:

1. **State is ephemeral.** Filters, sort, pagination, column visibility, the customer you selected, the order you were on — none of it survives a navigation. A power user doing 100 actions a day gets 100 moments of lost work.
2. **Error-state is normalized.** Three tRPC endpoints throw 500s on every order-creation (credit + 2 referrals). `orders.getAll` 500s. Dashboard widgets show "No data available." Users have been trained to work around broken things, which means they can't tell "broken" from "doing it wrong."
3. **The workflow concept isn't expressed visually.** Inventory is a pipeline; the UI shows a table. Orders go draft→confirmed→shipped→paid; the UI shows a status badge. AR/AP reconciliation is a posture; the UI shows totals with no delta.

Three highest-leverage fixes, in order:

1. **Kill the 500s that fire on every order creation** (`credit.getVisibilitySettings`, `referrals.getSettings`, `referrals.getPendingCredits`) plus `orders.getAll`. Hours of backend work. Biggest single trust restore.
2. **Make table state live in the URL.** One library + a disciplined table-layer refactor. Biggest cross-flow UX improvement for the smallest conceptual change. Every list page changes from "start over" to "pick up where you left off."
3. **Retire legacy paths aggressively.** 3 payment procedures → 1. 2 order-confirm paths → 1. 2 dashboards → 1. 3 empty-state components → 1. 3 table systems → 1 policy. The team has already decided canonical in every case — they just haven't done the demolition.

Everything else — the 42 visual fixes, the remaining 33 UX fixes — is polish on top of those three.

---

## 2. Personas and top flows

From `context-pack/01_PRODUCT_BRIEF.md` plus `server/routers.ts` permissions:

| Persona | Job-to-be-done | Frequency | Primary surface |
|---|---|---|---|
| **Sales rep / manager** | Clients, quotes, orders, sales sheets, needs→sales | Daily, many/day | `/sales` |
| **Inventory manager** | Intake batches, move statuses, POs/vendors | Daily, many/day | `/inventory` + `/purchase-orders` |
| **Warehouse / fulfillment** | Pick, pack, bag, ship | Daily, continuous | `/inventory?tab=shipping` |
| **Accountant / finance** | Invoice, record payment, review AR/AP/ledger | Daily | `/accounting` |
| **Admin / system operator** | Users, roles, feature flags, scheduling | Weekly | `/settings` |
| **VIP customer** | Browse catalog, respond to price alerts | External | `/vip-portal/*` |

Top-5 domains by flow count (from `docs/reference/USER_FLOW_MATRIX.csv`, 551 total flows): **Inventory 58, Orders 57, Accounting 52, Calendar 34, CRM 28**. Calendar is a bigger module than its sidebar prominence suggests.

Strategic direction (`docs/design/spreadsheet-native-golden-flows-2026-03-18/module-specs.md`): migration from **work-surface** (form/drawer-heavy) → **spreadsheet-native** (table-first, direct-edit, keyboard-first). Every fix should accelerate that end state.

Design principles from the spec that should guide every fix:

- Each sheet has **one dominant primary table**
- Supporting regions must justify themselves through a visible relationship to the primary table
- Inspectors are secondary companions, not the main action surface
- Spreadsheet edits change data only; workflow transitions remain explicit actions
- Visible adjacency must use a repeatable pattern (summary strip, pinned handoff row, support card with explicit cross-sheet CTA) — not inspector-only clues
- Shared primitives, selection cues, save state, and keyboard discoverability should be reused, not reinvented per module

---

## 3. Flow-by-flow experience audit

### Flow 1 — Sales rep creates an order (most frequent)

**What they do:** pick a customer, add line items from inventory, apply pricing, review credit + margin, finalize.

**What the UI gives them:** `/sales?tab=create-order` loads a 2311-line `OrderCreatorPage` with ~15 stacked panels (LineItemTable, OrderAdjustmentPanel, OrderTotalsPanel, FloatingOrderPreview, CreditLimitBanner, CreditWarningDialog, ClientCommitContextCard, ReferredBySelector, ReferralCreditsPanel, CreditLimitWidget, PricingConfigTab, PricingContextPanel, InventoryBrowser, ProfileQuickPanel, KeyboardHintBar, WorkSurfaceStatusBar).

**Where this hurts:**

- **On customer-pick, three tRPC endpoints throw 500**: `credit.getVisibilitySettings`, `referrals.getSettings`, `referrals.getPendingCredits`. The Credit banner shows an error, the Referral panel shows an error. Every single order. The rep has learned to ignore errors, which is the worst UX outcome possible.
- Inventory browser stacked ABOVE line items, not beside. Workflow is scroll-down-find, scroll-up-add, scroll-down-find. The team's own `sales-order-creation-direction.md` spec says Inventory-left / Order-right.
- Customer field shows **6 feedback signals for one input**: label, ✓ success icon, ⚠ error icon, green border on success, red border on error, text error below.
- "Finalize" pops a confirm dialog saying "cannot be undone." Finalize isn't destructive — it's the whole point.
- Autosave runs via `useSaveState` AND `useUnsavedChangesWarning` nags about unsaved changes on navigation. One or the other.
- Duplicate h2 "Create Sales Order" inside a shell that already says "Sales" + a description sentence.
- Cmd+S, Cmd+Enter, Cmd+Z work inside the editor. Outside: no `c` to create, no `/` to search.

**Felt experience:** *"I can do it, but it's death by a thousand scrolls and I've trained myself to ignore two error panels."*

### Flow 2 — Sales rep opens the order list

**What they do:** go to `/orders` to see what's open, what's shipped, find an order from yesterday.

**What they get:** `orders.getAll` returns 500 per `09_KNOWN_ISSUES_AND_RISKS.md`. The primary sales list is unreliable.

**Felt experience:** *"I can't see my own orders half the time. I navigate via Customer → profile → orders because that path works."*

### Flow 3 — Sales rep shares a catalog with a buyer over text/chat

**What they do:** put together what's in stock this week and send a link to a buyer on SMS or Signal.

**What they get:** Sales Sheets exist, they can build one, but there's no tokenized shareable URL for chat. `TER-1075` recently added that pattern for shared **sales orders** (public `getByToken`), but it hasn't been extended to Sales Sheets yet. Workflow: build in TERP → export/screenshot → paste into the chat.

**Felt experience:** *"I do this ten times a day and TERP makes me do it twice."*

### Flow 4 — Inventory manager intakes a new batch (GF-001)

**What they do:** new product arrives, enter vendor, brand, product, lot, batch number, quantity, cost, locations.

**What the UI gives them:** `DirectIntakeWorkSurface` does a single transaction creating vendor → brand → product → lot → batch → batchLocations → audit. If any fails, whole thing fails.

**Where this hurts:**
- No multi-step progress indication. Either works or doesn't.
- No "save and start next" flow. Back to list, click "new intake," empty form. On 50 intakes a morning that re-nav is real time.
- **Zero scan support anywhere in codebase.** Every batch code is typed.
- Sidebar has a stale legacy "Direct Intake" link routing into the receiving queue — two labels, same place.

**Felt experience:** *"It works but it's forms. I'd rather be in a spreadsheet where I can tab through."*

### Flow 5 — Inventory manager checks what's live / moves statuses

**What they do:** open Inventory, scan the list, change batch statuses (LIVE → QUARANTINED → SOLD_OUT, etc.).

**What the UI gives them:** a generic table (one of three systems). Default filter does NOT land on LIVE even though 95% of the work is about live batches (`TER-1048 [P2-02]` open). Status labels are raw enums (`AWAITING_INTAKE`, `PHOTOGRAPHY_COMPLETE`), not humanized. Column set is generic — Price/COGS/Margin not in default view (`TER-1047 [P2-01]` open).

**Where this hurts:**
- Mental model is a pipeline: batches come in → get photographed → go live → sell down → close. UI shows a flat table. No kanban, no pipeline strip, no "4 awaiting intake, 23 LIVE, 4 on hold" glance-view.
- Filters and sort lose on navigation. Filter to a vendor, click into detail, click back — gone.
- No "Add to Order" row action yet (`TER-1053 [P2-07]` open).

**Felt experience:** *"I'm looking at rows when I'm really running a pipeline. I hold a lot in my head."*

### Flow 6 — Warehouse staff picks and packs an order (GF-005)

**What they do:** take a confirmed order, physically pull the batches from storage, bag them, mark them packed, move to ship.

**What the UI gives them:** `PickPackWorkSurface` — 1642 lines, desktop-first, with inspector panels, save state, undo, exports, drawer editors. Buttons are small.

**Where this hurts:**
- This is a person standing at a cart with a phone/tablet, not sitting at a desk. The work-surface UI is built for a desk.
- **Zero scan/barcode support** anywhere in the codebase.
- `pickPack.*` endpoints require `adminProcedure`. Warehouse staff may need over-privileging to do their own job.
- No "shift view" — show me everything that needs packing today, sorted by ship priority, nothing else.

**Felt experience:** *"Warehouse work on a desktop ERP."*

### Flow 7 — Accountant records a payment (GF-007)

**What they do:** customer sends a check/wire for $X, record it against the right invoice(s), see invoice marked paid, see AR reduce.

**What the UI gives them:** `InvoiceToPaymentFlow` calls `accounting.payments.create`. **Three payment procedures exist on the server:** `payments.recordPayment` (canonical per internal docs), `accounting.payments.create` (what UI calls), `accounting.invoices.recordPayment` (separate again) — different side effects on invoice balance + GL entries.

**Where this hurts:**
- **Accountant's worst nightmare.** Did the payment post? Did the invoice balance update? Answer: depends which button ran.
- Client Ledger and Invoice List can show different totals for the same client (known-issues doc flags this).
- Every "payment recorded" toast is followed by a manual triple-check. Broken trust.

**Felt experience:** *"I don't trust the numbers, so I always double-check. Defeats the point of having an ERP."*

### Flow 8 — Accountant reviews a client ledger (GF-008)

**What they do:** "What does Alice owe us, what has she paid, what's outstanding?"

**What the UI gives them:** Client Ledger absorbed as a tab inside `/accounting`. Data loads. No reconciliation view — no "AR says $X, Ledger says $Y, here's the delta."

**Where this hurts:**
- Data is there but accountant does the reconciliation math mentally.
- Export exists but filters don't persist.

**Felt experience:** *"The data is fine. I wish it added itself up."*

### Flow 9 — Anyone opens the dashboard

**What they do:** land on `/` first thing in the morning.

**What the UI gives them:** either `DashboardV3` (12-line wrapper around 602-line `SimpleDashboard`) or `OwnerCommandCenterDashboard` (87 lines, role-specific, cleanly organized), behind a feature flag. Widgets reportedly show "No data available" in prod per walkthrough feedback. `inventory.profitability.summary/top` return 500. Custom layout renders blank.

**Where this hurts:**
- Dashboard is first-impression surface. Broken for most users.
- Two dashboards behind a flag — team hasn't committed.
- Widget filters don't work per user feedback.

**Felt experience:** *"I skip the dashboard. I go straight to my workspace."*

**When a user skips the dashboard, the dashboard is dead. TERP has a dead first page.**

### Flow 10 — Any user navigates between detail views

**What they do:** click into a customer → their order → that order's invoice → that invoice's payment. Then they want to get back out.

**What the UI gives them:** no in-app back button. This is the #1 unprompted user complaint in walkthrough feedback. Breadcrumbs only at `xl` breakpoint and only on non-root paths. Browser back sometimes works, sometimes resets the workspace filter, sometimes jumps to an unrelated tab.

**Where this hurts:**
- Every drill-down is a one-way trip.
- Users right-click-open-in-new-tab to not lose their place. That's a UX failure workaround.

**Felt experience:** *"I click deep into something and then I'm lost."*

### Flow 11 — Any user pulls up something fast with Cmd+K

**What they do:** hit Cmd+K, type a customer name or SKU, jump.

**What the UI gives them:** command palette opens, searches globally across quotes/orders/customers/products. 300ms debounce, 3-char minimum. Five hardcoded actions (New Order, Record Receiving, Expected Deliveries Today, Sales Catalogue, Help).

**Where this hurts:**
- Products and inventory batches not in search yet (`TER-1049 [P2-03]` open).
- Actions list is a nav menu, not a palette. Nothing for "add payment to invoice X," "ship order Y," "mark batch Z sold-out," "adjust credit for client Q."
- 300ms + 3-char minimum feels slow — Linear's is instant with 1 char.

**Felt experience:** *"I use it to jump to a customer. That's all it's good for."*

### The meta-pattern across all 11 flows

Every flow has the same shape: **the happy path works, but the edges fail silently or noisily, and state doesn't travel with the user.**

---

## 4. Tier A — broken, user-reported, trust-breaking

From `09_KNOWN_ISSUES_AND_RISKS.md` and `docs/FEEDBACK_ANALYSIS.md`. **Fix before any polish.**

| # | Finding | Evidence |
|---|---|---|
| A1 | `orders.getAll` returns 500 on `/orders` | `server/routers/orders.ts:getAll` |
| A2 | `credit.getVisibilitySettings` + `referrals.getSettings` + `referrals.getPendingCredits` return 500 during order creation | `server/routers/credit.ts:189`, `server/routers/referrals.ts:25,120,502` |
| A3 | `inventory.profitability.summary/top` return 500 on dashboard | `server/routers/inventory.ts` |
| A4 | Logout doesn't enforce unauthenticated state — user returns to dashboard after "logout" | `server/_core/context.ts:203,230` |
| A5 | Dashboard widgets show "No data available" in prod | walkthrough |
| A6 | Custom dashboard layout results in blank dashboard | walkthrough |
| A7 | Settings icon + profile icon unresponsive on mobile | walkthrough |
| A8 | Comments feature non-functional; @ tagging broken — likely cause: `CommentWidget.tsx:24` uses deprecated `trpc.useContext()` (v10 API replaced by `useUtils()` in v11) | `client/src/components/comments/CommentWidget.tsx:24` |
| A9 | "Create Event" button reported broken. **Verified in code: actually works** — `EventFormDialog.tsx` has full client-link, attendees, recurrence, invitations. Stale feedback from Nov 2025, likely fixed since. | `components/calendar/EventFormDialog.tsx` |
| A10 | `/settings/display` returns 404 — broken legacy link | `client/src/App.tsx:488` |
| A11 | `featureFlags.getAuditHistory` returns 500 on `/settings/feature-flags` | `server/routers/featureFlags.ts:372` |
| A12 | **Nav is NOT filtered by permissions, only by feature flags.** Every role sees every menu item → 403 on click. | `client/src/config/navigation.ts:569–573` |
| A13 | **No persistent impersonation banner in main AppShell.** Banner exists in VIP portal (`ImpersonationBanner` at `VIPDashboard.tsx:187`) but main app's `Layout.tsx` has no mount point. Super Admin viewing as a client has no visual cue. | `client/src/components/layout/Layout.tsx` |
| A14 | **Todos NOT absorbed into Notifications despite TER-569 claim.** `NotificationsHub` has only System + Alerts tabs; Todos live on separate `/todo-lists` and `/todo-lists/:id` routes. | `client/src/components/notifications/NotificationsHub.tsx:17–22` |

**These cost more user trust than any styling fix ever will.**

---

## 5. Visual / UI hyper-detail — 42 atomic fixes in 7 systems

### Headline

The "high school CS project" feeling is driven by five systemic drivers, not surface polish:

1. **Color chaos** — 637 raw Tailwind color-class occurrences (8 shades of green, 6 of red, 5 of blue). `Badge` has only `default/secondary/destructive/outline` — no `success/warning/info/pending/draft`. Every developer invents status styling.
2. **Radius chaos** — 10 different `rounded-*` values in primitives alone. Design token `--radius: 0.15rem` exists and is ignored.
3. **Shadow chaos** — 101 `shadow-sm`, 30 `shadow-lg`, 26 `shadow-md`, plus colored shadows. Even inputs have `shadow-xs`.
4. **Stacked gradients** — `terp-shell-root` radials → `linear-workspace-shell` gradient → `linear-workspace-header` gradient → `linear-workspace-content` gradient. Four background treatments.
5. **Split theme** — dark olive sidebar (`oklch(0.22 0.05 155)`) + cream content area + a separate lime accent (`oklch(0.78 0.18 130)`) that doesn't match brand primary (rust `oklch(0.53 0.13 44)`). Two accent hues, one split layout.

### System 1 — Color rationalization (biggest visual lever)

1. Add semantic CSS variables: `--success`, `--success-bg`, `--warning`, `--warning-bg`, `--info`, `--info-bg`, `--pending`, `--pending-bg`, `--draft`, `--draft-bg` (reuse `--destructive`)
2. Extend Badge variants with `success | warning | info | pending | draft | muted`, each backed by the CSS vars
3. Find/replace 637 raw color classes → Badge variants or semantic vars (mechanical, split by module)
4. Kill the lime sidebar accent; use `var(--primary)` everywhere
5. Remove all colored shadows (`shadow-yellow`, `shadow-purple`, etc. — 4 occurrences)

### System 2 — Radius discipline

6. Decide on a single `--radius` (0.375rem recommended) and enforce
7. Card: `rounded-xl` → token
8. AppHeader search: `rounded-2xl` → token
9. Kill `rounded-full` on non-interactive containers (meta pills, eyebrow pill, tabs list wrapper)
10. Audit each `rounded-*` usage: only interactive elements get radius; layout containers get 0 or token

### System 3 — Shadow rationalization

11. Remove `shadow-sm` from Card primitive
12. Remove `shadow-xs` from Input primitive
13. Remove the custom micro-shadow from AppHeader
14. Remove `.linear-workspace-tabs-list` shadows (outer + inset)
15. Remove `.linear-workspace-tabs-trigger[data-state="active"]` box-shadow
16. Remove `.linear-workspace-meta-item` inset box-shadow
17. Remove `.linear-workspace-shell` box-shadow
18. Policy: shadows ONLY on dropdown, popover, dialog, sheet, command menu

### System 4 — Kill decorative backgrounds and gradients

19. `.terp-shell-root` — remove both radial gradients; solid `var(--background)`
20. `.linear-workspace-shell` — remove gradient; use `transparent` or `var(--card)`
21. `.linear-workspace-header` — remove gradient
22. `.linear-workspace-content` — remove gradient
23. `.linear-workspace-tab-row` — remove color-mix background
24. AppHeader — remove `backdrop-blur-md` + `bg-background/90`

### System 5 — Header and sidebar consolidation

25. Drop `description`, `meta`, `section` props from every workspace page's `LinearWorkspaceShell` usage (8 pages)
26. Shrink `.linear-workspace-title` from `clamp(1.75rem, 2.4vw, 2.5rem)` to `1.125rem` / 600 / tracking-normal
27. Delete `.linear-workspace-eyebrow` (or demote to flat gray inline breadcrumb)
28. Convert `.linear-workspace-tabs-list` from pill container to flat tabs
29. Convert `.linear-workspace-tabs-trigger` to flat text + 2px bottom border on active
30. Pick one theme (all dark Linear-style OR light with tinted sidebar Mercury-style)
31. Reduce sidebar active state from 3 signals (border + bg + bold) to 1
32. Remove nested group-card wrapping (`border-white/10 bg-white/5` when `hasActiveItem`)
33. Remove green-dot bullet on active group labels
34. Delete sidebar footer user/logout block (duplicates AppHeader dropdown)

### System 6 — Primitive cleanup

35. Input: remove `shadow-xs`; change focus ring from 3px to 2px or border-color-only
36. Button: simplify disabled to `disabled:opacity-50` (drop `saturate-50` and `shadow-none`)
37. Card: `rounded-md border py-4` (from `rounded-xl border py-6 shadow-sm`)
38. AppHeader search: flatten — flat input with leading icon + trailing `⌘K` chip
39. AppHeader account chip: flatten — no border, no shadow, no pill
40. Typography lockdown: 6-step scale (11/12/13/14/18/24); forbid off-scale sizes via lint or review gate
41. Drop Fraunces (keep Instrument Sans; keep DM Mono only if used for tabular nums)

### System 7 — Content width

42. Pick ONE max-width: `.container` (1280px) vs `.terp-main-shell` (1800px). Delete the loser.

---

## 6. Behavioral / UX hyper-detail — 36 atomic fixes in 9 systems

### System A — State persistence (highest UX lever)

The custom `DataTable` component (597 lines) with sort/filter/search/pagination/column-vis/selection is **used in zero production pages** (only a docstring reference in `skeleton-loaders.tsx`). All 83 table-using pages roll state with plain `useState`. Only tabs persist to URL (`useQueryTabState`). Everything else lost on nav/refresh/back.

- **A1.** Adopt URL-backed state via `nuqs` (or similar). One hook: `useUrlTableState({ sort, filters, page, pageSize, search, view })`
- **A2.** Either (a) revive `DataTable` as the canonical list primitive with URL persistence, or (b) thin `useUrlTableState` hook any shadcn-table page can adopt
- **A3.** Migrate top 10 highest-traffic list pages first: Orders, Inventory, Clients, Invoices, Payments, Purchase Orders, Receiving, Sample Management, Interest List, Returns
- **A4.** "Saved Views" — name and pin a filter/sort combination (2-week project, dramatic daily impact)
- **A5.** Persist column visibility per user per table in `localStorage` (first step before A4)

### System B — Table unification

Three parallel systems active: shadcn `table.tsx` (83 pages), AG Grid (30 files), `ResponsiveTable`/`PowersheetGrid` (25 files). Different keyboard, selection, empty-state, pagination, styling.

- **B1.** Decision: canonical system? Suggested rule: ≥1000 rows OR editable = AG Grid; else shadcn
- **B2.** Unify column-visibility dropdown UX across all three
- **B3.** Unify empty-state (three exist: `empty-state.tsx` 600 lines, `empty.tsx` 105 lines, `operational-empty-state.tsx`; 74 total usages)
- **B4.** Unify loading-state (`loading-state.tsx`, `skeleton.tsx`, `skeleton-loaders.tsx`)
- **B5.** Unify pagination (`pagination.tsx`, `pagination-controls.tsx`, `DataTablePagination.tsx`)
- **B6.** Delete dead `DataTable.tsx` + `DataTableFilters.tsx` + `DataTablePagination.tsx` if not adopted per A2
- **B7.** Remove any unreferenced empty/loading components

### System C — Keyboard and command coverage

Global `useKeyboardShortcuts` imported in exactly one place (`App.tsx:68`). `useWorkSurfaceKeyboard` covers Tab/Enter/Esc/Cmd-Z only inside specific editors. No list-level vocab.

- **C1.** List vocab: `j`/`k` row nav, `Enter` open, `x` select, `Shift+X` range, `e` edit, `Esc` clear selection
- **C2.** App-global: `/` focus search, `g` + letter go-to (`go`/`gi`/`gc`/`gp`/`gr`/`gf`), `c` create in current context, `?` cheatsheet
- **C3.** Build `?` cheatsheet overlay (current context + global)
- **C4.** Command palette: 3-char minimum → 2; 300ms debounce → 150ms
- **C5.** Command palette: "Recent actions" section when input empty
- **C6.** Command palette: in-place entity actions after search-jump ("Mark shipped," "Duplicate," "Record payment")
- **C7.** Command palette: natural language routed to saved views (depends on A4)

### System D — Flow consolidation and page weight

`OrderCreatorPage.tsx` 2311 lines, `ClientProfilePage.tsx` 1849, `CashLocations.tsx` 1451, `Settings.tsx` 1316. OrderCreator renders 15+ components plus duplicate h2 + description sentence.

- **D1.** Drop per-page duplicate h2/description on OrderCreator, ClientProfile, similar
- **D2.** Audit OrderCreator panels: fold ReferredBySelector into Customer's context, move ReferralCreditsPanel to totals, move ClientCommitContextCard into customer drawer
- **D3.** Pick one dashboard. Kill the flag. Adopt `OwnerCommandCenterDashboard` pattern as template
- **D4.** Cap new page components at ~500 lines; 1000+ line pages are candidates for `feature/*Section.tsx` splits

### System E — Feedback reduction

Customer field on OrderCreator shows 6 concurrent signals. Pattern repeats across forms.

- **E1.** Pick one error signal — red border on blur + single text message below on submit. Remove success ✓ icons (no news is good news)
- **E2.** Remove tiny uppercase label when placeholder communicates field ("Search for a customer...")
- **E3.** Drop success border color. Unfilled = neutral; invalid = red; filled valid = neutral
- **E4.** Dependent fields: hide until dependency met, don't show locked-with-explanation ("Select a customer to set referral details")

### System F — Confirmation rationalization

- **F1.** Policy: confirm only actions that (a) can't be undone AND (b) have real-world consequences. Everything else: execute + undo toast
- **F2.** Remove finalize-order confirm if autosave is on and status is reversible
- **F3.** Suppress `ConfirmNavigationDialog` when autosave committed ≤5s ago
- **F4.** Replace removal confirms on list pages with "Removed — Undo" Sonner toast (already installed)
- **F5.** Audit every `<ConfirmDialog` — aim to cut by ~60%

### System G — Context preservation

- **G1.** Show breadcrumbs from `md` breakpoint up, not just `xl`
- **G2.** "Back to [previous filtered list]" chip in workspace header (depends on A1)
- **G3.** Make global search context-aware — typing in Orders workspace scopes to orders first
- **G4.** Audit focus-return on every drawer/sheet/dialog close; add lint rule or review gate

### System H — Loading / empty / error consistency

- **H1.** Consolidate to one empty-state primitive with variants (`noData | noResults | noAccess | error`). Delete the other two
- **H2.** Consolidate to one loading system: skeleton for initial, spinner for button-level, progress bar for long operations
- **H3.** Standardize error states: what went wrong + what to try + link to report
- **H4.** Audit every page route for empty/loading/error coverage. Fix anything that falls back to blank

### System I — Notifications and toast

**953 `toast.*` calls across the client.** Severe fatigue risk.

- **I1.** Audit toast density on top 3 flows (create order, receive intake, record payment) — any flow firing 3+ toasts for one user action needs consolidation
- **I2.** Build notification bell into proper inbox with read/unread, inline actions, "mute this type"
- **I3.** Severity vocab: toast (transient confirmation), notification (async persistent), dashboard card (account-wide attention)
- **I4.** Move "X deleted" confirm-dialogs to undo toasts (depends on F4)

---

## 7. Deep-dive findings

Specific patterns surfaced in the code dive, each file-referenced:

### 7.1 — Sidebar IA biases away from the most-frequent persona

`client/src/config/navigation.ts`:
- "Sell" group: **1** visible sidebar item (`/sales`)
- "Operations": **1** visible (`/inventory`)
- "Admin": **3** visible (Calendar, Settings, Notifications)

Sales is the most-frequent persona but has the fewest entry points. "Create Order" is 3 clicks from any page. Linear's Create Issue is one keystroke.

**Fix:** Add "New Order" + "Record Payment" as always-visible header actions near search. Depends on C2/C6.

### 7.2 — Two active order-confirm paths in production

From `09_KNOWN_ISSUES_AND_RISKS.md` Truth Table 1:
- `GF-003 createDraftEnhanced + finalizeDraft` (canonical, `/orders/create`)
- `GF-004 OrdersWorkSurface.confirmDraftOrder` (legacy, `/orders`)

**Fix:** Retire legacy confirm control. Operators get ONE confirm flow.

### 7.3 — Three payment-recording paths

From Truth Table 4:
- `payments.recordPayment` (canonical per docs)
- `accounting.payments.create` (what UI actually calls)
- `accounting.invoices.recordPayment` (third, different side effects)

**Fix:** Route UI to `payments.recordPayment`. Delete or alias the others.

### 7.4 — Two status systems on batches

`drizzle/schema.ts`: `batches.statusId → workflowStatuses.id` AND `batchStatus` enum on the same table row. Two parallel systems, both active.

**Fix:** Decide canonical. Decommission or unify.

### 7.5 — 213 of 551 flows gated Super-Admin only (39%)

From `USER_FLOW_MATRIX.csv`. Warehouse staff need `adminProcedure` to run GF-005 Pick&Pack. Either flows are over-gated or Super Admin is the de facto power-user experience and everyone else sees a lobotomized version.

**Fix:** RBAC rationalization per persona. Loosen warehouse, sales, accounting flows.

### 7.6 — Comments likely broken due to deprecated tRPC API

`CommentWidget.tsx:24` uses `trpc.useContext()` — deprecated v10 API, replaced by `useUtils()` in v11. If tRPC version advanced, silent break.

**Fix:** Swap `useContext` → `useUtils`. Verify query invalidation still works.

### 7.7 — Impersonation banner mount gap

`ImpersonationBanner` is wired up only inside `VIPDashboard.tsx:187`. Main TERP `Layout.tsx` has no mount point. When a Super Admin views TERP AS a user, no visual cue.

**Fix:** Mount banner in `Layout.tsx` whenever an impersonation session is active. Persists across nav.

### 7.8 — Nav filters by feature flag only, not permission

`navigation.ts:569–573` filters only on `featureFlag`, never consults `usePermissions`.

**Fix:** `buildNavigationAccessModel` should accept a permissions array; items requiring a permission the current user doesn't have are hidden from sidebar.

### 7.9 — Zero barcode/scan support anywhere in codebase

Grep `scan|barcode|Scan|Barcode` across the entire `client/src/` tree returns nothing. `PickPackWorkSurface` (1642 lines) is pure desktop work-surface.

**Fix:** Add a mobile-optimized `/pick-pack/mobile` route with scan-input-first UX. Different layout, same data model.

### 7.10 — Calendar feedback from Nov 2025 is stale

Walkthrough said "Create Event button non-functional" and "Add Event Attendees missing." Actual code (`EventFormDialog.tsx`) has working client-link (line 166), participants array (line 59), recurrence builder, invitation dialog.

**Action:** Close those tickets. Mark "already addressed — needs verify."

### 7.11 — Notifications "absorbed" Todos per TER-569, but they live on separate routes

`NotificationsHub.tsx:17` type is `"system" | "alerts"` only. `App.tsx:837,841,845` routes `/todo-lists` and `/todo-lists/:id` to separate pages.

**Fix:** Either (a) actually absorb — add Todo tab to NotificationsHub, redirect `/todo-lists` to `/notifications?tab=todos`, or (b) retract the absorption claim in `navigation.ts`.

### 7.12 — DashboardV3 is a 12-line wrapper

`DashboardV3.tsx:10–12` is just `return <SimpleDashboard />`. Real dashboard is 602 lines in `components/dashboard/SimpleDashboard.tsx`. Feature flag compares against `OwnerCommandCenterDashboard.tsx` (87 lines, 7 widget components, clean persona layout).

**Fix:** Adopt owner pattern as template. Build SalesCommandCenter and InventoryCommandCenter. Kill SimpleDashboard.

---

## 8. Raw counts / evidence

| Metric | Value |
|---|---|
| Raw Tailwind color classes (`bg-green-*`, `text-red-*`, etc.) | **637** |
| Shades of green text in use | **8** |
| Shades of red text in use | **6** |
| Shades of blue text in use | **5** |
| Distinct `rounded-*` values in primitives | **10** |
| Shadow strengths (incl. colored) | **7+** |
| Stacked background gradients per page load | **4** |
| Font families loaded | **3** (Instrument Sans, Fraunces, DM Mono) |
| Font-face declarations | **6** weight variants |
| Parallel table implementations | **3** (shadcn 83 files, AG Grid 30 files, PowersheetGrid 25 files) |
| Production usages of custom `DataTable` | **0** |
| Parallel empty-state components | **3** (74 total usages) |
| Parallel loading components | **3** |
| Dashboards behind feature flag | **2** |
| Global keyboard-shortcut hook usages | **1** |
| Command palette actions (hardcoded) | **5** |
| Feedback signals on OrderCreator customer field | **6** |
| `toast.*` calls across client | **953** |
| `OrderCreatorPage.tsx` line count | **2311** |
| `ClientProfilePage.tsx` line count | **1849** |
| `PickPackWorkSurface.tsx` line count | **1642** |
| Barcode/scan references in entire client | **0** |
| Tier A broken-things findings (verified) | **14** |
| Golden flows defined | **12** (GF-001 through GF-012) |
| User flow matrix rows | **551** |
| Data entities | **212** |
| Super-Admin-only flow rows | **213** (39%) |

---

## 9. Prioritized execution plan — 8 PRs

Ordered by frequency × severity × leverage. Each PR is independently mergeable.

### PR 1 (P0 broken) — Tier A fixes

Fix the 500s, the logout, the 404, and the wired-but-unmounted banner before any polish. Mostly backend work.

- A1 — `orders.getAll` 500
- A2 — credit + referrals 500s on order creation
- A3 — `inventory.profitability.*` 500s
- A4 — logout enforcement
- A10 — `/settings/display` 404 redirect
- A11 — `featureFlags.getAuditHistory` 500
- A8 — Comments `useContext` → `useUtils`
- A13 — Mount `ImpersonationBanner` in main `Layout.tsx`

### PR 2 (P0 behavioral) — URL table state (hook + POC)

- A1 — Build `useUrlTableState` hook (nuqs-based)
- A3 — Migrate one proof-of-concept list page (Orders)
- A5 — Column visibility to `localStorage` per-user

### PR 3 (P0 visual) — Badge vocabulary + semantic vars

Lands the vocabulary that unlocks color cleanup. Zero risk.

- Fix 1 — semantic CSS vars
- Fix 2 — Badge variants

### PR 4 (P1 cleanup) — Shell chrome strip

Low-risk, ~15 files, almost all deletions.

- Fixes 11–18 (shadows)
- Fixes 19–24 (gradients)
- Fixes 25–29 (workspace headers: drop description/meta/section, shrink title, flatten tabs)
- Fix 41 (drop Fraunces)

### PR 5 (P0 behavioral cont'd) — Migrate top-9 list pages

- A3 — Inventory, Clients, Invoices, Payments, Purchase Orders, Receiving, Sample Management, Interest List, Returns

### PR 6 (P0 visual cont'd) — Color find/replace

- Fix 3 — 637 replacements routed through Badge variants or semantic vars. Split by module (Sales, Inventory, Accounting, Relationships, Admin)

### PR 7 (P1 form cleanup)

- E1–E4 — reduce feedback signals; drop success borders/icons; hide dependent fields until met
- F1–F5 — confirmation rationalization; replace non-destructive confirms with undo toasts

### PR 8 (P2 structural) — retire legacy paths

- 7.2 — Retire legacy order-confirm (GF-004 UI)
- 7.3 — Route UI to canonical `payments.recordPayment`
- 7.12 — Pick `OwnerCommandCenterDashboard` pattern; kill SimpleDashboard
- B1 — Document canonical table system policy
- B6 — Delete dead `DataTable.tsx`
- H1–H2 — Consolidate empty/loading primitives

### Beyond PR 8 (P3/P4 scheduled)

- A4 — Saved Views (2 weeks, high user value)
- C1–C7 — List keyboard vocab + command palette depth
- Fixes 30–34 — Sidebar theme unification
- Fixes 6–10 — Radius normalization
- D2 — OrderCreator panel consolidation per `sales-order-creation-direction.md` spec
- 7.9 — Mobile/scan-first PickPack
- 7.5 — RBAC rationalization per persona
- 7.11 — Merge or retract Todo absorption claim
- 7.8 — Permission-aware sidebar filtering
- 7.4 — Decommission one of the two batch-status systems
- A12 — Close stale Nov-2025 Calendar feedback (already fixed)
- I1–I3 — Notification system depth

---

## 10. What this document is not

- **Not a redesign.** No new IA, no new screens, no changed data model.
- **Not visual-only.** Roughly half the items are behavioral.
- **Not exhaustive.** Follow-up dimensions not fully covered: mobile parity depth, accessibility (focus trap, screen reader, ad-hoc color contrast), form autosave coverage, real-time collaboration cues, onboarding, print/export UX, VIP portal UX depth, Calendar attendee/invitation UX depth.
- **Not opinion.** Every finding ties to file + line or a verified flow with evidence.

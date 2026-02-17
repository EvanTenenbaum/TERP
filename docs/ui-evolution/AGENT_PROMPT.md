# TERP UI Evolution — Agent Execution Prompt

> **Purpose:** Self-contained instructions for a UI/UX agent with access to `EvanTenenbaum/TERP`. Everything needed to execute the frontend evolution — from token swap to density system to command palette — is in this document and the accompanying files.

---

## Your Mission

You are executing a UI/UX evolution of the TERP ERP application. This is **not** a redesign or refactor. It is a surgical, additive evolution that transforms the frontend from a "modern app" into a "professional power tool" while preserving all existing functionality.

**Repository:** `EvanTenenbaum/TERP`
**Branch:** `feat/ui-evolution` (single long-running branch, merge to `main` when approved)
**Tech stack:** React 19, Tailwind CSS 4, shadcn/ui, tRPC, TanStack Query, cmdk
**Package manager:** pnpm
**Test framework:** Vitest

The work has three parts, executed in order on the same branch:

| Part | What It Is | Effort | Risk |
|------|-----------|--------|------|
| **A. Visual Migration** | Token swap + font change + radius tightening + hardcoded color cleanup | 2–3 days | Very Low |
| **B. Density System** | CSS variable-driven compact mode with a toggle | 2–3 days | Very Low |
| **C. Power-User Features** | Command palette enhancement + keyboard hints | 5–8 days | Low-Medium |

**Total realistic effort: 9–14 dev-days.** Parts A and B can be done in a single day by a fast developer. Part C is where the real work lives.

---

## Context: What TERP Is

TERP is a cannabis industry ERP. It manages intake, inventory, photography, orders, invoicing, payments, and fulfillment. The UI is organized around **Work Surfaces** — each is a master-detail view with a data table on the left and an InspectorPanel on the right.

### The 8 Golden Flows (Must Not Break)

| Flow | Route | Work Surface |
|------|-------|-------------|
| GF-001: Direct Intake | `/intake` | DirectIntakeWorkSurface |
| GF-002: Procure to Pay | `/purchase-orders` | PurchaseOrdersWorkSurface |
| GF-003: Order to Cash | `/orders` | OrdersWorkSurface |
| GF-004: Invoice & Payment | `/accounting/invoices` | InvoicesWorkSurface |
| GF-005: Pick-Pack | `/pick-pack` | PickPackWorkSurface |
| GF-006: Client Ledger | `/accounting` | ClientLedgerWorkSurface |
| GF-007: Inventory Mgmt | `/inventory` | InventoryWorkSurface |
| GF-008: Sample Request | `/samples` | SamplesWorkSurface |

### Key Files

| File | Lines | Role |
|------|-------|------|
| `client/src/index.css` | 271 | Design tokens (OKLCH), base styles |
| `client/src/App.tsx` | 697 | Root component, routing, providers |
| `client/src/components/ui/table.tsx` | 114 | shadcn table primitives — **the single highest-impact file for density** |
| `client/src/components/layout/Sidebar.tsx` | 301 | Collapsible sidebar |
| `client/src/components/layout/AppHeader.tsx` | 189 | Search bar, notifications, breadcrumbs |
| `client/src/components/DashboardLayout.tsx` | 370 | Sidebar provider wrapper |
| `client/src/components/work-surface/InspectorPanel.tsx` | 556 | Detail panel (has 11 hardcoded gray refs — fix these) |
| `client/src/components/work-surface/WorkSurfaceStatusBar.tsx` | 53 | Bottom status bar |
| `client/src/components/CommandPalette.tsx` | 244 | Existing cmdk command palette (extend, don't rewrite) |
| `client/src/hooks/useKeyboardShortcuts.ts` | 51 | Global keyboard shortcut hook |
| `client/src/hooks/work-surface/useWorkSurfaceKeyboard.tsx` | 384 | Work Surface keyboard contract |
| `client/src/contexts/FeatureFlagContext.tsx` | ~80 | DB-backed feature flags with `isEnabled("key")` |
| `client/src/config/navigation.ts` | 302 | All nav items and groups |

### Work Surfaces (11 files, ~12,000 lines total)

| File | Lines | Hardcoded Blue | Hardcoded Gray |
|------|-------|---------------|----------------|
| DirectIntakeWorkSurface.tsx | 1,671 | 0 | 0 |
| OrdersWorkSurface.tsx | 1,437 | 1 | 1 |
| PurchaseOrdersWorkSurface.tsx | 1,178 | 1 | 1 |
| ClientLedgerWorkSurface.tsx | 1,075 | 5 | 19 |
| InvoicesWorkSurface.tsx | 1,061 | 2 | 2 |
| PickPackWorkSurface.tsx | 1,054 | 12 | 45 |
| ClientsWorkSurface.tsx | 1,104 | 3 | 1 |
| ProductsWorkSurface.tsx | 1,044 | 0 | 1 |
| QuotesWorkSurface.tsx | 848 | 0 | 1 |
| InventoryWorkSurface.tsx | 826 | 1 | 2 |
| VendorsWorkSurface.tsx | 655 | 0 | 0 |

> **Key insight:** Most Work Surfaces are already clean. PickPackWorkSurface (45 gray, 12 blue) and ClientLedgerWorkSurface (19 gray, 5 blue) are the two that need the most hardcoded color cleanup. The rest are 0–3 references each.

---

## Design Direction: "Brushed Gunmetal"

The aesthetic is **brushed gunmetal** — machined precision, not app store gloss. Think instrument panel, not consumer SaaS.

### Design Rules

1. **Machined precision.** Borders are 1px. Border radius is 4px max (`--radius: 0.25rem`). No rounded pills, no soft blobs.
2. **Warm neutral grays on OKLCH hue 250 (steel-blue).** No purple. No gradients. No glow effects.
3. **IBM Plex Sans** for body text, **IBM Plex Mono** for numbers and data. Enable `font-feature-settings: "tnum" on, "lnum" on` for tabular numbers in data tables.
4. **Data density over white space.** Compact is the goal, but never cramped.
5. **Color is functional.** Status colors (emerald, amber, red) are the only saturated colors. Everything else is monochrome steel.
6. **Dark mode is primary.** Design and test in dark mode first.

---

## Visual References

Study these carefully. They show the approved direction.

### SAP Fiori Master-Detail (Layout Inspiration)
![SAP Fiori](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/iCpOoNKJJxhrznXU.png)

The key pattern: master list on the left with inline status badges, detail pane on the right with tabs. This is already what TERP does — the evolution tightens it.

### Approved Mockup: Orders (Dark, Comfortable Density)
![Orders Dark](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/wwPMZyOtfMeZnwYs.png)

### Approved Mockup: Orders (Compact + Command Palette + Keyboard Hints)
![Orders Evolved](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/TOfXzjFonYuPoDzO.webp)

### Approved Mockup: Orders (Light Mode, Compact)
![Orders Light](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/iFgBDRqUMMZHYQRo.webp)

### Approved Mockup: Inventory with Batch Images (Dark)
![Inventory Images](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/oHPOrZCyjvtdqDZn.webp)

### Approved Mockup: Inventory Detail Pane
![Inventory Detail](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/tEUoBRsSjoDcmtuu.webp)

### Reference: Linear (Density + Keyboard Inspiration)
![Linear](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/MFUEDRLYZSxANvrJ.jpg)

### Reference: Bloomberg Terminal (Extreme Density)
![Bloomberg](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/ZBhrpldvnSZNDfpd.jpg)

### Reference: Stripe Dashboard (Clean Utility)
![Stripe](https://files.manuscdn.com/user_upload_by_module/session_file/310519663281181999/xpQkrJsdcAKvWZRf.png)

---

## Part A: Visual Migration (2–3 days)

This is a one-way migration. No feature flag. No conditional paths. You are replacing the current tokens with better ones.

### A1. Font Setup

Add to `client/index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Add to `@theme inline` in `index.css`:

```css
--font-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, monospace;
```

Add to `body` rule in `@layer base`:

```css
font-feature-settings: "tnum" on, "lnum" on;
```

### A2. Token Swap

Replace the `:root` and `.dark` token blocks in `client/src/index.css` with the values in the accompanying `DESIGN_TOKENS.css` file. This is a direct replacement — the variable names are identical, only the values change.

Key changes from current → evolved:

| Token | Current | Evolved | Why |
|-------|---------|---------|-----|
| `--radius` | `0.65rem` | `0.25rem` | Machined, not soft |
| Primary hue | Blue (264) | Steel (250) | Industrial, not consumer |
| `--background` (dark) | `oklch(0.141 0.005 285.823)` | `oklch(0.145 0.008 250)` | Warmer, less purple |
| `--border` (dark) | `oklch(1 0 0 / 10%)` | `oklch(0.26 0.008 250)` | Solid, not transparent |
| Font | System default | IBM Plex Sans/Mono | Professional data font |

### A3. Hardcoded Color Cleanup

After swapping tokens, do a cleanup pass on hardcoded Tailwind color classes. The goal is to replace `blue-*` and `gray-*` with semantic tokens where possible.

**Priority 1 — InspectorPanel.tsx (11 gray references):**

| Find | Replace With |
|------|-------------|
| `bg-white dark:bg-gray-900` | `bg-background` |
| `border-gray-200 dark:border-gray-700` | `border-border` |
| `bg-gray-50 dark:bg-gray-800` | `bg-muted` |
| `text-gray-900 dark:text-gray-100` | `text-foreground` |
| `text-gray-500 dark:text-gray-400` | `text-muted-foreground` |
| `text-gray-700 dark:text-gray-300` | `text-foreground` |
| `bg-gray-300 dark:bg-gray-600` | `bg-border` |
| `text-gray-400` | `text-muted-foreground` |

**Priority 2 — Status badges across Work Surfaces:**

Status badges use `bg-blue-100 text-blue-800` for "Processing", "Sent", "Picking", etc. These are **functional colors** — they communicate status. The correct approach is to migrate them to a status color system using CSS variables:

```css
/* Add to index.css */
--status-info: oklch(0.58 0.06 250);        /* steel — replaces blue */
--status-info-bg: oklch(0.22 0.03 250);     /* dark mode bg */
--status-info-fg: oklch(0.78 0.04 250);     /* dark mode text */
```

Then replace `bg-blue-100 text-blue-800` → `bg-[var(--status-info-bg)] text-[var(--status-info-fg)]` in status badge maps. This is a find-and-replace per Work Surface.

**Priority 3 — PickPackWorkSurface.tsx (45 gray, 12 blue):**

This is the most color-heavy Work Surface. Most references are selection states and row highlighting. Apply the same InspectorPanel pattern: `gray-*` → semantic tokens, `blue-*` → `primary` or status tokens.

**What to leave alone:** Calendar (245 gray, 73 blue) and Scheduling (144 gray, 31 blue) are NOT golden flows and are not in scope. Don't touch them.

### A4. Radius Cleanup (Optional, Low Priority)

The `--radius: 0.25rem` change cascades to all shadcn/ui components automatically. The 701 hardcoded `rounded-lg`/`rounded-xl` references in non-shadcn elements will keep their current rounding. This is acceptable — the structural elements (cards, dialogs, dropdowns, inputs) will look sharp, and inline elements can be tightened over time. Do NOT do a mass find-replace on `rounded-lg`.

---

## Part B: Density System (2–3 days)

The density system is gated behind a feature flag: `ui-density-toggle`. When the flag is off, the UI looks and behaves exactly as it does today. When the flag is on, a density toggle appears in the header, and users can switch between "comfortable" (current) and "compact" modes.

### B1. Add Density CSS Variables to `index.css`

```css
/* Comfortable (default — matches current behavior exactly) */
:root {
  --density-row-h: 2.5rem;
  --density-cell-px: 0.5rem;
  --density-cell-py: 0.625rem;
  --density-header-h: 4rem;
  --density-sidebar-item-py: 0.5rem;
  --density-font-size: 0.875rem;
}

/* Compact (activated by adding .density-compact to <html>) */
.density-compact {
  --density-row-h: 1.75rem;
  --density-cell-px: 0.375rem;
  --density-cell-py: 0.25rem;
  --density-header-h: 3rem;
  --density-sidebar-item-py: 0.25rem;
  --density-font-size: 0.8125rem;
}
```

### B2. Create `DensityContext.tsx`

See the reference implementation in `reference-implementations/DensityContext.tsx`. This follows the exact pattern of the existing `ThemeContext.tsx`. It stores preference in localStorage and applies the `.density-compact` CSS class to `document.documentElement`.

### B3. Modify `table.tsx` (The Highest-Impact Change)

This single 4-line change cascades density to ALL 11 Work Surfaces:

```tsx
// TableHead: change h-10 px-2 to:
"text-foreground h-[var(--density-row-h)] px-[var(--density-cell-px)] text-left align-middle font-medium text-[length:var(--density-font-size)] whitespace-nowrap ..."

// TableCell: change p-2 to:
"px-[var(--density-cell-px)] py-[var(--density-cell-py)] align-middle text-[length:var(--density-font-size)] whitespace-nowrap ..."
```

See `reference-implementations/table-diff.md` for the exact before/after.

### B4. Modify Layout Components

| File | Change |
|------|--------|
| `AppHeader.tsx` | `h-16` → `h-[var(--density-header-h)]` |
| `Sidebar.tsx` | Nav item `py-2`/`py-1.5` → `py-[var(--density-sidebar-item-py)]`; header `h-16` → `h-[var(--density-header-h)]` |
| `DashboardLayout.tsx` | Default sidebar width 280px → 240px when compact |
| `InspectorPanel.tsx` | Reduce header padding and section spacing in compact |
| `WorkSurfaceStatusBar.tsx` | Reduce height in compact |

### B5. Wire in `App.tsx`

Wrap with `DensityProvider` at the same level as `ThemeProvider`. Gate the density toggle UI behind `isEnabled("ui-density-toggle")`.

### B6. Add the Feature Flag

Use the TERP admin UI or the `createFlag` tRPC mutation to add:

```
key: "ui-density-toggle"
description: "Enable compact/comfortable density toggle in the header"
module: "ui"
enabled: false (default off — flip to true for testing)
```

No database migration needed — flags are stored as rows in the `feature_flags` table.

### B7. Add the Toggle UI

Add a small button in `AppHeader.tsx` (next to the theme toggle or in the user menu) that calls `toggleDensity()`. Only render this button when `isEnabled("ui-density-toggle")` returns true.

---

## Part C: Power-User Features (5–8 days)

These are gated behind feature flags: `ui-command-palette-v2` and `ui-keyboard-hints`.

### C1. Command Palette Enhancement

The existing `CommandPalette.tsx` (244 lines) already works with cmdk. Extend it — do NOT rewrite it. Add:

1. **Recent Items group** — Last 10 viewed items from localStorage. Use the `useRecentItems` hook (see reference implementation). Add `addRecentItem()` calls in Work Surfaces when items are selected in the inspector.

2. **Context Actions group** — Actions based on the current page. On the Orders page: "Create Order", "Export CSV", "Toggle Filters". On Inventory: "Create Batch", "Run Audit", etc.

3. **Better search** — Wire the search input to existing tRPC search endpoints for real-time fuzzy matching across orders, clients, products.

**AppHeader change:** Replace the `<form>` search bar with a clickable button that opens the CommandPalette. Shows "Search or jump to..." with a `⌘K` badge. This is the Linear/GitHub pattern.

Gate the enhanced palette behind `isEnabled("ui-command-palette-v2")`. When the flag is off, the current CommandPalette behavior is unchanged.

### C2. Keyboard Hints

Create a `<Kbd>` component (see `reference-implementations/kbd.tsx`) and a `KeyboardHintBadge` wrapper (see `reference-implementations/KeyboardHintBadge.tsx`).

For each Work Surface, register page-scoped shortcuts and wrap action buttons:

```tsx
// Template for each Work Surface (~15 lines added per file):
import { KeyboardHintBadge } from "@/components/KeyboardHintBadge";

// Register shortcuts
useKeyboardShortcuts([
  { key: "c", handler: handleCreate, description: "Create new" },
  { key: "e", handler: handleEdit, description: "Edit selected" },
  { key: "/", handler: () => filterRef.current?.focus(), description: "Focus filter" },
  { key: "r", handler: () => refetch(), description: "Refresh" },
]);

// Wrap buttons
<KeyboardHintBadge keys={["C"]}>
  <Button onClick={handleCreate}>Create Order</Button>
</KeyboardHintBadge>
```

Add keyboard hints to the `WorkSurfaceStatusBar`: `↑↓ Navigate  ↵ Open  Esc Close  ⌘K Command`

Gate everything behind `isEnabled("ui-keyboard-hints")`.

### C3. Add Feature Flags

```
key: "ui-command-palette-v2"
description: "Enhanced command palette with recent items, context actions, and search"
module: "ui"
enabled: false

key: "ui-keyboard-hints"
description: "Show keyboard shortcut badges on action buttons"
module: "ui"
enabled: false
```

---

## What NOT to Touch

| Area | Reason |
|------|--------|
| Server/API layer (~100 files) | All changes are client-side only |
| Database schemas (~30 files) | No data model changes |
| tRPC routers (~20 files) | No API contract changes |
| Authentication (~10 files) | No auth changes |
| Calendar/Scheduling components | Not golden flows, too many hardcoded colors — out of scope |
| AG Grid spreadsheet views | Separate theme system, feature-flagged, not golden flows |
| 70 of 74 shadcn/ui components | Density cascades via CSS variables automatically |

---

## Critical Rules

1. **Do NOT break golden flows.** Test all 8 after every significant change.
2. **Do NOT change business logic.** No tRPC changes, no schema changes, no API changes.
3. **Part A (visual migration) is a direct replacement, not a toggle.** No feature flag, no conditional CSS. The new tokens ARE the tokens.
4. **Parts B and C are feature-flagged.** Use the existing `FeatureFlagContext` with `isEnabled("key")`. New features ship disabled by default.
5. **Comfortable density mode must be identical to current behavior.** The CSS variables in `:root` are set to match the current hardcoded values exactly. When density-compact is not active, nothing changes.
6. **IBM Plex fonts only.** No Inter, no system-ui as primary.
7. **OKLCH color space only.** All tokens use OKLCH. No hex, no HSL.
8. **Border radius max 4px.** `--radius: 0.25rem`. No exceptions in new code.
9. **Dark mode is primary.** Design and test in dark mode first.
10. **Extend, don't rewrite.** The CommandPalette, keyboard hooks, and feature flag system already exist. Build on them.

---

## Acceptance Criteria

Before merging the `feat/ui-evolution` branch:

- All 8 golden flows pass manual smoke test
- No TypeScript errors (`pnpm check`)
- No new console errors in browser
- New tests pass (`pnpm test`)
- Parts B and C are gated behind feature flags (disabled by default)
- Dark mode and light mode both work correctly
- With all feature flags OFF, the app looks like the new gunmetal visual but behaves identically to before
- With flags ON, density toggle, enhanced command palette, and keyboard hints all work
- PR includes before/after screenshots

---

## Lifecycle After Merge

Once the branch is merged to `main` and deployed:

1. **Enable `ui-density-toggle` for your account only** via the feature flag admin UI. Test against real production data.
2. **Enable `ui-command-palette-v2` and `ui-keyboard-hints`** for your account. Test the full evolved experience.
3. **When satisfied, flip all three flags to enabled globally.** Everyone sees the evolved UI.
4. **Optional cleanup sprint (1–2 weeks later):** Remove the feature flag checks from the code. The evolved behavior becomes the only behavior. Clean up any remaining hardcoded `blue-*`/`gray-*` in non-golden-flow components.

---

## Research Sources

These articles informed the design direction. Reference them for judgment calls:

1. "How White Space Killed an Enterprise App" (Christie Lenneville) — Why data density matters
2. "UX Pattern Analysis: Enterprise Data Tables" (Pencil & Paper) — Left-align text, right-align numbers, density toggles
3. "How We Redesigned the Linear UI" (Linear) — "Exciting evolution not complete disassembly"
4. "Building a Superhuman of X" (Rahul Vohra) — Every interaction under 100ms, Cmd+K, keyboard-first
5. "UI Density" (Matt Ström-Awn) — Visual density vs information density vs design density
6. Material Design Density Guidelines — Three density levels, compact reduces row height/padding/margins

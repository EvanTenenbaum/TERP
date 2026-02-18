# TERP UI Evolution — File Change Manifest

> Implementation checklist organized by part. Check off each file as you complete it.

---

## Part A: Visual Migration (No Feature Flag)

These changes are direct replacements. No conditional logic, no toggles.

### Files to Modify

| # | File | What Changes | Lines Touched |
|---|------|-------------|---------------|
| A1 | `client/index.html` | Add Google Fonts `<link>` for IBM Plex Sans + IBM Plex Mono | +3 |
| A2 | `client/src/index.css` | Replace `:root` and `.dark` token blocks with gunmetal values from `DESIGN_TOKENS.css`. Add `--font-sans` and `--font-mono` to `@theme inline`. Add `font-feature-settings: "tnum" on, "lnum" on` to body. Add status color variables. | ~80 |
| A3 | `client/src/components/work-surface/InspectorPanel.tsx` | Replace 11 hardcoded `gray-*` classes with semantic tokens (`bg-background`, `border-border`, `bg-muted`, `text-foreground`, `text-muted-foreground`) | 11 |
| A4 | `client/src/components/work-surface/PickPackWorkSurface.tsx` | Replace hardcoded `gray-*` → semantic tokens, `blue-*` → `primary`/status tokens | ~45 |
| A5 | `client/src/components/work-surface/ClientLedgerWorkSurface.tsx` | Replace hardcoded `gray-*` → semantic tokens, `blue-*` → `primary`/status tokens | ~24 |
| A6 | `client/src/components/work-surface/OrdersWorkSurface.tsx` | Replace `blue-*` status badge → status token | ~2 |
| A7 | `client/src/components/work-surface/InvoicesWorkSurface.tsx` | Replace `blue-*` status badge → status token | ~2 |
| A8 | `client/src/components/work-surface/InventoryWorkSurface.tsx` | Replace `blue-*` status badge → status token | ~1 |
| A9 | `client/src/components/work-surface/ClientsWorkSurface.tsx` | Replace `blue-*` links → `primary` | ~3 |
| A10 | `client/src/components/layout/ModuleFlowIntro.tsx` | Replace hardcoded `blue-*` → `primary`/semantic tokens | ~4 |

**Part A total: 10 files modified, 0 files created, ~175 lines touched.**

### Status Badge Migration Pattern

Every Work Surface has a status color map object near the top of the file. The pattern is:

```tsx
// BEFORE:
PROCESSING: "bg-blue-100 text-blue-800",
SENT: "bg-blue-100 text-blue-800",

// AFTER (using new status CSS variables):
PROCESSING: "bg-[oklch(var(--status-info-bg))] text-[oklch(var(--status-info-fg))]",
SENT: "bg-[oklch(var(--status-info-bg))] text-[oklch(var(--status-info-fg))]",

// OR simpler — just use the semantic primary:
PROCESSING: "bg-primary/10 text-primary",
SENT: "bg-primary/10 text-primary",
```

The simpler `bg-primary/10 text-primary` approach is recommended. It's fewer tokens and automatically adapts to both light and dark mode.

---

## Part B: Density System (Feature Flagged)

### New Files to Create

| # | File | Lines | Purpose |
|---|------|-------|---------|
| B1 | `client/src/contexts/DensityContext.tsx` | ~80 | React context: comfortable/compact, localStorage, CSS class toggle. See `reference-implementations/DensityContext.tsx`. |
| B2 | `client/src/hooks/useDensity.ts` | ~15 | Convenience re-export: `export { useDensity } from "@/contexts/DensityContext"` |

### Files to Modify

| # | File | What Changes | Lines Touched |
|---|------|-------------|---------------|
| B3 | `client/src/index.css` | Add density CSS variable block (`:root` comfortable defaults + `.density-compact` overrides) | +15 |
| B4 | `client/src/components/ui/table.tsx` | `TableHead`: `h-10 px-2` → `h-[var(--density-row-h)] px-[var(--density-cell-px)]`. `TableCell`: `p-2` → `px-[var(--density-cell-px)] py-[var(--density-cell-py)]`. Add `text-[length:var(--density-font-size)]` to both. | 4 |
| B5 | `client/src/components/layout/AppHeader.tsx` | `h-16` → `h-[var(--density-header-h)]`. Add density toggle button (gated behind `isEnabled("ui-density-toggle")`). | ~12 |
| B6 | `client/src/components/layout/Sidebar.tsx` | Nav item `py-2`/`py-1.5` → `py-[var(--density-sidebar-item-py)]`. Header `h-16` → `h-[var(--density-header-h)]`. | ~8 |
| B7 | `client/src/components/DashboardLayout.tsx` | Default sidebar width: 280px comfortable, 240px compact. | ~4 |
| B8 | `client/src/components/work-surface/InspectorPanel.tsx` | Reduce header padding and section spacing in compact. | ~6 |
| B9 | `client/src/components/work-surface/WorkSurfaceStatusBar.tsx` | Reduce height in compact. | ~3 |
| B10 | `client/src/App.tsx` | Import and wrap with `DensityProvider`. | +5 |

**Part B total: 8 files modified, 2 files created, ~72 lines touched.**

### Feature Flag to Add

Via TERP admin UI or tRPC mutation:

```
key: "ui-density-toggle"
description: "Enable compact/comfortable density toggle in the header"
module: "ui"
enabled: false
```

---

## Part C: Power-User Features (Feature Flagged)

### New Files to Create

| # | File | Lines | Purpose |
|---|------|-------|---------|
| C1 | `client/src/hooks/useRecentItems.ts` | ~60 | LRU recent items in localStorage. See `reference-implementations/useRecentItems.ts`. |
| C2 | `client/src/components/ui/kbd.tsx` | ~30 | Keyboard shortcut badge component. See `reference-implementations/kbd.tsx`. |
| C3 | `client/src/hooks/useKeyboardHints.ts` | ~40 | Hint visibility toggle with localStorage. See `reference-implementations/useKeyboardHints.ts`. |
| C4 | `client/src/components/KeyboardHintBadge.tsx` | ~25 | Conditional kbd wrapper. See `reference-implementations/KeyboardHintBadge.tsx`. |

### Files to Modify

| # | File | What Changes | Lines Touched |
|---|------|-------------|---------------|
| C5 | `client/src/components/CommandPalette.tsx` | Add Recent Items group, Context Actions group, better search. Gate behind `isEnabled("ui-command-palette-v2")`. | ~200 |
| C6 | `client/src/components/layout/AppHeader.tsx` | Replace `<form>` search bar with clickable "Search or jump to... ⌘K" button (gated behind flag). | ~15 |
| C7 | `client/src/components/work-surface/WorkSurfaceStatusBar.tsx` | Add keyboard hints row: `↑↓ Navigate  ↵ Open  Esc Close  ⌘K Command` (gated). | ~25 |
| C8–C18 | All 11 `*WorkSurface.tsx` files | Add `addRecentItem()` on inspector open (~3 lines each). Register shortcuts and wrap buttons with `KeyboardHintBadge` (~15 lines each). All gated. | ~18 each |

**Part C total: 12 files modified, 4 files created, ~415 lines touched.**

### Feature Flags to Add

```
key: "ui-command-palette-v2"
description: "Enhanced command palette with recent items, context actions, and search"
module: "ui"
enabled: false

key: "ui-keyboard-hints"
description: "Show keyboard shortcut badges on action buttons and status bar"
module: "ui"
enabled: false
```

---

## Grand Total

| Part | Files Modified | Files Created | Lines Touched | Feature Flagged |
|------|---------------|---------------|---------------|-----------------|
| A: Visual Migration | 10 | 0 | ~175 | No |
| B: Density System | 8 | 2 | ~72 | Yes |
| C: Power-User Features | 12 | 4 | ~415 | Yes |
| **Total** | **30** | **6** | **~662** | |

All on one branch: `feat/ui-evolution`.

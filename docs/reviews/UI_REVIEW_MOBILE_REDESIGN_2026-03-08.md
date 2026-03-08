# TERP UI Review & Mobile Redesign Plan

**Date**: 2026-03-08
**Scope**: Full UI/UX audit — desktop & mobile, with Instagram-style gallery/catalogue redesign
**Priority**: Gallery mode + Live Catalog mobile experience

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Critical Findings — Mobile](#critical-findings--mobile)
4. [Critical Findings — Desktop](#critical-findings--desktop)
5. [Gallery Mode: Instagram-Style Redesign Plan](#gallery-mode-instagram-style-redesign-plan)
6. [Sales Catalogue: Instagram-Style Redesign Plan](#sales-catalogue-instagram-style-redesign-plan)
7. [Cross-Cutting Improvements](#cross-cutting-improvements)
8. [Implementation Phases](#implementation-phases)
9. [Component-Level Specifications](#component-level-specifications)

---

## Executive Summary

TERP's UI has strong foundational patterns — shadcn/ui components, LinearWorkspaceShell, responsive-table patterns, and CHAOS-011 touch targets. However, the mobile experience for **image-heavy surfaces** (Gallery mode, Live Catalog) suffers from excessive white space, card-heavy layouts that waste vertical real estate, and desktop-first thinking that doesn't translate to thumb-zone ergonomics.

The two highest-impact redesign targets are:

1. **Inventory Gallery Mode** — Currently uses traditional card grid (`sm:grid-cols-2 xl:grid-cols-3`) with `aspect-[4/3]` images, full card chrome (header, content, footer), and generous `gap-4` spacing. On mobile this means ~1.5 cards visible per screen, massive scroll depth, and wasted space.

2. **Live Catalog (VIP Portal)** — Uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` with `aspect-square` images plus full card metadata blocks, buttons, and `gap-4` spacing. On mobile: one card per row with significant padding overhead.

Both should adopt **Instagram browser-style feed density** on mobile: edge-to-edge images, minimal metadata overlays, zero card chrome, and near-zero gaps.

---

## Current State Analysis

### Layout Architecture
| Layer | Pattern | Assessment |
|-------|---------|------------|
| Shell | `DashboardLayout` with collapsible `Sidebar` → `SidebarInset` → `main.p-4` | Good — sidebar collapses on mobile |
| Workspace | `LinearWorkspaceShell` — sticky tabs, eyebrow nav, command strip | Good structure, but tab row + command strip can consume 120px+ on mobile |
| Content | Pages use `container mx-auto` or direct workspace content | Inconsistent — some pages use container (double-padding), some don't |
| Gallery | `BatchGalleryCard` in `grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3` | Too sparse on mobile — 16px gap + 16px padding = 32px wasted horizontally |
| Catalog | `LiveCatalog` in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` | One column on mobile with full cards — very low density |

### Spacing Audit
| Component | Padding | Gap | Mobile Waste |
|-----------|---------|-----|-------------|
| `BatchGalleryCard` | Card py-6, CardHeader px-6, CardContent px-6 | grid gap-4 + p-4 wrapper | ~64px horizontal, ~48px vertical per card |
| `LiveCatalog` cards | CardHeader pb-3, CardContent space-y-3 | grid gap-4 + container px-4 | ~32px horizontal, ~24px vertical per card |
| `InventoryCard` (list mode mobile) | Card w-full, CardHeader pb-3, CardContent space-y-4 | Not in grid | Full card chrome per item |
| `UnifiedSalesPortal` | container p-4 md:p-6, cards p-4, grid gap-4 | Multiple nested spacing layers | ~48px horizontal at mobile |

### Image Handling
| Surface | Aspect | Object-fit | Placeholder | Lazy |
|---------|--------|-----------|-------------|------|
| Gallery `BatchGalleryCard` | `aspect-[4/3]` | `object-cover` | Icon fallback | No |
| Catalog `LiveCatalog` | `aspect-square` | `object-cover` | Emoji 🌿 fallback | `loading="lazy"` |
| Product cards elsewhere | Mixed/none | Mixed | Text or icon | No |

### Mobile Breakpoint Strategy
- Single breakpoint: `768px` via `useIsMobile()` and Tailwind `md:` prefix
- `max-md:min-h-11` on buttons (44px touch target) — good
- CSS-level touch targets for selects, menu items, tabs — good
- Missing: intermediate breakpoints for large phones (428px), small tablets (640px)

---

## Critical Findings — Mobile

### F1: Gallery Cards Consume Excessive Vertical Space
**Location**: `client/src/components/inventory/BatchGalleryCard.tsx`
**Issue**: Each card includes: image (`aspect-[4/3]`), status badge overlay, SKU text, product name, brand/supplier grid, quantity grid, badge row, and 2-button footer. At 375px width, a single card is ~480px tall — meaning less than 1.5 cards visible without scrolling.
**Impact**: Users must scroll extensively to browse inventory visually. The whole point of gallery mode is rapid visual scanning, but the metadata overwhelms the image.
**Benchmark**: Instagram mobile shows 1 full image + partial next post per screen in feed view, or 9 thumbnails (3x3) in grid/profile view. Both prioritize image over metadata.

### F2: Live Catalog Single-Column Mobile Grid
**Location**: `client/src/components/vip-portal/LiveCatalog.tsx:804`
**Issue**: `grid-cols-1` at mobile means one product per row. Combined with `aspect-square` image + full `CardHeader` + `CardContent` with price, attributes, and action button — each item is ~520px tall.
**Impact**: VIP portal buyers see 1 product at a time on mobile. This is a critical sales surface — low density means fewer products seen, lower engagement.

### F3: White Space Accumulation
**Issue**: Spacing compounds across layers:
- `main` has `p-4` (DashboardLayout)
- `container` class adds `px-4` (index.css)
- Grid wrapper adds `p-4` (InventoryWorkSurface)
- `gap-4` between cards (16px)
- Cards have internal `py-6` + `px-6`

On a 375px screen, the actual content width per card is: 375 - 16(main) - 16(container) - 16(grid-p) = 327px. With gap-4, a 2-col grid would give each card only ~155px — forcing single column.
**Fix**: Eliminate nested padding on mobile. The grid should go edge-to-edge within the workspace content area.

### F4: Sticky Header Stack Consumes Screen
**Location**: `LiveCatalog.tsx:462` — sticky header with search + toolbar + filter chips
**Issue**: The sticky header includes: search bar (~44px), toolbar row with filter/views/sort (~44px), filter chips row (~32px when active). Total: ~120px fixed header + system header (~56px) + workspace tabs (~46px) = **222px consumed before content begins**.
**Impact**: On a 667px iPhone SE height, only 445px remains for product content — less than 1 full product card.

### F5: Card Footer Buttons Redundant on Mobile
**Location**: `BatchGalleryCard.tsx:172-193`
**Issue**: Two full-width buttons ("Open Drawer" and "Adjust Qty") in the card footer take ~44px each = 88px per card dedicated to actions that could be accessed via tap-to-open or long-press.
**Impact**: 88px per card is ~18% of the card height dedicated to buttons that duplicate the tap-to-open behavior.

### F6: Missing Pull-to-Refresh and Infinite Scroll
**Issue**: Both Gallery and Catalog use pagination buttons ("Previous" / "Next") at the bottom. On mobile, this is an interruption-heavy pattern.
**Impact**: Users must scroll to bottom, tap "Next", wait for load, then scroll-to-top mental model resets. Instagram uses infinite scroll for continuous browsing.

---

## Critical Findings — Desktop

### F7: Gallery Grid Under-Utilizes Wide Screens
**Location**: `InventoryWorkSurface.tsx:2558`
**Issue**: `sm:grid-cols-2 xl:grid-cols-3` — on a 1920px monitor with sidebar collapsed, only 3 columns. At `aspect-[4/3]`, each card image is ~520px wide — oversized for a gallery scan.
**Impact**: Desktop users see 6-9 items per screen. A denser grid (4-5 columns) with smaller cards would enable faster visual scanning.

### F8: Sales Portal Kanban Not Horizontally Scrollable on Mobile
**Location**: `UnifiedSalesPortalPage.tsx:960`
**Issue**: `flex-col md:flex-row` — on mobile, pipeline columns stack vertically. Each column has its own `ScrollArea` at `h-[calc(100vh-400px)]`. This creates nested scroll containers.
**Impact**: Users must scroll past the entire "Sales Sheets" column to reach "Quotes". On mobile, a horizontally swipeable kanban or tab-based approach would be better.

### F9: Inventory Stats Bar Hidden on Mobile
**Location**: `InventoryWorkSurface.tsx:1801-1826`
**Issue**: The stats row (Page Rows, Units, Value, Live) displays as `flex gap-4` without responsive wrapping. On narrow screens, this line overflows or gets cut off.
**Impact**: Key operational metrics become unreadable on mobile.

### F10: Inconsistent View Mode Toggle Placement
**Issue**: Gallery/Table toggle is in the header area on Inventory, but view mode toggles on Sales Portal are in a different position. There's no consistent pattern for switching data visualization modes.
**Impact**: Users build mental models per page rather than learning a system-wide pattern.

---

## Gallery Mode: Instagram-Style Redesign Plan

### Design Philosophy
Instagram's mobile web layout prioritizes:
1. **Edge-to-edge images** — no card borders, no horizontal padding
2. **Minimal metadata** — username + actions below image, not in a card wrapper
3. **Zero inter-item gaps** — posts flow into each other with only a thin separator
4. **Vertical scrolling** — one post width = viewport width
5. **Two modes**: Feed (full-width single column) and Grid (3x3 thumbnails)

### Proposed Gallery Modes

#### Mode A: "Feed View" (Default Mobile)
```
┌─────────────────────────────────────┐
│ [Status Badge]          [···] Menu  │ ← Overlay on image
│                                     │
│          FULL-WIDTH IMAGE           │
│         (aspect-ratio: 4/5)         │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Gelato · Brand Name                 │ ← 1 line: name + brand
│ 42.5 lbs avail · $1,200/lb  [+Qty] │ ← 1 line: key metrics + action
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤ ← Hairline divider (1px)
│ [Status Badge]          [···] Menu  │
│                                     │
│          FULL-WIDTH IMAGE           │
│                                     │
```

**Key changes from current**:
- Image goes **full viewport width** — no card padding, no container padding
- Aspect ratio changes from 4:3 → **4:5** (matches Instagram's 2025 standard, optimized for portrait mobile)
- Metadata collapses from 5 sections to **2 lines** below image
- Status badge **overlays** image (already done, keep it)
- SKU shown on tap/drawer, not on card
- Brand/Supplier on one line, not a 2-col grid
- Quantity/COGS on one line with inline action
- **No card footer buttons** — tap card to open drawer, long-press or "..." menu for quick actions
- **Zero gap** between items — use a 1px `border-b` separator
- Image-to-metadata spacing: **8px** (not 24px)

#### Mode B: "Grid View" (3-Column Thumbnails)
```
┌───────────┬───────────┬───────────┐
│           │           │           │
│  [thumb]  │  [thumb]  │  [thumb]  │
│           │           │           │
│  Name     │  Name     │  Name     │
│  42 lbs   │  12 lbs   │  88 lbs   │
├───────────┼───────────┼───────────┤
│           │           │           │
│  [thumb]  │  [thumb]  │  [thumb]  │
│           │           │           │
│  Name     │  Name     │  Name     │
│  42 lbs   │  12 lbs   │  88 lbs   │
└───────────┴───────────┴───────────┘
```

**Key changes**:
- 3 columns with **2px gaps** (Instagram grid gap)
- Images at `aspect-square` (1:1) for uniform grid
- **2 lines** of metadata below: product name (truncated), available qty
- Tap to open full detail drawer
- No buttons, no badges, no card chrome
- On desktop: 4-5 columns at larger breakpoints

#### Mode C: "Compact List" (Existing Table, Improved)
Keep existing table view but add a thumbnail column (40x40px rounded square) as the first column for visual reference.

### Technical Implementation

**New Component**: `BatchFeedCard.tsx` (Feed View)
```
- Remove Card wrapper entirely — use a plain div with border-bottom
- Image: full-width, aspect-[4/5], object-cover
- Metadata: px-3 py-2 (tight padding)
- Product name: text-sm font-semibold, line-clamp-1
- Metrics line: text-xs text-muted-foreground
- Tap handler on entire surface (not separate button)
- Menu (···) as absolute-positioned icon button, top-right of image
```

**New Component**: `BatchGridThumb.tsx` (Grid View)
```
- No card wrapper — bare div
- Image: aspect-square, object-cover, rounded-none
- 2-line caption: text-xs, px-1 py-1
- Tap to open drawer
- gap-0.5 (2px) between items
```

**Grid Container Changes** (`InventoryWorkSurface.tsx`):
```tsx
// Mobile feed (< 768px)
<div className="divide-y divide-border">
  {items.map(item => <BatchFeedCard key={id} {...props} />)}
</div>

// Mobile grid
<div className="grid grid-cols-3 gap-0.5">
  {items.map(item => <BatchGridThumb key={id} {...props} />)}
</div>

// Desktop gallery (768px+)
<div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
  {items.map(item => <BatchGalleryCard key={id} {...props} />)}
</div>
```

**View Mode Selector** (3 modes on mobile, 2 on desktop):
- Mobile: Feed | Grid | Table
- Desktop: Gallery | Table

---

## Sales Catalogue: Instagram-Style Redesign Plan

### Current Problems (Live Catalog)
1. `grid-cols-1` on mobile — one card per row
2. `aspect-square` images with full card below — ~520px per item
3. Search + filter toolbar consumes ~120px sticky header
4. "Add to Interest List" button takes 44px per card
5. Pagination instead of infinite scroll

### Proposed Redesign

#### Mobile Layout: Product Feed
```
┌─────────────────────────────────────┐
│  🔍 Search...              [≡] [🛒] │ ← Collapsed header: search + filter + cart
├─────────────────────────────────────┤
│                                     │
│          FULL-WIDTH IMAGE           │
│         (aspect-ratio: 4/5)         │
│                                     │
│   [$LOW STOCK]                      │ ← Badge overlay (if applicable)
├─────────────────────────────────────┤
│  Gelato #7 — Indoor                 │ ← Product name + category
│  $1,200/lb · 42 lbs · Grade A      │ ← Price + qty + grade on one line
│  [♡ Add to List]     [🔔 Alert]     │ ← Compact action row
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                     │
│          FULL-WIDTH IMAGE           │
│                                     │
```

#### Mobile Layout: Product Grid (Browse Mode)
```
┌──────────────────┬──────────────────┐
│                  │                  │
│    [Product A]   │    [Product B]   │
│   aspect-[3/4]   │   aspect-[3/4]   │
│                  │                  │
│  Gelato #7       │  Purple Punch    │
│  $1,200/lb       │  $980/lb         │
│  42 lbs          │  18 lbs          │
├──────────────────┼──────────────────┤
│                  │                  │
│    [Product C]   │    [Product D]   │
│                  │                  │
```

**2 columns, 4px gaps**, tight metadata. This is similar to e-commerce apps (Shopify, SSENSE, Farfetch).

### Key Changes

1. **Sticky header collapse**: On scroll-down, collapse to just search icon + filter icon + cart icon (single row, ~44px). On scroll-up or tap, expand to full search bar.
2. **Image aspect**: Change from `aspect-square` to `aspect-[3/4]` (portrait, matches product photography better)
3. **Card chrome removal**: No `Card`, `CardHeader`, `CardContent` wrappers on mobile. Use bare `div` with `border-b`.
4. **Metadata condensation**: From 4 separate rows (title, category, price block, attributes block, buttons) → 3 lines max (name, price+qty+grade, compact actions)
5. **Interest list action**: Replace full-width button with a small heart/bookmark icon overlay on image corner. Tap to toggle.
6. **Infinite scroll**: Replace pagination with `IntersectionObserver`-based infinite scroll. Load 20 items at a time.
7. **Pull-to-refresh**: Add pull-to-refresh gesture for catalog refresh.
8. **Quick-add swipe**: Swipe right on a product card to add to interest list (haptic feedback).

### Desktop Improvements

On desktop (768px+), keep the card grid but tighten:
- `grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` (currently max 4)
- Reduce `gap-4` to `gap-3`
- Reduce card padding: `CardContent.space-y-3` → `space-y-2`
- Keep full card chrome but slim it

---

## Cross-Cutting Improvements

### CX1: Eliminate Padding Multiplication on Mobile
**Problem**: `main.p-4` + `container.px-4` + wrapper `p-4` = up to 48px horizontal padding.
**Fix**: On mobile (`< 768px`):
- `main` padding: `p-2` (8px)
- `linear-workspace-content` padding: `0` (already `0.4rem`, make it `0`)
- Grid/container wrappers: `px-0` on mobile
- Let cards/items go edge-to-edge

### CX2: Consistent View Mode Pattern
**Proposal**: Create a `ViewModeToggle` component used across all surfaces:
```tsx
<ViewModeToggle
  modes={["feed", "grid", "table"]}  // or ["gallery", "table"]
  active={viewMode}
  onChange={setViewMode}
/>
```
Place consistently in the workspace command strip area.

### CX3: Mobile-First Image Component
**Create**: `ProductImage` component that handles:
- Responsive aspect ratios (4:5 feed, 1:1 grid, 4:3 desktop gallery)
- Lazy loading with IntersectionObserver
- Blur-up placeholder (low-res → full-res)
- Error fallback (consistent across app — no emoji, use a branded placeholder)
- `srcset` for responsive image sizes
- WebP/AVIF format negotiation

### CX4: Infinite Scroll Hook
**Create**: `useInfiniteScroll` hook:
```tsx
const { items, loadMore, hasMore, isLoading } = useInfiniteScroll({
  queryFn: (page) => trpc.inventory.list.useQuery({ page, limit: 20 }),
  getNextPage: (lastPage) => lastPage.nextCursor,
});
```
Replace pagination on Gallery and Catalog mobile views.

### CX5: Collapsible Sticky Headers
**Pattern**: Headers should collapse on scroll-down, expand on scroll-up (iOS Safari style).
- Use `IntersectionObserver` + `scroll` direction detection
- Compact mode: icon-only buttons, no labels
- Full mode: search bar + filter chips visible

### CX6: Bottom Navigation Bar for VIP Portal
The VIP Portal (`LiveCatalog`) should have a bottom tab bar on mobile:
```
┌──────────┬──────────┬──────────┬──────────┐
│  Browse  │  Search  │  List    │  Account │
│   🏠     │   🔍     │   📋     │    👤    │
└──────────┴──────────┴──────────┴──────────┘
```
This keeps primary actions in the thumb zone. The current FAB (floating cart button) is good but insufficient.

### CX7: Typography Scale Tightening on Mobile
Current cards use `text-base` (16px) for titles and `text-sm` (14px) for labels. On mobile feed cards:
- Title: `text-sm font-semibold` (14px) — saves 2px per line
- Labels: `text-xs` (12px)
- Price: `text-base font-bold` (16px) — keep prominent

### CX8: Haptic Feedback for Mobile Interactions
Add `navigator.vibrate(10)` for:
- Adding to interest list
- Swipe actions
- Drag-and-drop (kanban)
- Destructive actions (longer vibration)

### CX9: Dark Mode for Photo Surfaces
Gallery and catalog views with product photography look significantly better against dark backgrounds. Consider:
- Auto-dark mode for gallery/catalog surfaces only
- Or: dark image viewport with light metadata areas

### CX10: Skeleton Loading Improvements
Current: `Loader2` spinner for catalog, generic skeletons elsewhere.
Proposed: Content-shaped skeletons matching the feed/grid layout:
- Feed skeleton: Full-width shimmer rectangle (aspect-4/5) + 2-line text shimmer
- Grid skeleton: 3x3 square shimmer grid
- Show 3-6 skeleton items while loading

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
| Task | File | Effort |
|------|------|--------|
| Create `ProductImage` component | `components/ui/product-image.tsx` | S |
| Create `useInfiniteScroll` hook | `hooks/useInfiniteScroll.ts` | M |
| Create `ViewModeToggle` component | `components/ui/view-mode-toggle.tsx` | S |
| Mobile padding reset (CX1) | `index.css`, workspace shells | S |
| Fix stats bar mobile wrapping (F9) | `InventoryWorkSurface.tsx` | S |

### Phase 2: Gallery Feed Mode (Week 2)
| Task | File | Effort |
|------|------|--------|
| Create `BatchFeedCard` component | `components/inventory/BatchFeedCard.tsx` | M |
| Create `BatchGridThumb` component | `components/inventory/BatchGridThumb.tsx` | M |
| Add Feed/Grid toggle to mobile gallery | `InventoryWorkSurface.tsx` | M |
| Replace pagination with infinite scroll (gallery) | `InventoryWorkSurface.tsx` | M |
| Desktop gallery density increase (F7) | `InventoryWorkSurface.tsx` | S |

### Phase 3: Catalog Feed Mode (Week 3)
| Task | File | Effort |
|------|------|--------|
| Create `CatalogFeedItem` component | `components/vip-portal/CatalogFeedItem.tsx` | M |
| Create `CatalogGridItem` component | `components/vip-portal/CatalogGridItem.tsx` | M |
| Collapsible sticky header | `LiveCatalog.tsx` | M |
| 2-column grid mode for mobile browse | `LiveCatalog.tsx` | M |
| Interest list overlay action (heart icon) | `CatalogFeedItem.tsx` | S |
| Replace pagination with infinite scroll | `LiveCatalog.tsx` | M |
| Add pull-to-refresh | `LiveCatalog.tsx` | S |

### Phase 4: Polish & Cross-Cutting (Week 4)
| Task | File | Effort |
|------|------|--------|
| Consistent skeleton loading (CX10) | Multiple | M |
| Haptic feedback (CX8) | Utility hook | S |
| Sales portal mobile kanban tabs (F8) | `UnifiedSalesPortalPage.tsx` | M |
| VIP portal bottom nav (CX6) | VIP portal layout | M |
| Dark mode for photo surfaces (CX9) | CSS variables | M |
| Tablet breakpoint (640px) | Global | S |

---

## Component-Level Specifications

### `BatchFeedCard` (Mobile Gallery Feed)

```
Props:
  - sku: string
  - productName: string
  - brandName: string
  - status: string
  - availableQty: string
  - unitCogs: string
  - thumbnailUrl?: string
  - stockStatus?: StockStatus
  - onOpen: () => void
  - onAdjustQuantity: () => void

Structure:
  <article> (no card wrapper)
    <button onClick={onOpen} className="block w-full">
      <div className="relative aspect-[4/5] w-full bg-muted">
        <ProductImage src={thumbnailUrl} alt={productName} fill />
        <Badge className="absolute left-3 top-3">{status}</Badge>
        <button className="absolute right-3 top-3" onClick={onMenu}>
          <MoreHorizontal />
        </button>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold line-clamp-1">
          {productName} · {brandName}
        </p>
        <p className="text-xs text-muted-foreground">
          {availableQty} lbs avail · {unitCogs}/lb
        </p>
      </div>
    </button>
  </article>
```

**Height estimate at 375px**: Image: ~468px (375 × 5/4) + Metadata: ~44px = **~512px** — but the image IS the content, not white space. The information density per pixel is dramatically higher than the current ~480px card where 200px+ is card chrome.

### `CatalogFeedItem` (Mobile Catalog Feed)

Similar to `BatchFeedCard` but with:
- Price prominently displayed (`text-base font-bold text-primary`)
- Heart/bookmark toggle on image corner
- Compact action row with icon buttons
- No full-width "Add to Interest List" button

### `BatchGridThumb` (Mobile Gallery Grid)

```
Props:
  - thumbnailUrl?: string
  - productName: string
  - availableQty: string
  - onOpen: () => void

Structure:
  <button onClick={onOpen} className="block">
    <div className="aspect-square bg-muted overflow-hidden">
      <ProductImage src={thumbnailUrl} alt={productName} fill />
    </div>
    <div className="px-1 py-1">
      <p className="text-[11px] font-medium line-clamp-1">{productName}</p>
      <p className="text-[10px] text-muted-foreground">{availableQty} lbs</p>
    </div>
  </button>
```

**Size at 375px**: Each thumb is ~122px wide (375px / 3 - 2px gaps) × 122px image + ~28px text = **~150px tall**. Users see **8-9 items per screen** — a 6x improvement over current.

### `ProductImage` Component

```
Props:
  - src?: string
  - alt: string
  - aspectRatio?: "square" | "4/5" | "4/3" | "3/4"
  - fill?: boolean
  - priority?: boolean (skip lazy load)
  - className?: string

Features:
  - IntersectionObserver lazy loading (unless priority)
  - Smooth fade-in on load (opacity transition)
  - Fallback: neutral gray bg with subtle product icon (no emoji)
  - Error handling: hide broken img, show fallback
  - CSS: object-cover, width 100%
```

---

## Metrics & Success Criteria

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| Items visible per screen (gallery mobile) | 1.2 | 1 feed / 8 grid |
| Items visible per screen (catalog mobile) | 0.9 | 1 feed / 6 grid |
| Horizontal white space (mobile) | ~48px | ~0px (feed) / ~8px (grid) |
| Time to scan 20 items (gallery) | ~30s scroll | ~10s (grid), ~20s (feed) |
| Sticky header height (mobile) | ~120px | ~44px (collapsed) |
| First meaningful paint (catalog) | Spinner | Content-shaped skeleton |
| Desktop gallery columns | 3 max | 5 max |

---

## Design References

- **Instagram mobile web (2025)**: 4:5 aspect feed, 3-column grid profile, zero card chrome, edge-to-edge images
- **Shopify mobile app**: 2-column product grid, minimal metadata, heart-to-save
- **SSENSE app**: Full-bleed product images, minimal text overlay, dark mode for product photography
- **Pinterest**: Masonry grid, image-first, metadata on hover/tap
- **Apple App Store**: Card-free layouts, generous imagery, crisp typography hierarchy

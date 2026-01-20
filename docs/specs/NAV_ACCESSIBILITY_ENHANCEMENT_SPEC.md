# NAV: Navigation Accessibility Enhancement Specification

**Version:** 1.0
**Created:** 2026-01-20
**Status:** Approved for Implementation
**Priority:** P1 (MVP Polish)

---

## Executive Summary

This specification defines the implementation plan for surfacing 8 currently hidden routes in the TERP navigation sidebar and Command Palette. The goal is to improve feature discoverability without adding new functionality.

**Scope:** Navigation configuration changes only (2 files)
**Effort:** ~2 hours
**Risk:** Low (configuration-only, no logic changes)

---

## Background

### Problem Statement

An accessibility audit identified 14 hidden routes in TERP. After analysis with Work Surfaces strategy alignment, 8 routes were determined to be high-value and should be visible in the main navigation.

### Routes to Surface

| Route | Current Status | Proposed Location |
|-------|----------------|-------------------|
| `/leaderboard` | Hidden | Sales group (after Dashboard) |
| `/needs` | Hidden | Sales group |
| `/matchmaking` | Hidden | Sales group |
| `/quotes` | Hidden | Sales group |
| `/returns` | Hidden | Sales group |
| `/vendor-supply` | Hidden | Inventory group |
| `/pricing/rules` | Hidden | Finance group |
| `/workflow-queue` | Hidden | Admin group |

### Routes Remaining Hidden (By Design)

| Route | Reason |
|-------|--------|
| `/help` | Already in Cmd+K via `?` shortcut |
| `/account` | User menu dropdown (personal settings) |
| `/locations` | Sub-feature accessed via Inventory Inspector |
| `/intake-receipts` | Workflow-triggered only |
| `/sales-portal` | Alternative view (future consideration) |
| `/pricing/profiles` | Sub-feature of Pricing Rules |

---

## Technical Design

### File Changes Required

#### 1. `client/src/config/navigation.ts`

**Icon Imports to Add:**
```typescript
import {
  // ... existing imports ...
  Trophy,           // Leaderboard
  Target,           // Client Needs
  Sparkles,         // Matchmaking
  FileQuestion,     // Quotes
  PackageX,         // Returns
  PackagePlus,      // Vendor Supply
  DollarSign,       // Pricing Rules (verify not already imported)
  ListOrdered,      // Workflow Queue
} from "lucide-react";
```

**Navigation Items to Add:**

```typescript
// === SALES GROUP (after Dashboard, before Clients) ===
// NAV-006: Leaderboard for performance tracking
{
  name: "Leaderboard",
  path: "/leaderboard",
  icon: Trophy,
  group: "sales",
  ariaLabel: "View team performance and rankings",
},

// === SALES GROUP (after Invoices) ===
// NAV-007: Client Needs for CRM workflow
{
  name: "Client Needs",
  path: "/needs",
  icon: Target,
  group: "sales",
  ariaLabel: "Track and manage client product needs",
},
// NAV-008: Matchmaking for needs-to-supply matching
{
  name: "Matchmaking",
  path: "/matchmaking",
  icon: Sparkles,
  group: "sales",
  ariaLabel: "Match client needs with available inventory",
},
// NAV-009: Quotes management
{
  name: "Quotes",
  path: "/quotes",
  icon: FileQuestion,
  group: "sales",
  ariaLabel: "Create and manage sales quotes",
},
// NAV-010: Returns processing
{
  name: "Returns",
  path: "/returns",
  icon: PackageX,
  group: "sales",
  ariaLabel: "Process customer returns and refunds",
},

// === INVENTORY GROUP (after Vendors) ===
// NAV-011: Vendor Supply items
{
  name: "Vendor Supply",
  path: "/vendor-supply",
  icon: PackagePlus,
  group: "inventory",
  ariaLabel: "Manage vendor supply items and availability",
},

// === FINANCE GROUP (after Credit Settings) ===
// NAV-012: Pricing Rules configuration
{
  name: "Pricing Rules",
  path: "/pricing/rules",
  icon: DollarSign,
  group: "finance",
  ariaLabel: "Configure pricing rules and algorithms",
},

// === ADMIN GROUP (after Feature Flags) ===
// NAV-013: Workflow Queue for operations
{
  name: "Workflow Queue",
  path: "/workflow-queue",
  icon: ListOrdered,
  group: "admin",
  ariaLabel: "View and manage background workflow tasks",
},
```

#### 2. `client/src/components/CommandPalette.tsx`

**Icon Imports to Add:**
```typescript
import {
  // ... existing imports ...
  Trophy,
  Target,
  Sparkles,
  FileQuestion,
  PackageX,
  PackagePlus,
  DollarSign,
  ListOrdered,
} from "lucide-react";
```

**Navigation Commands to Add:**
```typescript
// In Navigation group items array:
{
  id: "leaderboard",
  label: "Leaderboard",
  icon: Trophy,
  action: () => {
    setLocation("/leaderboard");
    onOpenChange(false);
  },
},
{
  id: "client-needs",
  label: "Client Needs",
  icon: Target,
  action: () => {
    setLocation("/needs");
    onOpenChange(false);
  },
},
{
  id: "matchmaking",
  label: "Matchmaking",
  icon: Sparkles,
  action: () => {
    setLocation("/matchmaking");
    onOpenChange(false);
  },
},
{
  id: "quotes",
  label: "Quotes",
  icon: FileQuestion,
  action: () => {
    setLocation("/quotes");
    onOpenChange(false);
  },
},
{
  id: "returns",
  label: "Returns",
  icon: PackageX,
  action: () => {
    setLocation("/returns");
    onOpenChange(false);
  },
},
{
  id: "vendor-supply",
  label: "Vendor Supply",
  icon: PackagePlus,
  action: () => {
    setLocation("/vendor-supply");
    onOpenChange(false);
  },
},
{
  id: "pricing-rules",
  label: "Pricing Rules",
  icon: DollarSign,
  action: () => {
    setLocation("/pricing/rules");
    onOpenChange(false);
  },
},
{
  id: "workflow-queue",
  label: "Workflow Queue",
  icon: ListOrdered,
  action: () => {
    setLocation("/workflow-queue");
    onOpenChange(false);
  },
},
```

---

## Post-Implementation State

### Navigation Sidebar

| Group | Before | After |
|-------|--------|-------|
| Sales | 8 items | 13 items (+5) |
| Inventory | 7 items | 8 items (+1) |
| Finance | 3 items | 4 items (+1) |
| Admin | 6 items | 7 items (+1) |
| **Total** | **24 items** | **32 items** |

### Command Palette

| Section | Before | After |
|---------|--------|-------|
| Navigation | 9 items | 17 items (+8) |
| Actions | 2 items | 2 items |
| **Total** | **11 items** | **19 items** |

### Hidden Routes

| Before | After |
|--------|-------|
| 14 routes | 6 routes |

---

## Atomic Tasks

| Task ID | Description | File | Effort | Dependencies |
|---------|-------------|------|--------|--------------|
| NAV-006 | Add Leaderboard to Sales nav (after Dashboard) | navigation.ts | 5 min | None |
| NAV-007 | Add Client Needs to Sales nav | navigation.ts | 5 min | NAV-006 |
| NAV-008 | Add Matchmaking to Sales nav | navigation.ts | 5 min | NAV-007 |
| NAV-009 | Add Quotes to Sales nav | navigation.ts | 5 min | NAV-008 |
| NAV-010 | Add Returns to Sales nav | navigation.ts | 5 min | NAV-009 |
| NAV-011 | Add Vendor Supply to Inventory nav | navigation.ts | 5 min | NAV-010 |
| NAV-012 | Add Pricing Rules to Finance nav | navigation.ts | 5 min | NAV-011 |
| NAV-013 | Add Workflow Queue to Admin nav | navigation.ts | 5 min | NAV-012 |
| NAV-014 | Add all 8 routes to Command Palette | CommandPalette.tsx | 15 min | NAV-013 |
| NAV-015 | Verify TypeScript compilation | - | 5 min | NAV-014 |
| NAV-016 | Manual QA verification | - | 15 min | NAV-015 |

**Total Estimated Effort:** ~1.5 hours

---

## Verification Checklist

- [ ] All 8 new routes appear in sidebar navigation
- [ ] Routes appear in correct groups and positions
- [ ] All routes are accessible via Cmd+K
- [ ] No TypeScript compilation errors
- [ ] Icons display correctly
- [ ] aria-labels are set for accessibility
- [ ] No visual regression in existing navigation
- [ ] Responsive layout not broken on mobile

---

## Rollback Plan

If issues are discovered post-deployment:
1. Revert changes to `navigation.ts`
2. Revert changes to `CommandPalette.tsx`
3. No database or API changes required
4. Instant rollback with no data impact

---

## Work Surfaces Alignment

All 8 routes implement appropriate patterns per `FEATURE_PRESERVATION_MATRIX.md`:

| Route | Work Surface Pattern | Status |
|-------|---------------------|--------|
| `/leaderboard` | Review Surface | Aligned |
| `/needs` | Review Surface | Aligned |
| `/matchmaking` | Panel + Filters | Aligned |
| `/quotes` | Work Surface | Aligned |
| `/returns` | Work Surface + Inspector | Aligned |
| `/vendor-supply` | Work Surface | Aligned |
| `/pricing/rules` | Work Surface + Inspector | Aligned |
| `/workflow-queue` | Review Surface | Aligned |

---

## Approval

- [x] Product Owner Approval: 2026-01-20
- [ ] Implementation Complete
- [ ] QA Verification Complete

# Meeting Items Cross-Reference Analysis

**Analysis Date:** January 29, 2026  
**Source:** Customer Meeting 2026-01-29  
**Purpose:** Identify items that already exist, are spec'd, or are in progress

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| **Already Implemented** | 11 | Items that exist in codebase |
| **Already Spec'd** | 8 | Items with existing specifications |
| **Known Bug (In Progress)** | 3 | Inventory-related bugs being worked |
| **Genuinely New** | 10 | Items requiring new work |

---

## Items to REMOVE (Already Exist or Obvious)

### Already Implemented in Codebase

| Meeting ID | Title | Evidence | Action |
|------------|-------|----------|--------|
| MEET-001 | Inventory page fails to load | **KNOWN BUG** - Already tracked as BUG-040 in roadmap | REMOVE - Obvious |
| MEET-003 | Spreadsheet View not functional | **IN PROGRESS** - SpreadsheetViewPage.tsx exists, behind feature flag, FEATURE-SPREADSHEET-VIEW-SPEC.md exists | REMOVE - Obvious |
| MEET-005 | Aging inventory highlight | **IMPLEMENTED** - AgingInventoryWidget.tsx exists with full implementation (Sprint 4 Track A: 4.A.4 MEET-025) | REMOVE |
| MEET-017 | Master Score is customizable | **IMPLEMENTED** - WeightCustomizer.tsx component exists in leaderboard | REMOVE |
| MEET-022 | Engagement = Frequency + Recency | **IMPLEMENTED** - LeaderboardPage.tsx shows ENGAGEMENT category with description "Order frequency, recency" | REMOVE |
| MEET-023 | Master Score weight components | **IMPLEMENTED** - WeightCustomizer allows customizing revenue, on-time payments, ordering, margin, credit usage, YoY growth, days since last order | REMOVE |
| MEET-028 | Inventory functionality unblocks all features | **KNOWN** - Already documented in UNIFIED_STRATEGIC_ROADMAP | REMOVE - Obvious |
| MEET-032 | Create Sales Order fails to load inventory | **KNOWN BUG** - Downstream of BUG-040 inventory loading | REMOVE - Obvious |
| MEET-009 | Client last seen / overdue tracking | **IMPLEMENTED** - PurchasePatternsWidget.tsx has daysSinceLastPurchase, MatchmakingOpportunitiesWidget shows overdue reorders | PARTIAL - May need enhancement |
| MEET-014 | Minimal client creation fields | **IMPLEMENTED** - QuickCreateClient.tsx (WS-011) allows name-only creation | REMOVE |
| MEET-011 | Hide unnecessary contact fields | **IMPLEMENTED** - QuickCreateClient shows only name, email/phone as minimal required | REMOVE |

### Already Spec'd (Have Specifications)

| Meeting ID | Title | Existing Spec | Action |
|------------|-------|---------------|--------|
| MEET-024 | AR/AP is accounting command center | **WS-001-SPEC.md** (Receive Payment), **WS-002-SPEC.md** (Pay Vendor) | REMOVE - Covered |
| MEET-026 | Receiving payments is higher risk | **WS-001-SPEC.md** mentions RBAC/permissions | KEEP - May need enhancement |
| MEET-010 | View client's last order from list | **FEAT-009-CLIENT-LEDGER-SPEC.md** covers client transaction history | REMOVE - Covered |
| MEET-025 | Cash handling - bulk distribution | **FEAT-007-CASH-AUDIT-SPEC.md** covers cash management | PARTIAL |
| MEET-002 | Dashboard inventory by category | **InventorySnapshotWidget.tsx** exists but may need category breakdown | KEEP - Enhancement needed |
| MEET-004 | Dashboard payables summary | Dashboard widgets exist but may need payables widget | KEEP - Verify |
| MEET-029 | Inventory as default landing page | User preference system exists in DashboardPreferencesContext | KEEP - Simple addition |

### Terminology/Business Rules Already Documented

| Meeting ID | Title | Status | Action |
|------------|-------|--------|--------|
| MEET-018 | Dual = Supplier + Buyer | **IMPLEMENTED** - CLIENT_TYPE_OPTIONS in LeaderboardPage.tsx shows "Dual (Both)" | REMOVE |
| MEET-019 | Financial + Reliability most important | **IMPLEMENTED** - Metric categories in LeaderboardPage show these prominently | REMOVE |
| MEET-030 | Daily workflow is like Tetris | **CONTEXT** - Not actionable, just user description | REMOVE |

---

## Items to KEEP (Genuinely New or Need Enhancement)

### New Feature Requests

| Meeting ID | Title | Priority | Notes |
|------------|-------|----------|-------|
| MEET-002 | Dashboard inventory snapshot by category | Now | InventorySnapshotWidget exists but needs category/price bracket breakdown |
| MEET-004 | Dashboard payables summary | Now | Need to verify if TotalDebtWidget covers this |
| MEET-006 | Cash on hand display | Next | AvailableCashWidget may exist - verify |
| MEET-008 | Debt warning system for at-risk clients | Now | **NEW** - No existing spec found |
| MEET-013 | Store client login names | Next | **NEW** - No existing field |
| MEET-020 | Add metric explanations to leaderboard | Next | **NEW** - Tooltips/help text needed |
| MEET-021 | Consider consolidating metrics | Later | **NEW** - UX simplification |
| MEET-029 | Set Inventory as default landing page | Next | **NEW** - User preference |
| MEET-031 | Simplify price category filtering | Next | **NEW** - UX improvement |

### Decisions/Deprioritizations to Document

| Meeting ID | Title | Priority | Notes |
|------------|-------|----------|-------|
| MEET-007 | Calendar integration deprioritized | Later | Customer confirmed - document in roadmap |
| MEET-015 | Infrequent client creation (~4x/year) | Later | Context for feature prioritization |
| MEET-016 | One-time visitors use existing client tab | Now | Business rule to document |
| MEET-027 | Dashboard requirements most important | Now | Prioritization guidance |

---

## Revised Item Count

| Category | Original Count | After Filtering | Removed |
|----------|----------------|-----------------|---------|
| Feature Requests | 12 | 7 | 5 |
| Business Rules | 8 | 3 | 5 |
| UI/UX Feedback | 5 | 3 | 2 |
| Bugs/Broken Flows | 3 | 0 | 3 (all known) |
| Decisions Made | 4 | 2 | 2 |
| Terminology | 1 | 0 | 1 |
| **TOTAL** | **32** | **15** | **17** |

---

## Recommended Action Items

### Immediate (Remove from Analysis)

1. Remove all inventory loading bugs (MEET-001, MEET-003, MEET-028, MEET-032) - already tracked
2. Remove implemented leaderboard features (MEET-017, MEET-022, MEET-023, MEET-018, MEET-019)
3. Remove implemented client features (MEET-014, MEET-011, MEET-010)
4. Remove aging inventory (MEET-005) - already implemented

### Keep and Prioritize

1. **MEET-008: Debt Warning System** - Genuinely new, high value
2. **MEET-002: Dashboard Category Breakdown** - Enhancement to existing widget
3. **MEET-020: Metric Explanations** - UX improvement
4. **MEET-026: Payment Permission Levels** - Security enhancement
5. **MEET-029: Default Landing Page** - User preference feature

---

*Cross-reference analysis completed: January 29, 2026*

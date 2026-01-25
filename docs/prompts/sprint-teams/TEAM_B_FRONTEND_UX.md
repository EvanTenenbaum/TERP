# Sprint Team B: Frontend UX & Navigation

**Branch:** `claude/sprint-team-b-frontend`
**Priority:** Can start in parallel with Team A
**Estimated Duration:** 3-4 days

---

## Your Mission

You are **Sprint Team B**, responsible for frontend UX improvements, navigation accessibility, and page-level fixes. Your work surfaces hidden features and improves the user experience.

---

## CRITICAL: Read Before Starting

1. **Read `/CLAUDE.md`** - All agent protocols apply
2. **Check `/docs/ACTIVE_SESSIONS.md`** - Ensure no conflicts
3. **Create session file** in `/docs/sessions/active/`
4. **Work on branch:** `claude/sprint-team-b-frontend`

---

## Your Owned Files

You have **exclusive write access** to:

```
client/src/config/navigation.ts
client/src/components/CommandPalette.tsx
client/src/pages/*.tsx (pages only, NOT work surfaces)
client/src/components/dashboard/widgets-v2/**
client/src/App.tsx (routing only)
client/src/pages/LiveShoppingPage.tsx
client/src/pages/HourTrackingPage.tsx (new file)
client/src/pages/VendorSupplyPage.tsx
client/src/pages/MatchmakingServicePage.tsx
```

**DO NOT MODIFY:**
- `server/**` (Teams A, C own)
- `client/src/components/work-surface/**` (Team E owns)
- `scripts/seed/**` (Team D owns)
- `client/src/hooks/**` (Team A owns)

---

## Task Execution Order

### Phase 1: Quick Wins - Navigation (Day 1, ~2 hours)

These are fast, low-risk changes that immediately surface hidden features.

#### NAV-006 through NAV-013: Add Navigation Items

**File:** `client/src/config/navigation.ts`

Add these navigation items in order:

```typescript
// In Sales group (after Dashboard):
{
  name: "Leaderboard",
  path: "/leaderboard",
  icon: Trophy,
  group: "sales",
  ariaLabel: "View team performance and rankings",
},

// After Invoices in Sales:
{
  name: "Client Needs",
  path: "/needs",
  icon: Target,
  group: "sales",
  ariaLabel: "View client needs and requirements",
},
{
  name: "Matchmaking",
  path: "/matchmaking",
  icon: Sparkles,
  group: "sales",
  ariaLabel: "Match products to client needs",
},
{
  name: "Quotes",
  path: "/quotes",
  icon: FileQuestion,
  group: "sales",
  ariaLabel: "Manage quotes and proposals",
},
{
  name: "Returns",
  path: "/returns",
  icon: PackageX,
  group: "sales",
  ariaLabel: "Process returns and refunds",
},

// In Inventory group (after Vendors):
{
  name: "Vendor Supply",
  path: "/vendor-supply",
  icon: PackagePlus,
  group: "inventory",
  ariaLabel: "View vendor supply offerings",
},

// In Finance group (after Credit Settings):
{
  name: "Pricing Rules",
  path: "/pricing/rules",
  icon: DollarSign,
  group: "finance",
  ariaLabel: "Configure pricing rules",
},

// In Admin group (after Feature Flags):
{
  name: "Workflow Queue",
  path: "/workflow-queue",
  icon: ListOrdered,
  group: "admin",
  ariaLabel: "View workflow queue",
},
```

**Import the icons at the top of the file.**

---

#### NAV-014: Add Routes to Command Palette

**File:** `client/src/components/CommandPalette.tsx`

Add the 8 new navigation commands to the Navigation group:

```typescript
// In the navigation commands array:
{
  id: "go-leaderboard",
  name: "Go to Leaderboard",
  shortcut: [],
  perform: () => navigate("/leaderboard"),
  section: "Navigation",
},
{
  id: "go-needs",
  name: "Go to Client Needs",
  shortcut: [],
  perform: () => navigate("/needs"),
  section: "Navigation",
},
// ... add all 8 routes
```

---

#### NAV-015: Verify TypeScript Compilation

```bash
pnpm check
```

---

#### NAV-016: Manual QA Verification

Test each new nav item:
1. Click the sidebar item
2. Verify route loads
3. Check Command Palette (Cmd+K)

---

#### NAV-017: Route CreditsPage in App.tsx

**File:** `client/src/App.tsx`

**Problem:** CreditsPage is imported but no route is defined.

**Fix:**
```typescript
// Find the routes section and add:
<Route path="/credits" element={<CreditsPage />} />
```

---

### Phase 2: Page Implementations (Days 1-2)

#### MEET-048: Create Hour Tracking Frontend (16 hours)

**New File:** `client/src/pages/HourTrackingPage.tsx`

The backend is fully implemented. Create the frontend:

```typescript
// Components to create:
// 1. ClockInOutButton - Toggle clock in/out
// 2. TimesheetView - Show current week's entries
// 3. TimeEntryForm - Manual entry creation
// 4. TimeAdjustmentDialog - Edit existing entries

// tRPC hooks to use:
trpc.hourTracking.clockIn.useMutation();
trpc.hourTracking.clockOut.useMutation();
trpc.hourTracking.startBreak.useMutation();
trpc.hourTracking.endBreak.useMutation();
trpc.hourTracking.listTimeEntries.useQuery();
trpc.hourTracking.getTimesheet.useQuery();
```

**Add route in App.tsx:**
```typescript
<Route path="/time-clock" element={<HourTrackingPage />} />
```

**Add navigation item.**

---

#### WS-010A: Integrate Photography Module (4 hours)

**File:** `client/src/pages/PhotographyPage.tsx`

**Problem:** PhotographyModule component (689 lines) exists but is never used.

**Fix:**
```typescript
// Import the module:
import { PhotographyModule } from '@/components/inventory/PhotographyModule';

// Use in the page:
<PhotographyModule
  onUpload={handleUpload}
  onApprove={handleApprove}
/>
```

---

#### LIVE-001: Live Shopping Session Console (4 hours)

**File:** `client/src/pages/LiveShoppingPage.tsx`
**Line:** 410

**Problem:** TODO comment indicates session console unimplemented.

**Options:**
1. **Implement:** Create session detail view with SSE events
2. **Remove:** Disable the clickable session row

Choose based on effort. If implementing:
```typescript
// Session detail view shows:
// - Current cart items
// - Customer info
// - Real-time updates via SSE
// - Action buttons (extend, end, convert)
```

---

### Phase 3: UX Improvements (Days 2-3)

#### FE-QA-009: Enable VendorSupplyPage Creation (8 hours)

**File:** `client/src/pages/VendorSupplyPage.tsx`
**Line:** 96

**Problem:** "Add Supply" button shows alert instead of form.

**Fix:**
1. Create SupplyCreationForm component
2. Wire to `vendorSupply.create` mutation
3. Add edit functionality
4. Connect "Find Matching Clients" to matchmaking

---

#### FE-QA-010: Wire MatchmakingServicePage Buttons (4 hours)

**File:** `client/src/pages/MatchmakingServicePage.tsx`

**Problem:** Four action buttons have no handlers:
- Line 385: "View Buyers" - no handler
- Line 388: "Reserve" - no handler
- Line 456: "Create Quote" - may not connect
- Line 459: "Dismiss" - no dismissal logic

**Fix each button:**
```typescript
// View Buyers
onClick={() => setShowBuyersModal(true)}

// Reserve
onClick={() => reserveMutation.mutate({ matchId })}

// Create Quote
onClick={() => navigate(`/quotes/new?matchId=${matchId}`)}

// Dismiss
onClick={() => dismissMutation.mutate({ matchId, reason })}
```

---

#### FE-QA-011: Integrate Unused Dashboard Widgets (8 hours)

**Directory:** `client/src/components/dashboard/widgets-v2/`

**Unused widgets to integrate:**
- CashCollectedLeaderboard
- ClientDebtLeaderboard
- ClientProfitMarginLeaderboard
- TopStrainFamiliesWidget
- SmartOpportunitiesWidget

**Determine:** Integrate into DashboardV3 or deprecate.

---

#### TERP-0002: Dashboard Widget Error States (4-8 hours)

**Add EmptyState component to all widgets for consistent error UI.**

**Add client navigation on leaderboard row click.**

---

#### TERP-0003: Add Client Wizard to ClientsWorkSurface (1-2 hours)

**Note:** This is in work-surface directory but Team B can implement since it's about the wizard dialog, not the work surface itself.

**Coordinate with Team E** before modifying.

---

#### TERP-0005: Reorganize Navigation Groups (2-4 hours)

**File:** `client/src/config/navigation.ts`

**Changes:**
- Move Pick & Pack from Sales to Inventory group
- Move Invoices from Sales to Finance group
- Add Direct Intake (`/intake`) to Inventory
- Add Locations (`/locations`) to Admin
- Add Inbox (`/inbox`) to top-level

---

#### TERP-0007: Surface Non-Sellable Batch Status (4-8 hours)

**Files:** `client/src/components/sales-sheet/*`, `client/src/pages/orders/*`

**Problem:** Non-sellable batches shown without status indicators.

**Fix:**
1. Add status badges for QUARANTINED, ON_HOLD, AWAITING_INTAKE
2. Block or warn when adding non-sellable to order
3. Validate batch status before submission

---

#### TYPE-001: Fix `as any` Casts in Golden Flows (4 hours)

**Note:** These files are in `client/src/components/work-surface/golden-flows/`

**Coordinate with Team E** - they own work surfaces but you can fix types.

**Files:**
- OrderCreationFlow.tsx: lines 582, 587, 593, 596, 613, 650
- InvoiceToPaymentFlow.tsx: lines 655, 665, 679, 689
- OrderToInvoiceFlow.tsx: lines 658, 661, 668, 678

---

### Phase 4: Mobile & Polish (Day 4)

#### MOB-001: Mobile Responsiveness Issues (24 hours)

Address 38 mobile responsiveness issues across components.

**Priority:**
1. Navigation sidebar collapse
2. Data tables horizontal scroll
3. Form layout on mobile
4. Dialog sizing

---

## Verification Protocol

Before creating your PR:

```bash
pnpm check        # 0 TypeScript errors
pnpm lint         # 0 linting errors
pnpm test         # Tests pass
pnpm build        # Build succeeds
```

---

## Creating Your PR

```bash
gh pr create --base staging/integration-sprint-2026-01-25 \
  --title "Team B: Frontend UX & Navigation" \
  --body "$(cat <<'EOF'
## Summary
- Added 8 hidden routes to navigation (NAV-006..NAV-014)
- Created Hour Tracking frontend (MEET-048)
- Fixed VendorSupplyPage creation (FE-QA-009)
- Wired MatchmakingServicePage buttons (FE-QA-010)
- Integrated dashboard widgets (FE-QA-011)
- Addressed mobile responsiveness (MOB-001)

## Navigation Changes
- Leaderboard, Client Needs, Matchmaking, Quotes, Returns added to Sales
- Vendor Supply added to Inventory
- Pricing Rules added to Finance
- Workflow Queue added to Admin
- All routes accessible via Command Palette

## Verification
- [x] pnpm check passes
- [x] pnpm lint passes
- [x] pnpm build passes
- [x] Manual navigation testing complete
EOF
)"
```

---

## Cross-Team Dependencies

**Blocking you:**
- Team A (TypeScript must compile)

**You block:**
- Team E (needs routes to work)

**Coordination needed:**
- Team E: Before modifying any work-surface files
- Team C: For any API changes needed

---

## Questions?

Create a coordination ticket or ask Evan.

# Implementation Tasks: Unified Leaderboard System

## Overview

This document breaks down the implementation of the Unified Leaderboard System into manageable tasks organized by phase. Each task includes estimated effort, dependencies, and acceptance criteria.

---

## Phase 1: Database Schema & Foundation

### Task 1.1: Create Leaderboard Database Tables
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** None

**Description:**
Create the new database tables required for the leaderboard system using Drizzle ORM.

**Subtasks:**
- [ ] Add `leaderboard_weight_configs` table to schema
- [ ] Add `leaderboard_default_weights` table to schema
- [ ] Add `leaderboard_metric_cache` table to schema
- [ ] Add `leaderboard_rank_history` table to schema
- [ ] Add `dashboard_widget_configs` table to schema
- [ ] Define relations for all new tables
- [ ] Add appropriate indexes for performance
- [ ] Generate and apply migration

**Acceptance Criteria:**
- All tables created with correct column types
- Foreign key constraints properly defined
- Indexes added for all foreign keys and common query patterns
- Migration runs successfully without errors

**Files to Create/Modify:**
- `drizzle/schema.ts` (add new tables)
- `drizzle/migrations/XXXX_leaderboard_tables.sql` (generated)

---

### Task 1.2: Seed Default Weight Configurations
**Estimate:** 2h | **Priority:** HIGH | **Dependencies:** Task 1.1

**Description:**
Create seed data for default leaderboard weights for customers and suppliers.

**Subtasks:**
- [ ] Create seeder for `leaderboard_default_weights`
- [ ] Add customer default weights (as per requirements)
- [ ] Add supplier default weights (as per requirements)
- [ ] Add "ALL" client type default weights
- [ ] Test seeder execution

**Acceptance Criteria:**
- Default weights seeded for CUSTOMER, SUPPLIER, and ALL client types
- Weights sum to 100% for each configuration
- Seeder is idempotent (can run multiple times safely)

**Files to Create/Modify:**
- `scripts/seed/seeders/seed-leaderboard-defaults.ts`
- `scripts/seed/seeders/index.ts` (add to seeding order)

---

### Task 1.3: Add Performance Indexes for Metric Calculations
**Estimate:** 2h | **Priority:** MEDIUM | **Dependencies:** Task 1.1

**Description:**
Add database indexes to optimize the metric calculation queries.

**Subtasks:**
- [ ] Add composite index on `invoices(customerId, invoiceDate, status)`
- [ ] Add composite index on `orders(customerId, orderDate)`
- [ ] Add index on `payments(invoiceId, paymentDate)`
- [ ] Verify indexes don't already exist
- [ ] Generate and apply migration

**Acceptance Criteria:**
- Indexes created without errors
- Query performance improved for metric calculations
- No duplicate indexes created

**Files to Create/Modify:**
- `drizzle/schema.ts` (add indexes)
- `drizzle/migrations/XXXX_leaderboard_indexes.sql` (generated)

---

## Phase 2: Backend Services

### Task 2.1: Implement MetricCalculator Service
**Estimate:** 8h | **Priority:** HIGH | **Dependencies:** Task 1.1

**Description:**
Create the core service that calculates individual metrics for clients.

**Subtasks:**
- [ ] Create `server/services/leaderboard/metricCalculator.ts`
- [ ] Implement `calculateYtdRevenue(clientId)`
- [ ] Implement `calculateLifetimeValue(clientId)`
- [ ] Implement `calculateAverageOrderValue(clientId)`
- [ ] Implement `calculateOrderFrequency(clientId)`
- [ ] Implement `calculateRecency(clientId)`
- [ ] Implement `calculateOnTimePaymentRate(clientId)`
- [ ] Implement `calculateAverageDaysToPay(clientId)`
- [ ] Implement `calculateCreditUtilization(clientId)`
- [ ] Implement `calculateYoyGrowth(clientId)`
- [ ] Implement `calculateAllMetrics(clientId)`
- [ ] Implement `calculateMetricsBatch(clientIds[])`
- [ ] Add statistical significance checks for each metric
- [ ] Add unit tests for each calculation

**Acceptance Criteria:**
- All metric calculations return correct values based on test data
- Statistical significance thresholds enforced
- Batch calculation performs efficiently (< 5s for 100 clients)
- All calculations respect soft deletes

**Files to Create/Modify:**
- `server/services/leaderboard/metricCalculator.ts`
- `server/services/leaderboard/metricCalculator.test.ts`
- `server/services/leaderboard/types.ts`
- `server/services/leaderboard/constants.ts`

---

### Task 2.2: Implement Weight Normalizer Utility
**Estimate:** 2h | **Priority:** HIGH | **Dependencies:** None

**Description:**
Create utility functions for weight normalization and validation.

**Subtasks:**
- [ ] Create `server/services/leaderboard/weightNormalizer.ts`
- [ ] Implement `normalizeWeights(weights)` - ensures sum = 100%
- [ ] Implement `validateWeights(weights)` - validates structure
- [ ] Implement `redistributeWeights(weights, excludedMetrics)` - handles missing metrics
- [ ] Add property-based tests for normalization invariant

**Acceptance Criteria:**
- Normalized weights always sum to exactly 100%
- Edge cases handled (all zeros, single metric, negative values)
- Property test passes for all random inputs

**Files to Create/Modify:**
- `server/services/leaderboard/weightNormalizer.ts`
- `server/services/leaderboard/weightNormalizer.test.ts`

---

### Task 2.3: Implement LeaderboardService
**Estimate:** 8h | **Priority:** HIGH | **Dependencies:** Task 2.1, Task 2.2

**Description:**
Create the main leaderboard service that orchestrates metric calculation, ranking, and caching.

**Subtasks:**
- [ ] Create `server/services/leaderboard/leaderboardService.ts`
- [ ] Implement `getLeaderboard(params)` - main ranking method
- [ ] Implement `getClientRanking(clientId)` - single client context
- [ ] Implement `calculateMasterScore(metrics, weights)`
- [ ] Implement `calculateRanks(clients)` - sorting and percentiles
- [ ] Implement `getUserWeights(userId)`
- [ ] Implement `saveUserWeights(userId, weights)`
- [ ] Implement `getDefaultWeights(clientType)`
- [ ] Add caching layer with TTL
- [ ] Implement cache invalidation logic
- [ ] Add integration tests

**Acceptance Criteria:**
- Leaderboard returns correctly ranked clients
- Master score calculation matches expected formula
- Caching reduces database load on repeated requests
- User weight preferences persist correctly

**Files to Create/Modify:**
- `server/services/leaderboard/leaderboardService.ts`
- `server/services/leaderboard/leaderboardService.test.ts`
- `server/services/leaderboard/cacheManager.ts`
- `server/services/leaderboard/index.ts` (barrel export)

---

### Task 2.4: Implement PrivacySanitizer Service
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Task 2.3

**Description:**
Create the service that strips identifying information from VIP Portal responses.

**Subtasks:**
- [ ] Create `server/services/leaderboard/privacySanitizer.ts`
- [ ] Implement `sanitizeForVipPortal(leaderboard, clientId, mode)`
- [ ] Implement `validateNoIdentifiers(response)` - safety check
- [ ] Add property-based tests for privacy guarantees
- [ ] Add integration tests with real leaderboard data

**Acceptance Criteria:**
- Sanitized responses contain NO client identifiers (id, name, teriCode, email)
- Requesting client's own data is preserved
- Transparent mode shows values but not identities
- Black box mode shows only ranks
- Property test confirms no PII leakage for any input

**Files to Create/Modify:**
- `server/services/leaderboard/privacySanitizer.ts`
- `server/services/leaderboard/privacySanitizer.test.ts`

---

### Task 2.5: Implement Suggestion Generator
**Estimate:** 3h | **Priority:** MEDIUM | **Dependencies:** Task 2.3

**Description:**
Create the service that generates personalized improvement suggestions.

**Subtasks:**
- [ ] Create `server/services/leaderboard/suggestionGenerator.ts`
- [ ] Implement tier-based suggestion logic (top/middle/bottom quartile)
- [ ] Implement gap-based suggestions for transparent mode
- [ ] Integrate with existing `leaderboardRecommendations.ts` phrase library
- [ ] Add new suggestion phrases as needed
- [ ] Add unit tests

**Acceptance Criteria:**
- Suggestions match client's tier (encouraging for bottom, maintenance for top)
- Gap-based suggestions show correct amounts
- Suggestions never reference specific competitor names
- Phrases are varied and contextually appropriate

**Files to Create/Modify:**
- `server/services/leaderboard/suggestionGenerator.ts`
- `server/services/leaderboard/suggestionGenerator.test.ts`
- `server/lib/leaderboardRecommendations.ts` (extend phrases)

---

## Phase 3: API Layer

### Task 3.1: Create Internal Leaderboard Router
**Estimate:** 6h | **Priority:** HIGH | **Dependencies:** Task 2.3

**Description:**
Create the tRPC router for internal leaderboard operations.

**Subtasks:**
- [ ] Create `server/routers/leaderboard.ts`
- [ ] Implement `leaderboard.list` - full leaderboard with filters
- [ ] Implement `leaderboard.getForClient` - single client context
- [ ] Implement `leaderboard.getWidgetData` - dashboard widget data
- [ ] Implement `leaderboard.weights.get` - get user weights
- [ ] Implement `leaderboard.weights.save` - save user weights
- [ ] Implement `leaderboard.weights.reset` - reset to defaults
- [ ] Implement `leaderboard.weights.getDefaults` - get default weights
- [ ] Implement `leaderboard.weights.updateDefaults` - admin only
- [ ] Implement `leaderboard.export` - CSV/PDF export
- [ ] Implement `leaderboard.cache.invalidate` - admin cache control
- [ ] Add input validation with Zod schemas
- [ ] Register router in `server/routers.ts`
- [ ] Add integration tests

**Acceptance Criteria:**
- All endpoints return correct data
- Input validation prevents invalid requests
- Protected procedures require authentication
- Admin procedures require admin role
- Export generates valid CSV/PDF files

**Files to Create/Modify:**
- `server/routers/leaderboard.ts`
- `server/routers/leaderboard.test.ts`
- `server/routers.ts` (register router)

---

### Task 3.2: Enhance VIP Portal Leaderboard Endpoint
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Task 2.4

**Description:**
Refactor the existing VIP Portal leaderboard endpoint to use the new services.

**Subtasks:**
- [ ] Refactor `vipPortal.leaderboard.getLeaderboard` to use MetricCalculator
- [ ] Integrate PrivacySanitizer for response sanitization
- [ ] Add minimum participants threshold check
- [ ] Integrate SuggestionGenerator for improvement tips
- [ ] Add `vipPortal.leaderboard.getAvailableMetrics` endpoint
- [ ] Update input/output types
- [ ] Add integration tests for privacy guarantees

**Acceptance Criteria:**
- Existing VIP Portal leaderboard continues to work
- Responses are properly sanitized (no PII)
- Minimum participant threshold enforced
- Suggestions are personalized and appropriate

**Files to Create/Modify:**
- `server/routers/vipPortal.ts` (refactor leaderboard section)
- `server/routers/vipPortal.test.ts` (add leaderboard tests)

---

## Phase 4: Frontend - Internal Leaderboard

### Task 4.1: Create Leaderboard Page
**Estimate:** 8h | **Priority:** HIGH | **Dependencies:** Task 3.1

**Description:**
Create the main leaderboard page for internal users.

**Subtasks:**
- [ ] Create `client/src/pages/LeaderboardPage.tsx`
- [ ] Implement metric category tabs (Master/Financial/Engagement/Reliability/Growth)
- [ ] Implement client type filter dropdown
- [ ] Implement search functionality
- [ ] Implement sortable data table
- [ ] Implement pagination
- [ ] Add loading states and error handling
- [ ] Add route to navigation
- [ ] Add breadcrumb support

**Acceptance Criteria:**
- Page displays ranked clients with all metrics
- Tabs switch between metric categories
- Filters work correctly
- Search filters by name/TERI code
- Sorting works on all columns
- Pagination handles large datasets

**Files to Create/Modify:**
- `client/src/pages/LeaderboardPage.tsx`
- `client/src/config/navigation.ts` (add route)
- `client/src/App.tsx` (add route)

---

### Task 4.2: Create Weight Customizer Component
**Estimate:** 6h | **Priority:** HIGH | **Dependencies:** Task 4.1

**Description:**
Create the weight customization panel with sliders.

**Subtasks:**
- [ ] Create `client/src/components/leaderboard/WeightCustomizer.tsx`
- [ ] Implement slider controls for each metric
- [ ] Implement auto-normalization display (show weights summing to 100%)
- [ ] Implement "Apply Weights" button with loading state
- [ ] Implement "Reset to Default" button
- [ ] Create `client/src/components/leaderboard/WeightVisualization.tsx` (pie/bar chart)
- [ ] Add client-side weight recalculation for instant preview
- [ ] Create `client/src/hooks/useLeaderboardWeights.ts`

**Acceptance Criteria:**
- Sliders adjust weights smoothly
- Weights always display as summing to 100%
- Apply button triggers server recalculation
- Reset restores default weights
- Visualization updates in real-time

**Files to Create/Modify:**
- `client/src/components/leaderboard/WeightCustomizer.tsx`
- `client/src/components/leaderboard/WeightVisualization.tsx`
- `client/src/hooks/useLeaderboardWeights.ts`

---

### Task 4.3: Create Leaderboard Table Component
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Task 4.1

**Description:**
Create the reusable leaderboard data table component.

**Subtasks:**
- [ ] Create `client/src/components/leaderboard/LeaderboardTable.tsx`
- [ ] Implement rank badges (gold/silver/bronze for top 3)
- [ ] Implement metric cells with appropriate formatting
- [ ] Implement trend indicators (up/down/stable arrows)
- [ ] Implement row click navigation to client profile
- [ ] Implement column sorting
- [ ] Add responsive design for mobile

**Acceptance Criteria:**
- Table displays all required columns
- Rank badges show correctly for top 3
- Metrics formatted appropriately (currency, percentage, days)
- Trend arrows show correct direction
- Clicking row navigates to client profile

**Files to Create/Modify:**
- `client/src/components/leaderboard/LeaderboardTable.tsx`
- `client/src/components/leaderboard/RankBadge.tsx`
- `client/src/components/leaderboard/MetricCell.tsx`
- `client/src/components/leaderboard/TrendIndicator.tsx`

---

### Task 4.4: Create Dashboard Leaderboard Widget
**Estimate:** 4h | **Priority:** MEDIUM | **Dependencies:** Task 3.1

**Description:**
Create the compact leaderboard widget for the dashboard.

**Subtasks:**
- [ ] Create `client/src/components/dashboard/LeaderboardWidget.tsx`
- [ ] Implement "Top Performers" mode (top 5 by selected metric)
- [ ] Implement "Needs Attention" mode (bottom 5)
- [ ] Implement metric selector dropdown
- [ ] Implement client type filter
- [ ] Implement "View Full Leaderboard" link
- [ ] Add sparkline/trend indicator for each entry
- [ ] Create `client/src/hooks/useLeaderboardWidget.ts`
- [ ] Add widget to dashboard

**Acceptance Criteria:**
- Widget shows top/bottom 5 clients
- Metric can be changed via dropdown
- Mode can be toggled between top/bottom
- Clicking client navigates to profile
- "View All" navigates to full leaderboard

**Files to Create/Modify:**
- `client/src/components/dashboard/LeaderboardWidget.tsx`
- `client/src/hooks/useLeaderboardWidget.ts`
- `client/src/pages/DashboardV3.tsx` (integrate widget)

---

### Task 4.5: Create Client Profile Leaderboard Card
**Estimate:** 6h | **Priority:** MEDIUM | **Dependencies:** Task 3.1

**Description:**
Create the leaderboard context card for client profile pages.

**Subtasks:**
- [ ] Create `client/src/components/clients/ClientLeaderboardCard.tsx`
- [ ] Implement rank display with percentile
- [ ] Implement rank breakdown by category (Financial/Engagement/etc.)
- [ ] Create `client/src/components/clients/RankHistoryChart.tsx` (6-month trend)
- [ ] Create `client/src/components/clients/GapToNextRank.tsx`
- [ ] Implement quick action buttons (Send Follow-up, Schedule Call, Review Credit)
- [ ] Create `client/src/hooks/useClientRanking.ts`
- [ ] Integrate card into ClientProfilePage

**Acceptance Criteria:**
- Card shows current rank and percentile
- Category breakdown shows rank in each area
- History chart displays 6-month trend
- Gap analysis shows distance to next rank
- Quick actions trigger appropriate workflows

**Files to Create/Modify:**
- `client/src/components/clients/ClientLeaderboardCard.tsx`
- `client/src/components/clients/RankHistoryChart.tsx`
- `client/src/components/clients/RankBreakdown.tsx`
- `client/src/components/clients/GapToNextRank.tsx`
- `client/src/hooks/useClientRanking.ts`
- `client/src/pages/ClientProfilePage.tsx` (integrate card)

---

### Task 4.6: Implement Export Functionality
**Estimate:** 3h | **Priority:** LOW | **Dependencies:** Task 4.1

**Description:**
Implement CSV and PDF export for leaderboard data.

**Subtasks:**
- [ ] Create `client/src/components/leaderboard/ExportDialog.tsx`
- [ ] Implement CSV export with current filters/weights
- [ ] Implement PDF export with weight visualization
- [ ] Add export button to LeaderboardPage
- [ ] Handle large dataset exports gracefully

**Acceptance Criteria:**
- CSV export includes all visible columns
- PDF export includes weight chart
- Exports respect current filters
- Export includes timestamp and weight config

**Files to Create/Modify:**
- `client/src/components/leaderboard/ExportDialog.tsx`
- `server/routers/leaderboard.ts` (export endpoint implementation)

---

## Phase 5: Frontend - VIP Portal Enhancement

### Task 5.1: Enhance VIP Portal Leaderboard Component
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Task 3.2

**Description:**
Enhance the existing VIP Portal leaderboard with new features.

**Subtasks:**
- [ ] Update `client/src/components/vip-portal/Leaderboard.tsx`
- [ ] Implement black box mode (ranks only)
- [ ] Implement transparent mode (ranks + values)
- [ ] Add improvement suggestions section
- [ ] Add "minimum participants" message when threshold not met
- [ ] Improve visual design and mobile responsiveness
- [ ] Add loading and error states

**Acceptance Criteria:**
- Both display modes work correctly
- No client identifiers visible in either mode
- Suggestions display appropriately
- Minimum participant message shows when needed

**Files to Create/Modify:**
- `client/src/components/vip-portal/Leaderboard.tsx`

---

### Task 5.2: Add VIP Portal Leaderboard Admin Configuration
**Estimate:** 3h | **Priority:** MEDIUM | **Dependencies:** Task 5.1

**Description:**
Add admin UI for configuring VIP Portal leaderboard settings per client.

**Subtasks:**
- [ ] Update VIP Portal config page with leaderboard settings
- [ ] Add metric enable/disable toggles
- [ ] Add primary metric selector
- [ ] Add display mode selector (black box/transparent)
- [ ] Add minimum participants threshold setting
- [ ] Save settings to `featuresConfig.leaderboard` JSON

**Acceptance Criteria:**
- Admin can enable/disable individual metrics
- Admin can set primary display metric
- Admin can choose display mode
- Settings persist correctly

**Files to Create/Modify:**
- `client/src/pages/VIPPortalConfigPage.tsx`
- `server/routers/vipPortalAdmin.ts` (if needed)

---

## Phase 6: Testing & Polish

### Task 6.1: Property-Based Tests
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Phase 2, Phase 3

**Description:**
Implement property-based tests for critical invariants.

**Subtasks:**
- [ ] Install fast-check library
- [ ] Test weight normalization invariant (sum = 100%)
- [ ] Test ranking consistency (deterministic)
- [ ] Test VIP Portal privacy (no identifiers)
- [ ] Test percentile calculation correctness
- [ ] Test search filter correctness
- [ ] Test sort order correctness

**Acceptance Criteria:**
- All 15 correctness properties from design doc have tests
- Tests pass for 1000+ random inputs
- Edge cases covered

**Files to Create/Modify:**
- `server/services/leaderboard/leaderboard.property.test.ts`
- `server/services/leaderboard/privacy.property.test.ts`

---

### Task 6.2: Integration Tests
**Estimate:** 4h | **Priority:** HIGH | **Dependencies:** Phase 3

**Description:**
Create comprehensive integration tests for the leaderboard system.

**Subtasks:**
- [ ] Test full leaderboard flow (create clients → calculate → rank)
- [ ] Test VIP Portal flow (configure → request → verify sanitization)
- [ ] Test weight persistence (save → load → verify)
- [ ] Test cache behavior (request → verify cache → invalidate → verify recalc)
- [ ] Test statistical significance filtering

**Acceptance Criteria:**
- All integration tests pass
- Tests cover happy path and error cases
- Tests verify data integrity

**Files to Create/Modify:**
- `server/routers/leaderboard.integration.test.ts`
- `server/routers/vipPortal.leaderboard.integration.test.ts`

---

### Task 6.3: Performance Testing
**Estimate:** 2h | **Priority:** MEDIUM | **Dependencies:** Phase 3

**Description:**
Verify performance meets requirements.

**Subtasks:**
- [ ] Test leaderboard load time with 100 clients
- [ ] Test leaderboard load time with 500 clients
- [ ] Test leaderboard load time with 1000 clients
- [ ] Test cache hit performance
- [ ] Test weight recalculation performance
- [ ] Document performance baselines

**Acceptance Criteria:**
- Leaderboard loads in < 2s for 1000 clients
- Cache hits return in < 100ms
- Weight recalculation is instant (client-side)

**Files to Create/Modify:**
- `server/services/leaderboard/leaderboard.perf.test.ts`

---

### Task 6.4: Security Audit for VIP Portal
**Estimate:** 2h | **Priority:** HIGH | **Dependencies:** Task 5.1

**Description:**
Audit VIP Portal leaderboard for privacy/security issues.

**Subtasks:**
- [ ] Review all API responses for PII leakage
- [ ] Test with malicious inputs
- [ ] Verify session validation
- [ ] Check for information disclosure in error messages
- [ ] Document security measures

**Acceptance Criteria:**
- No PII leakage found
- All inputs validated
- Error messages don't reveal sensitive info
- Security documentation complete

**Files to Create/Modify:**
- `docs/security/LEADERBOARD_SECURITY_AUDIT.md`

---

### Task 6.5: Documentation
**Estimate:** 2h | **Priority:** LOW | **Dependencies:** All phases

**Description:**
Create user and developer documentation.

**Subtasks:**
- [ ] Create user guide for internal leaderboard
- [ ] Create admin guide for VIP Portal configuration
- [ ] Document API endpoints
- [ ] Document metric calculations
- [ ] Add inline code documentation

**Acceptance Criteria:**
- User guide covers all features
- Admin guide covers configuration options
- API documentation is complete
- Code is well-documented

**Files to Create/Modify:**
- `docs/features/LEADERBOARD_USER_GUIDE.md`
- `docs/features/LEADERBOARD_ADMIN_GUIDE.md`
- `docs/api/LEADERBOARD_API.md`

---

## Task Summary

| Phase | Tasks | Total Estimate |
|-------|-------|----------------|
| Phase 1: Database | 3 tasks | 8h |
| Phase 2: Backend Services | 5 tasks | 25h |
| Phase 3: API Layer | 2 tasks | 10h |
| Phase 4: Frontend Internal | 6 tasks | 31h |
| Phase 5: Frontend VIP Portal | 2 tasks | 7h |
| Phase 6: Testing & Polish | 5 tasks | 14h |
| **Total** | **23 tasks** | **~95h** |

## Recommended Execution Order

### Sprint 1 (Foundation) - ~18h
1. Task 1.1: Create Leaderboard Database Tables
2. Task 1.2: Seed Default Weight Configurations
3. Task 1.3: Add Performance Indexes
4. Task 2.2: Implement Weight Normalizer Utility
5. Task 2.1: Implement MetricCalculator Service

### Sprint 2 (Core Backend) - ~15h
1. Task 2.3: Implement LeaderboardService
2. Task 2.4: Implement PrivacySanitizer Service
3. Task 2.5: Implement Suggestion Generator

### Sprint 3 (API & Basic UI) - ~18h
1. Task 3.1: Create Internal Leaderboard Router
2. Task 3.2: Enhance VIP Portal Leaderboard Endpoint
3. Task 4.1: Create Leaderboard Page

### Sprint 4 (Full Internal UI) - ~17h
1. Task 4.2: Create Weight Customizer Component
2. Task 4.3: Create Leaderboard Table Component
3. Task 4.4: Create Dashboard Leaderboard Widget
4. Task 4.5: Create Client Profile Leaderboard Card

### Sprint 5 (VIP Portal & Polish) - ~16h
1. Task 5.1: Enhance VIP Portal Leaderboard Component
2. Task 5.2: Add VIP Portal Leaderboard Admin Configuration
3. Task 6.1: Property-Based Tests
4. Task 6.2: Integration Tests

### Sprint 6 (Final Polish) - ~9h
1. Task 4.6: Implement Export Functionality
2. Task 6.3: Performance Testing
3. Task 6.4: Security Audit for VIP Portal
4. Task 6.5: Documentation

---

## Dependencies Graph

```
Phase 1 (Database)
├── Task 1.1 ─────────────────────────────────────────────┐
│   └── Task 1.2                                          │
│   └── Task 1.3                                          │
│                                                         │
Phase 2 (Services)                                        │
├── Task 2.2 (no deps)                                    │
├── Task 2.1 ◄──────────────────────────────────────────┘
│   └── Task 2.3 ◄── Task 2.2
│       ├── Task 2.4
│       └── Task 2.5
│
Phase 3 (API)
├── Task 3.1 ◄── Task 2.3
└── Task 3.2 ◄── Task 2.4
│
Phase 4 (Internal UI)
├── Task 4.1 ◄── Task 3.1
│   ├── Task 4.2
│   ├── Task 4.3
│   └── Task 4.6
├── Task 4.4 ◄── Task 3.1
└── Task 4.5 ◄── Task 3.1
│
Phase 5 (VIP Portal UI)
├── Task 5.1 ◄── Task 3.2
└── Task 5.2 ◄── Task 5.1
│
Phase 6 (Testing)
├── Task 6.1 ◄── Phase 2, Phase 3
├── Task 6.2 ◄── Phase 3
├── Task 6.3 ◄── Phase 3
├── Task 6.4 ◄── Task 5.1
└── Task 6.5 ◄── All phases
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Metric calculations are slow | Implement caching early (Task 2.3), add indexes (Task 1.3) |
| VIP Portal privacy breach | Property-based tests (Task 6.1), security audit (Task 6.4) |
| Weight normalization bugs | Dedicated utility with tests (Task 2.2) |
| Complex UI state management | Use React Query for server state, local state for weights |
| Large dataset performance | Pagination, batch processing, client-side recalculation |

---

## Definition of Done

A task is considered complete when:
- [ ] Code is written and follows TERP development standards
- [ ] Unit tests pass with adequate coverage
- [ ] Integration tests pass (where applicable)
- [ ] No TypeScript errors (`pnpm typecheck` passes)
- [ ] No linting errors (`pnpm lint` passes)
- [ ] Code reviewed (self-review for solo work)
- [ ] Feature works in development environment
- [ ] Documentation updated (if applicable)

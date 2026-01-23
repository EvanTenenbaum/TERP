# TERP Next 7 Days Stabilization Plan

**Generated**: 2026-01-23 15:56:45  
**Planning Period**: 2026-01-24 to 2026-01-30  
**Focus**: Unblock automated QA and validate critical flows

## Overview

This 7-day plan prioritizes unblocking automated QA execution and validating TERP's 12 Golden Paths through evidence-based testing. All actions are grounded in reconnaissance findings and designed to maximize release confidence.

## Day 1 (Friday, Jan 24): Unblock Test Data

### Priority: CRITICAL (S2 Blocker)

**Goal**: Create QA test data seeding infrastructure

#### Morning (4 hours)

**Task 1.1**: Create Test Data Seeding Script  
**Owner**: Backend Developer  
**Effort**: 3 hours

```bash
# Create script
touch scripts/seed-qa-data.ts

# Implement seeding logic
# - 2 QA Locations (QA_LOCATION_A, QA_LOCATION_B)
# - 2 QA Customers (QA_CUSTOMER_STANDARD, QA_CUSTOMER_NET30)
# - 2 QA SKUs (QA_SKU_LOWSTOCK with qty=5, QA_SKU_NORMAL with qty=1000)
# - 1 QA Vendor (QA_VENDOR_TEST)
# - Accounting baseline (if needed)

# Add to package.json
"seed:qa-data": "tsx scripts/seed-qa-data.ts"
```

**Acceptance Criteria**:
- ✅ Script creates all required entities with QA prefixes
- ✅ Script is idempotent (can run multiple times safely)
- ✅ Entity IDs are logged to console
- ✅ Script updates test_data_registry.json with created IDs

**Task 1.2**: Execute Seeding on Staging  
**Owner**: DevOps / Backend Developer  
**Effort**: 30 minutes

```bash
# Run seeding
pnpm seed:qa-data

# Verify entities created
# Navigate to http://terp-app-b9s35.ondigitalocean.app/clients
# Search for "QA_CUSTOMER"
# Should find 2 customers
```

**Acceptance Criteria**:
- ✅ All QA entities exist in staging database
- ✅ Entities are searchable via UI
- ✅ test_data_registry.json updated with IDs

#### Afternoon (4 hours)

**Task 1.3**: Document Test Data Strategy  
**Owner**: QA Lead  
**Effort**: 2 hours

Create `docs/qa/TEST_DATA_STRATEGY.md` documenting:
- QA prefix conventions
- Entity creation procedures
- Data cleanup policies (when to reset)
- Registry maintenance (how to track IDs)
- Seeding script usage

**Task 1.4**: Validate Test Data Accessibility  
**Owner**: QA Engineer  
**Effort**: 1 hour

Manual validation:
1. Login as each QA role
2. Verify can see/access QA entities
3. Test basic CRUD operations
4. Document any RBAC issues

**Deliverables**:
- ✅ `scripts/seed-qa-data.ts` (working)
- ✅ `docs/qa/TEST_DATA_STRATEGY.md` (complete)
- ✅ `terp-qa-artifacts/reality-map/test_data_registry.json` (updated)
- ✅ Staging has all QA entities

## Day 2 (Monday, Jan 27): Golden Paths Testing Setup

### Priority: HIGH (Release Validation)

**Goal**: Prepare Playwright tests for 12 Golden Paths

#### Morning (4 hours)

**Task 2.1**: Review Existing Oracle Runner  
**Owner**: QA Engineer  
**Effort**: 1 hour

```bash
# Review existing test infrastructure
cd terp-repo/tests-e2e/oracles
cat oracle-runner.spec.ts

# Understand current testing approach
# Identify reusable patterns
```

**Task 2.2**: Create Golden Paths Test Suite  
**Owner**: QA Engineer  
**Effort**: 3 hours

```bash
# Create new test file
touch tests-e2e/golden-paths.spec.ts

# Implement tests for 12 Golden Paths:
# 1. Update Status (Orders / Pick Pack)
# 2. Update Order Status (Orders / Order Status)
# 3. Update Order (Orders / Orders)
# 4. Update Status (Inventory / Batches)
# 5. Update Product (Inventory / Products)
# 6. Void Invoice (Accounting / Invoices)
# 7. Mark Sent (Accounting / Invoices)
# 8. Update Status (Accounting / Invoices)
# 9. Generate From Order (Accounting / Invoices)
# 10. Get Invoice By ID (Accounting / Invoices)
# 11. List Invoices (Accounting / Invoices)
# 12. Update Client (CRM / Clients)
```

**Test Structure** (per charter):
```typescript
test('CH_orders_pick_pack_update_status - Run 1', async ({ page }) => {
  // 1. Authenticate as SUPER_ADMIN
  await qaAuth.login(page, 'qa.superadmin@terp.test', 'TerpQA2026!');
  
  // 2. Navigate to flow entry point
  // 3. Execute flow actions
  // 4. Collect evidence (trace, logs, screenshots)
  // 5. Validate with 2+ success signals
  // 6. Classify result (PASS/FAIL)
});
```

#### Afternoon (4 hours)

**Task 2.3**: Implement Evidence Collection  
**Owner**: QA Engineer  
**Effort**: 2 hours

Create `tests-e2e/helpers/evidence-collector.ts`:
```typescript
export class EvidenceCollector {
  async captureTrace(page, charterId, runIndex);
  async captureConsoleLog(page, charterId, runIndex);
  async captureNetworkLog(page, charterId, runIndex);
  async captureScreenshot(page, charterId, runIndex, label);
  async generateRunSummary(charterId, runIndex, result);
}
```

**Task 2.4**: Implement Multi-Signal Validation  
**Owner**: QA Engineer  
**Effort**: 2 hours

Create `tests-e2e/helpers/validator.ts`:
```typescript
export class Validator {
  async checkUIStateChange(page, expectedChange);
  async checkListViewReflectsChange(page, entityId);
  async checkNetworkSuccess(page, endpoint);
  async checkLedgerMath(page, before, after, expected);
  async checkAuditTrail(page, action);
  
  async validate(signals: Signal[]): ValidationResult {
    // Require minimum 2 signals
    // Return PASS/FAIL with evidence
  }
}
```

**Deliverables**:
- ✅ `tests-e2e/golden-paths.spec.ts` (12 tests × 3 runs = 36 tests)
- ✅ `tests-e2e/helpers/evidence-collector.ts`
- ✅ `tests-e2e/helpers/validator.ts`

## Day 3 (Tuesday, Jan 28): Execute Golden Paths Testing

### Priority: HIGH (Release Validation)

**Goal**: Run quorum tests for all 12 Golden Paths

#### Morning (4 hours)

**Task 3.1**: Execute Golden Paths Tests (Run 1)  
**Owner**: QA Engineer  
**Effort**: 2 hours

```bash
# Run tests with tracing enabled
PLAYWRIGHT_BASE_URL=http://terp-app-b9s35.ondigitalocean.app \
  playwright test tests-e2e/golden-paths.spec.ts --project=chromium

# Review results
# Collect traces to terp-qa-artifacts/traces/
```

**Task 3.2**: Execute Golden Paths Tests (Run 2)  
**Owner**: QA Engineer  
**Effort**: 2 hours

```bash
# Second quorum run
# Same commands as Run 1
# Compare results with Run 1
```

#### Afternoon (4 hours)

**Task 3.3**: Execute Golden Paths Tests (Run 3)  
**Owner**: QA Engineer  
**Effort**: 2 hours

```bash
# Third quorum run
# Same commands as Run 1
# Compare results with Run 1 and Run 2
```

**Task 3.4**: Classify Results  
**Owner**: QA Engineer  
**Effort**: 2 hours

For each charter:
- 3/3 pass → CONFIRMED_WORKING
- 3/3 fail → CONFIRMED_BROKEN (assign severity)
- Mixed → FLAKY_CANDIDATE
- Auth/data issues → BLOCKED_*

Generate per-charter summaries:
```bash
# For each charter
terp-qa-artifacts/runs/<charter_id>/summary.json
terp-qa-artifacts/runs/<charter_id>/report.md
```

**Deliverables**:
- ✅ 36 test runs completed (12 charters × 3 runs)
- ✅ 36 trace ZIPs in `terp-qa-artifacts/traces/`
- ✅ 12 charter summaries in `terp-qa-artifacts/runs/`
- ✅ Classification complete for all Golden Paths

## Day 4 (Wednesday, Jan 29): Ticket Generation

### Priority: MEDIUM (Issue Tracking)

**Goal**: Create tickets for all CONFIRMED_BROKEN and FLAKY_CANDIDATE flows

#### Morning (4 hours)

**Task 4.1**: Generate Tickets for Broken Flows  
**Owner**: QA Engineer  
**Effort**: 3 hours

For each CONFIRMED_BROKEN or FLAKY_CANDIDATE charter:
1. Create ticket file: `terp-qa-artifacts/backlog/tickets/TKT_<domain>_<entity>_<slug>_20260129.md`
2. Include:
   - Title
   - Severity (S1-S5)
   - Expected vs Actual
   - Minimal repro steps
   - Evidence paths (traces, screenshots, logs)
   - Suspected layer (UI/API/DB/RBAC/DATA/INFRA)
   - Suggested fix owner

**Task 4.2**: Dedupe Tickets  
**Owner**: QA Engineer  
**Effort**: 1 hour

Apply dedupe policy:
- Group by: domain, entity, flow, failure_mode, error_signature
- Merge duplicate tickets
- Append evidence to existing tickets

#### Afternoon (4 hours)

**Task 4.3**: Create GitHub Issues (S1-S3 only)  
**Owner**: QA Engineer  
**Effort**: 2 hours

For S1, S2, S3 severity tickets:
```bash
gh issue create \
  --title "TKT_ORDERS_PICK_PACK_UPDATE_FAIL" \
  --body "$(cat terp-qa-artifacts/backlog/tickets/TKT_*.md)" \
  --label "qa,release-blocker,severity:S2,domain:orders"
```

**Task 4.4**: Update Reality Map with Ticket References  
**Owner**: QA Engineer  
**Effort**: 1 hour

Update `REALITY_MAP.md` with:
- Golden Paths status (with ticket IDs if broken)
- Confirmed broken count by severity
- Flaky candidate count
- Links to tickets

**Deliverables**:
- ✅ Tickets generated for all broken/flaky flows
- ✅ GitHub issues created for S1-S3
- ✅ Reality Map updated with ticket references
- ✅ Deduped backlog in `terp-qa-artifacts/backlog/tickets/`

## Day 5 (Thursday, Jan 30): Accounting UI Planning

### Priority: MEDIUM (S3 Issue)

**Goal**: Plan UI development for top 10 P0 Accounting flows

#### Morning (4 hours)

**Task 5.1**: Prioritize Accounting Flows  
**Owner**: Product Manager + QA Lead  
**Effort**: 2 hours

Review 43 API_ONLY Accounting flows and select top 10 based on:
- User impact (Accounting Manager / Accountant usage frequency)
- Business criticality (money-related operations)
- Dependencies (flows that unblock other flows)

**Recommended Top 10**:
1. Receive Client Payment (WS-001)
2. Pay Vendor (WS-002)
3. Record Payment
4. Preview Balance
5. Get AR Summary
6. Get AR Aging
7. Get Outstanding Receivables
8. Get Overdue Invoices
9. Get Client Statement
10. Get AP Summary

**Task 5.2**: Create UI Wireframes  
**Owner**: Product Designer  
**Effort**: 2 hours

For each flow:
- Sketch UI layout
- Define user interactions
- Identify data inputs/outputs
- Map to existing UI patterns

#### Afternoon (4 hours)

**Task 5.3**: Estimate Development Effort  
**Owner**: Frontend Lead  
**Effort**: 2 hours

For each flow:
- Review tRPC procedure signature
- Identify required UI components
- Estimate development time
- Identify dependencies

**Task 5.4**: Create Development Tickets  
**Owner**: Product Manager  
**Effort**: 2 hours

Create GitHub issues for each flow:
```bash
gh issue create \
  --title "UI: Receive Client Payment (WS-001)" \
  --body "Implement UI for accounting.receiveClientPayment..." \
  --label "feature,ui,accounting,priority:high" \
  --milestone "Accounting UI Sprint"
```

**Deliverables**:
- ✅ Top 10 Accounting flows prioritized
- ✅ UI wireframes for each flow
- ✅ Development effort estimates
- ✅ 10 GitHub issues created

## Day 6-7 (Weekend Buffer)

### Optional: Extended Testing

If time permits, extend testing to:
- Additional P0 CLIENT_WIRED charters (beyond Golden Paths)
- RBAC validation (test all 7 QA roles)
- Performance testing (page load times, API response times)

## Success Metrics

By end of Day 5, achieve:

| Metric | Target | Status |
|--------|--------|--------|
| QA test data created | ✅ Yes | TBD |
| Golden Paths tested | 12/12 (100%) | TBD |
| Quorum runs completed | 36/36 (100%) | TBD |
| Tickets generated | All broken/flaky | TBD |
| GitHub issues created | S1-S3 only | TBD |
| Reality Map updated | ✅ Complete | TBD |
| Accounting UI planned | Top 10 flows | TBD |

## Risk Mitigation

### Risk 1: Test Data Seeding Fails

**Mitigation**: 
- Allocate extra time on Day 1
- Have backup plan to create entities manually via UI
- Document manual creation process

### Risk 2: Golden Paths Tests Reveal Critical Issues

**Mitigation**:
- Immediately escalate S1 issues to engineering lead
- Consider delaying release if multiple S1 issues found
- Focus on quick fixes for S2 issues

### Risk 3: Playwright Tests Are Flaky

**Mitigation**:
- Increase timeouts for slow operations
- Add explicit waits for UI state changes
- Retry failed tests once before classifying as FLAKY

## Dependencies

| Task | Depends On | Blocker |
|------|------------|---------|
| Day 2-5 | Day 1 complete | QA test data must exist |
| Day 3 | Day 2 complete | Tests must be written |
| Day 4 | Day 3 complete | Results must be classified |
| Day 5 | Day 4 complete | Issues must be identified |

## Estimated Total Effort

| Day | Hours | Focus |
|-----|-------|-------|
| Day 1 | 8h | Test data seeding |
| Day 2 | 8h | Test development |
| Day 3 | 8h | Test execution |
| Day 4 | 8h | Ticket generation |
| Day 5 | 8h | Accounting UI planning |
| **Total** | **40h** | **1 full work week** |

## Conclusion

This 7-day plan unblocks automated QA, validates TERP's 12 most critical flows, and creates a roadmap for addressing the Accounting UI gap. By end of week, TERP will have:

1. ✅ **Automated QA infrastructure** (test data + scripts)
2. ✅ **Evidence-based validation** of Golden Paths
3. ✅ **Actionable tickets** for any issues found
4. ✅ **Clear plan** for Accounting UI development

**Recommended Action**: Execute this plan starting Friday, Jan 24 to maximize release confidence.

---

*This plan is grounded in reconnaissance findings from the TERP Reality Mapper. Adjust timelines based on actual test results and team capacity.*

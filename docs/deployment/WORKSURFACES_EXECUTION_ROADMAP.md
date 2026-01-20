# Work Surfaces Strategic Execution Roadmap

> **Version**: 1.0.0
> **Date**: 2026-01-20
> **Classification**: Production Deployment Execution Plan
> **Reference**: `WORKSURFACES_DEPLOYMENT_STRATEGY_v2.md`

---

## Executive Summary

This document provides the **step-by-step execution plan** for deploying Work Surfaces to 100% of production users. It translates the deployment strategy into actionable tasks with clear ownership, timelines, and go/no-go criteria.

### Success Criteria
- All 9 Work Surfaces deployed and accessible
- Zero P0 bugs for 7 consecutive days
- Feature parity verified (200+ tRPC procedures)
- All 6 invariants passing continuously
- Rollback tested and documented

### Total Execution Estimate
| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 0: Infrastructure | DEPLOY-001..004 | 11h |
| Phase 1: Internal QA | DEPLOY-005 | 8h |
| Phase 2: Staged Rollout | DEPLOY-006..008 | 12h + 72h bake |
| **Total** | 8 tasks | ~31h active work + 72h observation |

---

## Phase 0: Infrastructure Preparation

### Overview
Before any user exposure, complete all infrastructure tasks to enable safe deployment.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 0: INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   DEPLOY-001 ──┬──► DEPLOY-005 (Stage 0)                        │
│   DEPLOY-002 ──┤                                                 │
│   DEPLOY-003 ──┤                                                 │
│   DEPLOY-004 ──┘                                                 │
│                                                                   │
│   [All 4 tasks can run in PARALLEL]                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### DEPLOY-001: Wire WorkSurfaceGate into App.tsx

**Estimate**: 4 hours
**Owner**: Frontend Developer
**Dependencies**: None

#### Pre-Conditions
- [ ] Branch created from main
- [ ] Local dev environment working
- [ ] TypeScript compilation passes

#### Execution Steps

**Step 1: Identify All Legacy Routes (30 min)**
```bash
# List all page imports in App.tsx
grep -n "import.*from.*pages" client/src/App.tsx

# Expected output: 9 legacy page imports
# Orders, Invoices, Inventory, Clients, PurchaseOrders,
# PickPack, ClientLedger, Quotes, SpreadsheetView
```

**Step 2: Import WorkSurfaceGate (15 min)**
```typescript
// Add to client/src/App.tsx
import { WorkSurfaceGate } from '@/hooks/work-surface/useWorkSurfaceFeatureFlags';

// Import all WorkSurface components
import { OrdersWorkSurface } from '@/components/work-surface/OrdersWorkSurface';
import { InvoicesWorkSurface } from '@/components/work-surface/InvoicesWorkSurface';
import { InventoryWorkSurface } from '@/components/work-surface/InventoryWorkSurface';
import { ClientsWorkSurface } from '@/components/work-surface/ClientsWorkSurface';
import { PurchaseOrdersWorkSurface } from '@/components/work-surface/PurchaseOrdersWorkSurface';
import { PickPackWorkSurface } from '@/components/work-surface/PickPackWorkSurface';
import { ClientLedgerWorkSurface } from '@/components/work-surface/ClientLedgerWorkSurface';
import { QuotesWorkSurface } from '@/components/work-surface/QuotesWorkSurface';
import { DirectIntakeWorkSurface } from '@/components/work-surface/DirectIntakeWorkSurface';
```

**Step 3: Wrap Each Route (2 hours)**
```typescript
// Replace each legacy route with WorkSurfaceGate wrapper
// Example for Orders:

// BEFORE:
<Route path="/orders" element={<Orders />} />

// AFTER:
<Route
  path="/orders"
  element={
    <WorkSurfaceGate
      featureFlag="WORK_SURFACE_ORDERS"
      newComponent={<OrdersWorkSurface />}
      legacyComponent={<Orders />}
    />
  }
/>
```

**Step 4: Route Mapping Table**

| Route | Feature Flag | Legacy Component | WorkSurface Component |
|-------|--------------|------------------|----------------------|
| `/orders` | `WORK_SURFACE_ORDERS` | `Orders` | `OrdersWorkSurface` |
| `/accounting/invoices` | `WORK_SURFACE_ACCOUNTING` | `Invoices` | `InvoicesWorkSurface` |
| `/inventory` | `WORK_SURFACE_INVENTORY` | `Inventory` | `InventoryWorkSurface` |
| `/clients` | `WORK_SURFACE_ORDERS` | `ClientsListPage` | `ClientsWorkSurface` |
| `/purchase-orders` | `WORK_SURFACE_INTAKE` | `PurchaseOrdersPage` | `PurchaseOrdersWorkSurface` |
| `/orders/pick-pack` | `WORK_SURFACE_INVENTORY` | `PickPackPage` | `PickPackWorkSurface` |
| `/clients/:id/ledger` | `WORK_SURFACE_ACCOUNTING` | `ClientLedger` | `ClientLedgerWorkSurface` |
| `/quotes` | `WORK_SURFACE_ORDERS` | `Quotes` | `QuotesWorkSurface` |
| `/spreadsheet` | `WORK_SURFACE_INTAKE` | `SpreadsheetViewPage` | `DirectIntakeWorkSurface` |

**Step 5: Verify Compilation (30 min)**
```bash
# Must pass
pnpm typecheck
pnpm build

# Verify all 9 routes wrapped
grep -c "WorkSurfaceGate" client/src/App.tsx
# Expected: 9
```

**Step 6: Manual Smoke Test (45 min)**
```bash
# Start dev server
pnpm dev

# Test each route with flag OFF (should show legacy)
# Test each route with flag ON (should show WorkSurface)
```

#### Verification Checklist
- [ ] `grep -c "WorkSurfaceGate" client/src/App.tsx` returns 9
- [ ] TypeScript compilation passes
- [ ] Build succeeds
- [ ] All 9 routes accessible with flag OFF
- [ ] All 9 routes accessible with flag ON
- [ ] No console errors in browser

#### Go/No-Go Criteria
| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Routes wrapped | 9 | | |
| Build passes | Yes | | |
| Manual test | All pass | | |

---

### DEPLOY-002: Add Gate Scripts to package.json

**Estimate**: 1 hour
**Owner**: DevOps/Developer
**Dependencies**: None

#### Pre-Conditions
- [ ] Scripts exist in `scripts/qa/`
- [ ] Scripts are executable (`chmod +x`)

#### Execution Steps

**Step 1: Verify Scripts Exist (10 min)**
```bash
ls -la scripts/qa/
# Expected files:
# - placeholder-scan.sh
# - rbac-verify.sh
# - feature-parity.sh
# - invariant-checks.ts
# - orphaned-procedures.sh
# - bulk-action-parity.sh
```

**Step 2: Make Scripts Executable (5 min)**
```bash
chmod +x scripts/qa/*.sh
```

**Step 3: Add npm Scripts to package.json (15 min)**
```json
{
  "scripts": {
    "gate:placeholder": "bash scripts/qa/placeholder-scan.sh",
    "gate:rbac": "bash scripts/qa/rbac-verify.sh",
    "gate:parity": "bash scripts/qa/feature-parity.sh",
    "gate:invariants": "tsx scripts/qa/invariant-checks.ts",
    "gate:orphaned": "bash scripts/qa/orphaned-procedures.sh",
    "gate:bulk": "bash scripts/qa/bulk-action-parity.sh",
    "gate:all": "npm run gate:placeholder && npm run gate:rbac && npm run gate:parity && npm run gate:invariants"
  }
}
```

**Step 4: Test Each Gate (30 min)**
```bash
# Run each gate individually
npm run gate:placeholder
npm run gate:rbac
npm run gate:parity
npm run gate:invariants

# Run all gates
npm run gate:all
```

#### Verification Checklist
- [ ] All 6 scripts executable
- [ ] `npm run gate:placeholder` exits 0
- [ ] `npm run gate:rbac` exits 0
- [ ] `npm run gate:parity` exits 0 (or documents known gaps)
- [ ] `npm run gate:invariants` exits 0
- [ ] `npm run gate:all` exits 0

#### Go/No-Go Criteria
| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Scripts added | 6 | | |
| gate:all passes | Yes | | |

---

### DEPLOY-003: Seed Missing RBAC Permissions

**Estimate**: 4 hours
**Owner**: Backend Developer
**Dependencies**: None

#### Pre-Conditions
- [ ] Database access available
- [ ] USER_FLOW_MATRIX.csv accessible
- [ ] rbacDefinitions.ts understood

#### Execution Steps

**Step 1: Extract Required Permissions from USER_FLOW_MATRIX (30 min)**
```bash
# Extract all permission strings from USER_FLOW_MATRIX.csv
cut -d',' -f8 docs/reference/USER_FLOW_MATRIX.csv | \
  grep -v "^$" | \
  tr '|' '\n' | \
  sort -u > /tmp/required_perms.txt

# Count
wc -l /tmp/required_perms.txt
# Expected: 100+
```

**Step 2: Extract Current Seeded Permissions (30 min)**
```bash
# From rbacDefinitions.ts
grep -oh '"[a-z_]*:[a-z_]*"' server/services/rbacDefinitions.ts | \
  sort -u > /tmp/seeded_perms.txt

# Find missing
comm -23 /tmp/required_perms.txt /tmp/seeded_perms.txt > /tmp/missing_perms.txt

# Review missing
cat /tmp/missing_perms.txt
```

**Step 3: Add Missing Permissions to rbacDefinitions.ts (2 hours)**

For each missing permission in `/tmp/missing_perms.txt`:

```typescript
// Add to server/services/rbacDefinitions.ts

// Example: Adding accounting permissions
export const permissions = {
  // ... existing permissions

  // Accounting - Added for Work Surfaces
  'accounting:view_ar_aging': {
    name: 'accounting:view_ar_aging',
    description: 'View AR aging report',
    roles: ['accounting', 'super_admin', 'sales_manager']
  },
  'accounting:view_ap_aging': {
    name: 'accounting:view_ap_aging',
    description: 'View AP aging report',
    roles: ['accounting', 'super_admin']
  },
  // ... add all missing permissions
};
```

**Step 4: Create Migration for Permission Seeding (30 min)**
```typescript
// db/migrations/YYYYMMDD_seed_worksurface_permissions.ts
import { permissions } from '@/services/rbacDefinitions';

export async function up(db) {
  const newPerms = [
    'accounting:view_ar_aging',
    'accounting:view_ap_aging',
    // ... list all new permissions
  ];

  for (const permKey of newPerms) {
    const perm = permissions[permKey];
    if (perm) {
      await db.permission.upsert({
        where: { name: perm.name },
        create: { name: perm.name, description: perm.description },
        update: {}
      });
    }
  }
}
```

**Step 5: Run Migration and Verify (30 min)**
```bash
# Run migration
pnpm db:migrate

# Verify permissions exist
pnpm db:studio
# Query: SELECT COUNT(*) FROM Permission WHERE name LIKE 'accounting:%'
# Expected: 40+

# Run RBAC gate
npm run gate:rbac
```

#### Verification Checklist
- [ ] All permissions from USER_FLOW_MATRIX extracted
- [ ] Missing permissions identified
- [ ] rbacDefinitions.ts updated
- [ ] Migration created
- [ ] Migration executed successfully
- [ ] `npm run gate:rbac` passes

#### Go/No-Go Criteria
| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Missing perms added | 40+ | | |
| Migration runs | Yes | | |
| gate:rbac passes | Yes | | |

---

### DEPLOY-004: Capture Baseline Metrics

**Estimate**: 2 hours
**Owner**: DevOps/SRE
**Dependencies**: None

#### Pre-Conditions
- [ ] Access to production observability stack
- [ ] Sentry dashboard access
- [ ] Application logs accessible

#### Execution Steps

**Step 1: Capture Current Latency Metrics (30 min)**

Query your observability platform for each endpoint:

| Endpoint | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate (%) |
|----------|----------|----------|----------|----------------|
| `/api/trpc/orders.getAll` | | | | |
| `/api/trpc/invoices.list` | | | | |
| `/api/trpc/inventory.getEnhanced` | | | | |
| `/api/trpc/clients.list` | | | | |
| `/api/trpc/purchaseOrders.list` | | | | |
| `/api/trpc/orders.getPickPackList` | | | | |
| `/api/trpc/clients.getLedger` | | | | |
| `/api/trpc/quotes.list` | | | | |
| `/api/trpc/batches.list` | | | | |

**Step 2: Capture Error Rates (30 min)**

```sql
-- Sentry or log query
SELECT
  endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as errors,
  100.0 * SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) / COUNT(*) as error_rate
FROM request_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND endpoint LIKE '/api/trpc/%'
GROUP BY endpoint
ORDER BY error_rate DESC;
```

**Step 3: Define Alert Thresholds (30 min)**

| Metric | Baseline | Warning Threshold | Critical Threshold |
|--------|----------|-------------------|-------------------|
| P95 Latency | _baseline_ | +50% | +100% |
| Error Rate | _baseline_ | +1% | +5% |
| 500 Errors/min | _baseline_ | 10 | 50 |
| Invariant Violations | 0 | 1 | 5 |

**Step 4: Create Monitoring Dashboard (30 min)**

Dashboard panels:
1. **Latency by Endpoint** - Time series graph
2. **Error Rate by Endpoint** - Time series graph
3. **Work Surface vs Legacy** - Comparison view
4. **Invariant Violation Count** - Number panel
5. **Active Users by Page** - Real-time counter
6. **Rollout Percentage** - Current feature flag %

**Step 5: Configure Alerts**

```yaml
# Alert configuration
alerts:
  - name: "WorkSurface Latency Spike"
    condition: "p95_latency > baseline * 1.5"
    severity: warning
    notify: ["#terp-alerts", "oncall@terp.io"]

  - name: "WorkSurface Error Rate"
    condition: "error_rate > baseline + 0.01"
    severity: warning
    notify: ["#terp-alerts"]

  - name: "Invariant Violation"
    condition: "invariant_violations > 0"
    severity: critical
    notify: ["#terp-alerts", "oncall@terp.io"]
    action: "auto_disable_feature_flags"
```

#### Verification Checklist
- [ ] Baseline latency captured for all 9 endpoints
- [ ] Baseline error rates captured
- [ ] Alert thresholds defined
- [ ] Monitoring dashboard created
- [ ] Alerts configured and tested

#### Deliverable: Baseline Document

Create `docs/deployment/BASELINE_METRICS_YYYYMMDD.md`:

```markdown
# Work Surfaces Baseline Metrics

**Captured**: YYYY-MM-DD HH:MM UTC
**Captured By**: [Name]

## Latency Baselines
| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| orders.getAll | Xms | Xms | Xms |
| ... | | | |

## Error Rate Baselines
| Endpoint | 7-day Error Rate |
|----------|------------------|
| orders.getAll | X.XX% |
| ... | |

## Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| P95 Latency | +50% | +100% |
| Error Rate | +1% | +5% |

## Dashboard URL
[Link to monitoring dashboard]
```

#### Go/No-Go Criteria
| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Baselines captured | 9 endpoints | | |
| Dashboard created | Yes | | |
| Alerts configured | Yes | | |

---

## Phase 0 Completion Gate

**All 4 tasks must complete before proceeding to Phase 1.**

```
┌────────────────────────────────────────────────────────────────┐
│                   PHASE 0 COMPLETION CHECKLIST                  │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [ ] DEPLOY-001: App.tsx has 9 WorkSurfaceGate routes          │
│   [ ] DEPLOY-002: npm run gate:all passes                       │
│   [ ] DEPLOY-003: All RBAC permissions seeded                   │
│   [ ] DEPLOY-004: Baseline metrics captured                     │
│                                                                  │
│   [ ] All changes committed to branch                           │
│   [ ] PR created and approved                                   │
│   [ ] Merged to main                                            │
│   [ ] Deployed to staging                                       │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Internal QA (Stage 0)

### DEPLOY-005: Execute Stage 0 (Internal QA)

**Estimate**: 8 hours
**Owner**: QA Team + Developer
**Dependencies**: DEPLOY-001, DEPLOY-002, DEPLOY-003, DEPLOY-004

#### Pre-Conditions
- [ ] Phase 0 complete
- [ ] Code deployed to production (flags OFF)
- [ ] Internal user accounts identified
- [ ] QA checklist prepared

#### Execution Steps

**Step 1: Enable Feature Flags for Internal Users Only (30 min)**

```sql
-- Enable for specific user IDs (internal team)
INSERT INTO feature_flag_overrides (flag_name, user_id, enabled)
VALUES
  ('WORK_SURFACE_INTAKE', 'user_internal_1', true),
  ('WORK_SURFACE_INTAKE', 'user_internal_2', true),
  ('WORK_SURFACE_ORDERS', 'user_internal_1', true),
  ('WORK_SURFACE_ORDERS', 'user_internal_2', true),
  ('WORK_SURFACE_INVENTORY', 'user_internal_1', true),
  ('WORK_SURFACE_INVENTORY', 'user_internal_2', true),
  ('WORK_SURFACE_ACCOUNTING', 'user_internal_1', true),
  ('WORK_SURFACE_ACCOUNTING', 'user_internal_2', true);
```

**Step 2: Run All Gate Scripts (30 min)**

```bash
# Run each gate and capture output
npm run gate:all 2>&1 | tee /tmp/gate-output.txt

# All must pass
echo "Exit code: $?"
```

**Step 3: Execute Golden Flows (4 hours)**

For each Golden Flow, test with appropriate role:

| Flow ID | Flow Name | Test Role | Steps | Expected Result |
|---------|-----------|-----------|-------|-----------------|
| GF-001 | Direct Intake | Inventory | Create batch via spreadsheet | Batch created, inventory updated |
| GF-002 | Standard PO | Purchasing | Create PO, receive goods | PO completed, inventory increased |
| GF-003 | Sales Order | Sales Rep | Create order, add items, confirm | Order confirmed, inventory reserved |
| GF-004 | Invoice & Payment | Accounting | Generate invoice, record payment | Invoice paid, AR reduced |
| GF-005 | Pick & Pack | Fulfillment | Pick items, pack, ship | Order shipped, inventory decreased |
| GF-006 | Client Ledger | Sales Rep | View ledger, check balance | Correct balance displayed |
| GF-007 | Inventory Adjust | Inventory | Adjust qty, add reason | Adjustment recorded with audit |
| GF-008 | Sample Request | Sales Rep | Create sample, track | Sample created, inventory reserved |

**Golden Flow Test Template:**

```markdown
## GF-001: Direct Intake

**Tester**: [Name]
**Date**: YYYY-MM-DD HH:MM
**Role**: Inventory Manager

### Steps
1. Navigate to /spreadsheet
2. Enter batch data: Strain, Qty, Vendor
3. Click "Create Batch"
4. Verify batch appears in inventory

### Expected
- Batch created with correct data
- Inventory qty increased
- Movement record created

### Actual
- [ ] Batch created:
- [ ] Inventory updated:
- [ ] Movement recorded:

### Status: PASS / FAIL

### Notes:
[Any observations]
```

**Step 4: Run Invariant Checks (30 min)**

```bash
# Run invariant checks
npm run gate:invariants

# Manual verification
# Connect to DB and run invariant queries
```

**Step 5: Review Monitoring Dashboard (30 min)**

- Check latency metrics
- Check error rates
- Verify no invariant violations
- Review Sentry for new errors

**Step 6: Document Findings (2 hours)**

Create `docs/qa/STAGE0_QA_REPORT_YYYYMMDD.md`:

```markdown
# Stage 0 QA Report

**Date**: YYYY-MM-DD
**Testers**: [Names]
**Duration**: X hours

## Gate Results
| Gate | Status | Notes |
|------|--------|-------|
| placeholder-scan | PASS/FAIL | |
| rbac-verify | PASS/FAIL | |
| feature-parity | PASS/FAIL | |
| invariant-checks | PASS/FAIL | |

## Golden Flow Results
| Flow | Status | Notes |
|------|--------|-------|
| GF-001 | PASS/FAIL | |
| GF-002 | PASS/FAIL | |
| ... | | |

## Issues Found
| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| | | | |

## Metrics Comparison
| Metric | Baseline | Observed | Delta |
|--------|----------|----------|-------|
| P95 Latency | Xms | Xms | +X% |
| Error Rate | X% | X% | +X% |

## Recommendation
[ ] Proceed to Stage 1
[ ] Requires fixes before proceeding
```

#### Verification Checklist
- [ ] Internal users can access Work Surfaces
- [ ] All gate scripts pass
- [ ] All 8 Golden Flows pass
- [ ] No invariant violations
- [ ] Latency within +50% of baseline
- [ ] Error rate within +1% of baseline
- [ ] No P0 bugs found

#### Go/No-Go Criteria for Stage 1

| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| Gates pass | 4/4 | | |
| Golden Flows pass | 8/8 | | |
| P0 bugs | 0 | | |
| P1 bugs | ≤3 | | |
| Invariant violations | 0 | | |
| Latency regression | <50% | | |
| Error rate regression | <1% | | |

**Decision**: [ ] GO / [ ] NO-GO

---

## Phase 2: Staged Rollout

### Rollout Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGED ROLLOUT TIMELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Stage 0     Stage 1        Stage 2        Stage 3              │
│   (Internal)  (10%)          (50%)          (100%)               │
│      │          │              │              │                  │
│      ▼          ▼              ▼              ▼                  │
│   ───●──────────●──────────────●──────────────●───►              │
│      │          │              │              │                  │
│   8h QA     24h bake       24h bake       24h bake               │
│                                                                   │
│   Total: ~4 days from Stage 0 to 100%                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### DEPLOY-006: Execute Stage 1 (10% Rollout)

**Estimate**: 4 hours active + 24 hours observation
**Owner**: DevOps + On-call
**Dependencies**: DEPLOY-005 signed off

#### Pre-Conditions
- [ ] Stage 0 signed off
- [ ] On-call engineer briefed
- [ ] Rollback procedure reviewed
- [ ] Communication sent

#### Execution Steps

**Step 1: Pre-Rollout Communication (15 min)**

```
Subject: [TERP] Work Surfaces 10% Rollout Starting

Team,

We are beginning the 10% rollout of Work Surfaces at [TIME].

What's changing:
- 10% of users will see new Work Surface UI
- Legacy UI remains default for 90%

Monitoring:
- Dashboard: [URL]
- On-call: [Name]

Rollback trigger:
- Error rate >5%
- P95 latency >2x baseline
- Any invariant violation

Contact: #terp-alerts or [oncall@terp.io]
```

**Step 2: Enable 10% Rollout (15 min)**

```sql
-- Update feature flags to 10%
UPDATE feature_flags
SET
  rollout_percentage = 10,
  updated_at = NOW()
WHERE name IN (
  'WORK_SURFACE_INTAKE',
  'WORK_SURFACE_ORDERS',
  'WORK_SURFACE_INVENTORY',
  'WORK_SURFACE_ACCOUNTING'
);

-- Verify
SELECT name, rollout_percentage, enabled
FROM feature_flags
WHERE name LIKE 'WORK_SURFACE_%';
```

**Step 3: Monitor First Hour (1 hour)**

Every 15 minutes:
- [ ] Check error rate dashboard
- [ ] Check latency dashboard
- [ ] Check invariant violations
- [ ] Check Sentry for new errors
- [ ] Check support channel for user reports

**Step 4: 24-Hour Bake Period**

Monitoring schedule:
| Time | Check Type | Owner |
|------|------------|-------|
| +1h | Full metrics review | Primary |
| +4h | Full metrics review | Primary |
| +8h | Full metrics review | Primary |
| +12h | Full metrics review | Secondary |
| +24h | Final review + Go/No-Go | Lead |

**Step 5: Document Stage 1 Results**

```markdown
# Stage 1 (10%) Results

**Start**: YYYY-MM-DD HH:MM
**End**: YYYY-MM-DD HH:MM
**Duration**: 24 hours

## Metrics
| Metric | Baseline | Stage 1 | Delta |
|--------|----------|---------|-------|
| P95 Latency | Xms | Xms | +X% |
| Error Rate | X% | X% | +X% |
| Invariant Violations | 0 | 0 | 0 |

## User Feedback
| Source | Count | Summary |
|--------|-------|---------|
| Support tickets | X | |
| Slack reports | X | |

## Issues
| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|

## Decision
[ ] Proceed to Stage 2
[ ] Extend bake period
[ ] Rollback required
```

#### Rollback Procedure

If any threshold exceeded:

```sql
-- IMMEDIATE: Disable all Work Surface flags
UPDATE feature_flags
SET
  rollout_percentage = 0,
  enabled = false,
  updated_at = NOW()
WHERE name LIKE 'WORK_SURFACE_%';

-- Verify rollback
SELECT name, rollout_percentage, enabled
FROM feature_flags
WHERE name LIKE 'WORK_SURFACE_%';
```

Time to rollback: **< 60 seconds**

#### Go/No-Go Criteria for Stage 2

| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| 24h bake complete | Yes | | |
| P0 bugs | 0 | | |
| Invariant violations | 0 | | |
| Latency regression | <50% | | |
| Error rate regression | <2% | | |
| User complaints | <5 | | |

---

### DEPLOY-007: Execute Stage 2 (50% Rollout)

**Estimate**: 4 hours active + 24 hours observation
**Owner**: DevOps + On-call
**Dependencies**: DEPLOY-006 signed off

#### Execution Steps

Same pattern as Stage 1, with:

```sql
-- Update to 50%
UPDATE feature_flags
SET rollout_percentage = 50
WHERE name LIKE 'WORK_SURFACE_%';
```

#### Go/No-Go Criteria for Stage 3

| Criteria | Required | Actual | Status |
|----------|----------|--------|--------|
| 24h bake complete | Yes | | |
| P0 bugs | 0 | | |
| Invariant violations | 0 | | |
| Latency regression | <30% | | |
| Error rate regression | <1% | | |
| User complaints | <10 | | |

---

### DEPLOY-008: Execute Stage 3 (100% Rollout)

**Estimate**: 4 hours active + 24 hours observation
**Owner**: DevOps + Product Lead
**Dependencies**: DEPLOY-007 signed off

#### Execution Steps

**Step 1: Final Pre-Rollout Review (30 min)**

```markdown
## 100% Rollout Readiness Checklist

### Technical
- [ ] All gates still passing
- [ ] No open P0/P1 bugs
- [ ] Monitoring dashboard healthy
- [ ] Rollback procedure tested

### Business
- [ ] Product owner sign-off
- [ ] Support team briefed
- [ ] Documentation updated

### Communication
- [ ] User announcement drafted
- [ ] Internal announcement drafted
```

**Step 2: Enable 100% Rollout (15 min)**

```sql
-- Update to 100%
UPDATE feature_flags
SET rollout_percentage = 100
WHERE name LIKE 'WORK_SURFACE_%';

-- Verify
SELECT name, rollout_percentage, enabled
FROM feature_flags
WHERE name LIKE 'WORK_SURFACE_%';
```

**Step 3: Send Announcements**

```
Subject: [TERP] Work Surfaces Now Live for All Users

Team & Users,

Work Surfaces is now live for 100% of users!

What's new:
- Faster keyboard navigation
- Improved save state indicators
- Better mobile responsiveness
- Unified inspector panels

Known issues: [Link to known issues doc]

Feedback: [Link to feedback form]

Support: support@terp.io or #terp-support

Thank you for your patience during this rollout.
```

**Step 4: 24-Hour Observation**

Same monitoring pattern as Stage 1 and 2.

**Step 5: Declare Success (or Issues)**

After 24 hours with:
- Zero P0 bugs
- Zero invariant violations
- Metrics within threshold

**DECLARE: Work Surfaces 100% Rollout Complete**

Update documentation:
- [ ] CHANGELOG.md
- [ ] ATOMIC_ROADMAP.md → 100% deployed
- [ ] Session documentation

---

## Rollback Procedures

### Instant Rollback (Feature Flags)

**Time to execute**: < 60 seconds
**Impact**: Zero data loss

```sql
-- Disable all Work Surface flags
UPDATE feature_flags
SET
  rollout_percentage = 0,
  enabled = false
WHERE name LIKE 'WORK_SURFACE_%';
```

### Code Rollback

**Time to execute**: ~5 minutes
**When to use**: Bug in WorkSurface code, not infrastructure

```bash
# Revert to previous deployment
git revert HEAD
git push origin main

# Trigger deployment
# Or: kubectl rollout undo deployment/terp-web
```

### Schema Rollback

**Time to execute**: Forward migration only
**When to use**: Never - migrations are forward-only

If schema change causes issues:
1. Create forward migration to fix
2. Deploy fix
3. Do NOT attempt backward migration

---

## Communication Plan

### Stakeholder Matrix

| Stakeholder | Communication Channel | Frequency | Owner |
|-------------|----------------------|-----------|-------|
| Internal Dev Team | Slack #terp-dev | Real-time | DevOps |
| Product Team | Email + Slack | Daily during rollout | Product |
| Support Team | Slack #terp-support | Before each stage | Product |
| Users | In-app banner | Stage 3 only | Product |
| Executives | Email summary | Post-completion | Product Lead |

### Communication Templates

**Stage Start**:
```
[TERP] Work Surfaces Stage X Starting
- What: X% of users will see Work Surfaces
- When: Starting now
- Monitor: [Dashboard URL]
- Rollback: [On-call contact]
```

**Stage Complete**:
```
[TERP] Work Surfaces Stage X Complete
- Duration: X hours
- Issues: X (X resolved)
- Metrics: Within threshold
- Next: Stage X+1 in X hours
```

**Incident**:
```
[TERP] Work Surfaces Rollback Initiated
- Trigger: [Error rate / Latency / Invariant]
- Impact: Users reverted to legacy UI
- Status: Investigating
- ETA: [Time]
```

---

## Success Metrics

### Definition of Done

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rollout % | 100% | Feature flag setting |
| P0 Bugs | 0 for 7 days | Jira/Linear tracking |
| Invariant Violations | 0 for 7 days | invariant-checks.ts |
| Latency Regression | <20% | Monitoring dashboard |
| Error Rate Regression | <0.5% | Monitoring dashboard |
| User Satisfaction | NPS ≥ baseline | Survey |

### Post-Rollout Checklist

- [ ] 100% rollout stable for 7 days
- [ ] Zero P0 bugs
- [ ] Zero invariant violations
- [ ] Documentation updated
- [ ] Session file completed
- [ ] CHANGELOG.md updated
- [ ] ATOMIC_ROADMAP.md updated to "100% Deployed"
- [ ] Retrospective scheduled

---

## Appendix A: Quick Reference Commands

```bash
# Run all gates
npm run gate:all

# Check feature flag status
psql -c "SELECT * FROM feature_flags WHERE name LIKE 'WORK_SURFACE_%';"

# Instant rollback
psql -c "UPDATE feature_flags SET rollout_percentage = 0 WHERE name LIKE 'WORK_SURFACE_%';"

# Check invariants
npm run gate:invariants

# Check error rate (last hour)
# [Your observability query here]

# Check latency (last hour)
# [Your observability query here]
```

## Appendix B: Escalation Path

| Level | Condition | Contact | Response Time |
|-------|-----------|---------|---------------|
| L1 | Warning threshold | On-call Slack | 15 min |
| L2 | Critical threshold | On-call page | 5 min |
| L3 | Invariant violation | Engineering Lead | Immediate |
| L4 | Data corruption | CTO | Immediate |

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-20
**Author**: Claude (Deployment Strategy Session)
**Reviewers**: [Pending]

# Work Surfaces Deployment Strategy

> **Version**: 1.0.0
> **Date**: 2026-01-20
> **Classification**: Production Rollout - 100% Target
> **Author**: Staff+ Engineer / Release Manager / QA Lead

---

## 1. EXECUTIVE SUMMARY

### What is Being Deployed
- **9 Work Surface components** replacing legacy page layouts for core workflows
- **11 hooks** providing keyboard contracts, save state, validation timing, print, export, undo
- **3 Golden Flow E2E test suites** for critical business paths
- **Feature flag infrastructure** for safe progressive rollout

### Why This Rollout is Risky
1. **Routes not wired**: Work Surfaces exist but App.tsx still routes to legacy pages (0% deployment)
2. **No feature flag integration**: `useWorkSurfaceFeatureFlags` exists but not consumed in routing
3. **Business logic coupling**: Mutations, inventory movements, and ledger entries must maintain integrity
4. **Hidden feature risk**: Worksurfaces may bury power-user shortcuts or critical filters
5. **RBAC consistency**: All 1,414+ tRPC procedures must maintain server-side permission enforcement
6. **Dev = Prod**: Current "production" site is effectively a dev/test environment

### How the Plan Prevents Regressions
1. **Gate-based progression**: No stage advance without passing automated + manual gates
2. **Self-correction loops**: Auto-disable via feature flag if invariants break
3. **Feature parity matrix**: Every feature from initiative must be traceable to implementation
4. **Erased function detection**: Explicit audit of click-depth increases and buried features
5. **Business logic verification**: End-to-end linkage tests for critical mutations

### What "Done" Means (100% Rollout Conditions)
- [ ] All 9 Work Surfaces wired into routes via feature flags
- [ ] Feature flags enabled for 100% of users
- [ ] All 8 Golden Flows passing E2E tests
- [ ] Zero P0 issues in Gap Ledger
- [ ] Rollback tested and documented
- [ ] Monitoring dashboards active with zero critical alerts
- [ ] Legacy page components marked for deprecation

---

## 2. SYSTEM INVENTORY & TRUTH MODEL

### 2.1 Canonical Workflows (from USER_FLOW_MATRIX / FLOW_GUIDE)

| Flow ID | Flow Name | Entry Point | Pass Conditions | Critical Mutations |
|---------|-----------|-------------|-----------------|-------------------|
| GF-001 | Direct Intake | /spreadsheet | Batches created, inventory updated | `productIntake.*`, `inventoryMovements.record` |
| GF-002 | Standard PO | /purchase-orders | PO received, inventory updated | `purchaseOrders.confirm`, `poReceiving.receive` |
| GF-003 | Sales Order | /orders | Order created, inventory reserved | `orders.create`, `orders.confirmOrder` |
| GF-004 | Invoice & Payment | /accounting/invoices | Invoice paid, AR cleared | `invoices.generateFromOrder`, `accounting.receiveClientPayment` |
| GF-005 | Pick & Pack | /pick-pack | Order fulfilled, inventory decremented | `pickPack.packItems`, `pickPack.markOrderReady` |
| GF-006 | Client Ledger | /clients/:id/ledger | Accurate balance displayed | `clientLedger.getLedger` |
| GF-007 | Inventory Adjustment | /inventory | Movement logged, qty updated | `inventoryMovements.adjust` |
| GF-008 | Sample Request | /samples | Sample dispatched, inventory decremented | `samples.createRequest`, `samples.fulfillRequest` |

### 2.2 Role / RBAC Matrix (from QA_AUTH.md)

| QA Account | Role | Key Permissions | Server-Enforced |
|------------|------|-----------------|-----------------|
| `qa.superadmin@terp.test` | Super Admin | ALL (bypass) | Yes - `adminProcedure` |
| `qa.salesmanager@terp.test` | Sales Manager | clients:*, orders:*, quotes:* | Yes - `protectedProcedure` + permission check |
| `qa.salesrep@terp.test` | Sales Rep | clients:read, orders:create | Yes - `protectedProcedure` + permission check |
| `qa.inventory@terp.test` | Inventory Manager | inventory:*, batches:* | Yes - `protectedProcedure` + permission check |
| `qa.fulfillment@terp.test` | Warehouse Staff | orders:fulfill, inventory:adjust | Yes - `protectedProcedure` + permission check |
| `qa.accounting@terp.test` | Accountant | accounting:*, invoices:* | Yes - `protectedProcedure` + permission check |
| `qa.auditor@terp.test` | Read-Only Auditor | *:read, audit:* | Yes - `protectedProcedure` + permission check |

**Critical RBAC Checks (Must be server-enforced):**
- `strictlyProtectedProcedure`: User management, password changes, audit log user history
- `adminProcedure`: RBAC role assignment, schema push, migration execution
- `vipPortalProcedure`: VIP client session verification

### 2.3 Invariants (Must Never Break)

| Invariant | Description | Detection Method | Auto-Heal |
|-----------|-------------|------------------|-----------|
| INV-001 | Inventory qty cannot go negative (unless explicitly allowed) | `inventoryMovements.validateAvailability` | Block mutation |
| INV-002 | Invoice amounts must equal sum of line items | Post-mutation check | Alert + flag for review |
| INV-003 | Payments cannot exceed invoice total | Pre-mutation validation | Block mutation |
| INV-004 | Fiscal period locks prevent retroactive postings | `accounting.postJournalEntry` check | Block mutation |
| INV-005 | Ledger entries must balance (debits = credits) | Transaction-level check | Rollback transaction |
| INV-006 | Order total must equal sum of line items | Pre-save validation | Block save |
| INV-007 | Batch COGS cannot be modified after sale | Business rule check | Block mutation |
| INV-008 | Soft-deleted records must not appear in UI lists | Query filter | Auto-filter |

---

## 3. PRE-DEPLOY GAP FIXING STRATEGY

### 3.1 Known Issues/Gaps Intake

**Discovery Methods:**
```bash
# 1. TODO/FIXME scan in work-surface code
grep -r "TODO\|FIXME\|HACK\|XXX" client/src/components/work-surface/ client/src/hooks/work-surface/

# 2. TypeScript compilation check
npx tsc --noEmit 2>&1 | grep -E "error TS"

# 3. Failing tests
npm test -- --run 2>&1 | grep -E "FAIL|Error"

# 4. PR history check for known issues
git log --oneline --grep="fix\|bug" -- client/src/components/work-surface/

# 5. Flow matrix coverage gaps
diff <(grep "WorkSurface" FEATURE_PRESERVATION_MATRIX.md) <(ls client/src/components/work-surface/*WorkSurface.tsx)
```

### 3.2 Mandatory Fix Categories

#### Category A: Placeholder Eradication
**Rule**: No TODO, FIXME, "coming soon", or placeholder text in:
- Money calculations (invoices, payments, COGS)
- Inventory mutations
- Auth/RBAC enforcement
- Posting workflows
- Reporting/export

**Detection Script:**
```bash
#!/bin/bash
# placeholder-scan.sh
CRITICAL_PATHS=(
  "client/src/components/work-surface/*Invoice*"
  "client/src/components/work-surface/*Payment*"
  "client/src/components/work-surface/*Inventory*"
  "client/src/hooks/work-surface/useExport*"
  "server/src/routers/accounting*"
  "server/src/routers/inventory*"
)
for path in "${CRITICAL_PATHS[@]}"; do
  grep -rn "TODO\|FIXME\|placeholder\|coming soon" $path && echo "FAIL: Found placeholder in $path" && exit 1
done
echo "PASS: No critical placeholders found"
```

#### Category B: Wiring Completeness
**Rule**: Every Work Surface must have complete UI→tRPC→Prisma chain.

| Work Surface | tRPC Router | Prisma Model | Status |
|--------------|-------------|--------------|--------|
| OrdersWorkSurface | orders.* | Order, OrderLineItem | VERIFY |
| InvoicesWorkSurface | invoices.*, accounting.* | Invoice, Payment | VERIFY |
| InventoryWorkSurface | batches.*, inventoryMovements.* | Batch, InventoryMovement | VERIFY |
| ClientsWorkSurface | clients.* | Client | VERIFY |
| PurchaseOrdersWorkSurface | purchaseOrders.* | PurchaseOrder | VERIFY |
| PickPackWorkSurface | pickPack.* | PickPackItem | VERIFY |
| ClientLedgerWorkSurface | clientLedger.* | LedgerEntry | VERIFY |
| QuotesWorkSurface | orders.* (type=QUOTE) | Order | VERIFY |
| DirectIntakeWorkSurface | productIntake.* | IntakeSession, Batch | VERIFY |

#### Category C: RBAC Enforcement
**Rule**: All mutations must have server-side permission checks.

**Verification Script:**
```bash
# Check all mutations have permission enforcement
grep -rn "protectedProcedure\|adminProcedure\|strictlyProtectedProcedure" server/src/routers/ | wc -l
# Should match or exceed mutation count
grep -rn "mutation(" server/src/routers/ | wc -l
```

#### Category D: Error State Handling
**Rule**: Every mutation must have:
1. Loading state
2. Success feedback
3. Error display
4. Retry capability (for transient errors)

### 3.3 Gap Ledger Template

```markdown
| Gap ID | Description | Severity | Category | Fix Description | Verification Test | Status |
|--------|-------------|----------|----------|-----------------|-------------------|--------|
| GAP-001 | Routes not wired to WorkSurfaces | CRITICAL | Wiring | Update App.tsx with WorkSurfaceGate | Route renders WorkSurface when flag ON | OPEN |
| GAP-002 | Feature flags not consumed | CRITICAL | Wiring | Add WorkSurfaceGate wrapper | Flag toggle changes displayed component | OPEN |
| GAP-003 | useConcurrentEditDetection not integrated | HIGH | Logic | Add hook to all WorkSurfaces | Concurrent edit shows conflict dialog | OPEN |
| GAP-004 | 2 direct toast.error calls in InvoicesWorkSurface | MEDIUM | Consistency | Migrate to toasts.error from hook | All toasts use standardized hook | OPEN |
| GAP-005 | useExport not integrated in any WorkSurface | LOW | Feature | Add export button to grids | Export button visible and functional | OPEN |
```

---

## 4. FEATURE PARITY & SURFACE COMPLETENESS VALIDATION

### 4.1 Feature Parity Matrix

**Source of Truth**: `FEATURE_PRESERVATION_MATRIX.md` (110 features)

| Feature ID | Feature Name | Exists? | Entry Point(s) | Role Visibility | Dependencies | Verification Test | Status |
|------------|--------------|---------|----------------|-----------------|--------------|-------------------|--------|
| DF-010 | Product Intake | YES | /spreadsheet → DirectIntakeWorkSurface | Inventory | productIntake.* | GF-001 E2E | VERIFY |
| DF-018 | Purchase Orders | YES | /purchase-orders → PurchaseOrdersWorkSurface | Purchasing | purchaseOrders.* | GF-002 E2E | VERIFY |
| SALE-001 | Sales Orders | YES | /orders → OrdersWorkSurface | Sales | orders.* | GF-003 E2E | VERIFY |
| ACCT-001 | Invoices | YES | /accounting/invoices → InvoicesWorkSurface | Accounting | invoices.* | GF-004 E2E | VERIFY |
| FUL-001 | Pick & Pack | YES | /pick-pack → PickPackWorkSurface | Fulfillment | pickPack.* | GF-005 E2E | VERIFY |
| DF-060 | Client Ledger | YES | /clients/:id/ledger → ClientLedgerWorkSurface | Sales, Accounting | clientLedger.* | GF-006 E2E | VERIFY |
| INV-001 | Inventory | YES | /inventory → InventoryWorkSurface | Inventory | batches.*, inventoryMovements.* | GF-007 E2E | VERIFY |
| DF-020 | Quotes | YES | /quotes → QuotesWorkSurface | Sales | orders.* (QUOTE) | Quote E2E | VERIFY |
| DF-026 | Client 360 | YES | /clients/:id → ClientsWorkSurface | Sales | clients.* | Client E2E | VERIFY |

### 4.2 Missing/Inaccessible Feature Detection

**Method 1: Compare old pages vs WorkSurfaces**
```bash
# List all tRPC calls in old pages
grep -rh "trpc\.\|api\." client/src/pages/Orders.tsx | sort -u > /tmp/old_orders_calls.txt

# List all tRPC calls in WorkSurface
grep -rh "trpc\.\|api\." client/src/components/work-surface/OrdersWorkSurface.tsx | sort -u > /tmp/new_orders_calls.txt

# Find missing calls
diff /tmp/old_orders_calls.txt /tmp/new_orders_calls.txt
```

**Method 2: Find orphaned actions (no navigation path)**
```bash
# Find button/action handlers that exist in old pages but not in WorkSurfaces
grep -rh "onClick\|onSubmit" client/src/pages/Orders.tsx | grep -v "// " > /tmp/old_handlers.txt
grep -rh "onClick\|onSubmit" client/src/components/work-surface/OrdersWorkSurface.tsx | grep -v "// " > /tmp/new_handlers.txt
```

**Method 3: Dead procedure scan**
```bash
# Find tRPC procedures with no callers
for proc in $(grep -rh "\.useMutation\|\.useQuery" server/src/routers/ | sed 's/.*\.\([a-zA-Z]*\).*/\1/' | sort -u); do
  count=$(grep -r "$proc" client/src/ | wc -l)
  [ $count -eq 0 ] && echo "ORPHAN: $proc"
done
```

### 4.3 Acceptance Criteria for Parity

A feature is marked **PASS** when ALL of the following are true:
1. Feature exists in WorkSurface (code inspection)
2. Feature is accessible via documented entry point (navigation test)
3. Feature works for correct role (RBAC test with QA accounts)
4. Feature's tRPC calls are identical to old page (call comparison)
5. Feature's E2E test passes (automated test)

---

## 5. "DON'T ERASE THE ERP" USABILITY REGRESSION CHECK

### 5.1 Regression Heuristics

| Heuristic | Detection Method | Severity if Violated |
|-----------|------------------|----------------------|
| Click depth increase | Compare navigation steps old vs new | HIGH |
| Loss of global search discoverability | Cmd+K audit | HIGH |
| Removal of bulk actions | Compare bulk action buttons | HIGH |
| Hidden critical filters/sorts | Compare filter options | MEDIUM |
| Loss of quick context switching | Compare keyboard shortcuts | MEDIUM |
| Loss of power paths (keyboard shortcuts) | Compare shortcut definitions | MEDIUM |
| Loss of inline edit capability | Compare edit modes | LOW |

### 5.2 Erased/Buried Functionality Ledger

```markdown
| Function | Old Access Path | New Access Path | Click Depth Change | Severity | Mitigation | Status |
|----------|-----------------|-----------------|-------------------|----------|------------|--------|
| Create Order | /orders → "New Order" button | /orders → "New Order" button | 0 | NONE | - | OK |
| Quick Client Lookup | /orders → Type in search | /orders → Type in search | 0 | NONE | - | VERIFY |
| Bulk Status Update | /orders → Select → Bulk Actions | /orders → Select → ? | ? | VERIFY | Ensure bulk action bar exists | VERIFY |
| Export to CSV | /orders → Export button | /orders → ? | ? | VERIFY | useExport integration needed | OPEN |
| Print Invoice | /invoices → Print button | /invoices → Inspector → Print | +1 | LOW | Add to inspector actions | VERIFY |
| Void Invoice | /invoices → Void button | /invoices → Inspector → Void | +1 | LOW | Prominent in inspector | VERIFY |
| AR Aging View | /accounting/invoices → Tab | /accounting/invoices → Tab | 0 | NONE | Preserve tab structure | VERIFY |
```

### 5.3 Power User Path Verification

**Keyboard Shortcuts to Preserve:**
| Shortcut | Function | Old Location | New Location | Status |
|----------|----------|--------------|--------------|--------|
| Cmd+K | Command palette | Global | Global | OK |
| Cmd+N | New record | Context-dependent | useWorkSurfaceKeyboard | VERIFY |
| Tab | Next field | Forms | useWorkSurfaceKeyboard | OK |
| Shift+Tab | Previous field | Forms | useWorkSurfaceKeyboard | OK |
| Enter | Commit/Select | Forms/Grids | useWorkSurfaceKeyboard | OK |
| Escape | Cancel/Close | Modals/Inspectors | useWorkSurfaceKeyboard | OK |
| Arrow keys | Navigate grid | Grids | useWorkSurfaceKeyboard | OK |

---

## 6. BUSINESS LOGIC & LINKAGE VERIFICATION

### 6.1 Linkage Map

```
UI Event → tRPC Mutation → Prisma Write → Derived Totals → Downstream Views

Example: Record Payment
┌──────────────────────┐
│ PaymentInspector     │ UI: RecordPaymentForm submit
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ accounting.receive   │ tRPC: accounting.receiveClientPayment
│ ClientPayment        │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Prisma Transaction   │ DB: Payment.create, Invoice.update,
│                      │     LedgerEntry.create (AR credit)
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Derived Totals       │ Recalc: Invoice.amountPaid, Client.balance
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Downstream Views     │ Update: AR Aging, Client Ledger, Dashboard KPIs
└──────────────────────┘
```

### 6.2 High-Risk Linkage Categories

| Category | Risk | Verification Method |
|----------|------|---------------------|
| Inventory Adjustments | Double-counting, negative stock | E2E + DB assertion |
| Invoice/Payment | AR drift, incorrect aging | E2E + balance reconciliation |
| Allocations/Fulfillment | Over-shipment, ghost inventory | E2E + inventory count check |
| Receivables Aging | Incorrect aging buckets | Query comparison old vs new |
| Reporting Consistency | Totals mismatch | Sum verification scripts |

### 6.3 Invariant Check Suite

```typescript
// invariant-checks.ts
export const invariantChecks = {
  // INV-001: No negative inventory (unless allowed)
  inventoryNonNegative: async (db: PrismaClient) => {
    const negatives = await db.batch.findMany({
      where: {
        availableQuantity: { lt: 0 },
        allowNegative: false
      }
    });
    if (negatives.length > 0) {
      throw new InvariantViolation('INV-001', `Found ${negatives.length} negative batches`);
    }
  },

  // INV-002: Invoice total = sum of line items
  invoiceTotalsMatch: async (db: PrismaClient) => {
    const mismatches = await db.$queryRaw`
      SELECT i.id, i.total, SUM(li.amount) as computed
      FROM Invoice i
      JOIN InvoiceLineItem li ON li.invoiceId = i.id
      GROUP BY i.id
      HAVING ABS(i.total - SUM(li.amount)) > 0.01
    `;
    if (mismatches.length > 0) {
      throw new InvariantViolation('INV-002', `Found ${mismatches.length} invoice total mismatches`);
    }
  },

  // INV-005: Ledger balance (debits = credits)
  ledgerBalance: async (db: PrismaClient) => {
    const result = await db.$queryRaw`
      SELECT
        SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as debits,
        SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as credits
      FROM LedgerEntry
    `;
    if (Math.abs(result.debits - result.credits) > 0.01) {
      throw new InvariantViolation('INV-005', `Ledger imbalance: D=${result.debits} C=${result.credits}`);
    }
  },

  // INV-006: Order total = sum of line items
  orderTotalsMatch: async (db: PrismaClient) => {
    const mismatches = await db.$queryRaw`
      SELECT o.id, o.total, SUM(li.total) as computed
      FROM "Order" o
      JOIN OrderLineItem li ON li.orderId = o.id
      GROUP BY o.id
      HAVING ABS(o.total - SUM(li.total)) > 0.01
    `;
    if (mismatches.length > 0) {
      throw new InvariantViolation('INV-006', `Found ${mismatches.length} order total mismatches`);
    }
  }
};
```

### 6.4 Logic/Linkage Investigation List

```markdown
| Item | Description | Risk Level | Investigation Method | Status |
|------|-------------|------------|----------------------|--------|
| LINK-001 | Concurrent edit detection not active in WorkSurfaces | HIGH | Add useConcurrentEditDetection to all surfaces | OPEN |
| LINK-002 | Golden Flow payments update AR aging correctly | HIGH | E2E test with aging query assertion | VERIFY |
| LINK-003 | Inventory movements logged for all mutations | HIGH | Audit trail query after each mutation type | VERIFY |
| LINK-004 | COGS recalculation triggers on cost change | MEDIUM | Unit test for COGS recalc service | VERIFY |
| LINK-005 | Client balance updates on payment/credit | HIGH | E2E test with balance assertion | VERIFY |
| LINK-006 | Fiscal period lock prevents retroactive posting | HIGH | Attempt post in locked period, verify rejection | VERIFY |
```

---

## 7. VALIDATION + SELF-CORRECTION LOOPS

### 7.1 Gates Before Exposure Increases

| Gate | Check | Tool | Blocks If |
|------|-------|------|-----------|
| G1 | TypeScript compilation | `npx tsc --noEmit` | Any error |
| G2 | Unit tests | `npm test -- --run` | Any failure |
| G3 | Integration tests | `npm run test:integration` | Any failure |
| G4 | E2E Golden Flows | `npm run test:e2e:golden` | Any failure |
| G5 | RBAC enforcement | `npm run test:rbac` | Any unenforced mutation |
| G6 | Invariant checks | `npm run check:invariants` | Any violation |
| G7 | Placeholder scan | `./scripts/placeholder-scan.sh` | Any critical placeholder |
| G8 | Schema migration | `npx prisma migrate status` | Pending migrations |

### 7.2 Progressive Rollout Stages

#### Stage 0: Internal Only (Feature Flag: 0%)
**Duration**: 1-2 days
**Audience**: Development team only
**Entry Criteria**:
- All G1-G8 gates pass
- App.tsx updated with WorkSurfaceGate wrappers
- Feature flags default to OFF

**Activities**:
- Smoke test all 9 WorkSurfaces manually
- Verify feature flag toggles work
- Test rollback capability

**Exit Criteria**:
- [ ] All WorkSurfaces render correctly
- [ ] Feature flag ON shows WorkSurface
- [ ] Feature flag OFF shows legacy page
- [ ] No console errors
- [ ] All 8 Golden Flows pass manually

**Telemetry to Watch**:
- Console errors
- tRPC error rates
- Page load times

**Rollback Trigger**:
- Any P0 bug discovered
- Build failure

---

#### Stage 1: 10% Rollout (Feature Flag: 10%)
**Duration**: 3-5 days
**Audience**: Power users / internal testers
**Entry Criteria**:
- Stage 0 complete
- Monitoring dashboards active

**Activities**:
- Collect user feedback
- Monitor error rates
- Run RBAC test matrix with QA accounts

**Exit Criteria**:
- [ ] Error rate < 0.1%
- [ ] No P0/P1 bugs reported
- [ ] RBAC tests pass for all 7 QA roles
- [ ] Performance within budget (grid <100ms, inspector <50ms)
- [ ] User feedback addressed

**Telemetry to Watch**:
- Error rate by WorkSurface
- Mutation failure rate
- P95 response times
- Feature usage (which surfaces used)

**Max Tolerated**:
- Error rate: 0.5%
- P95 latency: 2x budget

**Rollback Trigger**:
- Error rate > 1%
- P0 bug reported
- Invariant violation detected

---

#### Stage 2: 50% Rollout (Feature Flag: 50%)
**Duration**: 5-7 days
**Audience**: Half of all users (random assignment)
**Entry Criteria**:
- Stage 1 complete
- All P1 bugs fixed
- Invariant checks passing

**Activities**:
- A/B comparison of key metrics
- Full E2E test suite daily
- Business metric validation (order completion rate, etc.)

**Exit Criteria**:
- [ ] Error rate < 0.1%
- [ ] No P0/P1/P2 bugs
- [ ] Business metrics stable (±5% from baseline)
- [ ] All 8 Golden Flows automated tests pass
- [ ] Feature parity matrix 100% verified

**Telemetry to Watch**:
- All Stage 1 metrics
- Business metrics (orders/day, invoices/day)
- Support ticket volume
- Time-to-task completion (if instrumented)

**Max Tolerated**:
- Error rate: 0.3%
- Business metric regression: 10%

**Rollback Trigger**:
- Error rate > 0.5%
- Business metrics drop >15%
- Multiple P1 bugs
- Data corruption detected

---

#### Stage 3: 100% Rollout (Feature Flag: 100%)
**Duration**: Permanent
**Audience**: All users
**Entry Criteria**:
- Stage 2 complete
- Leadership sign-off
- Rollback plan tested

**Activities**:
- Final monitoring setup
- Documentation update
- Team training

**Exit Criteria**:
- [ ] 7 days at 100% with no P0/P1 bugs
- [ ] Support ticket volume normalized
- [ ] Legacy pages marked for deprecation
- [ ] Post-mortem document created

**Rollback Trigger**:
- Critical data loss
- Security vulnerability
- System-wide outage

### 7.3 Self-Healing Strategies

#### Auto-Disable via Feature Flag
```typescript
// In error boundary or tRPC error handler
if (errorRate > THRESHOLD || invariantViolation) {
  await setFeatureFlag('work-surface-enabled', false);
  await alertOps('WorkSurfaces auto-disabled due to error spike');
  redirect('/legacy-fallback');
}
```

#### Circuit Breaker for Dangerous Mutations
```typescript
// Wrap critical mutations
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
});

const safeMutation = circuitBreaker.wrap(async (input) => {
  return await trpc.accounting.receiveClientPayment.mutate(input);
});
```

#### Safe Mode (Read-Only)
```typescript
// If write operations unstable, enter read-only mode
const [safeMode, setSafeMode] = useState(false);

useEffect(() => {
  if (mutationFailureRate > 0.1) {
    setSafeMode(true);
    toast.warning('Safe mode enabled - edits temporarily disabled');
  }
}, [mutationFailureRate]);
```

---

## 8. DEPLOYMENT MECHANICS

### 8.1 Environment Separation

| Environment | Purpose | Feature Flags | Data |
|-------------|---------|---------------|------|
| Development | Local dev | All ON | Seed data |
| Staging | Pre-production testing | Match prod | Prod clone (anonymized) |
| Production | Live users | Progressive rollout | Real data |

### 8.2 Secrets Management

**Required Checks**:
- [ ] No secrets in git history
- [ ] Environment variables via secure provider (Vercel, etc.)
- [ ] Database credentials rotated after staging
- [ ] API keys scoped to environment

### 8.3 Migration Strategy

```bash
# Pre-deployment
1. Backup production database
2. Run migrations on staging first
3. Verify schema compatibility
4. Run migrations on production (during low-traffic window)

# Migration commands
npx prisma migrate deploy
npx prisma generate
```

### 8.4 Data Integrity Checks

```bash
# Post-migration verification
npm run check:invariants
npm run check:schema-drift

# Verify record counts
psql -c "SELECT 'orders' as table, COUNT(*) FROM \"Order\" UNION ALL
         SELECT 'invoices', COUNT(*) FROM Invoice UNION ALL
         SELECT 'payments', COUNT(*) FROM Payment;"
```

### 8.5 Operational Readiness

- [ ] Daily database backups configured
- [ ] Point-in-time recovery tested
- [ ] Restore drill completed (within 1 hour)
- [ ] On-call rotation established
- [ ] Incident response runbook updated

---

## 9. OBSERVABILITY & MONITORING

### 9.1 Critical Metrics & Dashboards

| Metric | Source | Alert Threshold | Dashboard |
|--------|--------|-----------------|-----------|
| tRPC error rate | Sentry/monitoring | >0.5% | Errors dashboard |
| P95 response time | APM | >2000ms | Performance dashboard |
| Mutation failure rate | tRPC middleware | >1% | Errors dashboard |
| Feature flag status | Feature flag service | - | Rollout dashboard |
| Invariant violations | Invariant checker | >0 | Data integrity dashboard |

### 9.2 Business Metrics

| Metric | Baseline | Alert if | Dashboard |
|--------|----------|----------|-----------|
| Orders created/hour | TBD | Drop >20% | Business KPIs |
| Invoices generated/hour | TBD | Drop >20% | Business KPIs |
| Payments recorded/hour | TBD | Drop >20% | Business KPIs |
| Inventory movements/hour | TBD | Drop >30% | Business KPIs |

### 9.3 Alert Configuration

```yaml
# alerting-rules.yaml
alerts:
  - name: worksurface-error-spike
    condition: error_rate > 0.5%
    window: 5m
    severity: critical
    action: page-oncall

  - name: invariant-violation
    condition: invariant_check_failures > 0
    window: 1m
    severity: critical
    action: page-oncall + auto-disable-feature

  - name: business-metric-drop
    condition: orders_per_hour < baseline * 0.8
    window: 1h
    severity: high
    action: alert-team
```

### 9.4 Required Log Fields

Every tRPC call must log:
- `timestamp`
- `procedure`
- `userId`
- `tenantId`
- `locationId` (if applicable)
- `duration_ms`
- `status` (success/error)
- `error_code` (if error)
- `worksurface_enabled` (boolean)

### 9.5 Unknown Unknown Detection

**Anomaly Detection Signals**:
- Unusual procedure call patterns
- Sudden drop in specific tRPC usage
- New error codes appearing
- Unexpected null/undefined values in critical fields

---

## 10. ROLLBACK PLAN

### 10.1 What Can Be Rolled Back Safely

| Component | Rollback Method | Time | Risk |
|-----------|-----------------|------|------|
| Feature flags | Set to 0% | Seconds | None |
| UI code | Git revert + deploy | 5-10 min | Low |
| tRPC changes | Git revert + deploy | 5-10 min | Low |
| Database schema | Forward-only | N/A | HIGH - must use forward fix |

### 10.2 Rollback Decision Tree

```
Error detected?
├── Yes → Is it P0 (data loss, security, system down)?
│         ├── Yes → IMMEDIATE ROLLBACK (feature flag to 0%)
│         │         └── Page oncall, begin investigation
│         └── No → Is error rate > 1%?
│                   ├── Yes → Rollback to previous stage
│                   └── No → Continue monitoring, fix forward
└── No → Continue rollout
```

### 10.3 Rollback Execution

```bash
# Step 1: Disable feature flags (immediate)
curl -X PATCH "$FEATURE_FLAG_API/work-surface-enabled" -d '{"enabled": false}'

# Step 2: If code rollback needed
git revert HEAD~1  # or specific commit
git push origin main
# Trigger deployment pipeline

# Step 3: Verify rollback
curl "$APP_URL/health"
npm run test:smoke
```

### 10.4 Time-to-Rollback Targets

| Action | Target Time | Method |
|--------|-------------|--------|
| Feature flag disable | <1 minute | API call |
| Code rollback | <10 minutes | Git revert + auto-deploy |
| Database restore | <1 hour | Point-in-time recovery |

### 10.5 Hotfix vs Revert

**Hotfix if**:
- Issue is well-understood
- Fix is small and low-risk
- Can be done in <30 minutes

**Revert if**:
- Issue is unclear or complex
- Multiple components affected
- Users actively impacted

---

## 11. FINAL QA CHECKLIST (Ship/No-Ship)

### Pre-100% Rollout Checklist

```markdown
## Feature Completeness
- [ ] All 9 WorkSurfaces render without errors
- [ ] Feature parity matrix 100% verified (PASS)
- [ ] No orphaned tRPC procedures
- [ ] No orphaned UI actions

## Golden Flows
- [ ] GF-001 Direct Intake: PASS
- [ ] GF-002 Standard PO: PASS
- [ ] GF-003 Sales Order: PASS
- [ ] GF-004 Invoice & Payment: PASS
- [ ] GF-005 Pick & Pack: PASS
- [ ] GF-006 Client Ledger: PASS
- [ ] GF-007 Inventory Adjustment: PASS
- [ ] GF-008 Sample Request: PASS

## RBAC
- [ ] Super Admin: All actions pass
- [ ] Sales Manager: Correct permissions
- [ ] Sales Rep: Correct permissions
- [ ] Inventory Manager: Correct permissions
- [ ] Fulfillment: Correct permissions
- [ ] Accountant: Correct permissions
- [ ] Auditor: Read-only enforced

## Technical Quality
- [ ] TypeScript: Zero errors
- [ ] Placeholder scan: PASS
- [ ] Invariant suite: PASS
- [ ] Performance budgets: Met

## Monitoring
- [ ] Error alerting active
- [ ] Business metric alerting active
- [ ] Dashboards accessible
- [ ] On-call rotation set

## Rollback
- [ ] Rollback tested and documented
- [ ] Feature flag disable tested
- [ ] Recovery time <10 minutes

## No-Ship Conditions (Any = No Ship)
- [ ] P0 bug exists: NO
- [ ] Invariant violation: NO
- [ ] RBAC bypass found: NO
- [ ] Data loss risk: NO
- [ ] Placeholder in critical path: NO
```

---

## 12. OUTPUT ARTIFACTS

### 12.1 Gap Ledger Template

```csv
Gap ID,Description,Severity,Category,Fix Description,Verification Test,Owner,Status,Notes
GAP-001,Routes not wired to WorkSurfaces,CRITICAL,Wiring,Update App.tsx with WorkSurfaceGate,Route renders WorkSurface when flag ON,,OPEN,
GAP-002,Feature flags not consumed in routing,CRITICAL,Wiring,Add WorkSurfaceGate wrapper to 9 routes,Flag toggle changes displayed component,,OPEN,
GAP-003,useConcurrentEditDetection not integrated,HIGH,Logic,Add hook to all 9 WorkSurfaces,Concurrent edit shows conflict dialog,,OPEN,
GAP-004,Direct toast calls in InvoicesWorkSurface,MEDIUM,Consistency,Migrate 2 calls to toasts.error,All toasts use standardized hook,,OPEN,
GAP-005,useExport not integrated,LOW,Feature,Add export button to grid toolbars,Export button visible and functional,,OPEN,
```

### 12.2 Feature Parity Matrix Template

```csv
Feature ID,Feature Name,Exists?,Entry Point,Role Visibility,Dependencies,Verification Test,Old Page,New WorkSurface,Status
DF-010,Product Intake,YES,/spreadsheet,Inventory,productIntake.*,GF-001 E2E,SpreadsheetViewPage,DirectIntakeWorkSurface,VERIFY
SALE-001,Sales Orders,YES,/orders,Sales,orders.*,GF-003 E2E,Orders,OrdersWorkSurface,VERIFY
```

### 12.3 Erased/Buried Functionality Ledger Template

```csv
Function,Old Access Path,New Access Path,Click Depth Change,Severity,Mitigation,Verification Method,Status
Bulk Status Update,/orders → Select → Bulk Actions,/orders → Select → BulkActionBar,0,NONE,BulkActionBar component,Manual test,VERIFY
Export to CSV,/orders → Export button,/orders → Grid toolbar → Export,0,NONE,useExport hook integration,Manual test,OPEN
Print Invoice,/invoices → Print button,/invoices → Inspector → Print,+1,LOW,Prominent inspector action,Manual test,VERIFY
```

### 12.4 Logic/Linkage Investigation List Template

```csv
Item ID,Description,Risk Level,Investigation Method,Expected Outcome,Actual Outcome,Status,Notes
LINK-001,Concurrent edit detection in WorkSurfaces,HIGH,Code review + integration test,Conflict dialog shown,NOT TESTED,OPEN,Hook exists but not integrated
LINK-002,Payment updates AR aging correctly,HIGH,E2E test with DB assertion,AR aging reflects payment,NOT TESTED,VERIFY,
LINK-003,Inventory movements logged for all mutations,HIGH,Audit trail query,All mutations have movement record,NOT TESTED,VERIFY,
```

### 12.5 Rollout Stage Gate Checklist Template

```markdown
## Stage [N] Gate Checklist

**Stage**: [0/1/2/3]
**Date**: YYYY-MM-DD
**Reviewer**: [Name]

### Technical Gates
- [ ] G1: TypeScript compilation: PASS/FAIL
- [ ] G2: Unit tests: PASS/FAIL ([X] passed, [Y] failed)
- [ ] G3: Integration tests: PASS/FAIL
- [ ] G4: E2E Golden Flows: PASS/FAIL
- [ ] G5: RBAC enforcement: PASS/FAIL
- [ ] G6: Invariant checks: PASS/FAIL
- [ ] G7: Placeholder scan: PASS/FAIL
- [ ] G8: Schema migration: PASS/FAIL

### Metrics (Previous 24h)
- Error rate: [X]% (threshold: [Y]%)
- P95 latency: [X]ms (threshold: [Y]ms)
- Mutation failure rate: [X]% (threshold: [Y]%)

### Issues
- P0: [count]
- P1: [count]
- P2: [count]

### Decision
- [ ] PROCEED to Stage [N+1]
- [ ] HOLD at Stage [N] (reason: ___)
- [ ] ROLLBACK to Stage [N-1] (reason: ___)

### Sign-off
- Engineering: _______________
- QA: _______________
- Product: _______________
```

---

## APPENDIX A: Quick Reference Commands

```bash
# Run all gates
npm run gate:all

# Individual gates
npm run gate:typescript      # G1
npm run gate:unit            # G2
npm run gate:integration     # G3
npm run gate:e2e:golden      # G4
npm run gate:rbac            # G5
npm run gate:invariants      # G6
npm run gate:placeholders    # G7
npm run gate:migrations      # G8

# Rollback
./scripts/rollback-worksurfaces.sh

# Monitor
npm run monitor:errors
npm run monitor:performance
npm run monitor:business

# Feature flags
npm run flags:enable-worksurfaces [percentage]
npm run flags:disable-worksurfaces
```

---

## APPENDIX B: Contact & Escalation

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-Call Engineer | [TBD] | Any P0/P1 issue |
| QA Lead | [TBD] | Test failures, RBAC issues |
| Product Owner | [TBD] | Business metric concerns |
| Engineering Manager | [TBD] | Rollback decisions |

---

**Document Status**: DRAFT - Pending team review
**Last Updated**: 2026-01-20
**Next Review**: Before Stage 0 begins

# TERP Top Release Blockers

**Generated**: 2026-01-23 15:56:30  
**Environment**: Staging  
**Analysis Type**: Reconnaissance + Documentation Review

## Executive Summary

Based on autonomous analysis of TERP's codebase, flow documentation, and staging environment, the following issues represent the highest-priority blockers for release readiness.

## S1: Data Integrity Issues

*No S1 issues identified during reconnaissance phase.*

**Note**: S1 issues (incorrect inventory counts, money totals, ledger balances) require live browser testing to validate. Recommend executing full Reality Mapper with test data to identify S1 issues.

## S2: Workflow Dead-Ends

### TKT_QA_TEST_DATA_MISSING_20260123

**Severity**: S2  
**Domain**: QA Infrastructure  
**Flow**: Automated Testing Workflow  
**Environment**: Staging

**Expected**: QA-prefixed test entities (QA_CUSTOMER_, QA_SKU_, QA_LOCATION_, QA_VENDOR_) exist for deterministic testing

**Actual**: No QA-prefixed entities found in staging database

**Impact**: 
- Cannot execute automated browser-based testing
- Manual QA requires manual data setup each time
- Reality Mapper blocked from generating evidence-based findings
- 146 P0 CLIENT_WIRED charters cannot be validated

**Minimal Repro Steps**:
1. Navigate to http://terp-app-b9s35.ondigitalocean.app/clients
2. Search for "QA_CUSTOMER"
3. Observe: "No clients found"

**Evidence**:
- Screenshot: `/home/ubuntu/screenshots/terp-app-b9s35_ondig_2026-01-23_15-53-57_7484.webp`
- Test Data Contract: `terp-qa-artifacts/reality-map/test_data_contract.md`

**Suspected Layer**: DATA  
**Suggested Fix Owner**: DB_AGENT or INFRA_AGENT

**Recommended Fix**:
Create `scripts/seed-qa-data.ts` to generate:
```typescript
// QA Locations
await db.insert(locations).values([
  { name: 'QA_LOCATION_A', ... },
  { name: 'QA_LOCATION_B', ... }
]);

// QA Customers
await db.insert(clients).values([
  { name: 'QA_CUSTOMER_STANDARD', ... },
  { name: 'QA_CUSTOMER_NET30', ... }
]);

// QA SKUs
await db.insert(products).values([
  { name: 'QA_SKU_LOWSTOCK', quantity: 5, ... },
  { name: 'QA_SKU_NORMAL', quantity: 1000, ... }
]);

// QA Vendor
await db.insert(vendors).values([
  { name: 'QA_VENDOR_TEST', ... }
]);
```

Add to package.json:
```json
"seed:qa-data": "tsx scripts/seed-qa-data.ts"
```

**Estimated Effort**: 2-4 hours  
**Priority**: HIGH (blocks automated QA)

## S3: RBAC/Security Issues

### TKT_ACCOUNTING_UI_MISSING_20260123

**Severity**: S3  
**Domain**: Accounting  
**Flow**: Multiple (43 flows affected)  
**Environment**: Staging

**Expected**: Accounting users can access critical financial features via UI

**Actual**: 43/52 (83%) of Accounting flows are API_ONLY (no UI implementation)

**Impact**:
- Accounting Manager and Accountant roles cannot perform core duties via UI
- Must use API directly or wait for UI development
- Affects critical flows:
  - Preview Balance
  - Receive Client Payment
  - Pay Vendor
  - Record Payment
  - AR/AP Summaries
  - Aging Reports
  - Outstanding Receivables/Payables

**Minimal Repro Steps**:
1. Login as qa.accounting@terp.test
2. Navigate to Accounting section
3. Observe: Many features missing from UI
4. Review USER_FLOW_MATRIX.csv: 43 flows marked "API-only"

**Evidence**:
- Charter Library: `terp-qa-artifacts/reality-map/charters_master.json`
- Flow Matrix: `terp-repo/docs/reference/USER_FLOW_MATRIX.csv`

**Suspected Layer**: UI  
**Suggested Fix Owner**: UI_AGENT

**Recommended Fix**:
Prioritize UI development for top 10 P0 Accounting flows (see REALITY_MAP.md Recommendations section).

**Estimated Effort**: 20-40 hours (2-4 hours per flow)  
**Priority**: MEDIUM (affects user productivity)

## S4: State Machine Mismatches

*No S4 issues identified during reconnaissance phase.*

**Note**: S4 issues (UI state doesn't match underlying data) require live browser testing to validate.

## S5: UX Friction/Polish

*No S5 issues identified during reconnaissance phase.*

## Summary Table

| Ticket ID | Severity | Domain | Flow | Status | Priority |
|-----------|----------|--------|------|--------|----------|
| TKT_QA_TEST_DATA_MISSING_20260123 | S2 | QA Infrastructure | Automated Testing | BLOCKED_DATA | HIGH |
| TKT_ACCOUNTING_UI_MISSING_20260123 | S3 | Accounting | Multiple (43 flows) | API_ONLY | MEDIUM |

## Release Recommendation

**Status**: ⚠️ CONDITIONAL GO

**Blockers**:
1. **S2 Blocker**: QA test data missing (blocks automated validation)
2. **S3 Issue**: Accounting UI gaps (affects user productivity)

**Recommendation**:
- **Can release** if manual QA validates Golden Paths (12 flows)
- **Should not release** without addressing S2 (creates technical debt)
- **Consider delaying** Accounting features until UI implemented

**Risk Assessment**:
- **High Risk**: Cannot validate 146 P0 flows without test data
- **Medium Risk**: Accounting users have degraded experience
- **Low Risk**: Core business flows (Golden Paths) appear CLIENT_WIRED

## Next Steps

1. **Immediate** (Before Release):
   - Create QA test data seeding script
   - Execute Golden Paths testing (12 flows × 3 runs = 36 tests)
   - Validate no S1 issues exist

2. **Short-Term** (Post-Release):
   - Implement UI for top 10 Accounting flows
   - Schedule weekly automated Reality Mapping
   - Build RBAC validation suite

3. **Long-Term**:
   - Reduce API_ONLY flows from 81 to <20
   - Achieve 95%+ CLIENT_WIRED coverage
   - Implement continuous QA automation

---

*This report is based on reconnaissance findings. For evidence-based validation with browser automation and quorum runs, resolve BLOCKED_DATA condition and re-execute Reality Mapper.*

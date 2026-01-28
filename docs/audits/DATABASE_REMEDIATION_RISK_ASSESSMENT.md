# Database Remediation Risk Assessment

**Date:** 2026-01-28
**Author:** Claude Code Agent
**Task:** GF-PHASE0-008
**Status:** COMPLETE

---

## Executive Summary

This document assesses the risks associated with the 23 database schema issues identified in PR #331 and evaluates the proposed remediation plan.

| Category | Issues | Risk if Unaddressed | Remediation Risk |
|----------|--------|---------------------|------------------|
| Priority 1 (Phase 0) | 2 | CRITICAL | LOW (addressed) |
| Priority 2 (Phase 6) | 8 | MEDIUM-HIGH | LOW |
| Priority 3 (Phase 6) | 8 | MEDIUM | LOW-MEDIUM |
| Priority 4 (Deferred) | 5 | LOW-MEDIUM | MEDIUM (large refactor) |

**Overall Assessment:**
- **Without remediation:** MEDIUM-HIGH risk
- **With Phase 6 execution:** LOW risk
- **Recommendation:** Execute Priority 2 tasks (12h), consider Priority 3 if time permits

---

## Risk Analysis by Priority

### Priority 1 (Phase 0) - Already Addressed

#### Issue #1: Missing products.strainId Column

| Factor | Assessment |
|--------|------------|
| **Risk if not addressed** | CRITICAL - Query failures, photography broken |
| **Status** | ADDRESSED with fallback queries (PR #318) |
| **Residual risk** | LOW - Fallbacks working, logs track fallback usage |
| **Long-term action** | Add strainId column in Phase 6 if needed |

#### Issue #3: Missing product_images Table

| Factor | Assessment |
|--------|------------|
| **Risk if not addressed** | CRITICAL - Photography module completely broken |
| **Status** | BEING ADDRESSED (GF-PHASE0-006) |
| **Residual risk** | LOW - Table creation planned |
| **Verification** | `SHOW TABLES LIKE 'product_images';` |

---

### Priority 2 (Phase 6 Immediate) - Quick Wins

#### Issues #4-8: Missing FK Constraints on vendorId Columns

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | MEDIUM-HIGH |
| **Impact** | Data integrity issues, orphan records possible |
| **Likelihood** | MEDIUM - Manual data entry can create orphans |
| **Affected Tables** | brands, lots, paymentHistory, bills, expenses |
| **Mitigation effort** | 5h (INFRA-DB-001) |
| **Recommendation** | EXECUTE in Phase 6 |

**Risk Scenarios:**
1. User deletes vendor → bills/expenses reference non-existent vendor
2. Data import creates brands with invalid vendorId
3. Joins return incomplete data due to missing references

**Risk Score:** `Impact(HIGH) x Likelihood(MEDIUM) = MEDIUM-HIGH`

#### Issue #9: Misleading payments.vendorId Naming

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | MEDIUM |
| **Impact** | Developer confusion, potential bugs |
| **Likelihood** | HIGH - Every new developer encounters this |
| **Mitigation effort** | 2h (INFRA-DB-002) |
| **Recommendation** | EXECUTE in Phase 6 |

**Risk Scenarios:**
1. Developer assumes vendorId references vendors table
2. Incorrect queries written using wrong join
3. Code review overhead explaining the naming

**Risk Score:** `Impact(MEDIUM) x Likelihood(HIGH) = MEDIUM`

#### Issue #11: Dual Vendor Columns in purchaseOrders

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | MEDIUM |
| **Impact** | Data inconsistency if both populated differently |
| **Likelihood** | MEDIUM - Existing code handles correctly |
| **Mitigation effort** | 2h (INFRA-DB-002) |
| **Recommendation** | EXECUTE in Phase 6 |

**Risk Score:** `Impact(MEDIUM) x Likelihood(MEDIUM) = MEDIUM`

---

### Priority 3 (Phase 6 Medium-term)

#### Issue #12: Naming Inconsistency (camelCase/snake_case)

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | LOW |
| **Impact** | Code quality, maintainability |
| **Likelihood** | LOW - Drizzle handles transformation |
| **Mitigation effort** | 4h |
| **Recommendation** | EXECUTE if time permits |

**Risk Score:** `Impact(LOW) x Likelihood(LOW) = LOW`

#### Issues #13-18: Missing FK Constraints (Other Tables)

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | MEDIUM |
| **Impact** | Data integrity across products, batches, bills, ledger, sales |
| **Likelihood** | MEDIUM - Less frequently modified tables |
| **Mitigation effort** | 10h |
| **Recommendation** | EXECUTE if time permits |

**Affected Tables:**
- `products.brandId` → brands
- `batches.productId/lotId` → products/lots
- `billLineItems` → bills/products/lots
- `ledgerEntries` → accounts/fiscalPeriods
- `sales` → batches/products

**Risk Score:** `Impact(MEDIUM) x Likelihood(MEDIUM) = MEDIUM`

---

### Priority 4 (Deferred Post-Beta)

#### Issue #2: Dual Image Tables

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | LOW |
| **Impact** | Duplication, developer confusion |
| **Likelihood** | LOW - Workarounds exist |
| **Mitigation effort** | 16h (large refactor) |
| **Recommendation** | DEFER to post-beta |

**Rationale:**
- Current workarounds functional
- Large refactor during beta = high regression risk
- Can be done during planned maintenance window

**Risk Score:** `Impact(LOW) x Likelihood(LOW) = LOW`

#### Issue #10: Deprecated vendors Table

| Factor | Assessment |
|--------|------------|
| **Risk if deferred** | MEDIUM |
| **Impact** | Technical debt, data split, confusion |
| **Likelihood** | MEDIUM - Current dual-table approach works |
| **Mitigation effort** | 24h (major migration) |
| **Recommendation** | DEFER to post-beta |

**Rationale:**
- Party Model migration is complex (24h+)
- Current dual-table approach functional
- Risk of data loss during migration
- Requires careful multi-phase approach

**Risk Score:** `Impact(MEDIUM) x Likelihood(MEDIUM) = MEDIUM`

#### Issues #19-23: Miscellaneous

| Issue | Risk | Recommendation |
|-------|------|----------------|
| #19 Missing indexes | LOW | Defer - Performance only |
| #20 Documentation gaps | LOW | Defer - Non-functional |
| #21 Soft delete consistency | LOW | Defer - No reported issues |
| #22 auditLogs FK | LOW | Defer - May be intentional |
| #23 Self-ref FK accounts | LOW | Defer - Low impact |

---

## Overall Risk Posture

### Without Phase 6 Execution

| Risk Category | Level |
|---------------|-------|
| **Data Integrity** | MEDIUM-HIGH |
| **Developer Productivity** | MEDIUM |
| **System Stability** | LOW |
| **Future Maintenance** | HIGH |
| **Overall Risk** | MEDIUM-HIGH |

**Key Concerns:**
- Orphan records can be created
- FK constraint violations possible
- Developer confusion increases over time
- Technical debt accumulates

### With Phase 6 Execution (Recommended)

| Risk Category | Level |
|---------------|-------|
| **Data Integrity** | LOW |
| **Developer Productivity** | LOW-MEDIUM |
| **System Stability** | LOW |
| **Future Maintenance** | MEDIUM |
| **Overall Risk** | LOW |

**Benefits:**
- Referential integrity enforced
- Column naming clarified
- Developer confusion reduced
- Solid foundation for future work

---

## Decision Matrix

| Decision | Risk | Effort | Recommendation |
|----------|------|--------|----------------|
| Execute P2 only | LOW | 12h | MINIMUM VIABLE |
| Execute P2 + P3 | VERY LOW | 28h | RECOMMENDED |
| Defer all to post-beta | MEDIUM-HIGH | 0h | NOT RECOMMENDED |
| Execute everything | VERY LOW | 74h | OVERKILL for beta |

---

## Risk Mitigation Strategies

### For Phase 6 Execution

1. **Pre-Migration Verification**
   - Check for orphan records before adding FK constraints
   - Create database backup before each migration
   - Test migrations in staging first

2. **Rollback Plans**
   - Document SQL to remove FK constraints if issues
   - Keep old column names as aliases temporarily
   - Maintain rollback scripts for each migration

3. **Incremental Approach**
   - Add constraints one table at a time
   - Verify after each constraint addition
   - Monitor logs for FK violation errors

### For Deferred Items

1. **Document Workarounds**
   - Clear documentation of current dual-table approach
   - Code comments explaining vendorId naming
   - Migration plan documented for future execution

2. **Monitor for Issues**
   - Track orphan record creation
   - Log when fallback queries activate
   - Alert on data consistency errors

---

## Recommendations

### Immediate Actions (Phase 6)

1. **EXECUTE INFRA-DB-001** (8h)
   - Add FK constraints to vendorId columns
   - High data integrity impact
   - Low execution risk

2. **EXECUTE INFRA-DB-002** (4h)
   - Rename misleading columns
   - Reduces developer confusion
   - Low execution risk

### Conditional Actions (If Time Permits)

3. **CONSIDER INFRA-DB-001 Extension** (8h)
   - Add remaining FK constraints
   - Medium priority
   - Low execution risk

### Deferred Actions (Post-Beta)

4. **PLAN INFRA-DB-003** (16h)
   - Image table consolidation
   - Execute during maintenance window

5. **PLAN INFRA-DB-004** (24h)
   - Vendors → clients migration
   - Execute in phases with careful testing

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R1 | Orphan records in bills | MEDIUM | HIGH | INFRA-DB-001 | Phase 6 |
| R2 | FK violation errors | LOW | MEDIUM | Pre-check + rollback | Phase 6 |
| R3 | Developer confusion | HIGH | LOW | INFRA-DB-002 | Phase 6 |
| R4 | Migration data loss | LOW | CRITICAL | Backup + staging | Future |
| R5 | Performance regression | LOW | LOW | Add indexes | Future |

---

## Acceptance Criteria for Risk Reduction

After Phase 6 completion, verify:

- [ ] Zero orphan records in FK-constrained tables
- [ ] No FK violation errors in production logs
- [ ] All column names match their references
- [ ] Developer documentation updated
- [ ] Rollback procedures tested

---

## References

- **Database Audit:** `docs/audits/DATABASE_TABLE_AUDIT_2026-01-28.md`
- **Remediation Roadmap:** `docs/roadmaps/DATABASE_REMEDIATION_ROADMAP.md`
- **Golden Flows Roadmap:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`
- **CLAUDE.md:** Database standards

---

**Document Version:** 1.0
**Author:** Claude Code Agent
**Task:** GF-PHASE0-008

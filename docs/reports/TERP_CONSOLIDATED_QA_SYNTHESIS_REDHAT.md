# TERP Consolidated QA Synthesis Report (Executive + Technical) — Third-Party Redhat Revision

> **Scope note:** This third-party Redhat revision re-audits the prior synthesis for over-claims, stale evidence, and mismatched assumptions. Evidence remains **repo-local**; DB runtime verification is **DB-UNCONFIRMED** where applicable.

## 1) Executive Summary (10 bullets max)

- **Overall readiness rating:** **P0** — security exposure and data-integrity risks remain top-priority per QA evidence. 【F:QA_COMBINED_FINAL_REPORT.md†L27-L124】
- **Top systemic theme 1:** **Unauthenticated surface area** (public endpoints and default secrets). 【F:QA_COMBINED_FINAL_REPORT.md†L31-L49】
- **Top systemic theme 2:** **Data integrity risks** (non-transactional delete paths, soft-delete gaps, concurrency risk flags). 【F:QA_COMBINED_FINAL_REPORT.md†L70-L124】
- **Top systemic theme 3:** **API contract/registration drift** (NOT_FOUND, BAD_REQUEST, missing/incorrect params). 【F:qa-results/DEFECT_LOG.csv†L5-L39】【F:qa-results/E2E_TEST_EXECUTION_REPORT.md†L127-L216】
- **Top 5 stop-the-line issues:** admin setup key fallback; public matching endpoints; public calendar recurrence mutations; credit application concurrency risk; non-transactional cascading deletes. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L90】
- **E2E indicator (staleness flagged):** 48.8% pass rate from Jan 9 E2E run; roadmap marks many as fixed—requires re-validation. 【F:qa-results/E2E_TEST_EXECUTION_REPORT.md†L10-L22】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】
- **RBAC drift risk:** Permissions used in code but missing in RBAC seed (accounting/analytics/settings/audit). 【F:docs/reference/FLOW_GUIDE.md†L1154-L1171】
- **Inventory/money invariants risk (DB-UNCONFIRMED):** Denormalized quantities and totals stored in core tables without explicit reconciliation guarantees. 【F:drizzle/schema.ts†L562-L606】【F:drizzle/schema.ts†L1543-L1607】【F:drizzle/schema.ts†L2611-L2667】
- **Correction from prior report:** `server/dbTransaction.ts` **is not** a placeholder; it re-exports real transaction utilities. The remaining risk is **coverage**, not implementation. 【F:server/dbTransaction.ts†L1-L15】【F:server/\_core/dbTransaction.ts†L33-L95】
- **Recommendation headline:** Lock down public surfaces and prove transaction coverage → re-validate E2E failures → eliminate stubs/placeholder UX. 【F:QA_COMBINED_FINAL_REPORT.md†L277-L315】

---

## 2) Canonical Issue Register (Deduped + Redhat Corrections)

| IssueID           | Title                                                   | Domain              | Severity | Confidence | Evidence Summary                                                                                                                                                                                                               | Matrix RowKey(s)                   | Repro Summary                                               | Impact                           |
| ----------------- | ------------------------------------------------------- | ------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| SEC-001           | Hardcoded admin setup key fallback                      | Security            | P0       | HIGH       | Default key fallback documented in QA audit. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L38】                                                                                                                                         | N/A                                | Use fallback key to promote admin.                          | Unauthorized admin creation.     |
| SEC-002           | 12 public matchingEnhanced endpoints expose client data | Security/CRM        | P0       | HIGH       | QA audit enumerates public procedures. 【F:QA_COMBINED_FINAL_REPORT.md†L39-L43】                                                                                                                                               | N/A                                | Call without auth.                                          | Data leakage.                    |
| SEC-003           | Public calendar recurrence mutations                    | Security/Calendar   | P0       | HIGH       | QA audit lists 5 public mutations. 【F:QA_COMBINED_FINAL_REPORT.md†L45-L49】                                                                                                                                                   | N/A                                | Unauth mutation call.                                       | Unauthorized schedule tampering. |
| SEC-004           | Live session token in URL                               | Security            | P1       | MED        | Token in query string per QA audit. 【F:QA_COMBINED_FINAL_REPORT.md†L51-L57】                                                                                                                                                  | N/A                                | Observe token in URL.                                       | Token exposure.                  |
| SEC-005           | Hardcoded production URLs                               | Security/Config     | P2       | MED        | QA audit notes hardcoded DO URLs. 【F:QA_COMBINED_FINAL_REPORT.md†L59-L64】                                                                                                                                                    | N/A                                | Missing env uses prod URLs.                                 | Misrouting/infra disclosure.     |
| DI-001            | **Transaction coverage is unproven (not placeholder)**  | Data Integrity      | P0       | MED        | `dbTransaction.ts` re-exports real implementation; QA audit’s “placeholder” claim is **stale**. Risk remains if critical mutations don’t use it. 【F:QA_COMBINED_FINAL_REPORT.md†L70-L77】【F:server/dbTransaction.ts†L1-L15】 | N/A                                | Identify critical mutation paths without `withTransaction`. | Non-atomic writes.               |
| DI-002            | Credit application concurrency risk                     | Accounting          | P0       | MED        | QA audit flags race; current implementation uses row locks/idempotency but needs **coverage verification** across call paths. 【F:QA_COMBINED_FINAL_REPORT.md†L79-L84】【F:server/creditsDb.ts†L204-L335】                     | clients.transactions.recordPayment | Concurrent credit apply.                                    | Double-applied credits.          |
| DI-003            | Non-transactional cascading delete                      | Inventory           | P1       | MED        | Intake receipt deletes not wrapped in transaction. 【F:QA_COMBINED_FINAL_REPORT.md†L86-L90】                                                                                                                                   | intakeReceipts.\*                  | Delete receipt with partial failure.                        | Orphans/audit loss.              |
| DI-004            | Client “archive” ≠ soft delete                          | CRM                 | P1       | MED        | Archive aliases delete + supplier deletion flips `isSeller`. 【F:QA_COMBINED_FINAL_REPORT.md†L92-L98】                                                                                                                         | clients.archive                    | Archive client; audit trail lost.                           | Compliance/audit risk.           |
| API-001           | NOT_FOUND procedures (historical, needs re-validation)  | API                 | P1       | MED        | DEF log shows missing registrations; roadmap marks fixes complete. 【F:qa-results/DEFECT_LOG.csv†L5-L23】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】                                                                       | accounting.getARSummary etc.       | Call endpoints → NOT_FOUND.                                 | Core features appear broken.     |
| API-002           | Orders/quotes/invoices DB query failures (historical)   | Orders/Accounting   | P0       | MED        | DEF log shows DB failures; roadmap marks fixes complete. 【F:qa-results/DEFECT_LOG.csv†L2-L14】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】                                                                                 | orders.getAll, invoices.getSummary | Call list endpoints.                                        | Sales/accounting blocked.        |
| API-003           | Internal server errors (calendar/cogs/notifications)    | Calendar/COGS/Notif | P0       | MED        | DEF log shows 500s; roadmap marks fixes complete. 【F:qa-results/DEFECT_LOG.csv†L9-L24】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】                                                                                        | calendar.getEvents, cogs.getCOGS   | Call endpoints.                                             | Critical workflows fail.         |
| API-004           | Input validation/contract mismatch                      | API/UX              | P2       | HIGH       | E2E shows BAD_REQUEST for id naming and params. 【F:qa-results/DEFECT_LOG.csv†L25-L33】                                                                                                                                        | clients.getById, inventory.getById | Use `id` param.                                             | UX errors.                       |
| UI-001            | Destructive actions without confirmation                | UX                  | P2       | HIGH       | 14 actions listed, one handler missing. 【F:QA_COMBINED_FINAL_REPORT.md†L214-L231】                                                                                                                                            | Settings/Calendar/Org              | Click delete/remove.                                        | Accidental data loss.            |
| FE/BE-PLACEHOLDER | Placeholder/stub features                               | FE/BE               | P2       | HIGH       | 32 FE and 17 BE placeholder items. 【F:QA_COMBINED_FINAL_REPORT.md†L128-L163】                                                                                                                                                 | N/A                                | Use stubbed screens.                                        | Misleading metrics/UX.           |
| RBAC-001          | Permissions missing from seed                           | RBAC                | P1       | HIGH       | Flow guide lists missing permission strings. 【F:docs/reference/FLOW_GUIDE.md†L1154-L1171】                                                                                                                                    | accounting._, analytics._          | RBAC mismatch.                                              | Access drift.                    |

---

## 3) Thematic Root Cause Clusters (5–10)

1. **Unauthenticated surfaces & privilege leakage**
   - **Issues:** SEC-001/002/003/004/005
   - **Why it happens:** Default secrets + public procedures remain in sensitive routers. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L64】
   - **Blast radius:** Client data exposure + scheduling manipulation.
   - **Systemic fix:** Fail-fast secrets; block public mutations in sensitive modules.

2. **Transaction coverage & integrity gaps**
   - **Issues:** DI-001/002/003/004
   - **Why it happens:** Transaction wrapper exists, but usage coverage is unproven and delete flows may be non-atomic. 【F:QA_COMBINED_FINAL_REPORT.md†L70-L98】【F:server/dbTransaction.ts†L1-L15】
   - **Blast radius:** Money/inventory correctness.
   - **Systemic fix:** Critical mutation audit + enforced wrapper use.

3. **API registration/contract drift**
   - **Issues:** API-001/002/003/004
   - **Why it happens:** Endpoints defined in flow matrix but missing or mismatched input validation. 【F:qa-results/DEFECT_LOG.csv†L5-L39】【F:docs/reference/USER_FLOW_MATRIX.csv†L1-L140】
   - **Blast radius:** Core operational screens.
   - **Systemic fix:** Contract tests keyed to USER_FLOW_MATRIX.

4. **Placeholder/shadow logic in FE/BE**
   - **Issues:** FE/BE-PLACEHOLDER
   - **Why it happens:** Placeholder logic shipped without feature flagging. 【F:QA_COMBINED_FINAL_REPORT.md†L128-L163】
   - **Blast radius:** Metrics, VIP Portal, analytics.
   - **Systemic fix:** Feature-flag incomplete areas or remove from production UX.

5. **RBAC seed drift**
   - **Issues:** RBAC-001
   - **Why it happens:** Permission strings used in routers are missing from seeds. 【F:docs/reference/FLOW_GUIDE.md†L1154-L1171】
   - **Blast radius:** Access mismatch across accounting/analytics/settings.
   - **Systemic fix:** Seed reconciliation + RBAC drift detector.

---

## 4) Deep Dives (Top 7 Issues, all P0 included)

### 4.1 SEC-001 — Hardcoded admin setup key

- **Symptom:** Default admin setup key fallback. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L38】
- **ERP impact:** Unauthorized admin creation, audit trust loss.
- **Root-cause chain:** Admin setup → default key accepted → admin role assigned.
- **Code references:** `server/routers/adminSetup.ts` (per QA report). 【F:QA_COMBINED_FINAL_REPORT.md†L31-L38】
- **Schema references:** Users table for roles. 【F:drizzle/schema.ts†L1-L24】
- **Fix:** Remove fallback; require env key; fail startup if missing.
- **Regression:** Negative test without env; positive test with env.

### 4.2 SEC-002 — Public matchingEnhanced endpoints

- **Symptom:** 12 public procedures exposing client data. 【F:QA_COMBINED_FINAL_REPORT.md†L39-L43】
- **ERP impact:** Client data leakage (compliance risk).
- **Root-cause chain:** PublicProcedure → unguarded access → sensitive data exposed.
- **Schema references:** Clients include contact + credit data. 【F:drizzle/schema.ts†L1543-L1607】
- **Fix:** Convert to protectedProcedure + RBAC.
- **Regression:** Unauth blocked; authorized allowed.

### 4.3 SEC-003 — Public calendar recurrence mutations

- **Symptom:** Unauthenticated calendar mutations. 【F:QA_COMBINED_FINAL_REPORT.md†L45-L49】
- **ERP impact:** Operations schedule tampering.
- **Root-cause chain:** Unauth mutation → DB writes → schedule changes.
- **Fix:** ProtectedProcedure + audit logging.

### 4.4 DI-001 — Transaction coverage unproven (correction)

- **Symptom:** Prior report claimed placeholder transaction helper; **current code is real**. 【F:server/dbTransaction.ts†L1-L15】【F:server/\_core/dbTransaction.ts†L33-L95】
- **ERP impact:** If critical mutations bypass wrapper, non-atomic writes occur.
- **Root-cause chain:** Critical mutation → no transaction → partial writes → drift.
- **Fix:** Inventory/Accounting mutation audit with enforced wrapper usage.

### 4.5 DI-002 — Credit application concurrency risk

- **Symptom:** QA audit flagged race; code uses row locks & idempotency but coverage is **DB-UNCONFIRMED**. 【F:QA_COMBINED_FINAL_REPORT.md†L79-L84】【F:server/creditsDb.ts†L204-L335】
- **ERP impact:** Over-application of credits.
- **Fix:** Ensure all credit paths call `applyCredit` and require idempotency keys.

### 4.6 API-002 — Orders/Invoices DB query failures (historical)

- **Symptom:** Orders/quotes/invoices list failures in E2E. 【F:qa-results/DEFECT_LOG.csv†L2-L4】
- **ERP impact:** Sales pipeline stalls.
- **Redhat correction:** Roadmap marks these fixed; requires **re-validation**. 【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】

### 4.7 API-001 — NOT_FOUND procedures (historical)

- **Symptom:** Multiple NOT_FOUND procedures. 【F:qa-results/DEFECT_LOG.csv†L5-L23】
- **ERP impact:** Key modules appear broken.
- **Redhat correction:** Roadmap indicates fixes; **re-validate**. 【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】

---

## 5) Risk Register (Trust Killers)

1. **Unauthenticated access to client data** — guardrail: publicProcedure ban in sensitive routers. 【F:QA_COMBINED_FINAL_REPORT.md†L39-L43】
2. **Unauthorized calendar edits** — guardrail: protected mutations + audit logs. 【F:QA_COMBINED_FINAL_REPORT.md†L45-L49】
3. **Credit double-apply** — guardrail: idempotency keys and transaction enforcement. 【F:server/creditsDb.ts†L204-L335】
4. **Partial deletes** — guardrail: transactional delete flow. 【F:QA_COMBINED_FINAL_REPORT.md†L86-L90】
5. **Stale E2E failures** — guardrail: re-run E2E against current build. 【F:qa-results/E2E_TEST_EXECUTION_REPORT.md†L10-L22】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】
6. **RBAC seed drift** — guardrail: seed reconciliation + drift tests. 【F:docs/reference/FLOW_GUIDE.md†L1154-L1171】
7. **Placeholder metrics** — guardrail: feature flag or remove stubs. 【F:QA_COMBINED_FINAL_REPORT.md†L128-L163】

---

## 6) Recommendation Plan (Phased)

### Phase 0 — Stop the Bleeding (P0)

- **Goals:** Remove unauthenticated surfaces; enforce secrets.
- **Changes:** Fix SEC-001/002/003 immediately. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L49】
- **Validation:** Auth/RBAC tests + negative unauth tests.

### Phase 1 — Stabilize & Enforce Invariants

- **Goals:** Prove transaction coverage; fix non-atomic deletes.
- **Changes:** Audit all critical mutations for `withTransaction` usage; wrap delete flows. 【F:server/dbTransaction.ts†L1-L15】【F:QA_COMBINED_FINAL_REPORT.md†L86-L90】

### Phase 2 — Re-validate & Close Stale Defects

- **Goals:** Confirm E2E defects are actually resolved in current build.
- **Changes:** Re-run E2E for DEF-001–DEF-023; close or reopen. 【F:qa-results/DEFECT_LOG.csv†L2-L24】【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】

---

## 7) Roadmap Task Pack (Protocol-Compliant)

> **Note:** Task IDs are **proposed** and require official assignment.

| TaskID          | Title                                 | Priority | Domain         | Owner | Description                                             | Code Locations                                 | Acceptance Criteria             | QA Verification                     | Risk/Rollback | Matrix Mapping |
| --------------- | ------------------------------------- | -------- | -------------- | ----- | ------------------------------------------------------- | ---------------------------------------------- | ------------------------------- | ----------------------------------- | ------------- | -------------- |
| PROPOSED-QA-001 | Remove admin setup fallback key       | P0       | Security       | BE    | Require ADMIN_SETUP_KEY env; fail fast if missing       | `server/routers/adminSetup.ts` (per QA report) | No default key path             | Unauth admin creation attempt fails | Low           | N/A            |
| PROPOSED-QA-002 | Protect matchingEnhanced endpoints    | P0       | Security/CRM   | BE    | Convert to protectedProcedure + RBAC                    | `server/routers/matchingEnhanced.ts`           | Unauth blocked; auth OK         | RBAC tests                          | Medium        | N/A            |
| PROPOSED-QA-003 | Protect calendar recurrence mutations | P0       | Calendar       | BE    | ProtectedProcedure + audit log                          | `server/routers/calendarRecurrence.ts`         | Unauth blocked                  | Calendar regression                 | Low           | N/A            |
| PROPOSED-QA-004 | Transaction coverage audit            | P0       | Data Integrity | BE/QA | Audit all critical mutations; enforce `withTransaction` | `server/_core/dbTransaction.ts`                | 100% critical mutations wrapped | Integration tests                   | Medium        | N/A            |
| PROPOSED-QA-005 | Re-run E2E for DEF-001–DEF-023        | P1       | QA             | QA    | Validate whether reported failures still exist          | E2E suite                                      | Updated pass/fail log           | E2E report                          | Medium        | Matrix-wide    |

---

## 8) “Fastest Path to Confidence” (7-day plan)

- **Day 1–2:** Lock down SEC-001/002/003 with tests.
- **Day 3:** Audit transaction coverage for money/inventory critical mutations.
- **Day 4–5:** Re-run E2E for DEF-001–DEF-023; reopen or close as needed.
- **Day 6:** Address RBAC seed drift and remove placeholder metrics.
- **Day 7:** Deliver updated matrix coverage + sign-off.

---

## Appendix A) Evidence Index

- **Security:** QA combined report security section. 【F:QA_COMBINED_FINAL_REPORT.md†L31-L64】
- **Data integrity:** QA combined report integrity section. 【F:QA_COMBINED_FINAL_REPORT.md†L70-L124】
- **E2E defects:** DEF log + E2E report. 【F:qa-results/DEFECT_LOG.csv†L2-L39】【F:qa-results/E2E_TEST_EXECUTION_REPORT.md†L117-L260】
- **Roadmap fixes (staleness):** BUG-078..085 marked complete. 【F:docs/roadmaps/MASTER_ROADMAP.md†L253-L267】
- **Transaction utilities (correction):** `dbTransaction.ts` re-exports real implementation. 【F:server/dbTransaction.ts†L1-L15】
- **RBAC gaps:** Flow guide. 【F:docs/reference/FLOW_GUIDE.md†L1154-L1171】

---

## QA Protocol (Adaptive Expert QA)

- **QA Level used:** 🔴 Level 3 (Full Redhat QE) — high-risk, durable ERP report.
- **Key risks identified:** Unauth surfaces, transaction coverage gaps, staleness of E2E evidence.
- **What changed and why:** Corrected the transaction-placeholder claim to a **coverage** risk, and flagged E2E failures as **historical** pending re-validation.

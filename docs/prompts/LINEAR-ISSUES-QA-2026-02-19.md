# Linear Issues — QA Report 2026-02-19

**Instructions:** Create these 12 issues in the [TERP - Golden Flows Beta](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d) project. When Linear access (MCP or API) is available, use `manus-mcp-cli tool call create_issue` for each.

---

## P0 — Urgent (Wave 11A)

### Issue 1: Direct Intake API broken — generic error masks root cause
- **Priority:** Urgent
- **Labels:** bug, P0, golden-flow
- **Estimate:** 8 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

All `inventory.intake` calls fail with "An unexpected error occurred" hiding the real error. The `processIntake()` function (`server/inventoryIntakeService.ts:90-380`) wraps errors at line 376 as raw `Error`, which `server/_core/errors.ts:326` converts to a generic message. Root cause is inside the transaction — could be `findOrCreate`, batch INSERT, batchLocations, or productImages. Need to check production logs for Request IDs and fix the underlying failure. Also fix error propagation to surface the real cause.

**Acceptance Criteria:**
- [ ] Identify actual exception from production logs
- [ ] Fix the underlying INSERT/query failure
- [ ] Propagate TRPCError with descriptive message instead of raw Error
- [ ] Intake API creates batches successfully
- [ ] 9 blocked tests pass

---

### Issue 2: Purchase Order line items INSERT — SQL parameter mismatch
- **Priority:** Urgent
- **Labels:** bug, P0, golden-flow
- **Estimate:** 3 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`purchaseOrders.create` (`server/routers/purchaseOrders.ts:273-281`) provides 5 values but schema defines 12 columns. Drizzle generates full INSERT including `quantityReceived`, `notes`, `supplierClientId`, `deletedAt` without values. Fix by explicitly setting nullable columns to null and `quantityReceived` to "0".

**Acceptance Criteria:**
- [ ] PO creation with line items succeeds
- [ ] All 12 columns handled (5 explicit + 7 defaults/nulls)
- [ ] Compare fix with working `addItem` mutation (line 533) pattern
- [ ] 3 PO tests pass

---

### Issue 3: Payment recording fails — transaction rollback during GL entries
- **Priority:** Urgent
- **Labels:** bug, P0, golden-flow
- **Estimate:** 3 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`payments.recordPayment` (`server/routers/payments.ts:314-419`) transaction rolls back when creating GL entries. Account resolution at lines 306-310 may fail if Cash or AR accounts not seeded. If accounts exist, `ledgerEntries` INSERT or `fiscalPeriodId` resolution may be the failure point. Generic error at line 437 hides root cause.

**Acceptance Criteria:**
- [ ] Verify chart of accounts is seeded (Cash, AR exist)
- [ ] Add pre-transaction validation for all required accounts
- [ ] Improve error message to include actual failure reason
- [ ] Full and partial payment recording succeeds
- [ ] 3 payment tests pass

---

### Issue 4: Order PACKED→SHIPPED fails — missing "Sales Revenue" account
- **Priority:** Urgent
- **Labels:** bug, P0, golden-flow, data-seeding
- **Estimate:** 3 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`createInvoiceWithGL()` (`server/services/orderOrchestrator.ts:1288`) looks up "Sales Revenue" account. If missing from DB, throws NOT_FOUND and prevents order creation entirely. Account is defined in seed defaults (`seedDefaults.ts:514` as #4000) but not present in prod DB. Run seed defaults, add defensive check.

**Acceptance Criteria:**
- [ ] All 7 ACCOUNT_NAMES constants verified in prod DB
- [ ] `seedDefaults` chart of accounts runs successfully
- [ ] Order creation succeeds (creates invoice + GL entries)
- [ ] Full order lifecycle PENDING→PACKED→SHIPPED works
- [ ] 1 order lifecycle test passes

---

## P1 — High (Wave 11B)

### Issue 5: Vendor payables INSERT fails — parameter mismatch
- **Priority:** High
- **Labels:** bug, P1
- **Estimate:** 2 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`payablesService.createPayable()` (`server/services/payablesService.ts:122-138`) inserts 12 values for 28-column table. Nullable columns without explicit defaults cause mismatch. Fix: add explicit null values for `dueDate`, `paidDate`, `inventoryZeroAt`, `notificationSentAt`, `notes`.

**Acceptance Criteria:**
- [ ] Vendor payable creation succeeds
- [ ] CHAIN-009 test passes

---

### Issue 6: Sample requests INSERT fails — parameter mismatch
- **Priority:** High
- **Labels:** bug, P1
- **Estimate:** 2 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`samplesDb.ts:45-52` provides 6 values for 36-column `sampleRequests` table. Return workflow fields, vendor return fields, and other nullable columns need explicit null values.

**Acceptance Criteria:**
- [ ] Sample request creation succeeds
- [ ] CHAIN-010 test passes

---

### Issue 7: QA test accounts missing / email mismatch — blocks RBAC testing
- **Priority:** High
- **Labels:** bug, P1, data-seeding
- **Estimate:** 2 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

Seed script (`scripts/seed-qa-users.ts:33-64`) has email naming mismatches vs CLAUDE.md:
- `qa.sales@` should be `qa.salesmanager@`
- `qa.admin@` should be `qa.superadmin@`
- Missing `qa.salesrep@terp.test` (Customer Service role)

Fix emails, add missing account, run seeder in production.

**Acceptance Criteria:**
- [ ] All 7 CLAUDE.md accounts exist in prod DB
- [ ] Email addresses match protocol exactly
- [ ] 5 AUTH tests pass

---

### Issue 8: Invoice getById returns 404
- **Priority:** High
- **Labels:** bug, P1
- **Estimate:** 2 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`invoices.getById` (`server/routers/invoices.ts:191-241`) returns 404. May be missing test data or deprecated `customerId` naming causing JOIN failure. Investigate and fix.

**Acceptance Criteria:**
- [ ] Invoice detail retrieval works for existing invoices
- [ ] GF-004-TC-014 test passes

---

## P2 — Medium (Wave 11C)

### Issue 9: Storage zones INSERT fails — parameter mismatch
- **Priority:** Medium
- **Labels:** bug, P2
- **Estimate:** 1 point
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

`server/routers/storage.ts:142-155` missing `isActive` (should be `true`), `currentCapacity`, `metadata` in INSERT.

**Acceptance Criteria:**
- [ ] Storage zone creation succeeds
- [ ] CHAIN-011 test passes

---

### Issue 10: Tags table query fails — column casing or NULL handling
- **Priority:** Medium
- **Labels:** bug, P2
- **Estimate:** 1 point
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

Tags SELECT (`server/routers/tags.ts:52-77`) fails. Either column name casing mismatch (`standardizedName` vs DB `standardized_name`) or LIKE on NULL `description` column.

**Acceptance Criteria:**
- [ ] Tags list and search works
- [ ] CHAIN-012 test passes

---

### Issue 11: Quotes should not validate inventory availability
- **Priority:** Medium
- **Labels:** enhancement, P2
- **Estimate:** 2 points
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

Creating a QUOTE order fails with "Insufficient available inventory". Quotes are pricing commitments, not inventory reservations. Skip inventory check for QUOTE type orders.

**Acceptance Criteria:**
- [ ] QUOTE orders can be created regardless of inventory
- [ ] SALE orders still validate inventory
- [ ] UJ-008 test passes

---

### Issue 12: Order creation error handling — raw Zod validation exposed
- **Priority:** Low
- **Labels:** enhancement, P2
- **Estimate:** 1 point
- **Milestone:** Wave 11 - QA Bug Fixes
- **Description:**

CHAIN-002 shows raw Zod error "Invalid input: expected object" not wrapped in user-friendly TRPCError.

**Acceptance Criteria:**
- [ ] Zod validation errors return proper error messages
- [ ] CHAIN-002 test passes

---

*Total: 12 issues, 30 story points*
*Wave 11A: 4 issues (17 pts) — fixes 16 tests*
*Wave 11B: 4 issues (8 pts) — fixes 7 tests*
*Wave 11C: 4 issues (5 pts) — fixes 4 tests*

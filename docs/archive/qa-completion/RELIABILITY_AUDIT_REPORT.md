# TERP Production Reliability & Data Integrity Audit

**Date:** 2026-01-06
**Auditor Role:** Principal Reliability Engineer + Staff Backend/Frontend Engineer + QA Lead
**Scope:** Full codebase reliability assessment for small-business production deployment

---

## SECTION A — Production Readiness Verdict

### Ship Tomorrow?

**CONDITIONAL - Critical Issues Must Be Addressed First**

The system has strong architectural foundations but contains several critical issues that could cause customer harm if deployed without remediation.

### Top 5 Catastrophic Risks

| #   | Risk                                                 | Impact                                                                                       | Location                               |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | **Public Demo User Exposes All Business Data**       | Anyone can access all read endpoints without authentication via synthetic "public demo user" | `server/_core/context.ts:36-76`        |
| 2   | **Unauthenticated Schema Push Endpoint**             | Anyone can push schema changes to production database                                        | `server/_core/simpleAuth.ts:229-243`   |
| 3   | **Payment Recording Without Transaction Boundaries** | Multi-step payment recording can leave data in inconsistent state                            | `server/routers/accounting.ts:844-912` |
| 4   | **SSL Certificate Validation Disabled**              | Man-in-the-middle attacks possible on database connections                                   | `server/_core/connectionPool.ts:73-77` |
| 5   | **Unauthenticated User Creation Endpoint**           | Anyone can create admin users in the system                                                  | `server/_core/simpleAuth.ts:282-300`   |

### Top 5 Most Likely Day-1 Support Tickets

| #   | Issue                                      | Likelihood | Description                                                       |
| --- | ------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| 1   | Duplicate orders from double-click/refresh | HIGH       | No idempotency keys on order creation mutations                   |
| 2   | "My changes weren't saved"                 | HIGH       | Optimistic locking bypassed when version not provided             |
| 3   | Pricing calculation discrepancies          | MEDIUM     | Floating-point `.toFixed(2)` used instead of Decimal.js           |
| 4   | Calendar events missing/duplicated         | MEDIUM     | publicProcedure used for calendar reads, unclear permission scope |
| 5   | Session expired during long operations     | MEDIUM     | 30-day JWT with no refresh mechanism                              |

### Data at Highest Risk (Ranked)

1. **Client Credit Balances** - `clients.totalOwed` updated without transactions in `receiveClientPayment`
2. **Inventory Quantities** - Race conditions possible between inventory check and order creation
3. **Order Totals** - Floating-point math used for money calculations
4. **Payment Records** - Non-atomic multi-table writes in payment flows
5. **User Permissions** - RBAC permission checks cached, stale data possible

---

## SECTION B — System Map (Reliability-Relevant Only)

### Runtime Stack

| Component  | Technology                       | Notes                 |
| ---------- | -------------------------------- | --------------------- |
| Frontend   | React 19.1 + TypeScript + Vite   | Single-page app       |
| API Layer  | tRPC 11.6 on Express 4.21        | Type-safe RPC         |
| Database   | MySQL 8.0 (DigitalOcean Managed) | Drizzle ORM           |
| Auth       | JWT (30-day cookies) + bcrypt    | Custom implementation |
| Session    | HTTP-only cookies                | `terp_session`        |
| Caching    | In-memory (node-cache pattern)   | No Redis              |
| Monitoring | Sentry (optional), Pino logging  | Structured logs       |

### Data Persistence Points

- **Primary DB:** MySQL 8.0 via Drizzle ORM (`server/db.ts`)
- **Schema:** 4 schema files totaling 6,500+ lines (`drizzle/schema*.ts`)
- **Migrations:** 45+ SQL migrations + auto-migrate fallback (`server/autoMigrate.ts`)
- **Connection Pool:** mysql2 with 25 connections (`server/_core/connectionPool.ts`)

### Background Work

| Job               | Location                             | Schedule        |
| ----------------- | ------------------------------------ | --------------- |
| Price Alerts Cron | `server/cron/priceAlertsCron.ts`     | Unknown         |
| Calendar Jobs     | `server/_core/calendarJobs.ts`       | Event-driven    |
| Stats Interval    | `server/_core/connectionPool.ts:151` | Every 5 minutes |

### External Services

- DigitalOcean MySQL (managed database)
- Clerk (optional OAuth, via env vars)
- Sentry (optional error tracking)
- OpenTHC (strain data import)

### Primary Mutation Surfaces

| Domain     | Router                         | Key Mutations                                          |
| ---------- | ------------------------------ | ------------------------------------------------------ |
| Orders     | `server/routers/orders.ts`     | createDraftEnhanced, confirmOrder, updateDraftEnhanced |
| Inventory  | `server/routers/inventory.ts`  | updateBatch, adjustQuantity                            |
| Accounting | `server/routers/accounting.ts` | receiveClientPayment, payVendor, recordPayment         |
| Credits    | `server/routers/credit.ts`     | calculate, manualOverride                              |
| Clients    | `server/routers/clients.ts`    | create, update, delete                                 |
| Calendar   | `server/routers/calendar.ts`   | createEvent, updateEvent                               |

---

## SECTION C — Critical Data & Workflows

### "Don't Be Wrong" Domains

#### 1. Orders & Order Line Items

- **What "wrong" looks like:** Incorrect totals, missing items, duplicate orders, inventory not decremented
- **Detection:** Users reporting discrepancies, inventory audits showing drift
- **Current safeguards:** FOR UPDATE locks in ordersDb.ts, transaction wrapping

#### 2. Payments & Client Balances

- **What "wrong" looks like:** Payment recorded but balance not updated, overpayment creating negative balance
- **Detection:** Client complaints, AR aging reports not matching
- **Current safeguards:** MINIMAL - `receiveClientPayment` lacks transaction wrapping

#### 3. Inventory Counts

- **What "wrong" looks like:** Negative inventory, oversold stock, phantom inventory
- **Detection:** Physical counts vs system, order failures
- **Current safeguards:** Version columns exist, FOR UPDATE locks in some paths

#### 4. Credit Limits & Exposure

- **What "wrong" looks like:** Client over-extended, credit check bypassed
- **Detection:** Late discovery of exposure exceeding limits
- **Current safeguards:** `checkOrderCredit` procedure, but enforcement is configurable

#### 5. Pricing Calculations

- **What "wrong" looks like:** COGS incorrect, margin calculations wrong, rounding errors
- **Detection:** Margin reports show unexpected values
- **Current safeguards:** COGS calculator exists but uses `toFixed(2)` throughout

#### 6. User Permissions/RBAC

- **What "wrong" looks like:** User accessing data they shouldn't, permission leak
- **Detection:** Audit logs, user reports
- **Current safeguards:** Permission middleware, but public demo user bypasses

---

## SECTION D — Failure Mode Catalog

### Finding #1 — Public Demo User Data Exposure

- **Area:** Backend / Auth
- **Location:** `server/_core/context.ts:36-76`, `server/_core/permissionMiddleware.ts:63-83`
- **Trigger:** Any unauthenticated request to the API
- **Failure:** All `:read` permissions granted automatically
- **Impact:** Complete exposure of all business data (clients, orders, inventory, pricing, accounting)
- **Likelihood:** HIGH (by design)
- **Severity:** CRITICAL
- **How to Reproduce:** Make any tRPC query without a session cookie
- **Fast Mitigation:** Remove lines 75-83 in permissionMiddleware.ts, make `getOrCreatePublicUser` throw instead
- **Proper Fix:** Require authentication for all non-public routes, remove public demo user entirely
- **Verification:** Attempt API request without cookie, confirm 401 response

### Finding #2 — Unauthenticated Schema Push Endpoint

- **Area:** Backend / Admin
- **Location:** `server/_core/simpleAuth.ts:229-243`
- **Trigger:** POST to `/api/auth/push-schema`
- **Failure:** Database schema modified without authorization
- **Impact:** Data loss, schema corruption, service outage
- **Likelihood:** LOW (requires knowledge of endpoint)
- **Severity:** CRITICAL
- **How to Reproduce:** `curl -X POST http://host/api/auth/push-schema`
- **Fast Mitigation:** Add authentication middleware to endpoint
- **Proper Fix:** Move to protected admin router with `system:manage` permission
- **Verification:** Confirm endpoint returns 401 without valid session

### Finding #3 — Unauthenticated User Creation Endpoint

- **Area:** Backend / Auth
- **Location:** `server/_core/simpleAuth.ts:282-300`
- **Trigger:** POST to `/api/auth/create-first-user`
- **Failure:** Unauthorized user creation
- **Impact:** Attacker creates admin account, full system compromise
- **Likelihood:** MEDIUM
- **Severity:** CRITICAL
- **How to Reproduce:** `curl -X POST http://host/api/auth/create-first-user -d '{"username":"attacker","password":"test"}'`
- **Fast Mitigation:** Check if users exist before allowing creation, require existing admin auth
- **Proper Fix:** Remove endpoint or add single-use setup token
- **Verification:** Confirm endpoint blocked when users exist

### Finding #4 — Unauthenticated Seed Endpoint

- **Area:** Backend / Admin
- **Location:** `server/_core/simpleAuth.ts:246-279`
- **Trigger:** POST to `/api/auth/seed` when SKIP_SEEDING not set
- **Failure:** Database seeded with test data
- **Impact:** Production data mixed with test data, confusion
- **Likelihood:** LOW
- **Severity:** HIGH
- **How to Reproduce:** `curl -X POST http://host/api/auth/seed`
- **Fast Mitigation:** Always set `SKIP_SEEDING=true` in production
- **Proper Fix:** Remove endpoint from simpleAuth, move to CLI tool
- **Verification:** Confirm SKIP_SEEDING returns 403

### Finding #5 — Payment Recording Without Transaction

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts:844-912` (`receiveClientPayment`)
- **Trigger:** Client payment recording
- **Failure:** Partial write - payment recorded but balance not updated (or vice versa)
- **Impact:** Accounting discrepancies, client trust issues
- **Likelihood:** MEDIUM (network/db issues during multi-step write)
- **Severity:** CRITICAL
- **How to Reproduce:** Kill database connection mid-operation
- **Fast Mitigation:** Wrap lines 869-899 in `db.transaction()`
- **Proper Fix:** Create `PaymentService` with proper transactional boundaries
- **Verification:** Unit test with simulated failure, verify rollback

### Finding #6 — SSL Certificate Validation Disabled

- **Area:** Deployment / Security
- **Location:** `server/_core/connectionPool.ts:73-77`
- **Trigger:** Database connection with SSL
- **Failure:** MITM attacks possible, credentials could be intercepted
- **Impact:** Database credentials exposure, data breach
- **Likelihood:** LOW (requires network position)
- **Severity:** HIGH
- **How to Reproduce:** Proxy database traffic
- **Fast Mitigation:** Set `rejectUnauthorized: true` with proper CA cert
- **Proper Fix:** Use DigitalOcean's CA certificate bundle
- **Verification:** Test connection with invalid cert fails

### Finding #7 — Database Health Check Doesn't Crash on Failure

- **Area:** Deployment / Startup
- **Location:** `server/_core/connectionPool.ts:144-147`
- **Trigger:** Database unreachable at startup
- **Failure:** App starts without database, silently fails on first query
- **Impact:** Users see errors, unclear what's wrong
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Start app with invalid DATABASE_URL
- **Fast Mitigation:** Add `process.exit(1)` in catch block
- **Proper Fix:** Implement proper health checks with graceful degradation
- **Verification:** App exits with clear error on startup

### Finding #8 — Duplicate Database Check (Code Quality)

- **Area:** Backend / Multiple Files
- **Location:** `server/routers/calendar.ts:40-42`, `server/routers/admin.ts:38-42`
- **Trigger:** N/A - code duplication
- **Failure:** Maintenance burden, inconsistent error handling
- **Impact:** Low - cosmetic/maintenance issue
- **Likelihood:** N/A
- **Severity:** LOW
- **How to Reproduce:** Search for `if (!db) throw new Error.*Database not available`
- **Fast Mitigation:** Remove duplicate lines
- **Proper Fix:** Create helper function for db access
- **Verification:** Code review

### Finding #9 — Order Double-Submit Without Idempotency

- **Area:** Backend / Orders
- **Location:** `server/routers/orders.ts` (all create mutations)
- **Trigger:** User double-clicks submit, network retry
- **Failure:** Duplicate orders created
- **Impact:** Inventory oversold, customer confusion, refund work
- **Likelihood:** HIGH
- **Severity:** HIGH
- **How to Reproduce:** Submit order form twice rapidly
- **Fast Mitigation:** Frontend disable button after click
- **Proper Fix:** Add idempotency key to order creation, check before insert
- **Verification:** Duplicate requests with same key return existing order

### Finding #10 — Calendar Uses publicProcedure

- **Area:** Backend / Calendar
- **Location:** `server/routers/calendar.ts:21`
- **Trigger:** Calendar `getEvents` called
- **Failure:** Permission filtering happens after data fetch, not at router level
- **Impact:** Defense-in-depth gap, potential data exposure
- **Likelihood:** LOW (secondary filtering exists)
- **Severity:** MEDIUM
- **How to Reproduce:** Call getEvents without authentication
- **Fast Mitigation:** Change to protectedProcedure
- **Proper Fix:** Use protectedProcedure + requirePermission
- **Verification:** Unauthenticated calendar request returns 401

### Finding #11 — Optimistic Locking Bypassed Without Version

- **Area:** Backend / Clients
- **Location:** `server/clientsDb.ts:383-394`
- **Trigger:** Client update without `expectedVersion` parameter
- **Failure:** Concurrent updates overwrite each other (last-write-wins)
- **Impact:** Lost updates, user frustration
- **Likelihood:** MEDIUM (multi-user environment)
- **Severity:** MEDIUM
- **How to Reproduce:** Two users edit same client simultaneously
- **Fast Mitigation:** Always require version in frontend
- **Proper Fix:** Make version mandatory in API schema
- **Verification:** Concurrent update without version fails

### Finding #12 — Floating-Point Money Calculations

- **Area:** Backend / Multiple
- **Location:** Multiple files using `.toFixed(2)` (50+ occurrences)
- **Trigger:** Any financial calculation
- **Failure:** Rounding errors accumulate
- **Impact:** Penny-level discrepancies, audit failures
- **Likelihood:** MEDIUM
- **Severity:** MEDIUM
- **How to Reproduce:** Calculate `0.1 + 0.2` in JavaScript
- **Fast Mitigation:** Audit critical paths (order totals, payments)
- **Proper Fix:** Use Decimal.js (already in dependencies) throughout
- **Verification:** Property-based tests with edge-case amounts

### Finding #13 — Password Stored in `loginMethod` Field

- **Area:** Backend / Auth
- **Location:** `server/_core/simpleAuth.ts:152-159`
- **Trigger:** User creation/login
- **Failure:** Confusing semantics, potential security review failures
- **Impact:** LOW (data is hashed correctly)
- **Likelihood:** N/A - design issue
- **Severity:** LOW
- **How to Reproduce:** N/A
- **Fast Mitigation:** Add clear comments
- **Proper Fix:** Add dedicated `passwordHash` column to users table
- **Verification:** Schema audit

### Finding #14 — Empty DATABASE_URL Returns Empty String

- **Area:** Deployment / Config
- **Location:** `server/_core/env.ts:63-65`
- **Trigger:** Missing DATABASE_URL environment variable
- **Failure:** App starts with invalid config
- **Impact:** Runtime failures instead of startup failure
- **Likelihood:** LOW (dev environment issue mostly)
- **Severity:** MEDIUM
- **How to Reproduce:** Start without DATABASE_URL set
- **Fast Mitigation:** connectionPool.ts already validates
- **Proper Fix:** Make env.ts throw for required vars
- **Verification:** App fails fast with clear error

### Finding #15 — Auto-Migrate Doesn't Block Startup on Failure

- **Area:** Deployment / Migration
- **Location:** `server/autoMigrate.ts:991-994`
- **Trigger:** Migration fails during startup
- **Failure:** App continues with incomplete schema
- **Impact:** Runtime errors, data integrity issues
- **Likelihood:** LOW
- **Severity:** HIGH
- **How to Reproduce:** Introduce migration error
- **Fast Mitigation:** Log prominently
- **Proper Fix:** Fail startup if migrations fail
- **Verification:** Bad migration causes startup failure

### Finding #16 — VIP Portal Auth Separate from Main Auth

- **Area:** Backend / Auth
- **Location:** `drizzle/schema-vip-portal.ts` (vipPortalAuth table)
- **Trigger:** VIP portal login
- **Failure:** Separate authentication system, separate password management
- **Impact:** Security complexity, inconsistent policies
- **Likelihood:** N/A - architectural
- **Severity:** MEDIUM
- **How to Reproduce:** N/A
- **Fast Mitigation:** Document clearly
- **Proper Fix:** Unify authentication systems
- **Verification:** Architecture review

### Finding #17 — Live Shopping Cart Without Inventory Lock

- **Area:** Backend / Live Shopping
- **Location:** `server/routers/liveShopping.ts:176-200` (`addToCart`)
- **Trigger:** Adding item to live shopping cart
- **Failure:** Multiple sessions can add same inventory
- **Impact:** Overselling, inventory conflicts
- **Likelihood:** MEDIUM (during live events)
- **Severity:** HIGH
- **How to Reproduce:** Two sessions add same batch to cart
- **Fast Mitigation:** Check inventory on add
- **Proper Fix:** Soft-reserve inventory when added to cart
- **Verification:** Concurrent adds fail when inventory exhausted

### Finding #18 — No Rate Limiting on Auth Endpoints

- **Area:** Backend / Auth
- **Location:** `server/_core/simpleAuth.ts` (login endpoint)
- **Trigger:** Brute force login attempts
- **Failure:** Password enumeration/cracking
- **Impact:** Account compromise
- **Likelihood:** MEDIUM
- **Severity:** HIGH
- **How to Reproduce:** Rapid login attempts
- **Fast Mitigation:** Add rate limiter middleware
- **Proper Fix:** Use express-rate-limit (already in dependencies)
- **Verification:** 429 response after threshold

### Finding #19 — Vendor Payment Without Vendor Verification

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts:914-975` (`payVendor`)
- **Trigger:** Pay vendor mutation
- **Failure:** Payment to non-vendor client possible if isSeller check bypassed
- **Impact:** Money sent to wrong entity
- **Likelihood:** LOW (check exists)
- **Severity:** HIGH
- **How to Reproduce:** Pass clientId that has isSeller=false
- **Fast Mitigation:** Current check appears sufficient
- **Proper Fix:** Additional audit log entry
- **Verification:** Verify check catches non-sellers

### Finding #20 — Invoice Create Without Balance Validation

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts:276-290`
- **Trigger:** Invoice creation
- **Failure:** Invoice total/amount due mismatch possible
- **Impact:** AR balance discrepancies
- **Likelihood:** LOW (client-calculated values trusted)
- **Severity:** MEDIUM
- **How to Reproduce:** Send mismatched subtotal/totalAmount
- **Fast Mitigation:** Recalculate totals on server
- **Proper Fix:** Server-side validation of all calculations
- **Verification:** Input fuzz testing

### Finding #21 — Credit Override Without Approval Workflow

- **Area:** Backend / Credit
- **Location:** `server/routers/credit.ts:69-85` (`manualOverride`)
- **Trigger:** Manual credit limit override
- **Failure:** Single user can override any credit limit
- **Impact:** Excessive credit exposure
- **Likelihood:** LOW (permission required)
- **Severity:** MEDIUM
- **How to Reproduce:** Call manualOverride with high limit
- **Fast Mitigation:** Add approval requirement for large overrides
- **Proper Fix:** Multi-level approval workflow
- **Verification:** Override above threshold requires approval

### Finding #22 — Client Delete is Hard Delete

- **Area:** Backend / Clients
- **Location:** `server/routers/clients.ts:140-144`
- **Trigger:** Client delete called
- **Failure:** Data permanently lost, orphaned references possible
- **Impact:** Historical data loss, broken foreign keys
- **Likelihood:** LOW (permission required)
- **Severity:** HIGH
- **How to Reproduce:** Delete client with orders
- **Fast Mitigation:** Add cascade check
- **Proper Fix:** Implement soft delete (deletedAt)
- **Verification:** Deletion fails if client has orders

### Finding #23 — Frontend No Global Error Boundary Recovery

- **Area:** Frontend / Error Handling
- **Location:** `client/src/App.tsx:5` (ErrorBoundary imported)
- **Trigger:** Unhandled React error
- **Failure:** White screen, no recovery option
- **Impact:** User must refresh, unsaved work lost
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Trigger React render error
- **Fast Mitigation:** Verify ErrorBoundary has retry button
- **Proper Fix:** Add "Report issue" and state recovery
- **Verification:** Error boundary shows helpful UI

### Finding #24 — JWT 30-Day Expiry Without Refresh

- **Area:** Backend / Auth
- **Location:** `server/_core/simpleAuth.ts:44`
- **Trigger:** Token approaching expiry
- **Failure:** User logged out after 30 days with no warning
- **Impact:** Data loss if mid-operation
- **Likelihood:** LOW (long expiry)
- **Severity:** LOW
- **How to Reproduce:** Wait 30 days
- **Fast Mitigation:** Document session duration
- **Proper Fix:** Implement refresh token mechanism
- **Verification:** Token refresh extends session

### Finding #25 — Batch Version Not Incremented in All Paths

- **Area:** Backend / Inventory
- **Location:** `server/inventoryDb.ts` (various update functions)
- **Trigger:** Batch update via certain paths
- **Failure:** Version not incremented, optimistic locking ineffective
- **Impact:** Concurrent update detection fails
- **Likelihood:** MEDIUM
- **Severity:** MEDIUM
- **How to Reproduce:** Update batch, check version unchanged
- **Fast Mitigation:** Audit all update paths
- **Proper Fix:** Centralize version increment in single function
- **Verification:** Every update increments version

### Finding #26 — Order Number Generation Uses Timestamp

- **Area:** Backend / Orders
- **Location:** `server/ordersDb.ts:221-223`
- **Trigger:** Order creation
- **Failure:** Potential duplicates if created in same millisecond
- **Impact:** Duplicate order numbers
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Create many orders rapidly
- **Fast Mitigation:** Add random suffix
- **Proper Fix:** Use database sequence or ULID
- **Verification:** Concurrent inserts have unique numbers

### Finding #27 — Calendar Event Permission Check After Fetch

- **Area:** Backend / Calendar
- **Location:** `server/routers/calendar.ts:96-105`
- **Trigger:** getEvents query
- **Failure:** All events fetched, then filtered
- **Impact:** Performance issue, potential info leak in logs
- **Likelihood:** LOW
- **Severity:** LOW
- **How to Reproduce:** Query with many events
- **Fast Mitigation:** Add limit
- **Proper Fix:** Filter in database query
- **Verification:** Query plan shows filter pushed down

### Finding #28 — Appointment Booking Race Condition

- **Area:** Backend / Calendar
- **Location:** `server/routers/vipPortal.ts:170-200`
- **Trigger:** Two users booking same slot
- **Failure:** Double-booking possible
- **Impact:** Scheduling conflicts
- **Likelihood:** MEDIUM
- **Severity:** MEDIUM
- **How to Reproduce:** Concurrent booking requests
- **Fast Mitigation:** Lock slot during booking
- **Proper Fix:** Database constraint + retry logic
- **Verification:** Concurrent bookings fail gracefully

### Finding #29 — Credit Check Returns Warning But Allows Transaction

- **Area:** Backend / Credit
- **Location:** `server/routers/credit.ts:134-155`
- **Trigger:** Credit check on order exceeding limit
- **Failure:** In "WARNING" mode, transaction proceeds despite exceeding limit
- **Impact:** Credit overexposure
- **Likelihood:** HIGH (default mode)
- **Severity:** MEDIUM
- **How to Reproduce:** Create order exceeding credit limit
- **Fast Mitigation:** Consider SOFT_BLOCK default
- **Proper Fix:** Make enforcement mode explicit per-client
- **Verification:** Default mode documented clearly

### Finding #30 — Sample Inventory Separate from Regular

- **Area:** Backend / Inventory
- **Location:** `drizzle/schema.ts` (batches.sampleQty)
- **Trigger:** Sample distribution
- **Failure:** Sample qty not reconciled with orders
- **Impact:** Inventory discrepancies
- **Likelihood:** MEDIUM
- **Severity:** MEDIUM
- **How to Reproduce:** Distribute samples, check totals
- **Fast Mitigation:** Audit sample vs regular reports
- **Proper Fix:** Clear sample tracking workflow
- **Verification:** Reconciliation report exists

### Finding #31 — No Audit Trail for Payment Deletion

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts` (no delete endpoint)
- **Trigger:** N/A - deletion not implemented
- **Failure:** If added later, no audit trail
- **Impact:** Accounting fraud possible
- **Likelihood:** N/A (not implemented)
- **Severity:** N/A
- **How to Reproduce:** N/A
- **Fast Mitigation:** Keep no delete
- **Proper Fix:** If delete needed, add audit log
- **Verification:** Code review when adding delete

### Finding #32 — Drizzle Query in Accounting Without Proper Import

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts:808-812` (dynamic imports)
- **Trigger:** quickActions procedures
- **Failure:** Dynamic imports add latency
- **Impact:** Slow first request
- **Likelihood:** HIGH
- **Severity:** LOW
- **How to Reproduce:** Cold start quickActions call
- **Fast Mitigation:** Move to top-level imports
- **Proper Fix:** Consolidate imports
- **Verification:** Profile request times

### Finding #33 — Node Memory Limit in Docker

- **Area:** Deployment
- **Location:** `Dockerfile:88`
- **Trigger:** High memory usage
- **Failure:** OOM with 896MB limit
- **Impact:** Container crash
- **Likelihood:** LOW-MEDIUM
- **Severity:** MEDIUM
- **How to Reproduce:** Generate large reports
- **Fast Mitigation:** Monitor memory usage
- **Proper Fix:** Implement streaming for large operations
- **Verification:** Load test with memory monitoring

### Finding #34 — Feature Flag Without Default

- **Area:** Backend / Feature Flags
- **Location:** `drizzle/schema-feature-flags.ts`
- **Trigger:** New feature flag checked before creation
- **Failure:** Feature unavailable if flag doesn't exist
- **Impact:** Features broken until seeded
- **Likelihood:** LOW
- **Severity:** LOW
- **How to Reproduce:** Check non-existent flag
- **Fast Mitigation:** Default to disabled
- **Proper Fix:** Flag service returns default if not found
- **Verification:** Unknown flag returns false

### Finding #35 — Client Transaction Create Without Validation

- **Area:** Backend / Clients
- **Location:** `server/routers/clients.ts:181-197`
- **Trigger:** Create client transaction
- **Failure:** Amount can be any value including negative
- **Impact:** Data integrity issues
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Create transaction with negative amount
- **Fast Mitigation:** Add z.number().positive() validation
- **Proper Fix:** Business rule validation layer
- **Verification:** Negative amount rejected

### Finding #36 — Invoice Number Generation Race Condition

- **Area:** Backend / Accounting
- **Location:** `server/routers/accounting.ts:337-340` (`generateNumber`)
- **Trigger:** Concurrent invoice creation
- **Failure:** Duplicate invoice numbers
- **Impact:** Accounting confusion
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Concurrent generateNumber calls
- **Fast Mitigation:** Use in same transaction as create
- **Proper Fix:** Database sequence
- **Verification:** Load test invoice creation

### Finding #37 — CORS Not Explicitly Configured

- **Area:** Deployment
- **Location:** Express setup
- **Trigger:** Cross-origin requests
- **Failure:** May default to permissive
- **Impact:** Security risk
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Check CORS headers
- **Fast Mitigation:** Verify current behavior
- **Proper Fix:** Explicit CORS configuration
- **Verification:** CORS headers correct

### Finding #38 — Calendar Instance Generation Memory

- **Area:** Backend / Calendar
- **Location:** `server/routers/calendar.ts:113-129`
- **Trigger:** Large date range query with many recurrences
- **Failure:** Memory exhaustion
- **Impact:** Server crash
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Query year of daily recurring events
- **Fast Mitigation:** Limit date range
- **Proper Fix:** Lazy generation, pagination
- **Verification:** Memory test with large ranges

### Finding #39 — Admin Impersonation Session Not Properly Bounded

- **Area:** Backend / VIP Portal
- **Location:** `drizzle/schema-vip-portal.ts` (admin_impersonation_sessions)
- **Trigger:** Admin impersonating VIP client
- **Failure:** Session could persist indefinitely
- **Impact:** Extended unauthorized access
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Start impersonation, don't end
- **Fast Mitigation:** Auto-expire after timeout
- **Proper Fix:** Mandatory session time limits
- **Verification:** Session expires after threshold

### Finding #40 — Pricing Profile JSON in Client Table

- **Area:** Backend / Schema
- **Location:** `drizzle/schema.ts` (clients.customPricingRules)
- **Trigger:** Client with complex pricing
- **Failure:** JSON schema not validated
- **Impact:** Invalid pricing rules accepted
- **Likelihood:** LOW
- **Severity:** MEDIUM
- **How to Reproduce:** Insert malformed JSON
- **Fast Mitigation:** Zod validation in API layer
- **Proper Fix:** JSON schema validation at DB level
- **Verification:** Invalid JSON rejected

### Finding #41 — Webhook Secret Not Validated

- **Area:** Backend / Integrations
- **Location:** Various webhook handlers
- **Trigger:** Incoming webhook
- **Failure:** Unsigned webhooks accepted
- **Impact:** Forged webhook data processed
- **Likelihood:** MEDIUM
- **Severity:** HIGH
- **How to Reproduce:** Send webhook without signature
- **Fast Mitigation:** Implement signature verification
- **Proper Fix:** All webhooks require HMAC verification
- **Verification:** Unsigned webhooks rejected

### Finding #42 — No Database Backup Verification

- **Area:** Deployment / Operations
- **Location:** DigitalOcean managed DB
- **Trigger:** Recovery needed
- **Failure:** Backups not tested
- **Impact:** Data loss if backup corrupted
- **Likelihood:** LOW
- **Severity:** HIGH
- **How to Reproduce:** N/A
- **Fast Mitigation:** Test restore monthly
- **Proper Fix:** Automated restore testing
- **Verification:** Recovery drill documentation

---

## SECTION E — Silent Failure & Data Corruption Risks

### Places Where UI Says "Saved" But May Not Be

1. **Client Update Without Version** - `clientsDb.ts:388-394` doesn't verify row was actually updated
2. **Batch Update** - Returns without checking affected rows in some paths
3. **Accounting Quick Actions** - Multi-step operations without transaction rollback

### Places Where Errors Are Swallowed

1. **Health Check Failure** - `connectionPool.ts:144-147` logs but doesn't crash
2. **Auto-Migrate Failure** - `autoMigrate.ts:991-994` logs but continues
3. **Sentry Load Failure** - `main.tsx:14-17` catches and continues
4. **Index Creation Failure** - `autoMigrate.ts` continues on index errors

### Places Where State Can Diverge

1. **React Query Cache vs Database** - 5 minute stale time could show outdated data
2. **Client Balance vs Payment Records** - Separate tables updated non-atomically
3. **Inventory Counts vs Order Line Items** - Race window during order creation

### Places Where Defaults Could Overwrite Real Values

1. **Client Create** - Many fields default to `false`/`null` if not provided
2. **Order Items** - Missing `displayName` defaults to batch SKU
3. **Credit Enforcement** - Defaults to "WARNING" mode

### Places Where "Eventual Consistency" Is Implied But Not Implemented

1. **Client Total Spent/Owed** - Calculated fields that could drift from transaction sum
2. **Dashboard Metrics** - May not reflect in-flight transactions

---

## SECTION F — Deployment & Configuration Breakpoints

### Missing/Mis-set Env Vars

| Variable              | Risk                 | Detection        |
| --------------------- | -------------------- | ---------------- |
| `DATABASE_URL`        | App crashes          | Immediate        |
| `JWT_SECRET`          | Auth broken          | Immediate        |
| `SKIP_SEEDING=true`   | Test data in prod    | Manual discovery |
| `NODE_ENV=production` | Dev features in prod | Security audit   |
| `VITE_SENTRY_DSN`     | No error tracking    | Incident         |

### Build-Time vs Runtime Config Mismatch

- `VITE_*` variables must be set at build time in Dockerfile
- Runtime env changes won't affect frontend config

### Migrations Not Running

- `autoMigrate.ts` provides fallback but may create schema drift
- No enforcement that `drizzle-kit push` was run

### Seed Data Missing

- RBAC roles/permissions must be seeded
- Feature flags must be seeded
- Default fiscal periods must exist

### CORS/Session/Cookie Issues

- `sameSite: "lax"` may break cross-origin deployments
- `secure: true` only in production - test in staging with HTTPS

### Timeout Defaults

- Connection pool: 25 connections, 100 queue limit
- Node memory: 896MB limit in Docker
- JWT: 30-day expiry

---

## SECTION G — Priority Hardening Plan

### G1) 48-Hour Stabilization Plan

| Priority | Task                                | Target                                  | Verification                        |
| -------- | ----------------------------------- | --------------------------------------- | ----------------------------------- |
| 1        | **Remove public demo user**         | `context.ts`, `permissionMiddleware.ts` | API returns 401 without cookie      |
| 2        | **Auth-protect admin endpoints**    | `simpleAuth.ts:229-300`                 | All admin endpoints require login   |
| 3        | **Wrap payment in transaction**     | `accounting.ts:844-912`                 | Failure rolls back all changes      |
| 4        | **Enable SSL validation**           | `connectionPool.ts:75`                  | Connection fails with bad cert      |
| 5        | **Add idempotency to order create** | `orders.ts`, `ordersDb.ts`              | Duplicate request returns existing  |
| 6        | **Make version mandatory**          | `clients.ts`, `clientsDb.ts`            | Update fails without version        |
| 7        | **Add rate limiting to login**      | `simpleAuth.ts:176`                     | 429 after 5 attempts                |
| 8        | **Fix duplicate db checks**         | `calendar.ts`, `admin.ts`               | Code review                         |
| 9        | **Validate env at startup**         | `env.ts`                                | Missing vars crash with clear error |
| 10       | **Document SKIP_SEEDING**           | `.env.example`                          | Clear production instructions       |
| 11       | **Test backup restore**             | DigitalOcean                            | Document recovery procedure         |
| 12       | **Add webhook signature check**     | Webhook handlers                        | Unsigned requests rejected          |
| 13       | **Calendar to protectedProcedure**  | `calendar.ts:21`                        | 401 without auth                    |
| 14       | **Client soft delete**              | `clientsDb.ts`                          | Deletion sets deletedAt             |
| 15       | **Audit toFixed usage**             | Multiple files                          | Critical paths use Decimal.js       |

### G2) 2–4 Week Reliability Plan

| Week | Initiative                         | Description                                                  |
| ---- | ---------------------------------- | ------------------------------------------------------------ |
| 1    | **Transaction Service Layer**      | Create transactional wrappers for all multi-table operations |
| 1    | **Idempotency Framework**          | Add idempotency key support to all mutations                 |
| 2    | **Decimal.js Migration**           | Replace all `.toFixed()` with proper decimal handling        |
| 2    | **Unified Auth System**            | Merge VIP Portal auth with main auth                         |
| 3    | **Optimistic Locking Enforcement** | Make version mandatory in all update APIs                    |
| 3    | **Inventory Reservation System**   | Implement soft-reserve for live shopping carts               |
| 4    | **Audit Log Enhancement**          | Full audit trail for all data modifications                  |
| 4    | **Load Testing**                   | Document concurrent user limits and bottlenecks              |

---

## SECTION H — Minimal "Go Live" Checklist

### Pre-Deploy Checks

- [ ] `SKIP_SEEDING=true` in production env
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is unique, 32+ characters
- [ ] `DATABASE_URL` points to production MySQL
- [ ] RBAC roles and permissions seeded
- [ ] Feature flags seeded
- [ ] At least one admin user exists
- [ ] Public demo user code removed or disabled
- [ ] All unprotected admin endpoints secured

### Post-Deploy Smoke Tests

- [ ] Login works with valid credentials
- [ ] Login fails with invalid credentials
- [ ] API returns 401 without session cookie
- [ ] Order creation works end-to-end
- [ ] Inventory decrements after order
- [ ] Client balance updates after payment
- [ ] Calendar events load within 2 seconds
- [ ] Dashboard metrics render

### Monitoring Essentials

- [ ] Sentry DSN configured for error tracking
- [ ] Pino logs shipping to aggregator
- [ ] Database connection pool stats visible
- [ ] Response time p95 under 500ms
- [ ] Error rate under 1%

### Backup/Restore Sanity Check

- [ ] DigitalOcean backups enabled (daily)
- [ ] Point-in-time recovery available
- [ ] Test restore completed successfully
- [ ] Recovery time documented

### Rollback Plan

1. Keep previous Docker image tagged
2. Database supports point-in-time recovery
3. Feature flags can disable new features
4. DNS/load balancer can redirect to backup

### Support Triage List (Watch First 24 Hours)

1. Login failures (auth issues)
2. Order creation failures (inventory/credit)
3. Payment recording errors (accounting)
4. Calendar loading slow (performance)
5. Permission denied errors (RBAC)

---

## Appendix: File Reference Index

| File                                   | Issues Found              |
| -------------------------------------- | ------------------------- |
| `server/_core/context.ts`              | #1                        |
| `server/_core/simpleAuth.ts`           | #2, #3, #4, #13, #18, #24 |
| `server/_core/permissionMiddleware.ts` | #1                        |
| `server/_core/connectionPool.ts`       | #6, #7                    |
| `server/_core/env.ts`                  | #14                       |
| `server/autoMigrate.ts`                | #15                       |
| `server/routers/accounting.ts`         | #5, #19, #20, #32, #36    |
| `server/routers/calendar.ts`           | #8, #10, #27, #38         |
| `server/routers/admin.ts`              | #8                        |
| `server/routers/orders.ts`             | #9                        |
| `server/routers/clients.ts`            | #22, #35                  |
| `server/routers/credit.ts`             | #21, #29                  |
| `server/routers/liveShopping.ts`       | #17                       |
| `server/routers/vipPortal.ts`          | #28                       |
| `server/clientsDb.ts`                  | #11                       |
| `server/inventoryDb.ts`                | #25                       |
| `server/ordersDb.ts`                   | #26                       |
| `client/src/App.tsx`                   | #23                       |
| `Dockerfile`                           | #33                       |
| Multiple files                         | #12 (toFixed usage)       |

---

_Report generated by automated codebase analysis. Manual verification recommended for all findings._

# DATA Seeding QA Report - 2026-01-22

## Summary

Comprehensive database seeding completed with simulated test data for all major tables. This document tracks the seeding work, verification steps, and findings.

---

## Seed Script Details

**Script:** `scripts/seed-comprehensive.ts`
**Version:** v3.0 (Ultra-Comprehensive)
**Location:** `/home/user/TERP/scripts/seed-comprehensive.ts`

### Seeded Tables (6 Tiers, FK-ordered)

| Tier | Tables | Records |
|------|--------|---------|
| 1 | users, vendors, clients, brands, strains, locations, tags, workflow_statuses, pricing_defaults | Base data |
| 2 | products, lots, batches | 150/100/300 |
| 3 | orders, invoices, payments, bills, client_transactions, batch_status_history | 500/400/300/100 |
| 4 | calendars, calendar_events, todo_lists, todo_tasks, comments, inbox_items | 100/20/80/150 |
| 5 | vip_tiers, vip_portal_configurations, vip_portal_auth, client_needs, vendor_supply | 40/60/50 |
| 6 | sampleRequests, intake_sessions, recurring_orders, referral_credits, leaderboard_metric_cache | 60/30/20/30 |

### Data Characteristics

- **Clients:** 100 realistic California cannabis company names (e.g., "Pacific Dispensary", "Emerald Gardens")
- **Vendors:** 25 suppliers with contact info
- **Orders:** Mix of DRAFT/CONFIRMED/COMPLETED statuses
- **Invoices:** Mix of PENDING/PAID/OVERDUE statuses
- **VIP Portal:** 40 clients with portal access, 5 VIP tiers
- **Calendar:** 100 events across multiple calendars
- **Todos:** 20 lists with 80 tasks

---

## Critical Bug Fixed

### intake_sessions.vendor_id FK Constraint

**Issue:** The `vendor_id` column in `intake_sessions` references `clients.id` (not `vendors.id`), but the seed script was using vendor IDs.

**Schema Definition (drizzle/schema.ts:3730-3732):**
```typescript
vendorId: int("vendor_id")
  .notNull()
  .references(() => clients.id, { onDelete: "restrict" }),
```

**Fix Applied:**
- Created `sellerClientIds` from clients where `is_seller = 1`
- Pass seller client IDs to `seedIntakeSessions()` instead of vendor IDs
- Added guard for empty sellerClientIds array

**Commit:** `48efc3d fix: intake_sessions.vendor_id FK constraint - references clients.id not vendors.id`

---

## Verification Queries

### Record Counts
```sql
SELECT 'clients' as tbl, COUNT(*) as cnt FROM clients
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL SELECT 'todo_tasks', COUNT(*) FROM todo_tasks
UNION ALL SELECT 'vip_portal_configurations', COUNT(*) FROM vip_portal_configurations
UNION ALL SELECT 'intake_sessions', COUNT(*) FROM intake_sessions;
```

### FK Integrity Check (All should return 0)
```sql
SELECT 'orders->clients' as check_name, COUNT(*) as broken
FROM orders o LEFT JOIN clients c ON o.client_id = c.id WHERE c.id IS NULL
UNION ALL SELECT 'intake->clients', COUNT(*)
FROM intake_sessions s LEFT JOIN clients c ON s.vendor_id = c.id WHERE c.id IS NULL
UNION ALL SELECT 'invoices->clients', COUNT(*)
FROM invoices i LEFT JOIN clients c ON i.customerId = c.id WHERE c.id IS NULL
UNION ALL SELECT 'batches->products', COUNT(*)
FROM batches b LEFT JOIN products p ON b.productId = p.id WHERE p.id IS NULL;
```

---

## Build Verification

| Check | Result |
|-------|--------|
| TypeScript Build | ✅ PASS |
| Vite Build | ✅ PASS |
| ESLint (warnings only) | ✅ PASS (159 warnings in seed script - expected for CLI) |
| Seed Script Dry Run | ✅ PASS |

---

## Frontend QA Checklist

| Page | Expected Behavior | Status |
|------|-------------------|--------|
| `/clients` | List shows realistic company names | To Verify |
| `/orders` | Orders list populated with client associations | To Verify |
| `/inventory` | Batches with products, status badges | To Verify |
| `/invoices` | Invoices with client names, amounts | To Verify |
| `/calendar` | Events on calendar, clickable | To Verify |
| `/tasks` | Todo lists and tasks with assignees | To Verify |
| `/vip` | VIP tiers, marketplace data | To Verify |
| `/intake` | Intake sessions with valid supplier clients | To Verify |

---

## E2E Test Trigger

To run automated E2E tests against the seeded data:

**GitHub Actions (Recommended):**
1. Go to: https://github.com/EvanTenenbaum/TERP/actions/workflows/e2e-live-site.yml
2. Click "Run workflow"
3. Select: test_type=smoke, device=desktop-chrome
4. Run workflow

**Local (if Playwright installed):**
```bash
PLAYWRIGHT_BASE_URL=https://terp-app-b9s35.ondigitalocean.app \
SKIP_E2E_SETUP=1 \
pnpm exec playwright test tests/e2e/specs/regression.spec.ts
```

---

## Schema Insights Discovered

### Naming Convention Bifurcation

The database has a mix of naming conventions:
- **Legacy tables:** camelCase columns (e.g., `customerId`, `createdAt`)
- **Newer tables:** snake_case columns (e.g., `client_id`, `created_at`)

This is documented and expected - Drizzle handles the mapping.

### Semantic FK Mismatches

The `intake_sessions.vendor_id` field name is misleading:
- Name suggests it references `vendors` table
- Actually references `clients.id` where `is_seller = 1`
- This is by design for unified client/supplier model

---

## Recommendations

1. **Run E2E tests** via GitHub Actions to validate frontend integration
2. **Manual spot-check** key pages (clients, orders, invoices, VIP portal)
3. **Monitor Sentry** for any new errors after seeding
4. **Consider adding** seed script to CI for staging environment refresh

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/seed-comprehensive.ts` | Fixed intake_sessions FK, added sellerClientIds |

## Commits

- `48efc3d` - fix: intake_sessions.vendor_id FK constraint - references clients.id not vendors.id

---

**Branch:** `claude/add-simulated-data-25335`
**Status:** Ready for merge after E2E verification

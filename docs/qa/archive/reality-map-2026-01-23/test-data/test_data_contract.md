# TERP Test Data Contract

**Generated**: 2026-01-23 15:54:00
**Updated**: 2026-01-28
**Environment**: Staging (http://terp-app-b9s35.ondigitalocean.app)
**Status**: ✅ INFRASTRUCTURE_READY (Execution Pending)

## Current State

### Seeding Infrastructure

The QA test data seeding infrastructure has been **fully implemented** and is ready for execution:

- **Seeding Script:** `scripts/seed-qa-data.ts` - Complete and idempotent
- **NPM Command:** `pnpm seed:qa-data` - Configured in package.json
- **Registry Output:** `docs/qa/qa-data-registry.json` - Template ready
- **Strategy Doc:** `docs/qa/TEST_DATA_STRATEGY.md` - Full documentation

### Entities to be Created

| Entity Type | Count | Names/Variants                                                       | Status   |
| ----------- | ----- | -------------------------------------------------------------------- | -------- |
| LOCATION    | 5     | QA_LOCATION_MAIN, \_WAREHOUSE, \_COLD, \_STAGING, \_RETURNS          | 🔄 Ready |
| CUSTOMER    | 5     | QA_CUSTOMER_01, \_02, \_03, \_CREDIT, \_VIP                          | 🔄 Ready |
| SUPPLIER    | 3     | QA_SUPPLIER_01, \_02, \_03                                           | 🔄 Ready |
| BRAND       | 3     | QA_BRAND_PREMIUM, \_STANDARD, \_BUDGET                               | 🔄 Ready |
| PRODUCT     | 6     | QA_PRODUCT_FLOWER_A, \_B, \_PREROLL, \_EDIBLE, \_CONCENTRATE, \_VAPE | 🔄 Ready |

### Execution Requirements

To execute seeding, the following is needed:

1. **DATABASE_URL environment variable** - Connection string to staging database
2. **Run command:** `pnpm seed:qa-data`
3. **Verify output** - Check registry file and UI

## Previous Assessment (2026-01-23)

> Searched for QA-prefixed test entities and found:
>
> - ❌ **No QA_CUSTOMER entities found** (search returned "No clients found")
> - ⚠️ **QA-prefixed test data does not exist**

This issue is now addressable with the implemented seeding infrastructure.

## Existing Data in Staging

The staging environment has substantial production-like data:

- **Customers**: 100+ customers (Emerald Naturals, Riverside Naturals, etc.)
- **Products**: 7 categories (Pre-Roll, Vape, Edible, Concentrate, Flower, Topical, Tincture)
- **Inventory**: 30,572 units worth $13M+
- **Orders**: Historical order data present
- **Financial**: AR/AP tracking active

## Resolution Path

### To Complete S2 Blocker Resolution

1. **Execute seeding on staging:**

   ```bash
   # With DATABASE_URL set
   pnpm seed:qa-data
   ```

2. **Verify entities created:**
   - Check `docs/qa/qa-data-registry.json` for entity IDs
   - Search for "QA\_" prefix in staging UI

3. **Update this contract status to:** `COMPLETE`

4. **Proceed with Reality Mapper Phase 4-6**

## Script Details

The seeding script (`scripts/seed-qa-data.ts`) provides:

- **Idempotent execution** - Safe to run multiple times
- **Soft delete awareness** - Checks `deletedAt IS NULL`
- **Automatic registry update** - Writes entity IDs to JSON
- **Comprehensive logging** - Shows created vs skipped entities
- **Proper connection handling** - Closes DB connection on success/failure

## Test Data Registry

Primary registry: `docs/qa/qa-data-registry.json`

Registry will be auto-populated with entity IDs when seeding executes:

```json
{
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "locations": [{ "id": number, "site": "QA_LOCATION_*" }],
  "clients": {
    "customers": [{ "id": number, "teriCode": "QA_CUSTOMER_*", "name": "..." }],
    "suppliers": [{ "id": number, "teriCode": "QA_SUPPLIER_*", "name": "..." }]
  },
  "brands": [{ "id": number, "name": "QA_BRAND_*" }],
  "products": [{ "id": number, "name": "QA_PRODUCT_*", "brandId": number }]
}
```

## QA Accounts

Seven QA accounts are available for role-based testing:

| Email                     | Role              |
| ------------------------- | ----------------- |
| qa.superadmin@terp.test   | Super Admin       |
| qa.salesmanager@terp.test | Sales Manager     |
| qa.salesrep@terp.test     | Customer Service  |
| qa.inventory@terp.test    | Inventory Manager |
| qa.fulfillment@terp.test  | Warehouse Staff   |
| qa.accounting@terp.test   | Accountant        |
| qa.auditor@terp.test      | Read-Only Auditor |

Password for all: `TerpQA2026!`

## References

- **Strategy Document:** `docs/qa/TEST_DATA_STRATEGY.md`
- **Seeding Script:** `scripts/seed-qa-data.ts`
- **Registry:** `docs/qa/qa-data-registry.json`
- **7-Day Plan:** `docs/qa/reality-map-2026-01-23/exports/NEXT_7_DAYS_PLAN.md`

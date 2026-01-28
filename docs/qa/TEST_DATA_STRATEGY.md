# QA Test Data Strategy

**Owner:** QA Team
**Last Updated:** 2026-01-28
**Status:** Ready for Execution

## Overview

This document defines the strategy for managing QA test data in TERP environments. The seeding infrastructure has been implemented to create deterministic QA-prefixed test entities that enable automated testing and unblock the Reality Mapper Phase 4-6 execution.

## QA Prefix Convention

All QA test entities MUST use the `QA_` prefix to:

- Distinguish test data from production data
- Enable easy cleanup via prefix-based queries
- Support deterministic testing scenarios
- Prevent accidental deletion of production data

## Entity Naming Standards

| Entity Type | Prefix Pattern  | Examples                                    |
| ----------- | --------------- | ------------------------------------------- |
| Locations   | `QA_LOCATION_*` | `QA_LOCATION_MAIN`, `QA_LOCATION_WAREHOUSE` |
| Customers   | `QA_CUSTOMER_*` | `QA_CUSTOMER_01`, `QA_CUSTOMER_VIP`         |
| Suppliers   | `QA_SUPPLIER_*` | `QA_SUPPLIER_01`, `QA_SUPPLIER_02`          |
| Brands      | `QA_BRAND_*`    | `QA_BRAND_PREMIUM`, `QA_BRAND_STANDARD`     |
| Products    | `QA_PRODUCT_*`  | `QA_PRODUCT_FLOWER_A`, `QA_PRODUCT_VAPE`    |

## Seeding Infrastructure

### Seeding Script

**Location:** `scripts/seed-qa-data.ts`

The seeding script creates the following deterministic entities:

#### Locations (5 entities)

| Site Name               | Zone      | Purpose                     |
| ----------------------- | --------- | --------------------------- |
| `QA_LOCATION_MAIN`      | Zone-A    | Primary warehouse testing   |
| `QA_LOCATION_WAREHOUSE` | Zone-B    | Secondary warehouse testing |
| `QA_LOCATION_COLD`      | Cold-Zone | Cold storage testing        |
| `QA_LOCATION_STAGING`   | Staging   | Order staging area          |
| `QA_LOCATION_RETURNS`   | Returns   | Returns processing          |

#### Customers (5 entities)

| Teri Code            | Name                     | Purpose                   |
| -------------------- | ------------------------ | ------------------------- |
| `QA_CUSTOMER_01`     | QA Test Dispensary Alpha | Standard customer testing |
| `QA_CUSTOMER_02`     | QA Test Retail Beta      | Retail customer testing   |
| `QA_CUSTOMER_03`     | QA Test Wholesale Gamma  | Wholesale testing         |
| `QA_CUSTOMER_CREDIT` | QA Test Credit Customer  | Credit limit testing      |
| `QA_CUSTOMER_VIP`    | QA Test VIP Customer     | VIP portal testing        |

#### Suppliers (3 entities)

| Teri Code        | Name                       | Purpose               |
| ---------------- | -------------------------- | --------------------- |
| `QA_SUPPLIER_01` | QA Test Farm Delta         | Farm supplier testing |
| `QA_SUPPLIER_02` | QA Test Cultivator Epsilon | Cultivator testing    |
| `QA_SUPPLIER_03` | QA Test Manufacturer Zeta  | Manufacturer testing  |

#### Brands (3 entities)

| Name                | Description                   |
| ------------------- | ----------------------------- |
| `QA_BRAND_PREMIUM`  | Premium tier product testing  |
| `QA_BRAND_STANDARD` | Standard tier product testing |
| `QA_BRAND_BUDGET`   | Budget tier product testing   |

#### Products (6 entities)

| Name                     | Category     | Subcategory |
| ------------------------ | ------------ | ----------- |
| `QA_PRODUCT_FLOWER_A`    | Flower       | Indoor      |
| `QA_PRODUCT_FLOWER_B`    | Flower       | Outdoor     |
| `QA_PRODUCT_PREROLL`     | Pre-Roll     | Singles     |
| `QA_PRODUCT_EDIBLE`      | Edibles      | Gummies     |
| `QA_PRODUCT_CONCENTRATE` | Concentrates | Wax         |
| `QA_PRODUCT_VAPE`        | Vapes        | Cartridges  |

### Execution Procedure

#### Initial Setup

```bash
# Run seeding script (requires DATABASE_URL environment variable)
pnpm seed:qa-data
```

#### Verification Steps

1. **Check registry file:**

   ```bash
   cat docs/qa/qa-data-registry.json
   ```

2. **Verify entities in UI:**
   - Navigate to staging environment
   - Search for "QA\_" prefix in each entity type
   - Confirm expected counts match

3. **Test with QA accounts:**
   - Login with each QA role
   - Verify access to QA entities

### Script Characteristics

- **Idempotent:** Safe to run multiple times
- **Soft Delete Aware:** Checks for `deletedAt IS NULL`
- **Registry Output:** Updates `docs/qa/qa-data-registry.json`
- **Connection Handling:** Proper cleanup on success or failure

## Data Registry

### Primary Registry Location

**File:** `docs/qa/qa-data-registry.json`

This file contains all created QA entity IDs and is updated automatically by the seeding script.

### Registry Structure

```json
{
  "createdAt": "2026-01-28T12:00:00.000Z",
  "updatedAt": "2026-01-28T12:00:00.000Z",
  "locations": [{ "id": 123, "site": "QA_LOCATION_MAIN" }],
  "clients": {
    "customers": [
      {
        "id": 456,
        "teriCode": "QA_CUSTOMER_01",
        "name": "QA Test Dispensary Alpha"
      }
    ],
    "suppliers": [
      { "id": 789, "teriCode": "QA_SUPPLIER_01", "name": "QA Test Farm Delta" }
    ]
  },
  "brands": [{ "id": 101, "name": "QA_BRAND_PREMIUM" }],
  "products": [{ "id": 201, "name": "QA_PRODUCT_FLOWER_A", "brandId": 101 }]
}
```

### Legacy Registry (Reality Map)

**File:** `docs/qa/reality-map-2026-01-23/test-data/test_data_registry.json`

This registry was created during the Reality Map analysis phase and notes the missing QA data. It will be updated once seeding is complete.

## Data Cleanup Policy

### When to Reset

- After major schema changes
- Before release testing cycles
- When test data becomes corrupted
- On request from QA team
- Before each Reality Mapper execution

### How to Reset

```bash
# Delete all QA entities (use soft delete)
UPDATE locations SET deleted_at = NOW() WHERE site LIKE 'QA_%';
UPDATE clients SET deleted_at = NOW() WHERE teri_code LIKE 'QA_%';
UPDATE brands SET deleted_at = NOW() WHERE name LIKE 'QA_%';
UPDATE products SET deleted_at = NOW() WHERE nameCanonical LIKE 'QA_%';

# Re-run seeding
pnpm seed:qa-data
```

### Hard Reset (Use with Caution)

```bash
# Only use when absolutely necessary
DELETE FROM products WHERE nameCanonical LIKE 'QA_%';
DELETE FROM brands WHERE name LIKE 'QA_%';
DELETE FROM clients WHERE teri_code LIKE 'QA_%';
DELETE FROM locations WHERE site LIKE 'QA_%';

# Re-run seeding
pnpm seed:qa-data
```

## QA Test Accounts

### Account Credentials

All QA accounts use password: `TerpQA2026!`

| Email                       | Role              | Permissions             |
| --------------------------- | ----------------- | ----------------------- |
| `qa.superadmin@terp.test`   | Super Admin       | Full system access      |
| `qa.salesmanager@terp.test` | Sales Manager     | Sales team management   |
| `qa.salesrep@terp.test`     | Customer Service  | Order and client access |
| `qa.inventory@terp.test`    | Inventory Manager | Inventory management    |
| `qa.fulfillment@terp.test`  | Warehouse Staff   | Fulfillment operations  |
| `qa.accounting@terp.test`   | Accountant        | Financial access        |
| `qa.auditor@terp.test`      | Read-Only Auditor | Read-only system access |

### Account Seeding

```bash
# Seed QA accounts (if not already created)
pnpm seed:qa-accounts
```

### Environment Configuration

QA authentication must be enabled in the environment:

```bash
# .env
QA_AUTH_ENABLED=true
```

## Integration with Reality Mapper

### Blocked Charters

Without QA test data, the following are blocked:

- 146 P0 CLIENT_WIRED charters
- Automated browser-based testing
- Golden Flows validation
- Regression testing automation

### Unblocking Procedure

1. Run `pnpm seed:qa-data` on staging
2. Verify registry contains entity IDs
3. Update test_data_contract.md status to COMPLETE
4. Proceed with Reality Mapper Phase 4-6

## Best Practices

### For Test Authors

1. **Always use QA entities** - Never use production-like data for automated tests
2. **Reference by teriCode/name** - Use prefixed identifiers, not raw IDs
3. **Clean up after tests** - Soft delete any entities created during tests
4. **Document mutations** - If tests modify QA entities, document expected state

### For Seeding Maintenance

1. **Run in non-production** - Never run seeding in production
2. **Verify before commit** - Ensure registry is updated correctly
3. **Version control registry** - Commit registry changes with script changes
4. **Test idempotency** - Run script twice to verify no duplicates

## References

- **Seeding Script:** `scripts/seed-qa-data.ts`
- **QA Account Seeding:** `server/db/seed/qaAccounts.ts`
- **Reality Map:** `docs/qa/reality-map-2026-01-23/README.md`
- **7-Day Plan:** `docs/qa/reality-map-2026-01-23/exports/NEXT_7_DAYS_PLAN.md`
- **Test Data Contract:** `docs/qa/reality-map-2026-01-23/test-data/test_data_contract.md`

## Changelog

| Date       | Change                                     | Author       |
| ---------- | ------------------------------------------ | ------------ |
| 2026-01-28 | Initial strategy document created          | Claude Agent |
| 2026-01-28 | Seeding infrastructure ready for execution | Claude Agent |

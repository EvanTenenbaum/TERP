# VERIFY-DATA-010: Schema Validation Deployment Verification

## Task

Verify that the DATA-010 Schema Validation System has been successfully deployed to production.

## Database Credentials

```
Host: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com
Port: 25060
Username: doadmin
Password: AVNS_Q_RGkS7-uB3Bk7xC2am
Database: defaultdb
SSL: Required
```

---

## Verification Checklist

### 1. Database Schema Verification

Connect to the production database and run:

```sql
-- Check inventoryMovements table structure
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'inventoryMovements'
  AND COLUMN_NAME IN ('notes', 'adjustmentReason', 'reason')
ORDER BY ORDINAL_POSITION;
```

**Expected Results:**
| COLUMN_NAME | DATA_TYPE | Present? |
|-------------|-----------|----------|
| notes | text | ✅ YES |
| adjustmentReason | enum | ✅ YES |
| reason | - | ❌ NO (renamed to notes) |

```sql
-- Check orderStatusHistory has deleted_at
SELECT COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'order_status_history'
  AND COLUMN_NAME = 'deleted_at';
```

**Expected:** One row showing `deleted_at` column exists.

---

### 2. Run Schema Validation Script

```bash
pnpm tsx scripts/validate-schema-sync.ts
```

**Expected Output:**
```
✅ inventoryMovements.notes exists
✅ inventoryMovements.adjustmentReason exists
✅ inventoryMovements.inventoryMovementType exists
✅ Schema is in sync!
```

---

### 3. API Endpoint Verification

Test the inventory adjustment endpoint accepts the new `adjustmentReason` parameter:

```bash
# Get an auth token first, then:
curl -X POST https://[YOUR-API-URL]/trpc/inventoryMovements.adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "batchId": 1,
      "newQuantity": "100",
      "reason": "Verification test",
      "adjustmentReason": "COUNT_DISCREPANCY"
    }
  }'
```

**Expected:** 200 OK response (or appropriate error if batch doesn't exist - NOT a schema/type error)

---

### 4. Verify Data Integrity

```sql
-- Check existing inventory movements are accessible
SELECT COUNT(*) as total_movements FROM inventoryMovements;

-- Check recent movements have notes populated (previously reason)
SELECT id, batchId, inventoryMovementType, notes, adjustmentReason, createdAt
FROM inventoryMovements
ORDER BY createdAt DESC
LIMIT 5;
```

**Expected:**
- Count should return existing records (not zero unless fresh DB)
- Recent records should show `notes` field populated
- `adjustmentReason` may be NULL for historical records (expected)

---

## Success Criteria

All of the following must be true:

- [ ] `inventoryMovements.notes` column exists (TEXT)
- [ ] `inventoryMovements.adjustmentReason` column exists (ENUM)
- [ ] `inventoryMovements.reason` column does NOT exist (was renamed)
- [ ] `order_status_history.deleted_at` column exists
- [ ] Schema validation script passes
- [ ] API accepts `adjustmentReason` parameter without error
- [ ] Existing data is accessible and intact

---

## If Verification Fails

1. **Missing columns:** Migration not applied. Run:
   ```sql
   ALTER TABLE inventoryMovements
   ADD COLUMN adjustmentReason ENUM('DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_DISCREPANCY', 'QUALITY_ISSUE', 'REWEIGH', 'OTHER') AFTER referenceId;

   ALTER TABLE inventoryMovements
   CHANGE COLUMN reason notes TEXT;
   ```

2. **API errors:** Code not deployed. Check deployment status.

3. **Data missing:** Check for database connectivity issues.

---

## Report Format

After verification, report:

```
DATA-010 Deployment Verification Report
========================================
Date: [DATE]
Environment: Production

Database Schema:
- inventoryMovements.notes: [PASS/FAIL]
- inventoryMovements.adjustmentReason: [PASS/FAIL]
- order_status_history.deleted_at: [PASS/FAIL]

Validation Script: [PASS/FAIL]
API Endpoint: [PASS/FAIL]
Data Integrity: [PASS/FAIL]

Overall Status: [DEPLOYED/FAILED]
Notes: [Any issues found]
```

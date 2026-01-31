# Inventory Audit

Verify inventory display and valuation is working correctly.

## Known TERP Inventory Issues

These bugs have recurred multiple times:
1. **$0 Cost Display** - Status filter enum mismatch causes wrong batches to load
2. **"No inventory found"** - Restrictive filters persisted in localStorage
3. **Quantity Mismatch** - Frontend shows different count than DB

## Pre-Flight

```bash
git pull origin main
```

## Execution

### 1. Check API Response

```bash
# Test inventory endpoint directly
curl -s "https://terp-app-b9s35.ondigitalocean.app/api/trpc/inventory.list?batch=1&input=%7B%7D" \
  -H "Cookie: [session cookie]" | jq '.result.data | length'
```

### 2. Check Database State

```bash
# Count batches by status (run via pnpm db:studio or direct query)
echo "SELECT status, COUNT(*) as count FROM inventory_batches WHERE deleted_at IS NULL GROUP BY status;"
```

### 3. Scan for Status Filter Issues

```bash
echo "=== STATUS FILTER CODE PATHS ==="

echo "--- inventoryStatus enum definition ---"
grep -A10 "inventoryStatus" drizzle/schema/inventory.ts

echo "--- Status filter in router ---"
grep -B5 -A10 "status.*filter\|filter.*status" server/routers/inventory*.ts

echo "--- Frontend filter state ---"
grep -rn "inventoryStatus\|statusFilter\|defaultFilter" client/src/ --include="*.tsx" --include="*.ts" | head -20

echo "--- localStorage filter persistence ---"
grep -rn "localStorage.*filter\|filter.*localStorage" client/src/ --include="*.tsx" | head -10
```

### 4. Check Cost Calculation

```bash
echo "=== COST CALCULATION CODE ==="
grep -rn "unitCost\|totalCost\|costPerUnit\|valuationMethod" server/ --include="*.ts" | head -30
```

### 5. Verify Schema Alignment

```bash
echo "=== INVENTORY BATCH SCHEMA ==="
grep -A50 "inventoryBatches = " drizzle/schema/inventory.ts | head -60
```

## Output Format

```
INVENTORY AUDIT REPORT
======================
Date: [ISO 8601]

API STATUS
----------
- Endpoint reachable: YES/NO
- Batches returned: X
- Expected (from DB): Y

KNOWN BUG PATTERN CHECK
-----------------------
1. $0 Cost Display:
   - Status enum alignment: OK/MISMATCH
   - Filter enum values: [list]

2. "No inventory found":
   - localStorage filter code: [present/absent]
   - Default filter value: [value]

3. Quantity Mismatch:
   - Schema quantity field: [field name]
   - Router quantity field: [field name]
   - Match: YES/NO

CODE ISSUES FOUND
-----------------
[List any problems discovered]

RECOMMENDATIONS
---------------
[Specific fixes needed]
```

## Post-Audit

```bash
echo "[$(date -Iseconds)] Inventory audit: API returned X batches, Y issues found" >> .claude/audit-history.log
```

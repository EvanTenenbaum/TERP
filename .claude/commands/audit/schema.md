# Schema Audit

Run a comprehensive schema audit to detect TERP-specific issues.

## Pre-Flight

```bash
git pull origin main
git status
```

## Execution

### 1. Run Schema Tests
```bash
pnpm test:schema 2>&1 || true
```

### 2. Scan for mysqlEnum Naming Issues
The first argument to mysqlEnum MUST match the database column name.

```bash
# Find all mysqlEnum declarations and check naming
grep -rn "mysqlEnum(" drizzle/schema/ --include="*.ts" | head -50
```

### 3. Scan for Forbidden Patterns

```bash
echo "=== P0 AUTO-REJECT PATTERNS ==="

echo "--- Fallback User IDs (FORBIDDEN) ---"
grep -rn "ctx\.user??\.id \|\| 1\|ctx\.user??\.id ?? 1" server/ client/ --include="*.ts" --include="*.tsx" || echo "None found"

echo "--- Actor From Input (FORBIDDEN) ---"
grep -rn "input\.createdBy\|input\.userId" server/routers/ --include="*.ts" || echo "None found"

echo "--- Any Types (FORBIDDEN) ---"
grep -rn ": any\b" server/ client/src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -20 || echo "None found"

echo "--- Hard Deletes (WARNING) ---"
grep -rn "db\.delete(" server/ --include="*.ts" || echo "None found"

echo "--- Vendors Table Usage (DEPRECATED) ---"
grep -rn "db\.query\.vendors\|from vendors\|vendors\." server/ --include="*.ts" | grep -v "// DEPRECATED" || echo "None found"

echo "--- vendorId References (DEPRECATED) ---"
grep -rn "vendorId\|vendor_id" server/ drizzle/ --include="*.ts" | grep -v "legacyVendorId\|supplierClientId" | head -20 || echo "None found"
```

### 4. Check Enum Alignment

```bash
# List all status enums and their values
grep -A5 "mysqlEnum.*status" drizzle/schema/*.ts
```

## Output Format

Report findings using this structure:

```
SCHEMA AUDIT REPORT
==================
Date: [ISO 8601]
Branch: [current branch]

FORBIDDEN PATTERNS (P0 - Block Merge)
-------------------------------------
[List each finding with file:line and code snippet]

DEPRECATED PATTERNS (P1 - Fix Soon)
-----------------------------------
[List each finding]

ENUM ALIGNMENT ISSUES
--------------------
[List any mismatches between enum names and column names]

mysqlEnum VALIDATION
-------------------
[List any mysqlEnum where first arg doesn't match column name]

SUMMARY
-------
- P0 Blockers: X
- P1 Issues: Y
- Enum Mismatches: Z
```

## Post-Audit

If issues found, create a tracking entry:

```bash
# Record in audit history
echo "[$(date -Iseconds)] Schema audit found X P0, Y P1 issues" >> .claude/audit-history.log
```

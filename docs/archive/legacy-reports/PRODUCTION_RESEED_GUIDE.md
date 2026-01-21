# Production Re-Seeding Guide

**Purpose:** Apply the improved seeding generators to the production database while preserving the 12,762 existing strain records.

---

## ⚠️ Important Notes

1. **Strains will be PRESERVED** - The 12,762 existing strain records will NOT be touched
2. **All other data will be CLEARED** - Clients, products, orders, invoices, batches, lots, returns will be deleted and regenerated
3. **This is SAFE for test/demo environments** - Do NOT run if there is real business data
4. **Backup recommended** - Although this is test data, a backup is always good practice

---

## What Will Change

### ✅ Preserved (NOT touched)

- **Strains:** 12,762 records (real data)
- **Brands:** Existing brand records
- **Users:** Existing user accounts

### 🔄 Cleared and Regenerated

- **Clients:** 68 → ~100 (with CA addresses, cannabis-themed names)
- **Products:** 560 → ~200 (mapped to existing strains)
- **Orders:** 4,401 → ~4,400 (with Pareto distribution)
- **Batches:** All (regenerated with new inventory)
- **Lots:** All (regenerated)
- **Invoices:** All (regenerated)
- **Returns:** All (regenerated)

---

## Improvements Applied

### 1. Client Data (Task 2)

- ✅ California-focused addresses (LA, SF, SD, Oakland, Sacramento)
- ✅ Cannabis-themed business names (Emerald, Pacific, Coastal, etc.)
- ✅ Industry-specific company types (Dispensary, Collective, Wellness)

### 2. Order Diversity (Task 1)

- ✅ Pareto distribution (80/20 rule) - popular products dominate
- ✅ Long-tail item counts (most orders 2-5 items)
- ✅ Realistic B2B quantities

### 3. Data Anomalies (Task 3)

- ✅ Margin outliers (high and low)
- ✅ Small and large order edge cases
- ✅ "Chaos scenario" for robust testing

### 4. Schema Fixes (Task 0)

- ✅ Correct boolean types for `is_buyer`, `is_seller`, `is_brand`
- ✅ Proper JSON array for `tags`

---

## How to Execute

### Step 1: Set Production Database URL

```bash
export DATABASE_URL="mysql://doadmin:<REDACTED>@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl={\"rejectUnauthorized\":true}"
```

### Step 2: Run the Re-Seeding Script

```bash
cd /home/ubuntu/TERP
pnpm reseed:prod
```

### Step 3: Verify Results

```bash
# Check counts
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=<REDACTED> \
      --database=defaultdb \
      --ssl-mode=REQUIRED \
      -e "SELECT 'strains' as table_name, COUNT(*) as count FROM strains
          UNION ALL SELECT 'clients', COUNT(*) FROM clients
          UNION ALL SELECT 'products', COUNT(*) FROM products
          UNION ALL SELECT 'orders', COUNT(*) FROM orders;"

# Check client data quality (should see CA cities)
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=<REDACTED> \
      --database=defaultdb \
      --ssl-mode=REQUIRED \
      -e "SELECT name, address FROM clients LIMIT 10;"
```

---

## Expected Output

```
🔄 TERP Production Re-Seeding (Safe Mode)
============================================================
⚠️  This will clear and re-seed production data
✅ Strains will be PRESERVED (12,762 records)
============================================================

🗑️  Clearing old data...
   ✓ Cleared returns
   ✓ Cleared invoices
   ✓ Cleared orders
   ✓ Cleared batches
   ✓ Cleared lots
   ✓ Cleared products
   ✓ Cleared clients
   ✅ Old data cleared (strains preserved)

🌿 Verified: 12762 strains preserved

👥 Generating improved clients (CA-focused, cannabis-themed)...
   ✓ 100 clients generated
   ✅ Clients inserted

📦 Generating products (using existing strains)...
   ✓ 200 products generated

📦 Generating inventory...
   ✓ 150 lots generated
   ✓ 4500 batches generated

📋 Generating orders (with Pareto distribution)...
   ✓ 4400 orders generated

💰 Generating invoices...
   ✓ 3200 invoices generated

↩️  Generating returns...
   ✓ 120 returns generated

============================================================
✅ Production re-seeding complete!
============================================================
🌿 Strains: 12762 (preserved)
👥 Clients: 100 (new, CA-focused)
📦 Products: 200 (new)
📦 Batches: 4500 (new)
📋 Orders: 4400 (new, Pareto distribution)
💰 Invoices: 3200 (new)
↩️  Returns: 120 (new)
============================================================
```

---

## Rollback Plan

If something goes wrong, you can restore from a backup:

```bash
# Create backup BEFORE re-seeding
mysqldump --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
          --port=25060 \
          --user=doadmin \
          --password=<REDACTED> \
          --database=defaultdb \
          --ssl-mode=REQUIRED \
          > backup_before_reseed_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=<REDACTED> \
      --database=defaultdb \
      --ssl-mode=REQUIRED \
      < backup_before_reseed_YYYYMMDD_HHMMSS.sql
```

---

## Timeline

- **Backup:** ~2-3 minutes
- **Re-seeding:** ~5-10 minutes
- **Verification:** ~1 minute
- **Total:** ~10-15 minutes

---

## Ready to Execute?

**Before proceeding, confirm:**

- [ ] This is a test/demo environment (not real business data)
- [ ] You have reviewed what will be cleared and regenerated
- [ ] You understand that strains will be preserved
- [ ] You have time for the 10-15 minute process

**To execute:**

```bash
# From the sandbox
cd /home/ubuntu/TERP
export DATABASE_URL="mysql://doadmin:<REDACTED>@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl={\"rejectUnauthorized\":true}"
pnpm reseed:prod
```

---

**Questions or concerns?** Review the script at `scripts/reseed-production-safe.ts` before executing.

# TERP Matchmaking Service - Deployment Guide

**Version:** 1.0.0
**Date:** 2025-10-31
**Branch:** `claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx`

## Overview

This guide covers the deployment of the TERP Matchmaking Service, a comprehensive system for automatically matching client needs with available inventory and vendor supplies.

**Implementation Status:**

- ✅ Phase 1: CRITICAL matching engine improvements (Days 1-5)
- ✅ Phase 2: Enhanced features (Days 6-10)
- ✅ Phase 3: Numbered variant matching (Day 11)
- ✅ Phase 4: QA and Documentation

---

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [x] All 180 tests passing (100% pass rate)
- [x] 0 ESLint warnings on modified files
- [x] TypeScript compilation clean for backend
- [x] Git history clean with descriptive commits

### 2. Database Preparation

- [ ] **CRITICAL:** Review migration file `drizzle/0020_add_strain_type.sql`
- [ ] Backup production database before migration
- [ ] Test migration on staging environment first
- [ ] Verify indexes created successfully

### 3. Environment Setup

- [ ] Verify Node.js version >= 18.0.0
- [ ] Install dependencies: `npm install`
- [ ] Run database migrations: `npm run db:push` or manually apply `0020_add_strain_type.sql`

---

## Database Migration

### Migration File: `0020_add_strain_type.sql`

**What it does:**

- Adds `strain_type` ENUM column to `client_needs` table
- Adds `strain_type` ENUM column to `vendor_supply` table
- Creates indexes on both `strain_type` columns

**SQL Script:**

```sql
ALTER TABLE `client_needs`
ADD COLUMN `strain_type` enum('INDICA','SATIVA','HYBRID','CBD','ANY')
AFTER `strainId`;

ALTER TABLE `vendor_supply`
ADD COLUMN `strain_type` enum('INDICA','SATIVA','HYBRID','CBD')
AFTER `strain`;

CREATE INDEX `idx_strain_type_cn` ON `client_needs`(`strain_type`);
CREATE INDEX `idx_strain_type_vs` ON `vendor_supply`(`strain_type`);
```

**Migration Steps:**

1. **Backup Database:**

   ```bash
   # MySQL backup command
   mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply Migration (Option A - Drizzle):**

   ```bash
   npm run db:push
   ```

3. **Apply Migration (Option B - Manual):**

   ```bash
   mysql -u [username] -p [database_name] < drizzle/0020_add_strain_type.sql
   ```

4. **Verify Migration:**

   ```sql
   -- Check columns exist
   DESCRIBE client_needs;
   DESCRIBE vendor_supply;

   -- Check indexes exist
   SHOW INDEX FROM client_needs WHERE Key_name = 'idx_strain_type_cn';
   SHOW INDEX FROM vendor_supply WHERE Key_name = 'idx_strain_type_vs';
   ```

**Rollback Plan:**

```sql
ALTER TABLE `client_needs` DROP COLUMN `strain_type`;
ALTER TABLE `vendor_supply` DROP COLUMN `strain_type`;
```

---

## Deployment Steps

### Step 1: Pull Latest Code

```bash
git checkout claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx
git pull origin claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Tests

```bash
npm test
```

**Expected output:**

```
Test Files  8 passed (8)
Tests  180 passed (180)
```

### Step 4: Build Frontend

```bash
npm run build
```

### Step 5: Apply Database Migration

See "Database Migration" section above.

### Step 6: Restart Services

```bash
# Stop existing services
pm2 stop terp-server

# Start with new code
pm2 start terp-server
pm2 save
```

### Step 7: Verify Deployment

1. **Check Server Health:**

   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Verify Matchmaking Endpoints:**
   - Navigate to `/matchmaking` in browser
   - Check Dashboard for "Matchmaking Opportunities" widget
   - View Client Profile and verify "Purchase Patterns" widget
   - View Batch Detail and verify "Potential Buyers" widget

3. **Test Matching Logic:**
   - Create a test client need
   - Verify matches are found
   - Check strain alias matching (e.g., "GSC" matches "Girl Scout Cookies")
   - Check variant matching (e.g., "Blue Dream" matches "Blue Dream #5")

---

## Post-Deployment Validation

### Functional Testing

**Test 1: Strain Alias Matching**

```
1. Create client need: strain = "GSC"
2. Create vendor supply: strain = "Girl Scout Cookies"
3. Verify match is found with high confidence
```

**Test 2: Variant Matching**

```
1. Create client need: strain = "Blue Dream"
2. Create vendor supply: strain = "Blue Dream #5"
3. Verify match is found
4. Create another supply: strain = "Blue Dream #6"
5. Verify BOTH variants match the generic "Blue Dream" need
```

**Test 3: Strain Type Matching**

```
1. Create client need: strainType = "INDICA"
2. Create vendor supply: strainType = "INDICA"
3. Verify +15 confidence bonus in match
```

**Test 4: Predictive Reorders**

```
1. Navigate to Client Profile
2. View "Purchase Patterns" tab
3. Verify "Reorder Predictions" shows clients with recurring orders
4. Check overdue predictions are highlighted in red
```

### Performance Testing

- **Matching Speed:** Match generation should complete in < 2 seconds
- **Widget Load Time:** Dashboard widgets should load in < 1 second
- **Test Coverage:** 180/180 tests passing

---

## Rollback Procedure

If issues are encountered:

### 1. Revert Code

```bash
git checkout [previous-stable-commit]
git push origin claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx --force
```

### 2. Rollback Database

```sql
ALTER TABLE `client_needs` DROP COLUMN `strain_type`;
ALTER TABLE `vendor_supply` DROP COLUMN `strain_type`;
```

### 3. Restore Backup (if needed)

```bash
mysql -u [username] -p [database_name] < backup_[timestamp].sql
```

### 4. Restart Services

```bash
pm2 restart terp-server
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Match Generation Success Rate**
   - Target: > 95% of needs find at least one match
   - Alert if < 80%

2. **API Response Times**
   - Endpoint: `/api/trpc/matching.getAllActiveNeedsWithMatches`
   - Target: < 2 seconds
   - Alert if > 5 seconds

3. **Prediction Accuracy**
   - Monitor reorder predictions vs actual orders
   - Target: 70%+ accuracy for high-confidence predictions

4. **Error Rates**
   - Monitor for tRPC errors in matching endpoints
   - Alert if error rate > 1%

### Logging

Key events to log:

- Successful match generation
- Failed match attempts
- Prediction calculations
- Database migration status

---

## Troubleshooting

### Issue: Matches Not Appearing

**Symptoms:** Client needs show 0 matches despite available inventory

**Diagnosis:**

1. Check if `strain` fields are populated
2. Verify `strainType` values are valid ENUMs
3. Check confidence threshold (default: 50)

**Solution:**

```sql
-- Check for NULL strains
SELECT COUNT(*) FROM client_needs WHERE strain IS NULL;
SELECT COUNT(*) FROM vendor_supply WHERE strain IS NULL;

-- Check strain type values
SELECT DISTINCT strainType FROM client_needs;
SELECT DISTINCT strainType FROM vendor_supply;
```

### Issue: Variant Matching Not Working

**Symptoms:** "Blue Dream #5" doesn't match "Blue Dream"

**Diagnosis:**

1. Check strain normalization is working
2. Verify `strainsMatch()` function is being used

**Test:**

```typescript
import { strainsMatch } from "./server/utils/strainAliases";

console.log(strainsMatch("Blue Dream", "Blue Dream #5")); // Should be TRUE
console.log(strainsMatch("Blue Dream #5", "Blue Dream #6")); // Should be FALSE
```

### Issue: Slow Match Generation

**Symptoms:** Matching takes > 5 seconds

**Diagnosis:**

1. Check database indexes exist
2. Verify no N+1 query issues
3. Check data volume

**Solution:**

```sql
-- Verify indexes
SHOW INDEX FROM client_needs;
SHOW INDEX FROM vendor_supply;
SHOW INDEX FROM batches;

-- Check query performance
EXPLAIN SELECT * FROM client_needs WHERE strainType = 'INDICA';
```

---

## Feature Flags (Optional)

If you want to gradually roll out features:

```typescript
// server/config.ts
export const FEATURE_FLAGS = {
  STRAIN_TYPE_MATCHING: true,
  VARIANT_MATCHING: true,
  PREDICTIVE_REORDERS: true,
  MATCHMAKING_WIDGETS: true,
};
```

Disable specific features by setting to `false`.

---

## Support & Contact

**Implementation Branch:** `claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx`

**Key Files:**

- Matching Engine: `server/matchingEngine.ts`, `server/matchingEngineEnhanced.ts`
- Strain Normalization: `server/utils/strainAliases.ts`
- Predictive Analytics: `server/historicalAnalysis.ts`
- UI Components: `client/src/components/**/Matchmaking*.tsx`

**Documentation:**

- `MATCHMAKING_IMPLEMENTATION_SUMMARY.md` - Technical overview
- `MATCHMAKING_FINAL_REPORT.md` - Comprehensive feature documentation
- This file - Deployment guide

---

## Success Criteria

Deployment is successful when:

- [x] All 180 tests passing
- [ ] Database migration applied without errors
- [ ] Matchmaking page loads successfully
- [ ] Dashboard widgets display data
- [ ] At least one successful match generated
- [ ] No console errors in browser
- [ ] Server logs show no critical errors

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch for any errors or performance issues
2. **Gather user feedback** - Have sales team test the matchmaking interface
3. **Fine-tune confidence thresholds** - Adjust based on match quality
4. **Enable additional features** - Consider enabling more advanced scoring

**Congratulations on deploying the TERP Matchmaking Service! 🎉**

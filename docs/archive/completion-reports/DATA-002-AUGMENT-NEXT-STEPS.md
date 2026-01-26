# DATA-002-AUGMENT: Next Steps & Resolution Plan

## Current Status Summary

**Task:** DATA-002-AUGMENT - Augment Seeded Data for Realistic Relationships  
**Status:** ⚠️ IN PROGRESS (Partially Complete)  
**Completion:** 2/6 scripts executed successfully (33%)

### Completed ✅

1. ✅ `fix-temporal-coherence.ts` - Temporal date fixes applied
2. ✅ `augment-orders.ts` - 100 orders augmented with line items

### Pending ⚠️

3. ⚠️ `augment-inventory-movements.ts` - Needs stable connection
4. ⚠️ `augment-financial-chains.ts` - Needs stable connection
5. ⚠️ `augment-client-relationships.ts` - Needs stable connection
6. ⚠️ `validate-data-quality.ts` - Needs full execution

---

## Blockers Identified

### Blocker 1: API Endpoint Not Loading

**Issue:** `adminDataAugmentRouter` returns 404 in production  
**Root Cause:** Router not being registered/loaded in production build  
**Evidence:**

- Router code exists and is properly imported in `server/routers.ts`
- Deployment completes successfully
- Endpoint returns 404: "No procedure found on path"
- Other routers (e.g., `settings.seedDatabase`) work correctly

**Investigation Needed:**

- Check production build logs for TypeScript/import errors
- Verify router is included in production bundle
- Check if there's a runtime error preventing router registration

### Blocker 2: DigitalOcean Job Execution

**Issue:** `doctl apps create-job-run` command doesn't exist  
**Root Cause:** DigitalOcean CLI doesn't support manual job execution via command line  
**Evidence:**

- Job is configured in `.do/app.yaml`
- Job appears in app spec
- No `create-job-run` command in doctl CLI

**Workaround:**

- Use DigitalOcean web console to manually trigger job
- Or use DigitalOcean API directly

---

## Resolution Options

### Option 1: Fix API Endpoint (Recommended)

**Steps:**

1. Check production build logs for errors:
   ```bash
   doctl apps logs <app-id> --type build --tail 200 | grep -i "error\|adminDataAugment"
   ```
2. Verify router export:
   - Check `server/routers/adminDataAugment.ts` exports correctly
   - Verify import in `server/routers.ts` is correct
   - Check for circular dependencies
3. Test locally:
   ```bash
   pnpm build
   pnpm start
   curl http://localhost:3000/api/trpc/adminDataAugment.getStatus
   ```
4. If working locally, check production environment differences
5. Once fixed, run: `pnpm tsx scripts/monitor-and-run-augmentation.ts`

**Estimated Time:** 1-2 hours

### Option 2: Use DigitalOcean Console

**Steps:**

1. Go to: https://cloud.digitalocean.com/apps
2. Select TERP app
3. Navigate to "Jobs" tab
4. Find "augment-data" job
5. Click "Run" button
6. Monitor execution in logs

**Estimated Time:** 15 minutes (manual)

### Option 3: Direct Server Execution

**Steps:**

1. Obtain SSH access to production server (if available)
2. Navigate to app directory
3. Pull latest code: `git pull origin main`
4. Run scripts: `pnpm augment:data`
5. Monitor execution

**Estimated Time:** 30 minutes (if SSH access available)

### Option 4: Use DigitalOcean API

**Steps:**

1. Get API token from DigitalOcean
2. Use API to trigger job:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $DO_TOKEN" \
     -H "Content-Type: application/json" \
     "https://api.digitalocean.com/v2/apps/<app-id>/jobs/<job-id>/runs"
   ```
3. Monitor via API or console

**Estimated Time:** 30 minutes

---

## Recommended Action Plan

### Immediate (Next 1-2 hours)

1. **Investigate API endpoint issue**
   - Check build logs for errors
   - Verify router is properly exported/imported
   - Test locally to confirm functionality

2. **If API fix is complex, use Option 2 (Console)**
   - Quickest path to completion
   - No code changes needed
   - Can execute immediately

### Short-term (Next 24 hours)

3. **Complete remaining scripts execution**
   - Run via chosen method
   - Monitor execution
   - Verify results

4. **Run validation suite**
   - Execute `validate-data-quality.ts`
   - Review results
   - Address any issues found

### Follow-up

5. **Fix API endpoint for future use**
   - Resolve router loading issue
   - Test thoroughly
   - Document solution

---

## Files Created/Modified

### Scripts

- ✅ `scripts/audit-data-relationships.ts` - Referential integrity audit
- ✅ `scripts/fix-temporal-coherence.ts` - Temporal fixes
- ✅ `scripts/augment-orders.ts` - Order augmentation
- ✅ `scripts/augment-inventory-movements.ts` - Inventory linking
- ✅ `scripts/augment-financial-chains.ts` - Financial chains
- ✅ `scripts/augment-client-relationships.ts` - Client relationships
- ✅ `scripts/validate-data-quality.ts` - Validation suite
- ✅ `scripts/monitor-and-run-augmentation.ts` - Monitoring script
- ✅ `scripts/run-augmentation-via-api.ts` - API client script

### Server Code

- ✅ `server/routers/adminDataAugment.ts` - API endpoint router
- ✅ `server/routers.ts` - Router registration

### Configuration

- ✅ `.do/app.yaml` - DigitalOcean job configuration

### Documentation

- ✅ `docs/DATA-002-AUGMENT-EXECUTION-STATUS.md` - Execution status
- ✅ `docs/DATA-002-AUGMENT-RUN-FROM-STABLE-CONNECTION.md` - Connection guide
- ✅ `docs/DATA-002-AUGMENT-NEXT-STEPS.md` - This file

---

## Success Criteria

Task will be complete when:

- [ ] All 6 scripts execute successfully
- [ ] Validation suite passes all checks
- [ ] Data relationships are verified complete
- [ ] Roadmap updated to "complete" status
- [ ] Completion report created

---

**Last Updated:** 2025-12-03 09:20 UTC  
**Next Review:** After API investigation or console execution

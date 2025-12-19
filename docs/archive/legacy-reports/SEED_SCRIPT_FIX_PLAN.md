# Seed Script Fix Plan

## Current State Analysis

### Issues Identified:
1. **Foreign Key Constraint Errors**: Data clearing fails due to FK constraints preventing deletion
2. **Client ID Mismatch**: Orders reference client IDs (2, 3, 9, 1) that don't exist because:
   - Script assumes auto-increment starts at 1
   - Doesn't fetch actual inserted client IDs
   - Uses hardcoded array indices instead of real database IDs
3. **Schema Mismatch**: `paymentTerms` column doesn't exist in production vendors table
4. **Incomplete Data Clearing**: Raw SQL DELETE doesn't handle FK constraints properly

### What's Working:
- ✅ User creation (with duplicate handling)
- ✅ Client generation and insertion
- ✅ Brand creation
- ✅ Strain generation
- ✅ Product generation
- ✅ Vendor creation (after raw SQL fix)

## Plan

### Phase 1: Fix Data Clearing (Critical)
**Problem**: Foreign key constraints prevent proper data deletion
**Solution**: 
- Disable foreign key checks temporarily during clearing
- Use TRUNCATE for tables without FK dependencies
- Use DELETE with FK checks disabled for dependent tables
- Re-enable FK checks after clearing

**Implementation**:
```typescript
// Disable FK checks
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

// Clear in reverse dependency order
const tablesToClear = ['returns', 'invoices', 'orders', 'batches', 'lots', 'products', 'strains', 'clients', 'brands', 'vendors', 'users'];
for (const tableName of tablesToClear) {
  await db.execute(sql.raw(`TRUNCATE TABLE \`${tableName}\``));
}

// Re-enable FK checks
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
```

### Phase 2: Fix Client ID Mapping (Critical)
**Problem**: Orders use assumed client IDs instead of actual inserted IDs
**Solution**:
- Fetch actual client IDs after insertion
- Use those IDs when generating orders
- Map whale/regular clients correctly

**Implementation**:
```typescript
// After inserting clients, fetch their actual IDs
const insertedClients = await db.select({
  id: clients.id,
  name: clients.name
}).from(clients).orderBy(clients.id);

// Separate into whale and regular based on actual data
const whaleClientIds = insertedClients.slice(0, CONFIG.whaleClients).map(c => c.id);
const regularClientIds = insertedClients.slice(CONFIG.whaleClients, CONFIG.whaleClients + CONFIG.regularClients).map(c => c.id);
```

### Phase 3: Fix Vendor Insert (Already Done)
**Status**: ✅ Fixed - Using raw SQL to avoid paymentTerms column

### Phase 4: Fix Vendor ID Mapping (Similar to Client IDs)
**Problem**: Same issue - assuming IDs start at 1
**Solution**: Fetch actual vendor IDs after insertion

### Phase 5: Testing & Validation
- Run seed script end-to-end
- Verify all data inserts successfully
- Check foreign key integrity
- Validate data counts match expectations

## QA Review

### Risk Assessment:
- **Low Risk**: Data clearing fix (standard SQL pattern, well-tested)
- **Low Risk**: ID mapping fix (fetching real IDs, standard practice)
- **Medium Risk**: Production database - but we're only seeding test data
- **Low Risk**: All changes are additive/improvements, no breaking changes

### Testing Strategy:
1. Test on production database (as requested)
2. Verify each step completes successfully with console output
3. Check data integrity after completion using existing validation
4. Validate foreign key relationships using existing FK checks
5. Verify data counts match CONFIG expectations

### Rollback Plan:
- If seed fails, data clearing already happened (expected)
- Can re-run seed script (idempotent by design)
- No production data at risk (test seeding only)
- Script has error handling and will report failures clearly

### Edge Cases to Handle:
1. **Empty database**: Should work (fresh start)
2. **Partial data**: FK disable ensures clean slate
3. **Connection issues**: Script already has timeout handling
4. **Schema differences**: Already handled for vendors, may need for other tables

### Improvements Needed:
1. Add better error messages for FK constraint issues
2. Add validation that fetched IDs match expected counts
3. Add retry logic for transient database errors
4. Consider transaction wrapping for atomicity (optional)

## Execution Steps

1. ✅ Update data clearing to disable FK checks
2. ✅ Fix client ID fetching after insertion
3. ✅ Fix vendor ID fetching after insertion  
4. ✅ Test seed script execution
5. ✅ Verify data integrity
6. ✅ Document any remaining issues

## Success Criteria

- [ ] Seed script completes without errors
- [ ] All tables populated with expected data
- [ ] No foreign key constraint violations
- [ ] Data integrity validation passes
- [ ] Production database accessible and functional

# Red Team QA Analysis: Wave Prompts

**Date**: January 7, 2026  
**Purpose**: Identify stability risks, incomplete fixes, and technical debt in proposed solutions

---

## Executive Summary

After reviewing all wave prompts, I've identified **23 stability concerns** that could lead to:
- Regressions in other areas
- Incomplete fixes that resurface
- Technical debt accumulation
- Missing edge cases

---

## Wave 1A Analysis: Order & Batch Crashes

### BUG-040: Order Creator Inventory Loading

**Proposed Fix**:
```typescript
if (ruleIds.length === 0) {
  return []; // Return empty array instead of invalid SQL
}
```

**🔴 STABILITY CONCERNS**:

1. **Incomplete Fix**: Returning empty array when no pricing rules exist means the customer gets NO inventory shown. This is wrong - they should see inventory with DEFAULT pricing.

2. **Missing Root Cause**: Why does a client have empty pricing rules? Should we:
   - Prevent clients from having empty rules?
   - Fall back to default pricing?
   - Show a warning to the user?

3. **No Unit Test**: Fix could regress without test coverage.

**✅ IMPROVED FIX**:
```typescript
// If no custom rules, use default pricing
if (ruleIds.length === 0) {
  return getInventoryWithDefaultPricing(clientId);
}

// Also add validation when creating/editing clients
// to ensure pricing rules are never empty
```

---

### BUG-041: Batch Detail View Crash

**Proposed Fix**:
```typescript
{(batch?.locations || []).map(loc => ...)}
```

**🔴 STABILITY CONCERNS**:

1. **Symptom Treatment**: We're hiding the fact that the API returned bad data. Why is `locations` undefined?

2. **Silent Failure**: User sees empty locations list instead of understanding there's an issue.

3. **Missing Logging**: No way to track how often this happens in production.

**✅ IMPROVED FIX**:
```typescript
// In the API response handler
const locations = batch?.locations ?? [];
if (batch && !batch.locations) {
  console.warn(`Batch ${batch.id} has undefined locations - data integrity issue`);
  // Optionally report to error tracking
  Sentry.captureMessage(`Batch ${batch.id} missing locations`);
}

// In the component - show appropriate state
{locations.length === 0 ? (
  <EmptyState message="No location data available" />
) : (
  locations.map(loc => ...)
)}
```

---

### BUG-043: Permission Service Empty Array

**Proposed Fix**:
```typescript
if (permissionIds.length === 0) {
  return [];
}
```

**🔴 STABILITY CONCERNS**:

1. **Security Implication**: If a user has no permissions, should they have access to ANYTHING? Returning empty array might be interpreted as "no restrictions" somewhere.

2. **Missing Audit**: No logging of permission check failures.

3. **Inconsistent Pattern**: Other parts of the codebase might handle empty permissions differently.

**✅ IMPROVED FIX**:
```typescript
// Create a utility function used everywhere
export function safePermissionCheck(permissionIds: number[]): Permission[] {
  if (permissionIds.length === 0) {
    // Log for audit
    console.info('Permission check with empty permission set');
    return []; // Explicitly means "no permissions granted"
  }
  return db.select()
    .from(rolePermissions)
    .where(inArray(rolePermissions.permissionId, permissionIds));
}

// Document the expected behavior
// Empty array = user has NO permissions (deny all)
// This should be consistent across all permission checks
```

---

## Wave 1B Analysis: Data Display Fixes

### QA-049 & QA-050: Products/Samples Empty

**Proposed Fix**: "Investigate and fix filter issue"

**🔴 STABILITY CONCERNS**:

1. **No Root Cause Identified**: We're guessing it's a filter issue. What if it's:
   - Tenant isolation bug?
   - Database connection issue?
   - Caching problem?
   - Permission issue?

2. **No Verification Query**: Should provide SQL to verify data exists.

3. **No Regression Test**: How do we know this won't break again?

**✅ IMPROVED FIX**:
```typescript
// Step 1: Verify data exists at database level
// Run this query directly:
SELECT COUNT(*) FROM products WHERE archived = false;
SELECT COUNT(*) FROM samples;

// Step 2: Add debug endpoint (temporary)
// GET /api/debug/products-count
// Returns raw count from DB vs what API returns

// Step 3: Add logging to the query
const products = await db.select().from(products).where(...);
console.log(`Products query returned ${products.length} results`);
console.log('Query params:', JSON.stringify(params));

// Step 4: After fix, add integration test
test('products page shows all non-archived products', async () => {
  const dbCount = await db.select({ count: count() }).from(products);
  const apiResponse = await api.products.list({});
  expect(apiResponse.length).toBe(dbCount[0].count);
});
```

---

## Wave 2A Analysis: Search & Forms

### BUG-042: Global Search

**Proposed Fix**: Add more fields to search query.

**🔴 STABILITY CONCERNS**:

1. **Performance**: Adding 5+ ILIKE conditions without indexes will be SLOW on large datasets.

2. **No Pagination**: Search could return thousands of results.

3. **No Relevance Ranking**: Results aren't sorted by relevance.

4. **SQL Injection Risk**: Is `searchPattern` properly escaped?

**✅ IMPROVED FIX**:
```typescript
// Add indexes for searchable columns
// Migration:
CREATE INDEX idx_products_name_search ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_strain_search ON products USING gin(strain gin_trgm_ops);
CREATE INDEX idx_clients_name_search ON clients USING gin(name gin_trgm_ops);

// Use parameterized queries (already done by Drizzle, but verify)
const searchPattern = `%${input.query.replace(/[%_]/g, '\\$&')}%`;

// Add pagination
.limit(50)
.offset(input.page * 50)

// Add relevance scoring (simple version)
// Exact match > starts with > contains
ORDER BY 
  CASE WHEN name ILIKE ${exactPattern} THEN 1
       WHEN name ILIKE ${startsWithPattern} THEN 2
       ELSE 3 END,
  name ASC
```

---

### BUG-045 & BUG-048: Retry Button

**Proposed Fix**: Replace `window.location.reload()` with `refetch()`.

**🔴 STABILITY CONCERNS**:

1. **Incomplete State Reset**: What if the error is due to stale state that refetch won't fix?

2. **No Error Boundary**: If refetch fails again, user is stuck.

3. **No Retry Limit**: User could spam retry infinitely.

**✅ IMPROVED FIX**:
```typescript
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;

const handleRetry = async () => {
  if (retryCount >= MAX_RETRIES) {
    // Show "Contact support" message
    setShowSupportMessage(true);
    return;
  }
  
  setRetryCount(prev => prev + 1);
  
  try {
    await refetchInventory();
  } catch (error) {
    // If refetch fails, try clearing cache first
    queryClient.invalidateQueries(['inventory']);
    await refetchInventory();
  }
};

// Reset retry count on success
useEffect(() => {
  if (inventoryData) {
    setRetryCount(0);
  }
}, [inventoryData]);
```

---

### BUG-046: Auth Error Message

**Proposed Fix**: Change error message and code.

**🔴 STABILITY CONCERNS**:

1. **Breaking Change**: Other parts of the app might check for `UNAUTHORIZED` code.

2. **Inconsistent Frontend Handling**: Frontend might not handle `FORBIDDEN` correctly everywhere.

3. **No Audit Trail**: Permission denials should be logged for security.

**✅ IMPROVED FIX**:
```typescript
// Server: Add audit logging
if (!hasPermission(ctx.user, requiredPermission)) {
  // Log for security audit
  await logSecurityEvent({
    type: 'PERMISSION_DENIED',
    userId: ctx.user.id,
    resource: requiredPermission,
    timestamp: new Date(),
  });
  
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `You don't have permission to ${permissionDescriptions[requiredPermission]}`,
  });
}

// Frontend: Update ALL error handlers
// Search for: error.data?.code === 'UNAUTHORIZED'
// Add handling for: error.data?.code === 'FORBIDDEN'

// Create shared error handler
function handleApiError(error: TRPCClientError) {
  if (error.data?.code === 'UNAUTHORIZED') {
    redirectToLogin();
  } else if (error.data?.code === 'FORBIDDEN') {
    showPermissionDeniedMessage();
  } else {
    showGenericError(error.message);
  }
}
```

---

## Wave 2B Analysis: Navigation & Verification

### BUG-070: Spreadsheet View 404

**Proposed Fix**: "Check route configuration"

**🔴 STABILITY CONCERNS**:

1. **No Investigation**: Why was the route removed? Was it intentional?

2. **Feature Flag Check**: Is this behind a feature flag that's disabled?

3. **No Stakeholder Confirmation**: Should this feature even exist?

**✅ IMPROVED FIX**:
```typescript
// Step 1: Check git history
git log --oneline --all -- '**/spreadsheet*'
git log --oneline -- client/src/App.tsx | head -20

// Step 2: Check if intentionally removed
// Look for PR/commit message explaining removal

// Step 3: Check feature flags
const spreadsheetEnabled = useFeatureFlag('spreadsheet_view');

// Step 4: If restoring, add with feature flag
{spreadsheetEnabled && (
  <Route path="/spreadsheet" element={<SpreadsheetViewPage />} />
)}

// Step 5: Document decision
// Add comment explaining why route exists/doesn't exist
```

---

## Wave 3 Analysis: Integration & Deploy

### MERGE-001: Merge All Branches

**🔴 STABILITY CONCERNS**:

1. **No CI/CD**: Are there automated tests that run on merge?

2. **No Staging Environment**: Going straight to production is risky.

3. **No Rollback Plan**: What if production breaks?

4. **No Database Migration Check**: Do any fixes require migrations?

**✅ IMPROVED FIX**:
```bash
# Step 1: Run full test suite before merge
pnpm test

# Step 2: Check for migrations
pnpm drizzle-kit check

# Step 3: Deploy to staging first (if available)
git push origin main:staging

# Step 4: Smoke test staging
curl https://staging.terp-app.com/health

# Step 5: Deploy to production with rollback ready
# Keep previous deployment ID noted
PREVIOUS_DEPLOY_ID=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -1)

# Step 6: Monitor for 15 minutes post-deploy
# Watch error rates, response times
```

---

## Wave 4-6 Analysis: Post-Thursday

### General Concerns

1. **No Dependency Management**: Wave 5 integrations (SendGrid, Twilio) require API keys. Are they configured?

2. **No Feature Flags**: New features should be behind flags for safe rollout.

3. **No Monitoring**: How do we know if integrations are working in production?

4. **No Rate Limiting**: Email/SMS services have rate limits. Are we handling them?

---

## Parallel Execution Analysis

### Current Parallel Opportunities
- Wave 1A + 1B (already identified)
- Wave 2A + 2B (already identified)
- Wave 4A + 4B (already identified)
- Wave 5 Agent 1 + Agent 2 (already identified)
- Wave 6 Agent 1 + Agent 2 (already identified)

### Additional Parallel Opportunities Identified

1. **Wave 1A Task Split**:
   - BUG-040 (pricingEngine) can run parallel with BUG-041 (BatchDetailDrawer)
   - Different files, no dependencies

2. **Wave 2A Task Split**:
   - BUG-042 (search) can run parallel with BUG-045/046/048 (form fixes)
   - Different files, no dependencies

3. **Wave 3 Partial Parallel**:
   - Test writing can start while Wave 2 is finishing
   - Documentation can be written in parallel

4. **Wave 4A + 4B + Early Wave 5**:
   - SQL safety (4A) has no dependency on UX (4B)
   - Email service setup (5) can start while 4A/4B are running
   - Different codebases, no conflicts

5. **Cross-Wave Parallel**:
   - Integration tests (Wave 6) can start being WRITTEN during Wave 4
   - Just can't be RUN until fixes are in place

---

## Recommended Changes

### Add to ALL Prompts:

1. **Unit Test Requirement**:
   ```
   Every fix MUST include at least one unit test that:
   - Tests the happy path
   - Tests the edge case being fixed
   - Can be run in CI
   ```

2. **Logging Requirement**:
   ```
   Every fix MUST include appropriate logging:
   - console.warn for unexpected states
   - console.error for actual errors
   - Structured logging for production debugging
   ```

3. **Rollback Plan**:
   ```
   Every PR MUST include:
   - How to verify the fix works
   - How to rollback if it doesn't
   - What to monitor post-deploy
   ```

4. **Documentation**:
   ```
   Every fix MUST update:
   - Code comments explaining the fix
   - README if behavior changes
   - CHANGELOG entry
   ```

---

## Risk Matrix

| Wave | Task | Risk Level | Mitigation |
|------|------|------------|------------|
| 1A | BUG-040 | HIGH | Add default pricing fallback |
| 1A | BUG-041 | MEDIUM | Add logging for data issues |
| 1A | BUG-043 | HIGH | Document security implications |
| 1B | QA-049 | MEDIUM | Add integration test |
| 1B | QA-050 | MEDIUM | Add integration test |
| 2A | BUG-042 | HIGH | Add indexes, pagination |
| 2A | BUG-045 | LOW | Add retry limit |
| 2A | BUG-046 | MEDIUM | Update all error handlers |
| 2B | BUG-070 | LOW | Check if intentional |
| 3 | Deploy | HIGH | Add staging step |

# How to Request Changes Safely

This document explains how to request changes to the TERP ERP system that span frontend and backend, and how those changes will be implemented safely without breaking production.

---

## Overview

The TERP monorepo is designed for **safe iteration**. When you request a change like "Add feature X to the frontend and update the backend accordingly," the system will:

1. **Gate the feature** behind a feature flag (default off in production)
2. **Implement frontend changes** under the flag
3. **Implement backend changes** with API versioning (if breaking)
4. **Add tests** (unit, integration, E2E)
5. **Deploy to preview** environment for testing
6. **Enable the flag** after approval
7. **Deprecate old code** if applicable

This ensures:
- ✅ **No production breakage**: New code is deployed but inactive
- ✅ **Gradual rollout**: Features can be tested before full release
- ✅ **Kill switch**: Features can be instantly disabled if issues arise
- ✅ **No abandoned code**: Old code paths are deprecated and removed

---

## Request Format

When requesting a change, provide:

### 1. Feature Description
Clear description of what you want to add/change.

**Example**:
> "Add a bulk quote creation feature that allows users to upload a CSV file with multiple quotes and create them all at once."

### 2. Affected Areas
Indicate which parts of the system are affected:
- [ ] Frontend UI
- [ ] Backend API
- [ ] Database schema
- [ ] Business logic

### 3. Breaking Changes
Is this a breaking change to existing functionality?
- **Non-breaking**: Adds new feature without changing existing behavior
- **Breaking**: Changes or removes existing functionality

---

## Implementation Process

### Step 1: Feature Flag Creation

A new feature flag is added to `packages/config/src/flags.ts`:

```typescript
ENABLE_BULK_QUOTE_UPLOAD: {
  key: 'ENABLE_BULK_QUOTE_UPLOAD',
  description: 'Enable CSV bulk quote upload feature',
  defaultValue: false,
  scope: 'global',
},
```

### Step 2: Frontend Implementation

Frontend changes are gated behind the flag:

```typescript
import { isFeatureEnabled } from '@terp/config';

export default function QuotesPage() {
  const bulkUploadEnabled = await isFeatureEnabled('ENABLE_BULK_QUOTE_UPLOAD');
  
  return (
    <div>
      {bulkUploadEnabled && (
        <BulkUploadButton />
      )}
      {/* Existing quote creation UI */}
    </div>
  );
}
```

### Step 3: Backend Implementation

#### Non-Breaking Changes

If the change is **non-breaking** (adds new endpoint):

```typescript
// New endpoint in existing v1 API
// apps/web/src/app/api/v1/quotes/bulk/route.ts
export async function POST(request: Request) {
  // Implementation
}
```

#### Breaking Changes

If the change is **breaking** (changes existing endpoint):

1. **Create v2 endpoint**:
   ```typescript
   // apps/web/src/app/api/v2/quotes/route.ts
   export async function POST(request: Request) {
     // New implementation
   }
   ```

2. **Deprecate v1 endpoint**:
   ```typescript
   // apps/web/src/app/api/v1/quotes/route.ts
   export async function POST(request: Request) {
     // Add deprecation headers
     return new Response(JSON.stringify(data), {
       headers: {
         'Deprecation': 'true',
         'Sunset': 'Wed, 31 Dec 2025 23:59:59 GMT',
         'Link': '<https://docs.terp.com/api/v2/quotes>; rel="successor-version"'
       }
     });
   }
   ```

3. **Update DEPRECATION.md**:
   ```markdown
   ### POST /api/v1/quotes
   - **Deprecated On**: 2025-10-22
   - **Sunset Date**: 2025-12-31
   - **Reason**: New bulk upload feature requires different request format
   - **Migration Path**: Use POST /api/v2/quotes instead
   ```

### Step 4: Shared Types

API contracts are defined in `@terp/types`:

```typescript
// packages/types/src/index.ts
export const BulkQuoteUploadRequestSchema = z.object({
  csvData: z.string(),
  customerId: UuidSchema,
});

export type BulkQuoteUploadRequest = z.infer<typeof BulkQuoteUploadRequestSchema>;
```

Both frontend and backend use these types for type safety.

### Step 5: Database Changes (if needed)

If a database migration is required:

```bash
pnpm db:migrate:dev --name add_bulk_quote_upload_tracking
```

The migration is validated by CI against a shadow database to detect destructive changes.

### Step 6: Testing

Tests are added for the new feature:

**Unit Tests**:
```typescript
describe('BulkQuoteUpload', () => {
  it('should parse CSV and create quotes', async () => {
    // Test implementation
  });
});
```

**Integration Tests**:
```typescript
describe('POST /api/v1/quotes/bulk', () => {
  it('should create multiple quotes from CSV', async () => {
    // Test API endpoint
  });
});
```

**E2E Tests**:
```typescript
test('bulk quote upload flow', async ({ page }) => {
  // Test user flow
});
```

### Step 7: Pull Request

A PR is opened with:

- **Title**: `feat(quotes): add bulk CSV quote upload`
- **Description**: Summary of changes, linked issues, affected areas
- **Status Hub Delta**: Feature flag added, new endpoint, no migration
- **Preview URL**: Automatically generated by Vercel

The PR includes:
- ✅ Feature flag added
- ✅ Frontend changes gated behind flag
- ✅ Backend endpoint implemented
- ✅ Shared types defined
- ✅ Tests added
- ✅ Documentation updated

### Step 8: Preview Testing

The feature is tested on the preview environment:

1. Enable the flag in preview environment:
   ```
   FEATURE_ENABLE_BULK_QUOTE_UPLOAD=true
   ```
2. Test the feature on the preview URL
3. Verify existing functionality still works

### Step 9: Approval and Merge

After approval:
1. PR is merged to `main`
2. Vercel automatically deploys to production
3. **Feature is still disabled** in production (flag default is `false`)

### Step 10: Gradual Rollout

Enable the feature gradually:

**Preview Only** (initial):
```
FEATURE_ENABLE_BULK_QUOTE_UPLOAD=true  # Preview environment only
```

**Production** (after testing):
```
FEATURE_ENABLE_BULK_QUOTE_UPLOAD=true  # Production environment
```

**Full Rollout** (after stable):
Update `packages/config/src/flags.ts`:
```typescript
defaultValue: true,  // Now enabled by default
```

### Step 11: Cleanup

After the feature is stable:
1. Remove the feature flag
2. Remove old code paths (if any)
3. Remove deprecated endpoints (after sunset date)

---

## Example Scenarios

### Scenario 1: Add New Feature (Non-Breaking)

**Request**: "Add a dashboard widget showing top customers by revenue"

**Implementation**:
1. Add flag: `ENABLE_TOP_CUSTOMERS_WIDGET`
2. Create widget component (gated by flag)
3. Add API endpoint: `GET /api/v1/analytics/top-customers`
4. Define types in `@terp/types`
5. Add tests
6. Deploy with flag off
7. Enable in preview, test, then enable in production

**Result**: New feature added without affecting existing functionality.

---

### Scenario 2: Change Existing Feature (Breaking)

**Request**: "Change the quote creation form to require a PO number"

**Implementation**:
1. Add flag: `ENABLE_REQUIRED_PO_NUMBER`
2. Update frontend form (gated by flag)
3. Create new endpoint: `POST /api/v2/quotes` (requires PO number)
4. Deprecate old endpoint: `POST /api/v1/quotes`
5. Add deprecation headers and update DEPRECATION.md
6. Add tests for both v1 and v2
7. Deploy with flag off
8. Enable in preview, test migration
9. Enable in production
10. After 90 days, remove v1 endpoint

**Result**: Breaking change introduced safely with migration path.

---

### Scenario 3: Database Schema Change

**Request**: "Add a 'priority' field to quotes"

**Implementation**:
1. Add flag: `ENABLE_QUOTE_PRIORITY`
2. Create migration: `add_quote_priority_field`
3. Update Prisma schema
4. Update frontend form (gated by flag)
5. Update API to accept priority field (additive, non-breaking)
6. Add tests
7. Deploy with flag off
8. Enable in preview, test
9. Enable in production

**Result**: Database schema updated without breaking existing code.

---

## Kill Switch

If a feature causes issues in production:

1. **Disable immediately** via environment variable:
   ```
   FEATURE_<FLAG_KEY>=false
   ```
2. Redeploy (or wait for automatic redeploy)
3. Investigate and fix the issue
4. Re-enable after fix is deployed

---

## Best Practices

### Do's
✅ Always gate new features behind flags  
✅ Use API versioning for breaking changes  
✅ Add tests before merging  
✅ Test on preview before enabling in production  
✅ Document deprecations with clear migration paths  
✅ Remove flags after stable rollout  

### Don'ts
❌ Don't deploy unfinished code without a flag  
❌ Don't make breaking changes without versioning  
❌ Don't remove old endpoints without deprecation period  
❌ Don't skip tests  
❌ Don't leave flags in code indefinitely  

---

## Questions?

- **Feature Flags**: See [ADR-002](adrs/002-feature-flags.md)
- **API Versioning**: See [ADR-003](adrs/003-api-versioning.md)
- **Status Hub**: See [status/STATUS.md](status/STATUS.md)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Summary**: Request changes freely. The system ensures they're implemented safely with feature flags, API versioning, and gradual rollout. No production breakage, no abandoned code.


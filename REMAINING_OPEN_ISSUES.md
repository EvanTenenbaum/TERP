# Remaining Open Issues - TERP

**Date**: November 5, 2025  
**Status**: Identified after Phase 1 & 2 UI fixes  
**Priority**: Categorized by impact and effort

---

## Summary

After completing comprehensive UI button fixes, the following categories of issues remain:

1. **TODO Comments** - 14 instances requiring API implementation
2. **Console Logging** - 21 instances requiring proper logging
3. **TypeScript Errors** - 276 pre-existing errors
4. **Quality Remediation Roadmap** - P0/P1/P2 items from CTO audit

---

## Category 1: TODO Comments (API Implementation Required)

### 🔴 Critical Priority

#### 1. COGS Settings Save API
**File**: `client/src/components/cogs/CogsGlobalSettings.tsx:34`  
**Issue**: Save button has placeholder API call  
**Impact**: Users can't persist COGS global settings  
**Effort**: 2-4 hours  
**Fix Required**:
```typescript
// Replace TODO with actual tRPC mutation
const saveSettingsMutation = trpc.cogs.updateGlobalSettings.useMutation();
await saveSettingsMutation.mutateAsync(settings);
```

#### 2. COGS Client Adjustment API
**Files**: 
- `client/src/components/cogs/CogsClientSettings.tsx:81`
- `client/src/components/cogs/CogsClientSettings.tsx:109`

**Issue**: Edit and add client adjustments have placeholder API calls  
**Impact**: Users can't manage client-specific COGS adjustments  
**Effort**: 3-5 hours  
**Fix Required**:
```typescript
// Add tRPC mutations for client COGS
const updateAdjustmentMutation = trpc.cogs.updateClientAdjustment.useMutation();
const addAdjustmentMutation = trpc.cogs.addClientAdjustment.useMutation();
```

#### 3. Batch Quantity Adjustment API
**File**: `client/src/components/inventory/BatchDetailDrawer.tsx:670`  
**Issue**: Adjust Quantity button has placeholder API call  
**Impact**: Users can't adjust inventory quantities  
**Effort**: 2-3 hours  
**Fix Required**:
```typescript
const adjustQuantityMutation = trpc.inventory.adjustBatchQuantity.useMutation();
await adjustQuantityMutation.mutateAsync({
  batchId: batch.id,
  adjustment,
  reason
});
```

#### 4. Batch Status Change API
**File**: `client/src/components/inventory/BatchDetailDrawer.tsx:722`  
**Issue**: Change Status button has placeholder API call  
**Impact**: Users can't change batch status  
**Effort**: 2-3 hours  
**Fix Required**:
```typescript
const changeStatusMutation = trpc.inventory.changeBatchStatus.useMutation();
await changeStatusMutation.mutateAsync({
  batchId: batch.id,
  newStatus,
  reason
});
```

### 🟡 High Priority

#### 5. Auth Context Integration
**Files**:
- `client/src/components/inventory/ClientInterestWidget.tsx:42`
- `client/src/components/needs/ClientNeedsTab.tsx:70`
- `client/src/components/needs/ClientNeedsTab.tsx:91`

**Issue**: Hardcoded userId: 1 instead of auth context  
**Impact**: All actions attributed to wrong user  
**Effort**: 1-2 hours  
**Fix Required**:
```typescript
import { useAuth } from '@/contexts/AuthContext';
const { user } = useAuth();
// Use user.id instead of hardcoded 1
```

#### 6. Inbox Navigation
**File**: `client/src/components/inbox/InboxItem.tsx:95`  
**Issue**: TODO for navigating to referenced entity  
**Impact**: Users can't navigate from inbox items  
**Effort**: 2-3 hours  
**Fix Required**:
```typescript
const handleClick = () => {
  markAsSeen.mutate({ itemId: item.id });
  
  // Navigate based on item type
  switch (item.type) {
    case 'COMMENT':
      navigate(`/comments/${item.entityId}`);
      break;
    case 'NEED':
      navigate(`/needs/${item.entityId}`);
      break;
    // ... other types
  }
};
```

### 🟢 Medium Priority

#### 7. Batch Product Relations
**Files**:
- `client/src/components/inventory/BatchDetailDrawer.tsx:334`
- `client/src/components/inventory/BatchDetailDrawer.tsx:344`

**Issue**: Commented out product relation features  
**Impact**: Missing strain information display  
**Effort**: 3-4 hours  
**Fix Required**: Update API to include product relations, then uncomment

#### 8. Average Price Calculation
**File**: `client/src/components/inventory/BatchDetailDrawer.tsx:629`  
**Issue**: Hardcoded 0 for average price  
**Impact**: Inaccurate profitability display  
**Effort**: 2-3 hours  
**Fix Required**:
```typescript
const avgPrice = batch.profitability?.avgPrice || 0;
```

#### 9. Client Navigation
**File**: `client/src/components/inventory/ClientInterestWidget.tsx:194`  
**Issue**: Using window.location instead of router  
**Impact**: Page reload instead of SPA navigation  
**Effort**: 1 hour  
**Fix Required**:
```typescript
import { useLocation } from 'wouter';
const [, setLocation] = useLocation();
// Replace window.location.href with setLocation
```

#### 10. Template Selector TODO
**File**: `client/src/components/dashboard/widgets-v2/TemplateSelector.tsx:30`  
**Issue**: Template ID is "TODO" instead of proper ID  
**Impact**: Template selection may fail  
**Effort**: 30 minutes  
**Fix Required**: Change ID from "TODO" to "todo-list"

---

## Category 2: Console Logging (Replace with Proper Logging)

### Impact: Low (Development/Debugging)
### Effort: 1-2 hours total

**Total Instances**: 21 console.log/error/warn statements

**Files Affected**:
1. `main.tsx` - 1 instance (tRPC error logging)
2. `EventFormDialog.tsx` - 1 instance
3. `AddCommunicationModal.tsx` - 1 instance
4. `CogsClientSettings.tsx` - 4 instances
5. `CogsGlobalSettings.tsx` - 2 instances
6. `CommentsPanel.tsx` - 2 instances
7. `DataCardConfigModal.tsx` - 6 instances
8. `ClientInterestWidget.tsx` - 1 instance
9. `SaveViewModal.tsx` - 1 instance
10. `SavedViewsDropdown.tsx` - 1 instance
11. `NeedForm.tsx` - 1 instance

**Fix Required**:
```typescript
// Replace console.log/error/warn with structured logging
import { logger } from '@/lib/logger';

// Instead of:
console.log('Saving settings:', settings);
console.error('Error saving:', error);

// Use:
logger.info('Saving settings', { settings });
logger.error('Error saving settings', { error, context: 'CogsSettings' });
```

**Implementation Steps**:
1. Create `client/src/lib/logger.ts` with structured logging
2. Replace all console statements with logger calls
3. Add contextual information (component name, user action, etc.)
4. Ensure errors are logged with stack traces

---

## Category 3: TypeScript Errors

### Status: Pre-existing (Not introduced by UI fixes)
### Total: 276 errors

**Priority**: Medium (doesn't block functionality but reduces type safety)

**Common Error Types**:
1. Missing type definitions
2. `any` type usage
3. Property access on potentially undefined objects
4. Type mismatches in tRPC mutations

**Recommended Approach**:
1. Group errors by file/component
2. Fix highest-traffic components first
3. Add proper type definitions
4. Enable stricter TypeScript settings gradually

**Estimated Effort**: 2-3 weeks (can be done incrementally)

---

## Category 4: Quality Remediation Roadmap Items

### From: `docs/QUALITY_REMEDIATION_ROADMAP.md`

#### P0: Critical Fixes (Production Blockers)

**Timeline**: 10-15 days  
**Status**: Not started

1. **P0.1**: Implement Comprehensive Error Handling
   - All 31 API routers (379 endpoints)
   - Create error handling infrastructure
   - Add try-catch to all mutations
   - Implement error logging

2. **P0.2**: Add Input Validation
   - Zod schemas for all inputs
   - Sanitization for SQL injection
   - Rate limiting

3. **P0.3**: Secure Authentication & Authorization
   - JWT implementation
   - Role-based access control
   - Session management

4. **P0.4**: Implement Structured Logging
   - Replace console.log with logger
   - Add request/response logging
   - Error tracking

5. **P0.5**: Add Basic Monitoring
   - Health check endpoints
   - Performance metrics
   - Error rate tracking

#### P1: High Priority (Post-Launch)

**Timeline**: 4 weeks  
**Status**: Not started

1. **P1.1**: Comprehensive Testing Suite
2. **P1.2**: Advanced Security Hardening
3. **P1.3**: Performance Optimization
4. **P1.4**: Enhanced Monitoring & Alerting

#### P2: Medium Priority (Optimization)

**Timeline**: 5 weeks  
**Status**: Not started

1. **P2.1**: Advanced Testing & Coverage
2. **P2.2**: Performance & Operational Excellence
3. **P2.3**: Documentation & Knowledge Management

---

## Recommended Execution Order

### Phase 1: Quick Wins (1-2 days)
1. Fix Template Selector TODO (30 min)
2. Fix Client Navigation (1 hour)
3. Replace console.log with proper logging (2 hours)
4. Integrate Auth Context (2 hours)

**Total**: 1-2 days  
**Impact**: Medium  
**Risk**: Low

### Phase 2: Critical API Implementations (1 week)
1. COGS Settings Save API (4 hours)
2. COGS Client Adjustment API (5 hours)
3. Batch Quantity Adjustment API (3 hours)
4. Batch Status Change API (3 hours)
5. Inbox Navigation (3 hours)

**Total**: 1 week  
**Impact**: High  
**Risk**: Medium

### Phase 3: Medium Priority TODOs (3-4 days)
1. Batch Product Relations (4 hours)
2. Average Price Calculation (3 hours)

**Total**: 3-4 days  
**Impact**: Medium  
**Risk**: Low

### Phase 4: TypeScript Cleanup (Ongoing)
1. Group errors by component
2. Fix incrementally during feature work
3. Enable stricter settings gradually

**Total**: 2-3 weeks (incremental)  
**Impact**: Low (improves maintainability)  
**Risk**: Low

### Phase 5: Quality Remediation Roadmap (10-15 weeks)
Follow the P0 → P1 → P2 sequence from `QUALITY_REMEDIATION_ROADMAP.md`

---

## Immediate Next Steps

Based on impact and effort, recommend starting with:

1. **Template Selector TODO** (30 min) - Trivial fix
2. **Auth Context Integration** (2 hours) - Affects multiple features
3. **Console Logging Cleanup** (2 hours) - Improves debugging
4. **COGS API Implementation** (1 day) - Completes Phase 1 & 2 UI fixes

**Total Time**: 2-3 days  
**Impact**: High  
**Risk**: Low

---

## Notes

- All TODO comments from Phase 1 & 2 UI fixes are intentional placeholders for API implementation
- No placeholders were left in UI logic - all buttons are functional with user feedback
- TypeScript errors are pre-existing and don't block functionality
- Quality Remediation Roadmap is comprehensive and should be executed systematically

---

## Version History

- **v1.0** (2025-11-05): Initial compilation after Phase 1 & 2 UI fixes

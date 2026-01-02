# Feature Flag Integration Requirements

**Version:** 1.0  
**Date:** January 2, 2026  
**Status:** Active Standard

---

## Overview

All major features in TERP must integrate with the feature flag system to enable:

1. **Gradual Rollout** - Deploy features to specific users/roles before full release
2. **Quick Disable** - Turn off problematic features without deployment
3. **A/B Testing** - Test different implementations with different user groups
4. **Customer Customization** - Enable/disable features per customer requirement

---

## Feature Flag System Reference

### Available Components

| Component             | Location                                              | Purpose                                     |
| --------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `useFeatureFlag`      | `client/src/hooks/useFeatureFlag.ts`                  | React hook for checking flag status         |
| `FeatureFlag`         | `client/src/components/feature-flags/FeatureFlag.tsx` | Wrapper component for conditional rendering |
| `ModuleGate`          | `client/src/components/feature-flags/FeatureFlag.tsx` | Gate entire modules                         |
| `RequireFeature`      | `client/src/components/feature-flags/FeatureFlag.tsx` | Require feature for access                  |
| `featureFlagService`  | `server/services/featureFlagService.ts`               | Backend flag checking                       |
| `seedFeatureFlags.ts` | `server/services/seedFeatureFlags.ts`                 | Add new flags to seed data                  |

### Flag Naming Convention

```
{category}-{feature-name}

Categories:
- module-*     : Entire module enable/disable
- feature-*    : Individual feature within a module
- ui-*         : UI-specific features
- beta-*       : Beta/experimental features
```

### Examples

```typescript
// Frontend - React Hook
const { enabled, isLoading } = useFeatureFlag("feature-sample-management");

// Frontend - Wrapper Component
<FeatureFlag flag="feature-sample-management">
  <SampleManagementPage />
</FeatureFlag>

// Frontend - With Fallback
<FeatureFlag
  flag="feature-sample-management"
  fallback={<ComingSoonPlaceholder />}
>
  <SampleManagementPage />
</FeatureFlag>

// Backend - Service Check
const isEnabled = await featureFlagService.isEnabled("feature-sample-management", userId);
if (!isEnabled) {
  throw new TRPCError({ code: "FORBIDDEN", message: "Feature not enabled" });
}
```

---

## Integration Checklist for New Features

Every new feature MUST complete the following integration steps:

### 1. Define Feature Flag

Add to `server/services/seedFeatureFlags.ts`:

```typescript
{
  key: "feature-{feature-name}",
  name: "{Feature Display Name}",
  description: "{Description of what this flag controls}",
  module: "{parent-module-flag}", // e.g., "module-sales" or null
  systemEnabled: true,
  defaultEnabled: false, // Start disabled for gradual rollout
},
```

### 2. Frontend Integration

Wrap feature entry points with `FeatureFlag` component:

```typescript
// In navigation/menu
<FeatureFlag flag="feature-{feature-name}">
  <NavItem to="/feature-path">Feature Name</NavItem>
</FeatureFlag>

// In page/component
<FeatureFlag
  flag="feature-{feature-name}"
  fallback={<FeatureDisabledMessage feature="Feature Name" />}
>
  <FeatureComponent />
</FeatureFlag>
```

### 3. Backend Integration

Add flag check to router endpoints:

```typescript
// In router
.use(async (opts) => {
  const isEnabled = await featureFlagService.isEnabled(
    "feature-{feature-name}",
    opts.ctx.user?.id
  );
  if (!isEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is not enabled for your account",
    });
  }
  return opts.next();
})
```

### 4. Documentation

Update feature documentation to include:

- Feature flag key
- Default enabled state
- Parent module dependency (if any)
- Rollout plan

### 5. Testing

Add tests for:

- Feature enabled behavior
- Feature disabled behavior
- Flag inheritance from parent module

---

## Feature-Specific Integration Requirements

### FEATURE-005: Unit Tracking with QR Codes & NFC Tags

**Flag Key:** `feature-unit-tracking`  
**Parent Module:** `module-inventory`  
**Default:** Disabled (beta feature)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate QR code generation UI
- [ ] Gate NFC scanning interface
- [ ] Gate unit-level tracking endpoints
- [ ] Add to inventory module settings

---

### FEATURE-006: VIP Portal Client Booking System

**Flag Key:** `feature-vip-booking`  
**Parent Module:** `module-vip-portal`  
**Default:** Disabled (gradual rollout)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate booking calendar in VIP Portal
- [ ] Gate approval workflow endpoints
- [ ] Gate notification triggers
- [ ] Add to VIP Portal settings

---

### FEATURE-007: Calendar Buffer Times & Appointment Spacing

**Flag Key:** `feature-calendar-buffers`  
**Parent Module:** `module-calendar`  
**Default:** Enabled

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate buffer time settings UI
- [ ] Gate spacing calculation logic
- [ ] Add to calendar settings

---

### FEATURE-008: System-Wide Advanced Filtering & Sorting

**Flag Key:** `feature-advanced-filters`  
**Parent Module:** None (system-wide)  
**Default:** Enabled

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate advanced filter UI components
- [ ] Gate saved filter functionality
- [ ] Add to user preferences

---

### FEATURE-009: Enhanced Role-Based Access Control (RBAC)

**Flag Key:** `feature-enhanced-rbac`  
**Parent Module:** None (system-wide)  
**Default:** Disabled (breaking change potential)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate new permission UI
- [ ] Gate enhanced permission checks
- [ ] Add migration path for existing permissions

---

### FEATURE-010: Accounting-Calendar Integration & Cash Flow Forecasting

**Flag Key:** `feature-cashflow-forecast`  
**Parent Module:** `module-accounting`  
**Default:** Disabled (beta feature)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate forecasting dashboard
- [ ] Gate calendar integration endpoints
- [ ] Add to accounting settings

---

### FEATURE-011: Unified Product Catalogue (Foundation)

**Flag Key:** `feature-unified-catalogue`  
**Parent Module:** `module-inventory`  
**Default:** Disabled (major change)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate new catalogue UI
- [ ] Gate catalogue API endpoints
- [ ] Provide migration toggle for legacy product views

---

### FEATURE-012: Sales Sheet Generator (Staff Tool)

**Flag Key:** `feature-sales-sheet-generator`  
**Parent Module:** `module-sales`  
**Default:** Disabled (depends on FEATURE-011)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate sales sheet creation UI
- [ ] Gate PDF generation endpoints
- [ ] Add to sales module settings

---

### FEATURE-013: Quote/Order Unification

**Flag Key:** `feature-quote-order-unified`  
**Parent Module:** `module-sales`  
**Default:** Disabled (major workflow change)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate unified order creation flow
- [ ] Gate quote-to-order conversion
- [ ] Provide legacy order creation fallback

---

### FEATURE-014: VIP Portal Catalogue Integration

**Flag Key:** `feature-vip-catalogue`  
**Parent Module:** `module-vip-portal`  
**Default:** Disabled (depends on FEATURE-011)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate catalogue view in VIP Portal
- [ ] Gate product browsing endpoints
- [ ] Add to VIP Portal settings

---

### FEATURE-019: Signal Messaging System

**Flag Key:** `feature-signal-messaging`  
**Parent Module:** None (communication)  
**Default:** Disabled (external integration)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate Signal configuration UI
- [ ] Gate message sending endpoints
- [ ] Add to communication settings

---

### FEATURE-020: Tags System Revamp & Auto-Tagging Rules

**Flag Key:** `feature-auto-tagging`  
**Parent Module:** None (system-wide)  
**Default:** Disabled (new behavior)

**Integration Points:**

- [ ] Add flag to seedFeatureFlags.ts
- [ ] Gate auto-tagging rules UI
- [ ] Gate rule execution engine
- [ ] Provide manual tagging fallback

---

### Sample Management Enhancement (SAMPLE-001 to SAMPLE-009)

**Flag Key:** `feature-sample-management`  
**Parent Module:** `module-inventory`  
**Default:** Enabled (existing functionality)

**Additional Flags:**

- `feature-sample-returns` - Sample return workflow (default: disabled)
- `feature-vendor-sample-returns` - Vendor return workflow (default: disabled)

**Integration Points:**

- [ ] Add flags to seedFeatureFlags.ts
- [ ] Gate Sample Management page
- [ ] Gate return workflow endpoints
- [ ] Add to inventory settings

---

## Rollout Strategy Template

When enabling a new feature:

1. **Alpha** (Internal Testing)
   - Enable for admin users only via user override
   - Duration: 1-2 days

2. **Beta** (Limited Rollout)
   - Enable for specific roles via role override
   - Duration: 1 week

3. **General Availability**
   - Set `defaultEnabled: true`
   - Monitor for issues

4. **Full Rollout**
   - Set `systemEnabled: true`
   - Remove beta designation

---

## Audit Trail

All feature flag changes are logged in `feature_flag_audit_logs` table:

| Field         | Description                             |
| ------------- | --------------------------------------- |
| flagId        | Feature flag ID                         |
| action        | CREATE, UPDATE, DELETE, ENABLE, DISABLE |
| changedBy     | User who made the change                |
| previousValue | Value before change                     |
| newValue      | Value after change                      |
| timestamp     | When change occurred                    |

---

## Related Documentation

- [Feature Flag System Final Summary](../qa-reviews/FEATURE_FLAG_FINAL_SUMMARY.md)
- [Feature Flag QA Reviews](../qa-reviews/)
- [Seed Feature Flags](../../server/services/seedFeatureFlags.ts)

---

**End of Document**

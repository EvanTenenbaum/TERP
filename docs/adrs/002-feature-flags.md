# ADR-002: Feature Flags System

**Date**: 2025-10-22  
**Status**: Accepted  
**Deciders**: Evan Tenenbaum  

## Context

To enable safe iteration and gradual rollout of new features without breaking production, we need a feature flag system that allows:

- Toggling features on/off without code deployment
- Different states in preview vs production environments
- Scoped flags (global, per-user, per-customer)
- Kill switch capability for problematic features

## Decision

We will implement a **lightweight feature flag system** in `@terp/config/flags.ts` with:

### Flag Definition

```typescript
export type FeatureFlag = {
  key: string;
  description: string;
  defaultValue: boolean;
  scope: 'global' | 'user' | 'customer';
};
```

### Priority Order

1. **Database override** (future): Per-user or per-customer overrides stored in DB
2. **Environment variable**: `FEATURE_{FLAG_KEY}=true|false`
3. **Default value**: Defined in code (always `false` for new features in production)

### Usage Pattern

```typescript
import { isFeatureEnabled } from '@terp/config';

if (await isFeatureEnabled('ENABLE_MOBILE_UI')) {
  // Show new mobile UI
} else {
  // Show legacy UI
}
```

### Flag Lifecycle

1. **Introduction**: Add flag with `defaultValue: false`
2. **Preview testing**: Enable via `FEATURE_{FLAG_KEY}=true` in preview environment
3. **Gradual rollout**: Enable for specific users/customers via DB override
4. **Full rollout**: Change `defaultValue: true` or remove flag entirely
5. **Deprecation**: Remove flag and old code path after stable rollout

## Consequences

### Positive
- **Safe iteration**: New features can be developed and merged without affecting production
- **Gradual rollout**: Test features with subset of users before full deployment
- **Kill switch**: Instantly disable problematic features via environment variable
- **No stubs in production**: All code is deployed but gated behind flags

### Negative
- **Code complexity**: Conditional logic adds branching paths
- **Technical debt**: Old code paths must be maintained until flag removal
- **Testing overhead**: Both flag states should be tested

### Neutral
- **Flag hygiene**: Flags should be temporary; remove after full rollout
- **Documentation**: Each flag must have clear description and owner

## Alternatives Considered

1. **Third-party service (LaunchDarkly, Split.io)**: Rejected due to cost and external dependency
2. **No feature flags**: Rejected due to inability to safely iterate
3. **Branch-based deployment**: Rejected due to complexity and preview environment limitations

## References

- [Feature Flags Best Practices](https://martinfowler.com/articles/feature-toggles.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)


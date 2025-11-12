---
name: 🔒 Security Fix
about: Fix a security vulnerability from QA report
title: '[SECURITY] '
labels: security, critical, qa-report
assignees: ''
---

## Security Issue

**Severity:** 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low

**QA Report Reference:**
- See: `CODE_QA_EXECUTIVE_SUMMARY.md` → Section X
- See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 7, Item X

## Vulnerability Description

<!-- What is the security issue? -->

## Current Behavior

**File:** `path/to/file.ts:line`
```typescript
// Current vulnerable code
```

## Expected Behavior

```typescript
// Fixed secure code
```

## Impact

<!-- What could an attacker do? -->
- [ ] Unauthorized data access
- [ ] Database modification
- [ ] Account takeover
- [ ] Information disclosure
- [ ] Other: ___

## Fix Checklist

- [ ] Change `publicProcedure` to `protectedProcedure` or `adminProcedure`
- [ ] Add authorization checks
- [ ] Remove hardcoded credentials
- [ ] Fix weak JWT secret
- [ ] Add input validation
- [ ] Add security tests
- [ ] Update security documentation

## Testing

**How to test the fix:**
1.
2.
3.

## Related Issues
<!-- Link related security issues -->

## Phase
- Phase 1: Security Lockdown (Week 1 priority)

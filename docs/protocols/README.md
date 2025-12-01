# TERP Development Protocols

**Version:** 1.0
**Last Updated:** 2025-12-01

This directory contains all code quality and development standards for the TERP project.

---

## Protocol Index

| Protocol | Purpose | Priority |
|----------|---------|----------|
| [CODE_STANDARDS.md](./CODE_STANDARDS.md) | TypeScript, React, error handling patterns | **MANDATORY** |
| [TESTING_QUALITY.md](./TESTING_QUALITY.md) | Test coverage, quality standards, anti-patterns | **MANDATORY** |
| [DATABASE_STANDARDS.md](./DATABASE_STANDARDS.md) | Schema design, naming, migrations | **MANDATORY** |
| [PERFORMANCE_STANDARDS.md](./PERFORMANCE_STANDARDS.md) | React optimization, query performance | **MANDATORY** |
| [ACCESSIBILITY_STANDARDS.md](./ACCESSIBILITY_STANDARDS.md) | WCAG 2.1 AA compliance | **MANDATORY** |

---

## Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Architecture Decisions | [/docs/adr/](../adr/) | Document significant architectural choices |
| Development Workflow | [MANDATORY_READING.md](../../MANDATORY_READING.md) | Session workflow, git practices |
| Agent Onboarding | [AGENT_ONBOARDING.md](../../AGENT_ONBOARDING.md) | Getting started for AI agents |

---

## Quick Reference: Key Rules

### TypeScript
- NO `any` types
- NO `as` assertions without justification
- ALL functions must have explicit return types

### React
- ALL reusable components use `React.memo`
- ALL event handlers use `useCallback` when passed to children
- ALL derived data uses `useMemo`

### Testing
- Tier 1 (financial): 90%+ coverage
- Tier 2 (business): 80%+ coverage
- NO placeholder tests
- NO implementation detail testing

### Database
- Monetary values: `decimal(15, 2)`
- Quantities: `decimal(15, 4)`
- Booleans: `boolean()` not `int(0/1)`
- ALL foreign keys indexed

### Accessibility
- ALL interactive elements keyboard accessible
- ALL form inputs have labels
- ALL icon buttons have `aria-label`
- NO color as sole status indicator

---

## Enforcement

These protocols are enforced by:

1. **Automated Checks**
   - ESLint rules
   - TypeScript strict mode
   - Pre-commit hooks
   - CI pipeline

2. **Code Review**
   - All PRs must pass protocol checklist
   - Violations result in rejection

3. **Testing**
   - Coverage thresholds in CI
   - Accessibility testing with axe

---

## Protocol Changes

To propose changes to these protocols:

1. Create an ADR documenting the proposed change
2. Submit PR with protocol updates
3. Get approval from project lead
4. Update version number and date

---

## Questions?

If a protocol is unclear or doesn't cover your situation:
1. Check related protocols for guidance
2. Look at existing code patterns
3. Ask project lead for clarification
4. Document the decision in an ADR

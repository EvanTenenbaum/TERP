---
inclusion: always
---

# 🚀 MVP Iteration Protocol

**Version**: 1.1  
**Last Updated**: 2025-12-19  
**Status**: ACTIVE - Post-MVP Development

---

## Purpose

This protocol **extends** existing SOPs to enable fast iteration while tracking technical debt.

**Philosophy**: Ship fast, track debt, harden before scale.

**This protocol does NOT replace:**
- `08-adaptive-qa-protocol.md` - Still use for QA classification
- `99-pre-commit-checklist.md` - Still use before every commit
- `01-development-standards.md` - Still follow all standards
- `07-deprecated-systems.md` - Still avoid deprecated patterns

**This protocol ADDS:**
- Technical debt tracking system
- Feature maturity classification
- Hardening triggers and thresholds
- Weekly debt review process

---

## 🎯 Feature Maturity Levels

> **Integration with Adaptive QA**: These maturity levels help you classify work TYPE in `08-adaptive-qa-protocol.md`. Use maturity level to inform your QA classification.

| Maturity | Maps to QA Type | QA Level | When to Use |
|----------|-----------------|----------|-------------|
| 🧪 EXPERIMENTAL | EXPLORATORY | Level 1 | Testing ideas, POCs |
| 🔨 FUNCTIONAL | ITERATIVE/PRODUCTION | Level 2 | Real users, common paths |
| 🏛️ HARDENED | PRODUCTION/FINANCIAL | Level 3 | Scale, critical paths |

### Maturity Definitions

**🧪 EXPERIMENTAL**: Happy path only, manual testing, can be removed entirely
**🔨 FUNCTIONAL**: Common edge cases handled, unit tests, won't corrupt data  
**🏛️ HARDENED**: All edge cases, 80%+ coverage, optimized, monitored

### Promotion Criteria

**EXPERIMENTAL → FUNCTIONAL**:
- [ ] Users want this feature (validated)
- [ ] Core happy path works
- [ ] No data corruption possible
- [ ] Basic error handling exists

**FUNCTIONAL → HARDENED**:
- [ ] Feature is used regularly
- [ ] Edge cases documented and handled
- [ ] Performance acceptable at 10x current load
- [ ] Full test coverage (80%+)
- [ ] Monitoring/alerting in place

---

## 🛡️ Safety Rails Reference

> **These are already defined in existing protocols. This is a quick reference only.**
> **Full details**: `01-development-standards.md`, `07-deprecated-systems.md`

| Rule | Reference | Quick Check |
|------|-----------|-------------|
| Soft deletes only | `07-deprecated-systems.md` | No `db.delete()` |
| Transactions for multi-write | `01-development-standards.md` | `db.transaction()` wraps related writes |
| Zod validation | `01-development-standards.md` | All inputs validated |
| Auth check | `07-deprecated-systems.md` | `getAuthenticatedUserId(ctx)` |
| Error handling | `01-development-standards.md` | try/catch with logging |

**If you need code examples, see the referenced protocols.**

---

## 📝 Technical Debt Tracking (NEW)

**This is the core new capability this protocol adds.**

### The Debt Registry

Location: `docs/TECHNICAL_DEBT.md`

All shortcuts MUST be tracked:

```markdown
### [DEBT-XXX] Brief description
- **Feature**: Module/feature name
- **Maturity**: 🧪 EXPERIMENTAL / 🔨 FUNCTIONAL / 🏛️ HARDENED
- **Shortcut**: What was skipped
- **Risk**: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW - Why
- **Harden by**: Trigger condition
- **Effort**: Estimated hours
- **Created**: YYYY-MM-DD
```

### When to Add Debt Entries

| Situation | Action |
|-----------|--------|
| Skipping tests for speed | Add debt entry |
| Not handling edge case | Add debt entry |
| Using TODO comment | Add debt entry |
| Hardcoding a value | Add debt entry |
| Skipping optimization | Add debt entry |

### Risk Levels

| Level | Definition | Action Required |
|-------|------------|-----------------|
| 🔴 HIGH | Data loss, security, major UX | Fix within 1 week |
| 🟡 MEDIUM | Problems at scale, degraded UX | Fix before threshold |
| 🟢 LOW | Minor, cosmetic, unlikely | Fix when convenient |

---

## 📊 Hardening Triggers (NEW)

**When these thresholds are hit, harden the affected feature:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Table row count | 1000 rows | Add pagination |
| API response time | > 500ms | Optimize query |
| Error rate | > 1% | Investigate and fix |
| Daily active users | 10+ | Review EXPERIMENTAL features |
| Transaction volume | 100/day | Harden financial features |

---

## 🔄 Workflow Integration

### How This Fits with Existing Protocols

```
1. Start work
   ↓
2. Classify maturity level (this protocol)
   ↓
3. Use maturity to inform QA classification (08-adaptive-qa-protocol.md)
   ↓
4. Implement following standards (01-development-standards.md)
   ↓
5. If taking shortcuts → Add to debt registry (this protocol)
   ↓
6. Run Adaptive QA (08-adaptive-qa-protocol.md)
   ↓
7. Run Pre-Commit Checklist (99-pre-commit-checklist.md)
   ↓
8. Commit and deploy
```

### Quick Decision Tree

```
Am I taking a shortcut?
├── No → Follow normal protocols, ship it
└── Yes → Is it safe? (no data corruption, reversible)
    ├── No → Don't take the shortcut
    └── Yes → Add debt entry, then ship it
```

---

## 🗓️ Weekly Debt Review (NEW)

**Every Friday:**

1. **Review registry**: `cat docs/TECHNICAL_DEBT.md`
2. **Check thresholds**: Any "harden by" conditions met?
3. **Prioritize**: Pick 1-2 HIGH/MEDIUM items for next week
4. **Archive resolved**: Move completed items to "Resolved" section

---

## 🆘 Emergency Procedures

### If You Break Production

1. **Don't panic** - soft deletes and backups exist
2. **Assess** - what data is affected?
3. **Rollback code** - `git revert HEAD && git push`
4. **Check data** - look at `deletedAt` records
5. **Restore if needed** - use database backup
6. **Post-mortem** - document what happened

### If You Find Unreported Debt

1. Add to `docs/TECHNICAL_DEBT.md` immediately
2. Assess risk level
3. If 🔴 HIGH, flag to team
4. Create hardening task if needed

---

## Summary

**What this protocol adds to existing SOPs:**

| Capability | File |
|------------|------|
| Debt tracking | `docs/TECHNICAL_DEBT.md` |
| Maturity classification | Informs QA level selection |
| Hardening triggers | When to upgrade maturity |
| Weekly review process | Ensures debt doesn't accumulate |

**What this protocol does NOT replace:**

- QA classification → Use `08-adaptive-qa-protocol.md`
- Pre-commit checks → Use `99-pre-commit-checklist.md`
- Code standards → Use `01-development-standards.md`
- Deprecated patterns → Use `07-deprecated-systems.md`

---

**Ship fast. Track debt. Harden before scale. 🚀**

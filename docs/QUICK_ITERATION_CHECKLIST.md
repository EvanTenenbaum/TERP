# ⚡ Quick Iteration Checklist

**Use alongside existing protocols, not instead of them.**

---

## Before You Code

```
□ What maturity level? (EXPERIMENTAL / FUNCTIONAL / HARDENED)
□ Does it touch financial/inventory data? → Minimum FUNCTIONAL
□ Is it reversible? → Can ship faster if yes
```

---

## While You Code

### If Taking Shortcuts

```
□ Is it safe? (no data corruption, reversible)
□ Add TODO comment: // TODO: [DEBT-XXX] description
□ Add entry to docs/TECHNICAL_DEBT.md
□ Set "Harden by" trigger
```

### Safety Rails Quick Check
> Full details in `01-development-standards.md` and `07-deprecated-systems.md`

```
□ No db.delete() - use soft deletes
□ db.transaction() for multi-table writes
□ Zod validation on inputs
□ getAuthenticatedUserId(ctx) for mutations
□ try/catch with logging
```

---

## Before You Ship

**Use existing protocols:**

1. **Run Adaptive QA** → `08-adaptive-qa-protocol.md`
   - Classify work (use maturity level to inform)
   - Select QA level (1/2/3)
   - Execute QA

2. **Run Pre-Commit Checklist** → `99-pre-commit-checklist.md`
   - Architecture compliance
   - Code quality checks
   - Roadmap compliance

3. **If shortcuts taken** → Add debt entries

---

## Weekly (Friday)

```
□ Review docs/TECHNICAL_DEBT.md
□ Check if any "Harden by" conditions met
□ Pick 1-2 items to harden next week
□ Archive any resolved debt
```

---

## Emergency

**If you break production:**
1. `git revert HEAD && git push`
2. Check soft-deleted records
3. Restore from backup (last resort)
4. Write post-mortem

---

## Protocol References

| Need | Protocol |
|------|----------|
| QA classification | `08-adaptive-qa-protocol.md` |
| Pre-commit checks | `99-pre-commit-checklist.md` |
| Code standards | `01-development-standards.md` |
| Deprecated patterns | `07-deprecated-systems.md` |
| Debt tracking | `11-mvp-iteration-protocol.md` |

---

**Ship fast. Track debt. Harden before scale.**

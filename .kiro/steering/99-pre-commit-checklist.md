---
inclusion: always
---

# Pre-Commit Checklist (Mandatory)

This checklist **does not replace** the adaptive verification protocol.  
Read: `.kiro/steering/08-adaptive-qa-protocol.md`

## Core Verification (Always)

- [ ] TypeScript compiles: `pnpm check` (no errors)
- [ ] Linting passes: `pnpm lint` (no errors)
- [ ] Tests pass: `pnpm test` (or targeted tests with justification)
- [ ] Build passes: `pnpm build` (if code shipped to production)
- [ ] E2E passes: `pnpm test:e2e` or `pnpm test:smoke` (if UI/business flow changed)

## Discipline

- [ ] Pulled latest: `git pull origin main`
- [ ] No TODOs, stubs, or placeholders added
- [ ] Commit message states **what changed** + **what was verified**

## If You Cannot Run a Required Check

- [ ] Mark status as **UNSURE**
- [ ] Provide exact local/CI verification plan
- [ ] Do **not** claim correctness

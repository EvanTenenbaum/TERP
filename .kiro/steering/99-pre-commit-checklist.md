---
inclusion: always
---

# ✅ Pre-Commit Checklist

**MANDATORY**: Before every commit, verify:

## Architecture Compliance

- [ ] No deprecated systems used (see `07-deprecated-systems.md`)
- [ ] No `vendors` table queries (use `clients` with `isSeller=true`)
- [ ] No `ctx.user?.id || 1` patterns (use `getAuthenticatedUserId`)
- [ ] Soft deletes used (not hard deletes)
- [ ] FK indexes added for new foreign keys

## Code Quality

- [ ] No `any` types (run: `pnpm typecheck`)
- [ ] All tests pass (run: `pnpm test`)
- [ ] No linting errors (run: `pnpm lint`)
- [ ] Diagnostics clear (use: `getDiagnostics`)

## Roadmap Compliance

- [ ] Roadmap validates (run: `pnpm roadmap:validate`)
- [ ] Task status updated
- [ ] Session file updated

## Coordination

- [ ] Pulled latest: `git pull origin main`
- [ ] No conflicts with active sessions
- [ ] Changes pushed: `git push origin main`

## Deployment

- [ ] Deployment monitored (auto-starts on push)
- [ ] Health check passes
- [ ] No runtime errors

**If ANY item fails, DO NOT proceed. Fix the issue first.**

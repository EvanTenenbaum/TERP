---
inclusion: always
---

# ✅ Pre-Commit Checklist

**MANDATORY**: Before every commit, verify:

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

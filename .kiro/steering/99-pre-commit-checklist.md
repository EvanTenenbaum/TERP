---
inclusion: always
---
# Pre-Commit Checklist (Streamlined)

Before committing, verify these 5 essentials:

## Quick Checks

- [ ] TypeScript compiles: pnpm check (no errors)
- [ ] Linting passes: pnpm lint (no errors)  
- [ ] Tests pass: pnpm test (if you changed test-related code)
- [ ] Pull first: git pull origin main (avoid conflicts)
- [ ] Push after: git push origin main (share your work)

## Thats It

The pre-commit hook handles formatting automatically.
CI/CD handles comprehensive testing on push.

Do not overthink it. Ship it.

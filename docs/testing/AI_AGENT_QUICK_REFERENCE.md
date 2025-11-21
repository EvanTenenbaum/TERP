# AI Agent Quick Reference - TERP Testing

**⚠️ MANDATORY: Read this before making ANY code changes to TERP**

---

## 🎯 Primary Directive

**All new code must include tests. No exceptions.**

---

## ✅ Pre-Commit Checklist

Before every commit, verify:

- [ ] Tests written FIRST (TDD: Red → Green → Refactor)
- [ ] All tests pass locally (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checks pass (`pnpm typecheck`)
- [ ] Commit message follows Conventional Commits

---

## 🔬 Live QA Workflow

**When the user says "live qa":**

1. **Load QA Prompt:** Read `docs/agent_prompts/live_qa/live_qa_prompt.md`
2. **Follow 4-Phase Process:**
   - Phase 1: Pre-Flight Check (8 steps)
   - Phase 2: Session Startup & Automation
   - Phase 3: Systematic Testing (7 layers)
   - Phase 4: Reporting & Completion
3. **Deliver QA Report:** Comprehensive findings logged in `QA_TASKS_BACKLOG.md`

**This is NOT a development workflow - it's specialized QA testing.**

---

## 🔄 TDD Workflow (MANDATORY)

1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green

**Never write implementation code before writing tests.**

---

## 📝 Where to Put Tests

| Code Type         | Test Location                 | Example                          |
| ----------------- | ----------------------------- | -------------------------------- |
| Utility functions | `server/lib/**/*.test.ts`     | `utils.ts` → `utils.test.ts`     |
| tRPC routers      | `server/routers/**/*.test.ts` | `clients.ts` → `clients.test.ts` |
| E2E user flows    | `e2e/**/*.spec.ts`            | `e2e/create-order.spec.ts`       |

---

## 🚀 Essential Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for TDD)
pnpm test:watch

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm playwright test

# Run all quality checks
pnpm check
```

---

## 📚 Full Documentation

- **[AI Agent Integration Guide](docs/testing/TERP_AI_AGENT_INTEGRATION_GUIDE.md)** - Complete workflow
- **[Testing Usage Guide](docs/testing/TERP_TESTING_USAGE_GUIDE.md)** - How to run and write tests
- **[Contributing Guide](.github/CONTRIBUTING.md)** - Contribution requirements

---

## 🚫 What NOT to Do

- ❌ Write code without tests
- ❌ Skip the TDD workflow
- ❌ Bypass pre-commit hooks with `--no-verify`
- ❌ Commit failing tests
- ❌ Ignore linting or type errors

---

## 💡 Testing Trophy Priorities

Focus your testing efforts in this order:

1. **Integration Tests (50%)** - Test how units work together
2. **Unit Tests (20%)** - Test individual functions
3. **E2E Tests (20%)** - Test complete user workflows
4. **Static Analysis (10%)** - Linting and type checking

---

## 🆘 When in Doubt

1. Check the [Testing Best Practices](docs/testing/TERP_TESTING_BEST_PRACTICES.md)
2. Look at existing tests for examples
3. Ask for clarification before proceeding

---

**Remember: Quality code is tested code. Your commitment to testing is essential for TERP's success.** ✨

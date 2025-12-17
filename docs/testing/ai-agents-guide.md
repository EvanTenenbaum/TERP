# Playwright AI Agents Guide

**Version**: 1.0  
**Last Updated**: 2025-12-12  
**Status**: Active

This guide covers Playwright's built-in AI agents (Planner, Generator, Healer) and how to use them with TERP's testing infrastructure.

---

## Overview

Playwright 1.56+ includes three AI agents that can autonomously:
- **Explore** your application and generate test plans
- **Generate** executable Playwright tests from plans
- **Heal** failing tests when UI changes

### When to Use AI Agents vs Manual Testing

| Use AI Agents | Write Manual Tests |
|---------------|-------------------|
| Exploratory testing of new features | Critical security flows |
| CRUD operations coverage | Payment processing |
| Navigation and UI flows | Complex business logic |
| Regression test generation | Edge cases requiring domain knowledge |
| Maintenance after UI refactors | Performance-sensitive tests |

---

## The Three AI Agents

### 1. Planner Agent

**Purpose**: Explores your application and generates Markdown test plans.

**Command**:
```bash
pnpm test:e2e:ai:plan
# Or with specific URL:
npx playwright ai plan http://localhost:5173/orders
```

**Output**: Markdown files in `specs/` directory

**When to use**:
- Starting new test coverage for a module
- Documenting existing feature behavior
- Creating test specifications for review

**Example workflow**:
```bash
# 1. Start dev server
pnpm dev

# 2. Run Planner on Orders module
npx playwright ai plan http://localhost:5173/orders

# 3. Review generated plan
cat specs/core/orders-workflow.md

# 4. Edit plan to add edge cases
# (manual editing)
```

### 2. Generator Agent

**Purpose**: Converts Markdown test plans into executable Playwright tests.

**Command**:
```bash
pnpm test:e2e:ai:generate specs/core/orders-workflow.md
# Or:
npx playwright ai generate specs/core/orders-workflow.md
```

**Output**: Test files in `tests-e2e/ai-generated/`

**When to use**:
- After reviewing and approving a test plan
- Converting specifications to executable tests
- Bulk test generation from multiple specs

**Example workflow**:
```bash
# 1. Generate tests from approved plan
npx playwright ai generate specs/core/orders-workflow.md

# 2. Run generated tests
pnpm test:e2e tests-e2e/ai-generated/core/orders-workflow.spec.ts

# 3. Review and commit
git add specs/ tests-e2e/ai-generated/
git commit -m "test: add AI-generated orders workflow tests"
```

### 3. Healer Agent

**Purpose**: Automatically repairs failing tests when UI changes.

**Command**:
```bash
pnpm test:e2e:ai:heal
# Or:
npx playwright ai heal
```

**Output**: Updated test files with fixed selectors/assertions

**When to use**:
- After UI refactoring causes test failures
- When selectors become stale
- Periodic maintenance of test suite

**Example workflow**:
```bash
# 1. Run tests and identify failures
pnpm test:e2e

# 2. Auto-heal failing tests
npx playwright ai heal

# 3. Review healed tests
git diff tests-e2e/

# 4. Run tests again to verify
pnpm test:e2e

# 5. Commit healed tests
git commit -am "test: heal tests after UI refactor"
```

---

## Workflow Patterns

### Pattern 1: New Feature Coverage

1. Deploy feature to local dev environment
2. Run Planner agent to explore feature
3. Review generated test plan
4. Edit plan to add edge cases
5. Run Generator agent to create tests
6. Run tests and verify coverage
7. Commit both plan and generated tests

```bash
# Complete workflow
pnpm dev &
npx playwright ai plan http://localhost:5173/new-feature
# Review and edit specs/features/new-feature.md
npx playwright ai generate specs/features/new-feature.md
pnpm test:e2e tests-e2e/ai-generated/features/
git add specs/ tests-e2e/ai-generated/
git commit -m "test: add coverage for new-feature"
```

### Pattern 2: Maintenance After UI Changes

1. Make UI changes (refactor, redesign)
2. Run existing test suite
3. Identify failing tests
4. Run Healer agent to auto-repair
5. Review healed tests for correctness
6. Commit healed versions

```bash
# After UI changes
pnpm test:e2e 2>&1 | tee test-results.log
npx playwright ai heal
pnpm test:e2e  # Verify fixes
git commit -am "test: heal tests after UI refactor"
```

### Pattern 3: Comprehensive Module Coverage

1. Run Planner on module root URL
2. Let Planner explore all subpages
3. Generate multiple test plans
4. Use Generator to create test suite
5. Run Healer periodically to maintain

```bash
# Comprehensive coverage for Orders module
npx playwright ai plan http://localhost:5173/orders
npx playwright ai plan http://localhost:5173/orders/create
npx playwright ai plan http://localhost:5173/quotes
npx playwright ai generate specs/core/orders-*.md
```

---

## Integration with Existing Tests

### Using Existing Page Objects

AI-generated tests can import and use existing page objects:

```typescript
// In AI-generated test
import { BasePage } from '../page-objects/BasePage';
import { CRUDPage } from '../page-objects/CRUDPage';
```

Reference files:
- `tests-e2e/page-objects/BasePage.ts`
- `tests-e2e/page-objects/CRUDPage.ts`

### Authentication

AI agents use `tests-e2e/seed.spec.ts` for authenticated context:

```bash
# Run seed spec first to establish auth
pnpm test:e2e tests-e2e/seed.spec.ts
```

Session state is stored in `playwright/.auth/` for reuse.

### Database Setup

AI-generated tests use the same global setup:
- `testing/setup-e2e.ts` runs before all tests
- Database reset with `pnpm db:reset:test --scenario=full`
- No special configuration needed

---

## Best Practices

### Do ✅

- Review AI-generated test plans before generating tests
- Edit plans to add business-specific edge cases
- Run Healer after major UI refactors
- Keep AI-generated tests in separate directory
- Commit both plans (`specs/`) and tests (`tests-e2e/ai-generated/`)
- Use AI agents for exploratory testing of new features
- Run seed spec to establish authentication context

### Don't ❌

- Blindly trust AI-generated tests without review
- Use AI agents for critical security or payment flows
- Delete original tests when healing (keep both versions)
- Run Planner on production URLs (use local dev only)
- Skip manual testing even with AI coverage
- Mix AI-generated tests with human-written tests in same directory

---

## Commands Reference

```bash
# Initialize AI agents (one-time setup)
pnpm test:e2e:ai:init

# Explore app and generate test plan
pnpm test:e2e:ai:plan

# Generate tests from plan
pnpm test:e2e:ai:generate specs/core/orders-workflow.md

# Auto-heal failing tests
pnpm test:e2e:ai:heal

# Run AI-generated tests only
pnpm test:e2e:ai:run

# Run all tests (existing + AI-generated)
pnpm test:e2e
```

---

## Troubleshooting

### Planner doesn't explore all pages

**Cause**: Authentication not set up properly  
**Solution**: Run `tests-e2e/seed.spec.ts` first to establish auth context

### Generator creates invalid tests

**Cause**: Spec format issues or ambiguous scenarios  
**Solution**: Review and edit the Markdown plan before generating

### Healer changes too much

**Cause**: Major UI restructuring  
**Solution**: Review healed tests manually; consider regenerating from updated specs

### AI agents timeout

**Cause**: Slow application or complex pages  
**Solution**: Increase timeout in `playwright.config.ts` or break into smaller plans

### Tests fail after healing

**Cause**: Healer fixed selectors but logic changed  
**Solution**: Manually review and update test assertions

---

## Maintenance

### Regenerating Agent Definitions

After Playwright updates:
```bash
npx playwright init-agents --loop=vscode
```

This picks up new tools and instructions from the latest version.

### Updating Test Plans

1. Edit Markdown files in `specs/` directory
2. Re-run Generator to update tests
3. Version control both plans and tests

### Archiving Old Tests

Move superseded tests to `tests-e2e/ai-generated/archived/`:
```bash
mkdir -p tests-e2e/ai-generated/archived
mv tests-e2e/ai-generated/old-test.spec.ts tests-e2e/ai-generated/archived/
```

---

## File Structure

```
tests-e2e/
├── seed.spec.ts                    # Authentication & base setup
├── auth.spec.ts                    # Existing auth tests
├── *.spec.ts                       # Other existing tests
├── page-objects/                   # Reusable page objects
├── ai-generated/                   # AI-generated tests
│   ├── core/                       # Core business workflows
│   ├── accounting/                 # Financial workflows
│   ├── features/                   # Secondary features
│   └── healed/                     # Auto-healed versions

specs/                              # Markdown test plans
├── README.md                       # Spec format documentation
├── core/                           # Core workflow plans
├── accounting/                     # Accounting workflow plans
└── features/                       # Feature workflow plans
```

---

## Related Documentation

- [TERP Testing Best Practices](./TERP_TESTING_BEST_PRACTICES.md)
- [E2E Testing Guide](./E2E_TESTING_GUIDE.md)
- [Playwright Official Docs](https://playwright.dev/docs/ai-agents)

---

**Remember**: AI agents are tools to augment your testing, not replace critical thinking. Always review generated content before committing.

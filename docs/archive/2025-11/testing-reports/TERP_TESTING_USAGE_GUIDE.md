# TERP Testing Infrastructure - Usage Guide

**Date**: November 6, 2025  
**Status**: ✅ **Ready for Use**

---

## 🚀 Overview

This guide provides a comprehensive overview of the TERP testing infrastructure. It is designed for both human developers and AI agents to ensure consistent, high-quality testing practices across the entire development lifecycle.

Our testing strategy is based on the **Testing Trophy** model, which prioritizes integration tests to provide the best return on investment. This ensures our tests are both fast and realistic, giving us high confidence in our codebase.

### Testing Philosophy

| Test Type           | Effort Allocation | Description                                                                                                       |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Integration**     | 50%               | Tests how multiple units work together. These are the most valuable tests for ensuring business logic is correct. |
| **Unit**            | 20%               | Tests individual functions or components in isolation. Fast and cheap to write.                                   |
| **E2E**             | 20%               | Simulates real user workflows from end-to-end. Catches issues that other tests miss.                              |
| **Static Analysis** | 10%               | Catches typos, syntax errors, and type issues before any code is run. Includes linting and type checking.         |

---

## 🛠️ How to Run Tests

### 1. Automated Testing (CI/CD)

All tests are run automatically on every push to GitHub via **GitHub Actions**. You do not need to do anything to trigger them.

- **On Pull Requests (`pr.yml`)**: A fast suite of checks runs to provide quick feedback (< 5 minutes).
  - ✅ Linting & Type Checking
  - ✅ Unit Tests

- **On Merges to `main` (`merge.yml`)**: The full test suite runs to ensure the main branch is always stable.
  - ✅ Database Seeding (with `light` scenario)
  - ✅ Integration Tests
  - ✅ E2E Tests (with Playwright & Argos for visual regression)
  - ✅ Test Coverage Checks

### 2. Manual Testing (Local Development)

To run tests locally, use the following `pnpm` commands from the root of the `TERP` directory.

#### Running the Full Suite

```bash
# Run all tests (lint, unit, integration, e2e)
pnpm test
```

#### Running Specific Test Types

```bash
# Run only unit tests
pnpm test:unit

# Run only integration tests (requires Docker)
pnpm test:integration

# Run only E2E tests (requires Docker)
pnpm playwright test
```

#### Seeding the Test Database

The test database is automatically seeded before integration and E2E tests. You can also seed it manually:

```bash
# Seed with the "light" scenario (for integration tests)
pnpm seed light

# Seed with the "full" scenario (for E2E tests)
pnpm seed full
```

---

## 📊 Viewing Test Results

### GitHub Actions

- **Test Reports**: Go to the "Checks" tab on any pull request to see the status of all tests.
- **Playwright Report**: A full HTML report for E2E tests is uploaded as an artifact on every `merge` workflow run. You can download and view it locally.
- **Argos Visual Regression**: A link to the Argos dashboard with visual diffs is automatically posted as a comment on pull requests.

### Local Development

- **Vitest UI**: For a visual interface to run and debug unit/integration tests, use:
  ```bash
  pnpm test:integration --ui
  ```
- **Playwright UI**: For a powerful UI to run and debug E2E tests, use:
  ```bash
  pnpm playwright test --ui
  ```

---

## ✍️ How to Add New Tests

### Unit Tests

- **Location**: `server/lib/**/*.test.ts`
- **Convention**: Create a `*.test.ts` file next to the file you are testing.
- **Example**: To test `utils.ts`, create `utils.test.ts`.

### Integration Tests

- **Location**: `server/routers/**/*.test.ts`
- **Convention**: Test each tRPC router endpoint with its own test file.
- **Example**: To test `clients.ts` router, create `clients.test.ts`.

### E2E Tests

- **Location**: `e2e/**/*.spec.ts`
- **Convention**: Create a new `*.spec.ts` file for each user flow you want to test.
- **Example**: `e2e/create-order.spec.ts`

---

## 🐞 Debugging Failures

1. **Check the Logs**: The first step is always to check the detailed logs in GitHub Actions.
2. **Reproduce Locally**: Try to run the failing test locally to get more information.
3. **Use the UI**: Use the Vitest or Playwright UI for interactive debugging.
4. **Check the Database**: If seeding fails, check the Docker container logs for the test database.

---

This guide provides the foundation for maintaining a high-quality, well-tested codebase. By following these practices, we can ensure TERP remains stable, reliable, and easy to maintain.

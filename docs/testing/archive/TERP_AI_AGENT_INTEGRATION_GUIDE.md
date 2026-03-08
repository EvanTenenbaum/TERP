# TERP AI Agent - Testing Integration Guide

**Date**: November 6, 2025  
**Objective**: To ensure all AI agents contribute to and follow TERP testing best practices.

---

## 🤖 Primary Directive

As an AI agent working on the TERP codebase, your primary directive is to **leave the code in a better state than you found it**. This includes writing clean, efficient code and ensuring it is well-tested.

**All new code must be accompanied by tests.** No exceptions.

---

## 📝 Agent Workflow

When assigned a task, all AI agents must follow this workflow:

1. **Understand the Goal**: Analyze the user's request and the existing codebase to fully understand the task requirements.

2. **Identify Code to Modify**: Locate the specific files and functions that need to be changed.

3. **Write/Modify Tests FIRST (TDD)**: Before writing any implementation code, write or modify the tests that will verify the new functionality. This is a form of **Test-Driven Development (TDD)**.
   - **For new features**: Write a new test file.
   - **For bug fixes**: Write a new test that reproduces the bug.

4. **Run Tests and Watch Them Fail**: Run the tests and confirm that they fail as expected. This is a critical step to ensure your tests are working correctly.

5. **Write Implementation Code**: Write the code to make the tests pass.

6. **Run Tests and Watch Them Pass**: Run the tests again and confirm that they all pass.

7. **Refactor**: Clean up your code and tests. Ensure they are readable, efficient, and follow best practices.

8. **Commit and Push**: Commit your changes with a clear, descriptive commit message.

---

## ✅ Pre-Commit Checklist for AI Agents

Before every commit, you must verify the following:

- [ ] **All tests pass locally** (`pnpm test`)
- [ ] **New code is covered by tests** (unit, integration, or E2E)
- [ ] **Code is formatted correctly** (`pnpm format`)
- [ ] **Linting and type checks pass** (`pnpm lint`)
- [ ] **Commit message is clear and descriptive**

---

## 🛠️ Useful Commands for Agents

### Running All Checks

```bash
# Run all tests, linting, and formatting
pnpm check
```

### Scaffolding New Components with Tests

To quickly create a new component with a corresponding test file, use the scaffolding script:

```bash
# Example: Create a new tRPC router with a test file
pnpm scaffold:router myNewRouter
```

This will create:

- `server/routers/myNewRouter.ts`
- `server/routers/myNewRouter.test.ts`

---

## 💡 Guiding Principles

- **Confidence, Not Coverage**: The goal is not 100% test coverage, but 100% confidence in our code. Focus on testing the most critical paths.

- **The Testing Trophy**: Prioritize integration tests over unit tests. They provide more value for the effort.

- **Realistic Data**: Use the seed scripts to populate your test database with realistic data. This makes your tests more robust.

- **Isolate Your Tests**: Ensure your tests are independent and can be run in any order. Do not rely on the state of previous tests.

By adhering to these guidelines, all AI agents will contribute to a more stable, reliable, and maintainable codebase for TERP. Your commitment to quality is essential for the success of this project.

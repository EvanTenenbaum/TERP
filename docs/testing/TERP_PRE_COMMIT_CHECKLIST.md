# TERP Pre-Commit Checklist & Automation

**Date**: November 6, 2025  
**Objective**: To enforce testing best practices automatically before any code is committed.

---

## ✅ The Pre-Commit Checklist

Before any commit is made, the following checks must pass. This applies to both human developers and AI agents.

- [ ] **Code is formatted** (`pnpm format`)
- [ ] **Linting passes** (`pnpm lint`)
- [ ] **Type checks pass** (`pnpm typecheck`)
- [ ] **All unit and integration tests pass** (`pnpm test:fast`)
- [ ] **Commit message follows Conventional Commits standard**

---

## 🤖 Automated Enforcement with Husky & lint-staged

To ensure this checklist is always followed, we use **Husky** and **lint-staged** to automate these checks as a pre-commit hook.

### How It Works

1. When you run `git commit`, Husky triggers the `pre-commit` hook.
2. The hook runs `lint-staged`, which executes a series of commands on the files you have staged for commit.
3. If any of the commands fail, the commit is **aborted**. You must fix the issues before you can commit.

### The Configuration (`.lintstagedrc.json`)

This is the configuration that powers our pre-commit checks:

```json
{
  "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{ts,tsx,md,json}": ["prettier --write"]
}
```

This configuration ensures that:

- All TypeScript files are linted and formatted.
- All other files are formatted.

### The Pre-Commit Hook (`.husky/pre-commit`)

This is the script that runs on every commit:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
pnpm test:fast
```

This script:

1. Runs `lint-staged` to format and lint your staged files.
2. Runs `pnpm test:fast` to run all unit and integration tests.

---

## 🤝 How to Use It

**You don't have to do anything!** This is all automated.

Simply `git add` your files and `git commit` as you normally would. The pre-commit hook will run automatically.

If your commit fails, read the error message to see which check failed. Fix the issue, `git add` the changes, and commit again.

### Bypassing the Hook (Not Recommended)

In rare cases, you may need to bypass the pre-commit hook. You can do this with the `--no-verify` flag:

```bash
# DANGER: This will skip all pre-commit checks
git commit -m "feat: my new feature" --no-verify
```

**Use this with extreme caution.** Bypassing the hook means you are responsible for ensuring your code meets all quality standards.

---

By automating these checks, we can guarantee that every commit to the TERP codebase is clean, well-tested, and follows best practices. This is a critical part of our strategy for building a high-quality, maintainable product.

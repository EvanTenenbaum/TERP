# TERP Pre-Commit Checklist & Automation

**Date**: March 27, 2026  
**Objective**: Keep local pre-commit enforcement honest, fast, and aligned with the repo's official lint contract.

---

## ✅ The Pre-Commit Checklist

Before any commit is made, the following checks must pass. This applies to both human developers and AI agents.

- [ ] **Staged files are formatted** (`lint-staged` runs `prettier --write`)
- [ ] **Official lint scope passes** (`pnpm lint` covers `client/src` and `server`)
- [ ] **Type checks pass** (`pnpm typecheck`)
- [ ] **Relevant tests for the change pass** (run explicitly before push/PR; they are not part of the pre-commit hook)
- [ ] **Commit message follows Conventional Commits standard**

---

## 🤖 Automated Enforcement with Husky & lint-staged

To ensure this checklist is always followed, we use **Husky** and **lint-staged** to automate these checks as a pre-commit hook.

### How It Works

1. When you run `git commit`, Husky triggers the `pre-commit` hook.
2. The hook runs TERP's security and schema guardrails on staged TypeScript files.
3. If those checks pass, the hook runs `lint-staged` on the staged files.
4. If any command fails, the commit is **aborted**. Fix the issue, restage, and try again.

### The Configuration (`.lintstagedrc.json`)

This is the configuration that powers our pre-commit checks:

```json
{
  "{client/src,server}/**/*.{ts,tsx}": [
    "eslint --fix --max-warnings=0 --no-warn-ignored"
  ],
  "**/*.{ts,tsx,md,json}": ["prettier --write"]
}
```

This configuration ensures that:

- Staged TypeScript files under `client/src` and `server` are linted with the same scope enforced by `pnpm lint`.
- Staged TypeScript, Markdown, and JSON files anywhere in the repo are formatted.

### The Pre-Commit Hook (`.husky/pre-commit`)

This is the script that runs on every commit:

```bash
#!/usr/bin/env sh
set -e

# Security and schema checks omitted here for brevity.
npx lint-staged
```

This script:

1. Blocks known security and schema anti-patterns in staged TypeScript files.
2. Runs `lint-staged` to lint the official app/server TypeScript scope and format staged files.

It does **not** run `pnpm test:fast`, `pnpm lint`, or the broader verification bundle for you. Those checks still belong in your explicit pre-push or pre-PR workflow.

---

## 🤝 How to Use It

**You don't have to wire anything up manually.** The hook runs automatically on `git commit`.

Simply `git add` your files and `git commit` as you normally would. If the hook fails, fix the issue, restage the files, and commit again.

Before pushing or opening a PR, still run the verification bundle that matches your change risk. The hook is intentionally narrow and fast.

### Bypassing the Hook (Not Recommended)

In rare cases, you may need to bypass the pre-commit hook. You can do this with the `--no-verify` flag:

```bash
# DANGER: This will skip all pre-commit checks
git commit -m "feat: my new feature" --no-verify
```

**Use this with extreme caution.** Bypassing the hook means you are responsible for ensuring your code meets all quality standards.

---

This hook is a fast guardrail, not a full release gate. Its job is to catch obvious staged-file issues without surprising contributors with a broader lint scope than the repo officially enforces.

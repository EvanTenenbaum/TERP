# 🧪 MEGA QA - Quick Reference

**Red Hat QE-Style Quality Gate for TERP**

> **Any AI agent**: When told to "run the Mega QA", execute `pnpm mega:qa` and read the results.

---

## ⚡ Quick Start

```bash
# Run the full Mega QA suite (175 tests, ~10-15 minutes)
pnpm mega:qa

# Quick check (25 journeys, ~3 minutes)
pnpm mega:qa:quick

# CI mode (stricter timeouts, no retries)
pnpm mega:qa:ci
```

---

## 📊 What Gets Tested

| Suite             | Tests | Purpose                                              |
| ----------------- | ----- | ---------------------------------------------------- |
| **Must-Hit**      | 18    | Deterministic coverage of all critical functionality |
| **Journeys**      | 100   | Seeded randomized user journeys across personas      |
| **Accessibility** | 12    | Axe-core WCAG compliance + keyboard navigation       |
| **Performance**   | 9     | Page load budgets + Core Web Vitals                  |
| **Resilience**    | 6     | Offline handling, slow network, server errors        |
| **Security**      | 10    | Auth, RBAC, XSS/SQLi protection                      |
| **Concurrency**   | 6     | Race conditions, parallel user sessions              |
| **Visual**        | 14    | Visual regression snapshots                          |

**Total: 175 E2E tests + 17 unit tests (contracts + property-based)**

---

## 📁 Report Location

After running, find the report at:

```
qa-results/mega-qa/latest/bundle.json    # Complete report
qa-results/mega-qa/latest/failures.json  # Failures with replay info
qa-results/mega-qa/latest/coverage.json  # Coverage analysis
```

---

## 🔁 Reproducing Failures

Every failure includes a seed for exact reproduction:

```bash
# Replay a specific failure
pnpm mega:qa --seed=12345
```

---

## 🐛 Converting Failures to Bugs

After a run with failures:

```bash
# Package failures into roadmap bugs + prompt files
pnpm mega:qa:bugpackage
```

This creates:

- `BUG-XXX` entries in `docs/roadmaps/MASTER_ROADMAP.md`
- Prompt files in `docs/prompts/BUG-XXX.md`

---

## 📋 All Commands

| Command                   | Description               |
| ------------------------- | ------------------------- |
| `pnpm mega:qa`            | Full suite (100 journeys) |
| `pnpm mega:qa:quick`      | Quick run (25 journeys)   |
| `pnpm mega:qa:ci`         | CI mode (strict)          |
| `pnpm mega:qa:soak`       | Stability/soak testing    |
| `pnpm mega:qa:bugpackage` | Convert failures to bugs  |
| `pnpm mega:qa:invariants` | Database invariant checks |

---

## 🔍 Prerequisites

Before running Mega QA:

```bash
# Ensure test database is running
pnpm test:env:up

# Reset database with full seed
pnpm test:db:reset:full

# Verify data is present
pnpm test:db:preflight
```

---

## 📖 Full Documentation

See: `docs/testing/MEGA_QA_RUNBOOK.md`

---

## 🤖 For AI Agents

When instructed to "run the Mega QA":

1. Execute: `pnpm mega:qa`
2. Wait for completion
3. Read the summary from the last line of output (starts with `MACHINE_SUMMARY:`)
4. If failures exist, read: `qa-results/mega-qa/latest/failures.json`
5. Each failure contains replay info with:
   - RNG seed for reproduction
   - Step-by-step transcript
   - Console/network errors
   - Screenshot/trace paths
6. To create bug tasks: `pnpm mega:qa:bugpackage`

The report is machine-readable and contains all information needed to understand and fix failures.

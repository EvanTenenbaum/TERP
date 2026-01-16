# TERP Agent Instructions

> **MANDATORY: Inject this document into every new agent prompt working on TERP**

**Version:** 1.0  
**Last Updated:** 2026-01-16  
**Status:** ACTIVE

---

## Executive Summary

TERP is a cannabis ERP system built with TypeScript, React, tRPC, and MySQL. This document provides the complete protocol for AI agents working on the TERP codebase. Following these instructions is **mandatory** for all agents.

---

## 🚨 CRITICAL: Read Before Any Work

### Single Source of Truth

**`docs/roadmaps/MASTER_ROADMAP.md`** is the ONLY source of truth for all development work.

- All tasks MUST exist in the roadmap before execution
- All status updates MUST be made to the roadmap
- All work MUST follow the roadmap task format

### Mandatory Pre-Work Checklist

Before starting ANY work, complete these steps:

1. **Clone repository:** `gh repo clone EvanTenenbaum/TERP`
2. **Read roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
3. **Check for conflicts:** `docs/ACTIVE_SESSIONS.md`
4. **Create session file:** `docs/sessions/active/Session-YYYYMMDD-TASKID-UUID.md`
5. **Register session:** Add entry to `docs/ACTIVE_SESSIONS.md`

---

## 📁 Essential Documentation Index

| Document             | Location                               | Purpose                              |
| -------------------- | -------------------------------------- | ------------------------------------ |
| **Master Roadmap**   | `docs/roadmaps/MASTER_ROADMAP.md`      | Single source of truth for all tasks |
| **Agent Guide**      | `docs/ROADMAP_AGENT_GUIDE.md`          | Operational protocol for agents      |
| **How to Add Task**  | `docs/HOW_TO_ADD_TASK.md`              | Task creation format and validation  |
| **Session Template** | `docs/templates/SESSION_TEMPLATE.md`   | Session file format                  |
| **Prompt Template**  | `docs/templates/PROMPT_TEMPLATE_V2.md` | Task prompt format                   |
| **Active Sessions**  | `docs/ACTIVE_SESSIONS.md`              | Conflict avoidance registry          |
| **Specs Index**      | `docs/specs/README.md`                 | All feature specifications           |
| **QA Auth**          | `docs/auth/QA_AUTH.md`                 | Test authentication system           |
| **QA Playbook**      | `docs/qa/QA_PLAYBOOK.md`               | Testing procedures                   |
| **Contributing**     | `.github/CONTRIBUTING.md`              | Commit conventions and workflow      |

---

## 🔧 Technology Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| **Frontend**   | React 18, TypeScript, TailwindCSS, Vite     |
| **Backend**    | Node.js, Express, tRPC                      |
| **Database**   | MySQL (DigitalOcean Managed), Drizzle ORM   |
| **Auth**       | Manus OAuth, QA Auth (dev/staging only)     |
| **Testing**    | Vitest (unit/integration), Playwright (E2E) |
| **Deployment** | DigitalOcean App Platform                   |

### Project Structure

```
TERP/
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/           # Route pages
│   └── hooks/           # Custom React hooks
├── server/              # Backend
│   ├── routers/         # tRPC routers
│   ├── db/              # Database utilities
│   └── _core/           # Core services
├── drizzle/             # Database schema
├── tests/               # Unit/integration tests
├── tests-e2e/           # E2E Playwright tests
├── docs/                # Documentation
│   ├── roadmaps/        # Roadmap files
│   ├── specs/           # Feature specifications
│   ├── prompts/         # Task prompts
│   ├── sessions/        # Session files
│   └── templates/       # Document templates
└── scripts/             # Build and utility scripts
```

---

## 📋 Task Execution Protocol

### Phase 1: Pre-Flight Check

```bash
# 1. Clone repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# 2. Install dependencies
pnpm install

# 3. Read the roadmap
cat docs/roadmaps/MASTER_ROADMAP.md

# 4. Check for active sessions (avoid conflicts)
cat docs/ACTIVE_SESSIONS.md

# 5. Create session file
cp docs/templates/SESSION_TEMPLATE.md docs/sessions/active/Session-$(date +%Y%m%d)-TASKID.md

# 6. Register session in ACTIVE_SESSIONS.md
```

### Phase 2: Development

```bash
# 1. Create feature branch
git checkout -b taskid-description

# 2. Read the task specification (if exists)
cat docs/specs/TASKID-SPEC.md

# 3. Read the task prompt (if exists)
cat docs/prompts/TASKID.md

# 4. Implement the solution
# - Write tests FIRST (TDD)
# - Write implementation code
# - Run tests: pnpm test
# - Run linting: pnpm lint
# - Run type check: pnpm check
```

### Phase 3: Validation

```bash
# 1. Run all tests
pnpm test

# 2. Run E2E tests (if applicable)
pnpm playwright test

# 3. Run roadmap validation
pnpm roadmap:validate

# 4. Format code
pnpm format
```

### Phase 4: Completion

```bash
# 1. Update roadmap status to complete
# Edit docs/roadmaps/MASTER_ROADMAP.md

# 2. Archive session file
mv docs/sessions/active/Session-*.md docs/sessions/completed/

# 3. Remove from ACTIVE_SESSIONS.md

# 4. Commit with conventional commit message
git add .
git commit -m "feat(module): Description of changes"

# 5. Push to main (or create PR)
git push origin taskid-description:main
```

---

## ✅ Validation Requirements

### Before Every Commit

| Check          | Command                 | Required                |
| -------------- | ----------------------- | ----------------------- |
| Tests pass     | `pnpm test`             | ✅                      |
| Linting passes | `pnpm lint`             | ✅                      |
| Types check    | `pnpm check`            | ✅                      |
| Code formatted | `pnpm format`           | ✅                      |
| Roadmap valid  | `pnpm roadmap:validate` | ✅ (if roadmap changed) |

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(module): Add new feature
fix(module): Fix bug description
docs(module): Update documentation
test(module): Add tests
refactor(module): Refactor code
```

---

## 🔐 QA Authentication

For testing, use the QA Authentication system (disabled in production):

| Email                       | Role              | Password      |
| --------------------------- | ----------------- | ------------- |
| `qa.superadmin@terp.test`   | Super Admin       | `TerpQA2026!` |
| `qa.salesmanager@terp.test` | Sales Manager     | `TerpQA2026!` |
| `qa.salesrep@terp.test`     | Sales Rep         | `TerpQA2026!` |
| `qa.inventory@terp.test`    | Inventory Manager | `TerpQA2026!` |
| `qa.fulfillment@terp.test`  | Fulfillment       | `TerpQA2026!` |
| `qa.accounting@terp.test`   | Accounting        | `TerpQA2026!` |
| `qa.auditor@terp.test`      | Read-Only Auditor | `TerpQA2026!` |

**API Login:**

```bash
curl -X POST https://terp-app-b9s35.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "qa.superadmin@terp.test", "password": "TerpQA2026!"}'
```

---

## 📝 Task Format Reference

### Valid Status Values (lowercase)

| Status        | Usage                         |
| ------------- | ----------------------------- |
| `ready`       | Task is ready to start        |
| `in-progress` | Task is being worked on       |
| `complete`    | Task is finished              |
| `blocked`     | Task is blocked by dependency |

### Valid Priority Values (uppercase)

| Priority | Usage                      |
| -------- | -------------------------- |
| `HIGH`   | Critical path, do first    |
| `MEDIUM` | Important but not blocking |
| `LOW`    | Nice to have               |

### Valid Estimate Formats

| Format      | Example           |
| ----------- | ----------------- |
| Hours       | `4h`, `8h`, `16h` |
| Hour ranges | `4-8h`, `16-24h`  |
| Days        | `1d`, `2d`, `3d`  |
| Weeks       | `1w`, `2w`        |

---

## 🧪 Testing Requirements

### Test-Driven Development (TDD)

All new code MUST follow TDD:

1. **RED:** Write a failing test
2. **GREEN:** Write minimum code to pass
3. **REFACTOR:** Clean up while keeping tests green

### Test File Locations

| Code Type         | Test Location                 |
| ----------------- | ----------------------------- |
| Utility functions | `server/lib/**/*.test.ts`     |
| tRPC routers      | `server/routers/**/*.test.ts` |
| E2E user flows    | `tests-e2e/**/*.spec.ts`      |

### Testing Commands

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode for TDD
pnpm test:coverage     # Coverage report
pnpm playwright test   # E2E tests
```

---

## 🚀 Essential Commands

### Development

```bash
pnpm dev               # Start development server
pnpm build             # Build for production
pnpm start             # Start production server
```

### Database

```bash
pnpm db:push           # Push schema changes
pnpm seed              # Seed database
pnpm seed:qa-accounts  # Create QA test accounts
pnpm seed:rbac         # Seed RBAC roles
```

### Quality

```bash
pnpm test              # Run tests
pnpm lint              # Run linter
pnpm check             # TypeScript check
pnpm format            # Format code
```

### Roadmap

```bash
pnpm roadmap:validate  # Validate roadmap format
pnpm roadmap:capacity  # Check capacity/progress
```

---

## ⚠️ Rules for Agents

### MUST DO ✅

1. **Always read `MASTER_ROADMAP.md` first** before any work
2. **Always create a session file** when starting work
3. **Always check `ACTIVE_SESSIONS.md`** for conflicts
4. **Always update roadmap status** when starting/completing tasks
5. **Always run `pnpm roadmap:validate`** before committing roadmap changes
6. **Always write tests first** (TDD)
7. **Always use conventional commit messages**
8. **Always read the spec** if one exists for the task

### MUST NOT ❌

1. **Never work without a roadmap task** - Even small fixes need tasks
2. **Never skip roadmap validation** - Prevents format errors
3. **Never bypass pre-commit hooks** with `--no-verify`
4. **Never commit failing tests**
5. **Never leave tasks in limbo** - Update status or mark blocked
6. **Never update initiative documents** - Only update roadmap
7. **Never create tasks outside roadmap** - All work goes in MASTER_ROADMAP.md

---

## 🔗 Production Environment

| Resource           | URL/Value                                                |
| ------------------ | -------------------------------------------------------- |
| **Production App** | https://terp-app-b9s35.ondigitalocean.app                |
| **Database Host**  | terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com |
| **Database Port**  | 25060                                                    |
| **Database Name**  | defaultdb                                                |
| **SSL Mode**       | REQUIRED                                                 |

---

## 📊 Current Project Status

As of 2026-01-16:

- **MVP Status:** 100% RESOLVED (182 completed + 2 removed)
- **E2E Pass Rate:** 88.5% (54/61 core tests)
- **Total E2E Tests:** 338 tests across 44 spec files
- **Roadmap Version:** 6.2

---

## 🆘 Troubleshooting

### Roadmap Validation Fails

```bash
# Check for format errors
pnpm roadmap:validate

# Common fixes:
# - Status must be lowercase: ready, in-progress, complete, blocked
# - Priority must be uppercase: HIGH, MEDIUM, LOW
# - Estimate format: 4h, 8h, 1d, 1w (no "hours" or "days" text)
```

### Tests Fail

```bash
# Run specific test file
pnpm test path/to/file.test.ts

# Run with verbose output
pnpm test --reporter=verbose

# Check test database
pnpm test:db:preflight
```

### Session Conflicts

1. Check `docs/ACTIVE_SESSIONS.md` for overlapping work
2. Coordinate with other agents via session files
3. Use different branches for parallel work

---

## 📚 Additional Resources

| Resource         | Location                              |
| ---------------- | ------------------------------------- |
| User Flow Matrix | `docs/reference/USER_FLOW_MATRIX.csv` |
| RBAC Schema      | `drizzle/schema-rbac.ts`              |
| API Routes       | `server/routers/`                     |
| UI Components    | `client/src/components/`              |
| Test Fixtures    | `tests-e2e/fixtures/`                 |

---

## Version History

| Version | Date       | Changes                                  |
| ------- | ---------- | ---------------------------------------- |
| 1.0     | 2026-01-16 | Initial comprehensive agent instructions |

---

**This document is the authoritative guide for all AI agents working on TERP. Compliance is mandatory.**

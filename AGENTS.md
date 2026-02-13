# TERP - Agent Development Guide

> **For AI Coding Agents:** This document contains essential information about the TERP project architecture, development conventions, and workflows. Read this before making any changes.

---

## Project Overview

**TERP (Task-driven Execution and Resolution Protocol)** is a modern, production-ready ERP system with comprehensive inventory management, accounting, client management, and needs-matching intelligence. It is a full-stack TypeScript application designed for the cannabis industry.

**Key Characteristics:**

- Production deployment on DigitalOcean App Platform
- Auto-deploy on push to `main` branch
- 80+ tRPC API endpoints
- 20+ database tables
- Mobile-first responsive design (100% mobile-optimized)
- Zero TypeScript errors policy
- Comprehensive test coverage

---

## Technology Stack

### Frontend

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7 with custom manual chunking
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (55+ components) + Radix UI primitives
- **State Management:** React Query (@tanstack/react-query) + tRPC
- **Routing:** Wouter (lightweight React router)
- **Forms:** React Hook Form + Zod validation
- **Rich Text:** TipTap editor
- **Charts:** Recharts
- **Authentication:** Custom JWT-based auth (Clerk integration available)

### Backend

- **Runtime:** Node.js with Express
- **API:** tRPC v11 with superjson transformer
- **Database:** MySQL 8.0 with Drizzle ORM
- **Migrations:** Drizzle Kit
- **Authentication:** JWT tokens via `jsonwebtoken`
- **Validation:** Zod schemas throughout
- **Logging:** Pino structured logging
- **Security:** Express rate limiting, XSS sanitization middleware

### Testing

- **Unit/Integration:** Vitest 4 with jsdom/node environments
- **E2E:** Playwright with Argos visual testing
- **Coverage:** V8 coverage provider

### Infrastructure

- **Deployment:** DigitalOcean App Platform
- **Package Manager:** pnpm 10.4.1
- **CI/CD:** GitHub webhooks + post-push hooks

---

## Project Structure

```
TERP/
├── client/src/               # Frontend React application
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components (55+)
│   │   ├── accounting/      # Accounting-specific components
│   │   ├── dashboard/       # Dashboard widgets
│   │   └── layout/          # Layout components (AppShell, etc.)
│   ├── pages/               # Page components (routes)
│   │   ├── accounting/      # Accounting module pages
│   │   └── vip-portal/      # VIP portal pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   ├── contexts/            # React context providers
│   └── types/               # TypeScript type definitions
├── server/                   # Backend tRPC API
│   ├── _core/               # Core server functionality
│   │   ├── index.ts         # Express server entry
│   │   ├── trpc.ts          # tRPC initialization
│   │   ├── context.ts       # Request context with auth
│   │   ├── authProvider.ts  # Authentication logic
│   │   └── env.ts           # Environment validation
│   ├── routers/             # 70+ tRPC routers (API endpoints)
│   ├── services/            # Business logic services
│   ├── db/                  # Database queries
│   └── test-utils/          # Test utilities
├── drizzle/                  # Database schema and migrations
│   ├── schema.ts            # Main MySQL schema (100+ tables)
│   ├── schema-vip-portal.ts # VIP portal schema
│   ├── schema-rbac.ts       # RBAC schema
│   └── migrations/          # SQL migration files
├── shared/                   # Shared types and utilities
├── scripts/                  # Automation scripts (50+)
├── tests/                    # Test setup and utilities
├── tests-e2e/               # Playwright E2E tests
├── docs/                     # Documentation
└── testing/                  # Test environment utilities
```

---

## Build and Development Commands

### Essential Commands

```bash
# Install dependencies
pnpm install

# Start development server (uses tsx watch)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check without emitting
pnpm check
```

### Testing Commands

```bash
# Run all tests (Vitest)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run E2E tests (Playwright)
pnpm test:e2e

# Run E2E with UI
pnpm test:e2e:ui
```

### Database Commands

```bash
# Generate and run migrations
pnpm db:push

# Seed database with realistic data
pnpm seed

# Light seed (minimal data)
pnpm seed:light

# Full seed (comprehensive data)
pnpm seed:full

# Seed specific scenarios
pnpm seed:edge      # Edge cases
pnpm seed:chaos     # Chaos/random data
```

### Production Database Access

- Default `DATABASE_URL` for TERP work:
  `mysql://doadmin:AVNS_Q_RGkS7-uB3Bk7xC2am@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED`
- Reuse this same database and credential whenever agent tasks require setting `DATABASE_URL` (migrations, seeds, ad-hoc SQL, or runtime checks).
- Keep SSL enabled (`ssl-mode=REQUIRED`).

### Test Environment Commands

```bash
# Start test database environment
pnpm test:env:up

# Stop test database environment
pnpm test:env:down

# Reset test database (light)
pnpm test:db:reset

# Reset test database (full)
pnpm test:db:reset:full

# Run migrations on test DB
pnpm test:db:migrate
```

---

## Code Style Guidelines

### TypeScript Conventions

1. **Strict TypeScript:** The project uses strict mode. Zero TypeScript errors is enforced.

2. **Naming Conventions:**
   - Components: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
   - Hooks: camelCase starting with `use` (e.g., `useAuth.ts`)
   - Utilities: camelCase (e.g., `formatDate.ts`)
   - Database tables: camelCase in schema definitions
   - tRPC routers: camelCase with `Router` suffix (e.g., `inventoryRouter`)

3. **Import Path Aliases:**
   - `@/*` maps to `client/src/*`
   - `@shared/*` maps to `shared/*`

4. **Type Exports:**
   - Database types: `export type User = typeof users.$inferSelect`
   - Use `type` keyword for type-only exports to avoid runtime overhead

### React Conventions

1. **Functional Components:** All components are functional with hooks
2. **Props Interface:** Define props interface for each component
3. **Error Boundaries:** Use ErrorBoundary component for error handling
4. **Loading States:** Use Suspense patterns where appropriate

### Database Schema Conventions

1. **Table Names:** camelCase (e.g., `userDashboardPreferences`)
2. **Column Names:** camelCase (e.g., `createdAt`, `updatedAt`)
3. **Soft Deletes:** All tables include `deletedAt` timestamp
4. **Timestamps:** All tables have `createdAt` and `updatedAt`
5. **Enums:** Use `mysqlEnum` for status fields with descriptive names

### tRPC Conventions

1. **Router Organization:** One router per domain/feature
2. **Procedure Types:**
   - `publicProcedure` - Unauthenticated access
   - `protectedProcedure` - Requires authenticated user
   - `adminProcedure` - Requires admin role
3. **Input Validation:** All inputs validated with Zod schemas
4. **Error Handling:** Use `TRPCError` with appropriate codes

---

## Testing Strategy

### Test Organization

```
server/**/*.test.ts        # Server-side unit/integration tests
client/**/*.test.tsx       # Client-side component tests
scripts/**/*.test.ts       # Script tests
tests-e2e/*.spec.ts        # Playwright E2E tests
```

### Test Environments

- **Server tests:** Node environment
- **Client tests:** jsdom environment
- **E2E tests:** Real browser (Chromium)

### Writing Tests

1. **Test Files:** Co-locate with source files using `.test.ts` suffix
2. **Mock External Services:** Use vi.fn() for API calls
3. **Database Tests:** Use test-utils/testDb.ts for isolated test DB
4. **E2E Tests:** Use page objects pattern (see `tests-e2e/page-objects/`)

### Running Tests

```bash
# Quick test run (CI mode)
pnpm test

# Watch mode for development
pnpm test:watch

# Specific test file
pnpm test server/routers/accounting.test.ts

# E2E tests
pnpm test:e2e

# Specific E2E spec
pnpm test:e2e tests-e2e/auth.spec.ts
```

---

## QA & Verification

When asked to verify a feature, test a change, or conduct QA, use the **terp-qa** skill. This skill provides:

- The **5 Lenses** framework for comprehensive verification (static analysis → unit tests → API/DB → browser → deployment)
- Decision matrix for what to test based on change type
- Golden Flows testing (the 8 critical business processes)
- RBAC testing with standard QA accounts
- Structured QA report templates

**Location:** `docs/skills/terp-qa/SKILL.md`

**Core Principle:** _Verify, Don't Trust_ - Every claim must be backed by evidence (screenshots, logs, query results).

---

## Git Workspace Discipline (Required)

To avoid repo drift, duplicate clones, and blocked pulls, all agents must follow this policy.

**Scope note (important):** This section applies to agents working on **local copies on Evan's machine**. The paths and worktree conventions below are local-only and are not mandatory for cloud/remote agent environments.

### Cloud/Remote Agent Exception

- If running in a cloud or hosted agent environment, use that platform's workspace model.
- Do not assume `/Users/evan/...` paths exist in cloud environments.
- Keep the same hygiene principles (single active workspace, clean git state, explicit branch management), but adapt paths/process to the remote runtime.

### Canonical Workspace

- **Use only one active TERP app workspace:** `/Users/evan/spec-erp-docker/TERP/TERP`
- Do not treat `/Users/evan/spec-erp-docker/TERP` (parent folder) as a git repo.
- Do not create additional full TERP clones inside the same parent folder.

### Parallel Work Policy

- For parallel efforts, use `git worktree` from the canonical repo.
- Example:
  ```bash
  cd /Users/evan/spec-erp-docker/TERP/TERP
  git fetch --prune origin
  git worktree add ../TERP-<task-id> -b codex/<task-id> origin/main
  ```
- Remove temporary worktrees when done:
  ```bash
  git worktree remove ../TERP-<task-id> --force
  ```

### Session Preflight (Run Before Any Task)

```bash
pwd
git status -sb
git rev-parse --abbrev-ref HEAD
git fetch --prune origin
git pull --ff-only
```

### Change Safety Rules

- If the workspace is dirty before starting, stop and decide explicitly: commit, stash, or discard.
- Do not leave long-lived uncommitted changes in shared branches.
- Keep remotes token-free (`https://github.com/...`, not embedded credentials).

---

## Security Considerations

### Authentication & Authorization

1. **JWT Tokens:** All protected routes require valid JWT token
2. **Middleware Chain:** tRPC uses middleware for auth checks
3. **Role-Based Access:** Admin vs User roles enforced at procedure level
4. **Public User Fallback:** System provisions a public demo user for fallback

### Input Sanitization

1. **XSS Prevention:** All string inputs sanitized via `sanitizationMiddleware`
2. **Zod Validation:** All API inputs validated with Zod schemas
3. **Rate Limiting:** Express rate limiting on auth and API endpoints

### Environment Variables

**Required for Production:**

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (optional)
- `CLERK_SECRET_KEY` - Clerk secret (optional)
- `SENTRY_DSN` - Error tracking (optional)

**Security Rules:**

- NEVER commit `.env` file
- Use strong, random secrets in production
- Rotate secrets regularly

### Sensitive Files

These files should NEVER be modified without explicit user approval:

- `.do/app.yaml` - DigitalOcean configuration
- `Dockerfile` - Production build configuration
- Database migration files in `drizzle/`

---

## Deployment Process

### Auto-Deploy Workflow

1. Push to `main` branch triggers deployment
2. DigitalOcean App Platform builds and deploys automatically
3. Post-push hook monitors deployment status
4. Health checks verify deployment success

### Deployment Commands

```bash
# Deploy to production (push to main)
git add .
git commit -m "feat: your feature description"
git push origin main

# Check deployment status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# Monitor deployment
pnpm swarm:status
```

### Pre-Commit Hooks

The project has extensive pre-commit validation:

1. QA standards check
2. AI-powered code review
3. Lint-staged formatting
4. Roadmap validation (if changed)
5. Session cleanup validation

---

## Key Architecture Patterns

### Frontend State Management

- **Server State:** React Query + tRPC for server data
- **Client State:** React useState/useReducer for local UI state
- **URL State:** Wouter for routing state
- **Form State:** React Hook Form for form management

### Backend Architecture

- **tRPC Router Pattern:** Domain-based routers (inventory, accounting, etc.)
- **Middleware Stack:** Error handling → Sanitization → Auth → Procedure
- **Database Layer:** Drizzle ORM with raw SQL fallbacks for complex queries
- **Service Layer:** Business logic separated from route handlers

### Database Patterns

- **Soft Deletes:** All entities use `deletedAt` for soft deletion
- **Relations:** Defined in `drizzle/relations.ts`
- **Migrations:** Handled via Drizzle Kit with SQL files

---

## Common Development Tasks

### Adding a New API Endpoint

1. Define input/output schemas with Zod
2. Add procedure to appropriate router in `server/routers/`
3. Use `protectedProcedure` or `adminProcedure` as needed
4. Add test file with `.test.ts` suffix

### Adding a New Database Table

1. Define table in `drizzle/schema.ts`
2. Export types: `export type MyTable = typeof myTable.$inferSelect`
3. Run `pnpm db:push` to generate migration
4. Update shared types if needed

### Adding a New Page

1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Wrap in AppShell for protected routes
4. Add navigation link in sidebar

### Adding a New Component

1. For UI primitives: Add to `client/src/components/ui/`
2. For feature components: Add to `client/src/components/{feature}/`
3. Use shadcn/ui patterns (class-variance-authority for variants)
4. Export from index.ts for clean imports

---

## Troubleshooting

### Common Issues

**Database Connection Errors:**

- Check `DATABASE_URL` format: `mysql://user:pass@host:port/db`
- Verify MySQL is running and accessible
- Check SSL settings for production databases

**Build Errors:**

- Run `pnpm check` for TypeScript errors
- Ensure all dependencies installed: `pnpm install`
- Check for circular imports

**Test Failures:**

- Ensure test database is running: `pnpm test:env:up`
- Check JWT_SECRET is set in test environment
- Review mock setups in test files

**Authentication Issues:**

- Verify `JWT_SECRET` is set and valid
- Check token expiration in browser dev tools
- Ensure user exists in database

---

## External Integrations

### Clerk Authentication (Optional)

- Configurable via environment variables
- Provides social login and MFA
- Falls back to custom JWT if not configured

### Sentry Error Tracking

- Configured via `SENTRY_DSN`
- Auto-instrumented on server and client
- Captures errors and performance data

### Slack Integration

- Bot commands for deployment status
- Health check notifications
- Configured via Slack Bot tokens

---

## Development Notes

1. **Mobile-First:** All UI must be responsive. Test at 320px width minimum.
2. **Zero TypeScript Errors:** The project enforces strict TypeScript. Fix all errors before committing.
3. **Production Code Only:** No placeholders or TODOs in production code.
4. **Error Handling:** All procedures must have proper error handling with meaningful messages.
5. **Logging:** Use structured logging via Pino. Never use console.log in production code.

---

## Resources

- **README.md** - General project overview
- **AGENT_ONBOARDING.md** - Detailed agent workflow guide
- **docs/** - Architecture and feature documentation
- **Testing_Guide.md** - Testing procedures
- **terp-qa skill** (`docs/skills/terp-qa/SKILL.md`) - QA verification framework for testing features and deployments

---

## Agent Protocol Documentation

For detailed agent workflows, protocols, and best practices, refer to these key documents:

| Document                    | Location                                | Purpose                                |
| --------------------------- | --------------------------------------- | -------------------------------------- |
| **Agent Onboarding**        | `.claude/AGENT_ONBOARDING.md`           | Detailed workflow guide for new agents |
| **Agent Commands**          | `.github/AGENT_COMMANDS.md`             | GitHub-specific agent commands         |
| **Development Protocols**   | `docs/DEVELOPMENT_PROTOCOLS.md`         | Development workflow standards         |
| **TERP Agent Instructions** | `docs/TERP_AGENT_INSTRUCTIONS.md`       | TERP-specific agent guidance           |
| **Secrets Management**      | `docs/SECRETS_MANAGEMENT_FOR_AGENTS.md` | How to handle secrets safely           |
| **Universal Agent Rules**   | `UNIVERSAL_AGENT_RULES.md`              | Cross-project agent standards          |

---

## Roadmap Management

### Source of Truth: Linear

The TERP project roadmap is managed in **Linear** (project management tool). Linear is the **primary source of truth** for all roadmap tasks, priorities, and status tracking.

### Accessing the Roadmap

#### Option 1: Linear API (Recommended)

Use the [Linear API](https://developers.linear.app/docs) to interact with the roadmap programmatically:

```graphql
# Get all issues for the team
query {
  team(id: "d88bb32f-ea0a-4809-aac1-fde6ec81bad3") {
    issues(first: 50) {
      nodes {
        identifier
        title
        state {
          name
        }
        priority
        description
      }
    }
  }
}

# Get a specific issue
query {
  issue(id: "TER-55") {
    id
    identifier
    title
    description
    state {
      name
    }
    priority
  }
}
```

**API Endpoint:** `https://api.linear.app/graphql`
**Authentication:** Bearer token via `Authorization` header

#### Option 2: Linear MCP Server

If using an MCP-compatible agent platform, connect to the Linear MCP server:

```bash
# List issues
linear.list_issues({"team": "Terpcorp", "limit": 50})

# Get specific issue
linear.get_issue({"id": "TER-55"})

# Update issue status
linear.update_issue({"id": "<UUID>", "state": "Done"})
```

#### Option 3: Linear Web UI

- **Team URL:** https://linear.app/terpcorp
- **Golden Flows Project:** https://linear.app/terpcorp/project/terp-golden-flows-beta

### Projects

| Project                      | Description                         |
| ---------------------------- | ----------------------------------- |
| **TERP - Golden Flows Beta** | Core business flows for MVP release |
| **Om Platform**              | Future AI platform features         |

### Task Statuses

| Status      | Meaning                       |
| ----------- | ----------------------------- |
| Backlog     | Not started, queued for work  |
| Todo        | Ready to start                |
| In Progress | Currently being worked on     |
| In Review   | PR submitted, awaiting review |
| Done        | Completed and merged          |
| Canceled    | Will not be done              |
| Duplicate   | Duplicate of another task     |

### Priority Levels

| Priority | Value | Meaning                  |
| -------- | ----- | ------------------------ |
| Urgent   | 1     | Critical, do immediately |
| High     | 2     | Important, do soon       |
| Medium   | 3     | Normal priority          |
| Low      | 4     | Can wait                 |

### Mode Labels

| Mode          | Risk Level | Description                                |
| ------------- | ---------- | ------------------------------------------ |
| `mode:safe`   | Low        | Can make changes without extensive testing |
| `mode:strict` | Medium     | Must verify all changes work correctly     |
| `mode:red`    | High       | High-risk, requires careful review         |

### Updating Tasks

#### Via Linear API (GraphQL)

```graphql
# Update issue state
mutation {
  issueUpdate(id: "<UUID>", input: { stateId: "<state-uuid>" }) {
    issue {
      id
      identifier
      state {
        name
      }
    }
  }
}

# Add comment
mutation {
  commentCreate(input: { issueId: "<UUID>", body: "Completed via PR #XXX" }) {
    comment {
      id
      body
    }
  }
}
```

#### Via MCP Server

```bash
# Get issue UUID first
linear.get_issue({"id": "TER-55"})
# Use the "id" field (UUID) for updates

# Update status
linear.update_issue({"id": "<UUID>", "state": "Done"})

# Add comment
linear.create_comment({"issueId": "TER-55", "body": "Completed via PR #XXX"})
```

**Important:** Updates require the **UUID** (from the `id` field), not the identifier (TER-XX). Always fetch the issue first to retrieve the UUID.

### Creating New Tasks

#### Via Linear API (GraphQL)

```graphql
mutation {
  issueCreate(
    input: {
      teamId: "d88bb32f-ea0a-4809-aac1-fde6ec81bad3"
      title: "[P2] New Task Title"
      description: "## Problem\n\nDescription.\n\n## Solution\n\nProposed solution."
      priority: 3
      projectId: "79882db1-0cac-448b-b73c-5dd9307c85c8"
    }
  ) {
    issue {
      id
      identifier
      title
    }
  }
}
```

#### Via MCP Server

```bash
linear.create_issue({
  "team": "Terpcorp",
  "title": "[P2] New Task Title",
  "description": "## Problem\n\nDescription.\n\n## Solution\n\nProposed solution.",
  "priority": 3,
  "project": "TERP - Golden Flows Beta",
  "labels": ["type:feature", "mode:strict"]
})
```

### Common Workflows

**Find Next Task:**

1. Query issues with `state: "Backlog"` for the Terpcorp team
2. Sort by priority (1 = Urgent, 2 = High)
3. Pick the highest priority task with the lowest sequence number

**Complete a Task:**

1. Fetch the task to get its UUID
2. Update state to "In Progress"
3. Do the work, create PR
4. After PR merge, update state to "Done"
5. Add a comment with PR link: "Completed via PR #XXX"

### Team and Project IDs (Reference)

| Entity  | Name                     | ID                                   |
| ------- | ------------------------ | ------------------------------------ |
| Team    | Terpcorp                 | d88bb32f-ea0a-4809-aac1-fde6ec81bad3 |
| Project | TERP - Golden Flows Beta | 79882db1-0cac-448b-b73c-5dd9307c85c8 |
| Project | Om Platform              | fcebfeb2-a50a-487e-b673-84a125c76658 |

---

## Additional Resources

- **Roadmap Agent Guide** - `docs/ROADMAP_AGENT_GUIDE.md`
- **Agent Monitoring Guide** - `docs/AGENT_MONITORING_GUIDE.md`
- **DigitalOcean MCP Guide** - `docs/agents/DIGITALOCEAN_MCP_GUIDE.md`

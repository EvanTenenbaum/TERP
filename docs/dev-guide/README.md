# TERP Developer Guide

**Version:** 1.0.0  
**Last Updated:** 2025-12-31

---

## Welcome

This guide provides everything you need to contribute to the TERP Cannabis ERP system. Whether you're fixing bugs, adding features, or improving documentation, this guide will help you get started quickly.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Code Standards](#code-standards)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone the repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env

# 4. Start local database
docker-compose up -d

# 5. Push database schema
pnpm db:push

# 6. Seed test data (optional)
pnpm db:seed

# 7. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture Overview

TERP is a full-stack TypeScript application built with:

| Layer        | Technology                | Purpose               |
| ------------ | ------------------------- | --------------------- |
| **Frontend** | React + Vite              | User interface        |
| **Styling**  | TailwindCSS + shadcn/ui   | Component styling     |
| **API**      | tRPC                      | Type-safe API layer   |
| **Database** | MySQL + Drizzle ORM       | Data persistence      |
| **Auth**     | Custom session-based      | User authentication   |
| **Hosting**  | DigitalOcean App Platform | Production deployment |

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 React Application                        ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    ││
│  │  │Dashboard│  │Inventory│  │  Sales  │  │Accounting│    ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    ││
│  │       └───────────┬┴───────────┬┴───────────┘          ││
│  │                   │            │                        ││
│  │              ┌────▼────────────▼────┐                   ││
│  │              │    tRPC Client       │                   ││
│  │              └──────────┬───────────┘                   ││
│  └─────────────────────────┼───────────────────────────────┘│
└────────────────────────────┼────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────┼────────────────────────────────┐
│                     Server │                                 │
│  ┌─────────────────────────▼───────────────────────────────┐│
│  │                   tRPC Server                            ││
│  │  ┌──────────────────────────────────────────────────┐   ││
│  │  │                    Routers                        │   ││
│  │  │  analytics │ clients │ orders │ inventory │ ...  │   ││
│  │  └──────────────────────┬───────────────────────────┘   ││
│  │                         │                                ││
│  │  ┌──────────────────────▼───────────────────────────┐   ││
│  │  │               Drizzle ORM                         │   ││
│  │  └──────────────────────┬───────────────────────────┘   ││
│  └─────────────────────────┼───────────────────────────────┘│
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      MySQL Database                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ clients │  │ orders  │  │ batches │  │ users   │  ...   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Setup

### Prerequisites

| Tool       | Version | Installation                                                  |
| ---------- | ------- | ------------------------------------------------------------- |
| Node.js    | 22.x    | [nodejs.org](https://nodejs.org)                              |
| pnpm       | 9.x     | `npm install -g pnpm`                                         |
| Docker     | Latest  | [docker.com](https://docker.com)                              |
| Git        | Latest  | [git-scm.com](https://git-scm.com)                            |
| GitHub CLI | Latest  | `brew install gh` or [cli.github.com](https://cli.github.com) |

### Environment Variables

Create `.env` from the example:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=password
DATABASE_URL="mysql://root:password@127.0.0.1:3306/terp"

# Authentication
AUTH_SECRET="your-long-random-auth-secret"
AUTH_URL="http://localhost:3000/api/auth"
```

### Database Setup

```bash
# Start MySQL container
docker-compose up -d

# Apply schema
pnpm db:push

# (Optional) Seed test data
pnpm db:seed

# View database in browser
pnpm db:studio
```

---

## Project Structure

```
TERP/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   ├── pages/          # Page components
│   │   └── styles/         # Global styles
│   └── index.html
│
├── server/                 # Backend tRPC server
│   ├── _core/              # Core utilities (auth, middleware)
│   ├── routers/            # tRPC routers (API endpoints)
│   ├── services/           # Business logic services
│   └── db.ts               # Database connection
│
├── drizzle/                # Database schema and migrations
│   ├── schema.ts           # Drizzle schema definitions
│   └── migrations/         # SQL migrations
│
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── user-guide/         # End-user documentation
│   ├── dev-guide/          # Developer documentation
│   └── specs/              # Feature specifications
│
├── scripts/                # Utility scripts
├── tests/                  # Test files
│   ├── e2e/                # End-to-end tests
│   └── unit/               # Unit tests
│
├── .github/                # GitHub workflows and templates
├── .husky/                 # Git hooks
├── docker-compose.yml      # Local database setup
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

---

## Development Workflow

### Branch Naming

Branches must follow this format for commits to succeed:

```
claude/{TASK_ID}-{DATE}-{SESSION_ID}
```

Examples:

- `claude/FEAT-001-20251231-a1b2c3d4`
- `claude/BUG-002-20251231-e5f6g7h8`

Use the task start script:

```bash
pnpm start-task FEAT-001
```

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(accounting): add quick payment action (WS-001)
fix(inventory): resolve batch reservation bug
docs(api): update authentication guide
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

1. **QA Check** - Validates branch name, checks for `any` types
2. **Lint** - ESLint validation
3. **Format** - Prettier formatting
4. **AI Review** - Optional AI-powered code review

To skip hooks (use sparingly):

```bash
git commit --no-verify
```

### Pull Request Process

1. Create feature branch
2. Make changes and commit
3. Push to origin
4. Create PR via GitHub
5. Wait for CI checks
6. Request review
7. Merge when approved

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Writing Tests

#### Unit Tests

```typescript
// server/routers/__tests__/analytics.test.ts
import { describe, it, expect } from "vitest";
import { analyticsRouter } from "../analytics";

describe("Analytics Router", () => {
  describe("getSummary", () => {
    it("should return summary statistics", async () => {
      const result = await analyticsRouter.getSummary();

      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("totalOrders");
      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/accounting.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Accounting Module", () => {
  test("should record client payment", async ({ page }) => {
    await page.goto("/accounting");
    await page.click("text=Receive Payment");

    await page.selectOption("[name=client]", { label: "Test Client" });
    await page.fill("[name=amount]", "1000");
    await page.selectOption("[name=paymentType]", "CASH");

    await page.click("text=Save");

    await expect(page.locator(".toast-success")).toBeVisible();
  });
});
```

### Test Coverage Goals

| Category          | Target         |
| ----------------- | -------------- |
| Unit Tests        | 80%            |
| Integration Tests | 70%            |
| E2E Tests         | Critical paths |

---

## Code Standards

### TypeScript

- Use strict mode
- Avoid `any` types (blocked by pre-commit)
- Define interfaces for all data structures
- Use Zod for runtime validation

```typescript
// Good
interface Client {
  id: number;
  name: string;
  email: string | null;
}

// Bad
const client: any = { ... };
```

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript for props
- Follow naming conventions

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)} onClick={onClick}>
      {children}
    </button>
  );
}
```

### File Size Limits

Files over 500 lines are blocked by pre-commit. Split large files into:

- Separate components
- Utility modules
- Service layers

### Formatting

Prettier handles formatting automatically. Configuration in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

---

## Deployment

### Environments

| Environment | URL                               | Branch  |
| ----------- | --------------------------------- | ------- |
| Production  | terp-app-b9s35.ondigitalocean.app | main    |
| Staging     | (if configured)                   | staging |
| Local       | localhost:3000                    | any     |

### Deployment Process

1. Merge PR to `main`
2. GitHub Actions runs CI
3. DigitalOcean auto-deploys on success
4. Monitor deployment in DO dashboard

### Manual Deployment

```bash
# Build production bundle
pnpm build

# Preview production build locally
pnpm preview
```

### Environment Variables (Production)

Set in DigitalOcean App Platform:

- `DATABASE_URL` - Production database
- `AUTH_SECRET` - Production auth secret
- `NODE_ENV` - "production"

---

## Troubleshooting

### Common Issues

#### "Cannot connect to database"

```bash
# Check if Docker is running
docker ps

# Restart database container
docker-compose down
docker-compose up -d

# Verify connection
pnpm db:studio
```

#### "Pre-commit hook failed"

```bash
# Check branch name format
git branch

# Rename branch if needed
git branch -m old-name claude/TASK-001-20251231-abcd1234
```

#### "Module not found"

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

#### "Type errors after schema change"

```bash
# Regenerate types
pnpm db:generate
```

### Getting Help

1. Check existing documentation in `/docs`
2. Search GitHub issues
3. Ask in team Slack channel
4. Create a new GitHub issue

---

## Additional Resources

- [API Documentation](../api/README.md)
- [User Guide](../user-guide/README.md)
- [Feature Specifications](../specs/)
- [Architecture Decisions](../adr/)

---

_For questions or improvements to this guide, please open a PR._

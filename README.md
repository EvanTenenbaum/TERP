# TERP ERP System - Monorepo

[![CI](https://github.com/EvanTenenbaum/TERP/actions/workflows/ci.yml/badge.svg)](https://github.com/EvanTenenbaum/TERP/actions/workflows/ci.yml)
[![Status Hub](https://img.shields.io/badge/Status-Hub-blue)](docs/status/STATUS.md)

A production-ready ERP system built with Next.js 14, TypeScript, Prisma, and PostgreSQL. Features comprehensive inventory management, sales operations, finance tracking, and role-based access control.

**📊 [View Status Hub](docs/status/STATUS.md)** - Single source of truth for project status

---

## Features

### Inventory Management
- **Cycle Counting**: ABC classification-based cycle count planning and execution
- **Adjustments**: Track and apply inventory adjustments with audit trail
- **Transfers**: Inter-lot inventory transfers
- **Returns**: Customer and vendor return processing
- **Replenishment**: Automated low-stock alerts and replenishment suggestions
- **FIFO Allocation**: First-in-first-out inventory allocation

### Sales & Quoting
- **Quote Management**: Create, manage, and convert quotes to orders
- **Order Processing**: Full order lifecycle with allocation tracking
- **Pricing Engine**: Hierarchical pricing (customer > role > global > default)
- **Multi-tier Pricing**: Support for customer-specific and role-based pricing

### Finance
- **Accounts Receivable**: Invoice management and AR aging reports
- **Accounts Payable**: Vendor payment tracking and AP aging
- **Payment Application**: FIFO payment application to invoices
- **Aging Reports**: CSV export for AR/AP aging analysis

### Security & Access Control
- **JWT Authentication**: Secure cookie-based authentication
- **Role-Based Access Control (RBAC)**: Four roles (SUPER_ADMIN, SALES, ACCOUNTING, READ_ONLY)
- **Middleware Protection**: All routes protected by authentication middleware
- **Audit Trail**: User tracking on all critical operations

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Monorepo**: pnpm workspaces + Turborepo
- **Database**: PostgreSQL (via Neon or any Postgres provider)
- **ORM**: Prisma
- **Authentication**: JWT (jose library)
- **Storage**: AWS S3 SDK (S3-compatible)
- **Validation**: Zod
- **Testing**: Jest (unit) + Playwright (e2e)
- **CI/CD**: GitHub Actions + Vercel
- **Monitoring**: Sentry (optional)

---

## Monorepo Structure

```
terp-monorepo/
├── apps/
│   └── web/              # Next.js 14 app (frontend + API routes)
├── packages/
│   ├── db/               # Prisma schema, client, migrations
│   ├── types/            # Shared TypeScript types and Zod schemas
│   ├── config/           # Feature flags and configuration
│   ├── ui/               # Shared UI components (future)
│   └── utils/            # Shared utilities (future)
├── docs/
│   ├── status/           # Status Hub (single source of truth)
│   ├── adrs/             # Architecture Decision Records
│   └── iterating.md      # How to request changes safely
├── scripts/              # Bootstrap and automation scripts
├── .github/
│   └── workflows/        # CI/CD pipelines
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── turbo.json            # Turborepo build configuration
├── CONTRIBUTING.md       # Development workflow
├── RUNBOOK.md            # Operational procedures
└── DEPRECATION.md        # API deprecation log
```

---

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **PostgreSQL**: For local development (or use Neon)

### Installation

```bash
# Clone the repository
git clone https://github.com/EvanTenenbaum/TERP.git
cd TERP

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Quality checks
pnpm typecheck        # Type checking
pnpm lint             # Linting
pnpm test             # Unit tests
pnpm e2e              # E2E tests

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate:dev   # Create and apply migration
pnpm db:migrate:deploy # Apply migrations (production)
pnpm db:reset         # Reset database
pnpm db:studio        # Open Prisma Studio

# Utilities
pnpm clean            # Clean build artifacts
pnpm format           # Format code with Prettier
```

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**:
   - Import repository in Vercel
   - Vercel auto-detects monorepo structure

2. **Configure Environment Variables**:
   ```bash
   DATABASE_URL="postgresql://..."
   AUTH_JWT_SECRET="your-secret-min-32-chars"
   REQUIRE_AUTH="true"
   ALLOW_DEV_BYPASS="false"
   DEV_LOGIN_ENABLED="false"
   OBJECT_STORAGE_ENDPOINT="https://s3.us-west-2.amazonaws.com"
   OBJECT_STORAGE_BUCKET="your-bucket"
   OBJECT_STORAGE_ACCESS_KEY="..."
   OBJECT_STORAGE_SECRET="..."
   ```

3. **Deploy**:
   - Push to `main` for production
   - Open PR for preview deployment

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_JWT_SECRET` | JWT secret (min 32 chars) | Yes |
| `REQUIRE_AUTH` | Enable authentication | Yes (prod) |
| `ALLOW_DEV_BYPASS` | Allow dev bypass | No (false in prod) |
| `DEV_LOGIN_ENABLED` | Enable dev login | No (false in prod) |
| `OBJECT_STORAGE_*` | S3-compatible storage config | Yes |
| `FEATURE_*` | Feature flag overrides | No |

---

## Feature Flags

New features are gated behind feature flags for safe iteration:

```typescript
import { isFeatureEnabled } from '@terp/config';

if (await isFeatureEnabled('ENABLE_MOBILE_UI')) {
  // Show new mobile UI
}
```

**Available Flags**:
- `ENABLE_MOBILE_UI`: Mobile-optimized UI from Lovable frontend
- `ENABLE_NEW_DASHBOARD`: Redesigned dashboard with enhanced analytics
- `ENABLE_ADVANCED_PRICING`: Advanced pricing rules and tier management

See [Feature Flags ADR](docs/adrs/002-feature-flags.md) for details.

---

## API Versioning

APIs are versioned under `/api/v1/*` namespace:

- **Non-breaking changes**: Added to current version
- **Breaking changes**: New version created (e.g., `/api/v2/*`)
- **Deprecation**: Old endpoints maintained with deprecation headers

See [API Versioning ADR](docs/adrs/003-api-versioning.md) and [DEPRECATION.md](DEPRECATION.md) for details.

---

## Documentation

- **[Status Hub](docs/status/STATUS.md)**: Current project status (single source of truth)
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Development workflow and guidelines
- **[RUNBOOK.md](RUNBOOK.md)**: Operational procedures and incident response
- **[DEPRECATION.md](DEPRECATION.md)**: API deprecation log
- **[docs/iterating.md](docs/iterating.md)**: How to request changes safely
- **[docs/adrs/](docs/adrs/)**: Architecture Decision Records

---

## Testing

### Unit Tests
```bash
pnpm test
pnpm test --watch
```

### E2E Tests
```bash
pnpm e2e
pnpm e2e --ui  # Interactive mode
```

### Coverage
```bash
pnpm test --coverage
```

**Coverage Requirements**:
- Unit/Integration: ≥80% for business logic
- E2E: Smoke tests for core user funnels

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development workflow
- Branch strategy
- Commit conventions
- PR process
- Code standards
- Testing requirements

**Quick Start**:
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and add tests
4. Run quality checks: `pnpm typecheck && pnpm lint && pnpm test`
5. Open a PR with clear description

---

## Security

### Authentication
All routes (except `/login` and public assets) require authentication via JWT cookie.

### Authorization
Four roles with hierarchical permissions:
- **SUPER_ADMIN**: Full access to all operations
- **ACCOUNTING**: Finance operations, read-only inventory
- **SALES**: Quote and order management, read-only inventory
- **READ_ONLY**: View-only access

### Production Security Checklist
- ✅ JWT secret must be 32+ characters
- ✅ `REQUIRE_AUTH=true` in production
- ✅ `ALLOW_DEV_BYPASS=false` in production
- ✅ `DEV_LOGIN_ENABLED=false` in production
- ✅ Database SSL enabled (`sslmode=require`)
- ✅ Object storage credentials secured

---

## Support

- **Status**: Check [Status Hub](docs/status/STATUS.md)
- **Issues**: [GitHub Issues](https://github.com/EvanTenenbaum/TERP/issues)
- **Documentation**: See `docs/` directory
- **Contact**: See Status Hub for current responsible owner

---

## License

Proprietary - All rights reserved

---

## Acknowledgments

- **Lovable Frontend**: Mobile-first UI components from [code-to-beauty-design](https://github.com/EvanTenenbaum/code-to-beauty-design)
- **Backend**: Built on [ERPv3](https://github.com/EvanTenenbaum/ERPv3)

---

**Last Updated**: 2025-10-22  
**Version**: 1.0.0  
**Status**: 🟡 In Development



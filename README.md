# ERPv3 - Enterprise Resource Planning System

A production-ready ERP system built with Next.js 14, TypeScript, Prisma, and PostgreSQL. Features comprehensive inventory management, sales operations, finance tracking, and role-based access control.

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

### Attachments & Storage
- **S3-Compatible Storage**: AWS S3, Cloudflare R2, or MinIO support
- **Database-Backed Index**: Attachment metadata stored in PostgreSQL
- **Archive Support**: Soft-delete with archive functionality
- **Multi-Entity Support**: Attach files to any entity type

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Neon or any Postgres provider)
- **ORM**: Prisma
- **Authentication**: JWT (jose library)
- **Storage**: AWS S3 SDK (S3-compatible)
- **Validation**: Zod
- **Testing**: Jest (unit) + Playwright (e2e)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- S3-compatible storage (AWS S3, Cloudflare R2, or MinIO)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run seed
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Type checking
npm run typecheck

# Unit tests
npm test

# E2E tests
npm run test:e2e
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment

See [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) for complete Vercel deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import repository in Vercel
3. Set environment variables (see `.env.example`)
4. Deploy

### Environment Variables

Critical environment variables for production:

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

## Project Structure

```
erpv3/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── alerts/       # Replenishment alerts
│   │   │   ├── attachments/  # File upload/download
│   │   │   ├── auth/         # Authentication
│   │   │   ├── finance/      # Finance operations
│   │   │   ├── inventory/    # Inventory operations
│   │   │   ├── products/     # Product management
│   │   │   └── quotes/       # Quote management
│   │   ├── finance/          # Finance UI pages
│   │   ├── inventory/        # Inventory UI pages
│   │   ├── quotes/           # Quote UI pages
│   │   └── login/            # Login page
│   └── lib/
│       ├── api.ts            # API wrapper with RBAC
│       ├── auth.ts           # Authentication helpers
│       ├── errors.ts         # Error handling
│       ├── prisma.ts         # Prisma client
│       ├── storage.ts        # Object storage
│       ├── pricing.ts        # Pricing engine
│       ├── inventoryAllocator.ts  # FIFO allocation
│       └── finance/
│           └── payments.ts   # Payment FIFO application
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # SQL migrations
│   └── seed.ts               # Seed data
├── tests/
│   └── unit/                 # Unit tests
├── e2e/                      # E2E tests
├── docs/                     # Documentation
└── middleware.ts             # Auth middleware

```

## API Endpoints

### Inventory
- `POST /api/inventory/cycle-count/plan` - Create cycle count plan
- `GET /api/inventory/cycle-count/tasks` - List tasks for plan
- `POST /api/inventory/cycle-count/task/[id]/submit` - Submit count
- `POST /api/inventory/cycle-count/apply` - Apply cycle count
- `POST /api/inventory/adjustments` - Create adjustment
- `GET /api/inventory/adjustments/list` - List adjustments
- `POST /api/inventory/transfers` - Create transfer
- `POST /api/inventory/returns/customer` - Customer return
- `POST /api/inventory/returns/vendor` - Vendor return
- `GET /api/inventory/export` - Export inventory CSV

### Sales
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `POST /api/quotes/[id]/convert` - Convert quote to order

### Finance
- `POST /api/finance/payments/apply` - Apply payment FIFO
- `GET /api/finance/ar/aging.csv` - AR aging report
- `GET /api/finance/ap/aging.csv` - AP aging report

### Alerts
- `GET /api/alerts/replenishment/preview` - Preview replenishment needs
- `POST /api/alerts/replenishment/apply` - Apply replenishment

### Attachments
- `POST /api/attachments/upload` - Upload file
- `GET /api/attachments/list` - List attachments
- `GET /api/attachments/file` - Download file
- `POST /api/attachments/[id]/archive` - Archive attachment

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

## Documentation

- [Authentication & RBAC](docs/AUTH_RBAC.md)
- [Migration Safety](docs/MIGRATION_SAFETY.md)
- [Object Storage Setup](docs/OBJECT_STORAGE.md)
- [Vercel Deployment](docs/VERCEL_DEPLOY.md)
- [RBAC QA Checklist](docs/QA_RBAC_CHECKLIST.md)

## License

Proprietary - All rights reserved

## Support

For issues, questions, or feature requests, please contact the development team.

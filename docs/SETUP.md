# TERP Local Development Setup

**Date**: November 6, 2025  
**Purpose**: Guide for setting up the TERP project for local development.

---

## 1. Prerequisites

- **Node.js**: v22.x
- **pnpm**: v9.x
- **Docker**: Latest version
- **Git**: Latest version
- **GitHub CLI**: `gh`

---

## 2. Clone the Repository

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP

# Navigate into the project directory
cd TERP
```

---

## 3. Install Dependencies

```bash
# Install all project dependencies
pnpm install
```

---

## 4. Environment Variables

Create a `.env` file in the root of the project by copying the example file:

```bash
cp .env.example .env
```

### `.env` File Contents

```
# Drizzle Kit
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=password
DATABASE_URL="mysql://root:password@127.0.0.1:3306/terp"

# Next Auth
AUTH_SECRET="your-long-random-auth-secret"
AUTH_URL="http://localhost:3000/api/auth"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Clerk webhook secret for production
# CLERK_WEBHOOK_SECRET=whsec_...
```

**Notes:**

- The `DATABASE_*` variables are for the local Docker database.
- `AUTH_SECRET` can be any long, random string.
- You need to get Clerk keys from your Clerk dashboard.

---

## 5. Start the Local Database

This project uses Docker to run a local MySQL database.

```bash
# Start the database container in the background
docker-compose up -d
```

- **First time?** The database will be created automatically.
- **Need to reset?** Run `docker-compose down -v` to delete the database volume.

---

## 6. Push Database Schema

Apply the latest database schema from `drizzle/schema.ts` to your local database:

```bash
# Push schema changes
pnpm db:push
```

---

## 7. Seed the Database (Optional)

Populate your local database with realistic mock data:

```bash
# Seed with a light scenario (for development)
pnpm seed light

# Seed with a full scenario (for E2E testing)
pnpm seed full
```

---

## 8. Run the Development Server

Start the Next.js development server:

```bash
# Start the dev server
pnpm dev
```

Your application will be available at **http://localhost:3000**.

---

## 9. Run Tests

Ensure everything is working correctly by running the test suite:

```bash
# Run all tests (unit, integration, e2e)
pnpm test
```

---

## ✅ You Are Ready!

Your local development environment is now fully set up. You can start making changes and contributing to TERP.

### Quick Command Reference

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `pnpm install`         | Install dependencies                             |
| `pnpm dev`             | Start the development server                     |
| `pnpm test`            | Run all tests                                    |
| `pnpm test:watch`      | Run tests in watch mode (for TDD)                |
| `pnpm lint`            | Check code quality                               |
| `pnpm format`          | Format code                                      |
| `pnpm typecheck`       | Verify TypeScript types                          |
| `pnpm check`           | Run all quality checks (lint, format, typecheck) |
| `pnpm db:push`         | Push schema changes to the database              |
| `pnpm seed light`      | Seed the database with light mock data           |
| `docker-compose up -d` | Start the local database                         |
| `docker-compose down`  | Stop the local database                          |

---

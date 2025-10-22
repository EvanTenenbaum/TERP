# Contributing to TERP

Thank you for contributing to the TERP ERP System! This document outlines our development workflow, coding standards, and contribution guidelines.

---

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (install via `npm install -g pnpm`)
- **PostgreSQL**: For local development (or use Neon)
- **Git**: For version control

### Local Setup

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

# Run database migrations
pnpm db:migrate:dev

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **Feature branches**: `feat/feature-name` for new features
- **Bug fixes**: `fix/bug-description` for bug fixes
- **Hotfixes**: `hotfix/critical-issue` for urgent production fixes

### Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes

**Examples**:
```
feat(quotes): add bulk quote creation endpoint
fix(inventory): correct FIFO allocation logic
docs(api): update API versioning documentation
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, atomic commits
3. **Update tests** to cover your changes
4. **Run quality checks**:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
5. **Update Status Hub**: The bot will auto-update `docs/status/STATUS.md`, but verify it's correct
6. **Open a Pull Request** with:
   - Clear title following conventional commits
   - Description of changes
   - Linked issues (e.g., "Closes #123")
   - Affected areas (FE/BE/DB)
   - Status Hub delta (what changed)
7. **Request review** from a team member
8. **Address feedback** and update PR
9. **Merge** after approval and passing CI

### PR Template

When opening a PR, include:

```markdown
## Summary
Brief description of changes

## Linked Issues
Closes #123

## Affected Areas
- [ ] Frontend
- [ ] Backend
- [ ] Database
- [ ] Infrastructure

## Status Hub Delta
- Feature flags: None
- API changes: None
- Database migration: None

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or BREAKING_CHANGE_APPROVED label added)
- [ ] Status Hub updated by bot
```

---

## Code Standards

### TypeScript

- **Strict mode**: All packages use `strict: true` and `noUncheckedIndexedAccess: true`
- **No `any`**: Avoid `any` type; use `unknown` or proper types
- **Explicit return types**: Functions should have explicit return types
- **Zod validation**: Use Zod schemas for runtime validation

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserById`)
- **Types/Interfaces**: PascalCase (`UserProfile`)
- **Constants**: UPPER_SNAKE_CASE (`API_VERSION`)
- **Files**: kebab-case (`user-profile.ts`)
- **Packages**: @terp/package-name

### Code Quality

- **ESLint**: All code must pass `pnpm lint`
- **Prettier**: Code is auto-formatted on commit
- **Dead code**: No unused imports or variables (checked by `ts-prune`)
- **TODOs**: Must include issue ID (e.g., `// TODO(#123): Fix this`)

---

## Testing

### Test Types

1. **Unit Tests**: Test individual functions/modules (Vitest)
2. **Integration Tests**: Test API endpoints (supertest)
3. **E2E Tests**: Test user flows (Playwright)

### Coverage Requirements

- **Unit/Integration**: ≥80% coverage for business logic
- **E2E**: Smoke tests for core user funnels

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm e2e

# Watch mode
pnpm test --watch
```

---

## Feature Flags

All new features should be gated behind feature flags:

1. Add flag to `packages/config/src/flags.ts`
2. Use `isFeatureEnabled()` to check flag state
3. Default to `false` in production
4. Enable in preview environments for testing
5. Remove flag after stable rollout

See [ADR-002](docs/adrs/002-feature-flags.md) for details.

---

## API Changes

### Non-Breaking Changes

Additive changes can be made to existing endpoints:
- Add new optional fields
- Add new endpoints
- Expand enum values (with backward compatibility)

### Breaking Changes

Breaking changes require:
1. New API version (e.g., `/api/v2/*`)
2. Deprecation of old endpoint (see [DEPRECATION.md](DEPRECATION.md))
3. PR label: `BREAKING_CHANGE_APPROVED=true`
4. Update `@terp/types` with new schemas
5. Contract tests must pass

See [ADR-003](docs/adrs/003-api-versioning.md) for details.

---

## Database Migrations

### Creating Migrations

```bash
# Create a new migration
pnpm db:migrate:dev --name descriptive_migration_name
```

### Migration Safety

- **Non-destructive**: Prefer additive changes
- **Shadow database**: CI validates migrations against shadow DB
- **Rollback plan**: Document rollback steps in migration comments
- **Data migrations**: Separate schema changes from data migrations

### Destructive Changes

If a migration is destructive (drops columns, changes types):
1. Add PR label: `DESTRUCTIVE_MIGRATION_APPROVED=true`
2. Document rollback plan
3. Test on staging environment first
4. Schedule maintenance window if needed

---

## Status Hub

The **Status Hub** (`docs/status/STATUS.md`) is the single source of truth for project status.

### Auto-Updates

The Status Hub is automatically updated by a GitHub Action on:
- PR open/sync/merge
- CI completion
- Vercel deployment

### Manual Updates

To manually refresh the Status Hub, comment on a PR:
```
/status refresh
```

### What's Tracked

- Live deployment URLs
- Open PRs with preview links
- Latest migration ID and schema hash
- Feature flags matrix
- Recent changes and decisions
- Open risks and blockers

See the [Status Hub](docs/status/STATUS.md) for current project state.

---

## Review Requirements

All PRs require:
- ✅ CI passing (build, typecheck, lint, tests)
- ✅ E2E tests passing
- ✅ At least one approval from a team member
- ✅ Status Hub updated by bot
- ✅ No merge conflicts

---

## Questions?

- **Documentation**: Check `docs/` directory
- **Status**: See [Status Hub](docs/status/STATUS.md)
- **Issues**: Open a GitHub issue
- **Contact**: Reach out to the responsible owner

Thank you for contributing! 🎉


# ADR-001: Monorepo Architecture

**Date**: 2025-10-22  
**Status**: Accepted  
**Deciders**: Evan Tenenbaum  

## Context

The TERP ERP system previously consisted of a single Next.js application with all code in one repository. A separate Lovable-built frontend (code-to-beauty-design) existed in another repository. To enable safe iteration, shared code reuse, and unified deployment, we needed to consolidate both repositories into a single monorepo structure.

## Decision

We will adopt a **monorepo architecture** using:

- **pnpm workspaces** for package management
- **Turborepo** for build orchestration and caching
- **Workspace packages** for shared code (`@terp/db`, `@terp/types`, `@terp/config`, `@terp/utils`, `@terp/ui`)
- **Apps structure** with `apps/web` as the primary Next.js 14 App Router application

### Directory Structure

```
terp-monorepo/
├── apps/
│   ├── web/          # Unified Next.js 14 app (frontend + API routes)
│   └── api/          # (Optional) Separate API server if needed
├── packages/
│   ├── db/           # Prisma schema, client, migrations
│   ├── types/        # Shared TypeScript types and Zod schemas
│   ├── config/       # Feature flags and configuration
│   ├── ui/           # Shared UI components
│   └── utils/        # Shared utilities
├── docs/
│   ├── status/       # Status Hub (single source of truth)
│   └── adrs/         # Architecture Decision Records
└── scripts/          # Bootstrap and automation scripts
```

## Consequences

### Positive
- **Code reuse**: Shared packages eliminate duplication between frontend and backend
- **Type safety**: End-to-end type safety via `@terp/types` with Zod validation
- **Faster builds**: Turborepo caching speeds up CI/CD
- **Atomic changes**: Single PR can update frontend, backend, and shared code together
- **History preservation**: Git subtree maintains Lovable frontend commit history

### Negative
- **Initial complexity**: Monorepo setup requires more upfront configuration
- **Build tooling**: Requires understanding of pnpm workspaces and Turborepo
- **Migration effort**: Existing code must be reorganized into packages

### Neutral
- **Single deployment**: Vercel builds the monorepo with Turborepo integration
- **Workspace dependencies**: Packages reference each other via `workspace:*` protocol

## Alternatives Considered

1. **Multi-repo with published packages**: Rejected due to overhead of publishing internal packages
2. **Git submodules**: Rejected due to complexity and poor developer experience
3. **Single app with no packages**: Rejected due to lack of code organization and reusability

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vercel Monorepo Support](https://vercel.com/docs/monorepos)


# Agent 1D: TypeScript Cleanup (Wave 1)

## Context

You are an AI agent tasked with eliminating TypeScript errors across the TERP codebase to ensure type safety and stability.

## Tasks

1. **CODE-001: TypeScript Error Cleanup (240 errors)**
   - **Problem:** The codebase has ~240 TypeScript errors, primarily in server routers and complex components.
   - **Goal:** Fix all TypeScript errors while maintaining proper type safety (avoid using `any` where possible).
   - **Priority Files:**
     - `server/routers/alerts.ts`
     - `server/routers/inventoryShrinkage.ts`
     - `server/routers/vendorReminders.ts`
     - `server/routers/unifiedSalesPortal.ts`

## Quality Gates

- `pnpm check` must pass with 0 errors.
- No new `any` types should be introduced.
- Existing `any` types should be replaced with proper interfaces where feasible.
- Logic must remain unchanged; this is a type-fixing task only.

## Branch

`wave-1/typescript-cleanup`

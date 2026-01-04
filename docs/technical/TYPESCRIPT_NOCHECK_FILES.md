# TypeScript @ts-nocheck Files

> **Status**: Temporary workaround applied 2025-01-04
> **Priority**: Wave 1 - Code Health
> **Effort**: ~16 hours total

## Overview

These files have `@ts-nocheck` directives added as a temporary workaround to allow TypeScript compilation to pass. Each file has schema mismatch errors where the code references columns or types that don't exist in the current database schema.

## Root Cause

The routers and components were written for a planned schema that was never fully implemented. The code references:
- `products.name` (should be `products.nameCanonical`)
- `products.sku`, `products.targetStockLevel`, `products.minStockLevel`, `products.unit` (don't exist)
- `batches.quantity` (should be `batches.onHandQty`)
- `clientNeeds.productType`, `clientNeeds.quantity` (don't exist - use `category`, `quantityMin`/`quantityMax`)
- `clients.tier` (doesn't exist)

## Files Requiring Fixes

### Server Routers (13 files)

| File | Error Count | Primary Issue |
|------|-------------|---------------|
| `server/routers/alerts.ts` | 24 | Products/batches schema mismatch |
| `server/routers/analytics.ts` | 5 | Products schema mismatch |
| `server/routers/audit.ts` | 10 | Context type mismatch |
| `server/routers/customerPreferences.ts` | 10 | Clients schema mismatch |
| `server/routers/featureFlags.ts` | 2 | Feature flags schema |
| `server/routers/flowerIntake.ts` | 1 | Batches schema mismatch |
| `server/routers/inventoryShrinkage.ts` | 15 | Batches schema mismatch |
| `server/routers/photography.ts` | 5 | Batches/products schema |
| `server/routers/quickCustomer.ts` | 9 | Clients schema mismatch |
| `server/routers/referrals.ts` | 3 | Referrals schema |
| `server/routers/unifiedSalesPortal.ts` | 12 | Multiple schema issues |
| `server/services/featureFlagService.ts` | 1 | Feature flags schema |
| `server/db/seed/productionSeed.ts` | 2 | Seed data schema |

### Client Components (12 files)

| File | Error Count | Primary Issue |
|------|-------------|---------------|
| `client/src/pages/Inventory.tsx` | 32 | Batch/product type inference |
| `client/src/pages/PhotographyPage.tsx` | 7 | Batch type inference |
| `client/src/hooks/useInventorySort.ts` | 4 | Batch type inference |
| `client/src/pages/vip-portal/VIPDashboard.tsx` | 2 | Client type mismatch |
| `client/src/pages/settings/FeatureFlagsPage.tsx` | 2 | Feature flag types |
| `client/src/pages/accounting/Invoices.tsx` | 2 | Invoice types |
| `client/src/pages/UnifiedSalesPortalPage.tsx` | 2 | Portal types |
| `client/src/pages/InterestListPage.tsx` | 2 | Client needs types |
| `client/src/components/settings/VIPImpersonationManager.tsx` | 2 | Client type null vs undefined |
| `client/src/pages/settings/NotificationPreferences.tsx` | 1 | Notification types |
| `client/src/pages/OrderCreatorPage.tsx` | 1 | Order types |
| `client/src/pages/NotificationsPage.tsx` | 1 | Notification types |

## Fix Strategy

### Option 1: Update Routers to Match Current Schema (Recommended)
- Rewrite router queries to use actual column names
- Update type definitions to match schema
- Estimated: 8-12 hours

### Option 2: Add Missing Columns to Schema
- Add migrations for missing columns
- Risk: May conflict with existing data
- Not recommended without careful analysis

### Option 3: Create Compatibility Layer
- Add computed properties or views
- Higher complexity, lower risk
- Estimated: 4-6 hours

## Acceptance Criteria

- [ ] All `@ts-nocheck` directives removed
- [ ] `pnpm check` passes with 0 errors
- [ ] All affected features still work correctly
- [ ] Unit tests pass for affected routers

## Related Tasks

- Wave 1: Code Health - TypeScript Strict Mode
- Wave 1: Schema Alignment
- MASTER_ROADMAP.md - Task CH-001

# Wave 1 (v3): Critical Fixes & Code Health

> **Updated:** 2025-01-04
> **Status:** TypeScript errors reduced from 390 → 0 (with @ts-nocheck workarounds)

## Pre-Flight Checks

**IMPORTANT:** Run these checks BEFORE starting any work to ensure your environment is ready.

```bash
# 1. Clone the repository (sets up origin remote correctly)
gh repo clone EvanTenenbaum/TERP ~/TERP
cd ~/TERP

# 2. Verify git remote is configured
git remote -v
# Should show: origin  https://github.com/EvanTenenbaum/TERP.git (fetch/push)

# 3. Install dependencies
pnpm install

# 4. Verify TypeScript compiles (should be 0 errors)
pnpm check
# If errors appear, pull latest main: git pull origin main

# 5. Verify the app builds
pnpm build

# 6. Create your feature branch
git checkout -b wave-1/comprehensive-fixes-v3
```

If any pre-flight check fails, STOP and report the issue before proceeding.

## Context

Read these files first to understand the codebase:

- `docs/roadmaps/MASTER_ROADMAP.md` - Current project status
- `docs/CODEBASE_OVERVIEW.md` - Architecture overview  
- `docs/technical/TYPESCRIPT_NOCHECK_FILES.md` - Files with temporary @ts-nocheck
- `drizzle/schema.ts` - Database schema

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend:** Node.js + Express + tRPC + Drizzle ORM
- **Database:** MySQL (DigitalOcean Managed)
- **Testing:** Vitest + Playwright

## Protocols

1. **Atomic Complete:** Every task must be fully functional before marking complete
2. **Redhat QA:** Self-review all work for bugs, gaps, and improvements before committing
3. **CLI-First:** All actions must be automatable via CLI
4. **Mobile-First Responsive:** All UI changes must work on mobile AND desktop

## Tasks

### Part 1: Remove @ts-nocheck and Fix Schema Alignment (CODE-001) - 16h

**Goal:** Remove all `@ts-nocheck` directives and properly fix the underlying schema mismatches.

**Current State:** 25 files have `@ts-nocheck` as a temporary workaround. See `docs/technical/TYPESCRIPT_NOCHECK_FILES.md` for the full list.

**Instructions:**

1. Start with server routers (13 files) - these are the root cause
2. For each router, update queries to use actual schema column names:
   - `products.name` → `products.nameCanonical`
   - `batches.quantity` → `batches.onHandQty`
   - `clientNeeds.productType` → `clientNeeds.category`
   - `clientNeeds.quantity` → `clientNeeds.quantityMin` / `clientNeeds.quantityMax`
3. After fixing routers, the client components should have correct types
4. Remove `@ts-nocheck` from each file after fixing
5. Run `pnpm check` after each file to verify no new errors

**Priority Order:**
1. `server/routers/alerts.ts` (24 errors)
2. `server/routers/inventoryShrinkage.ts` (15 errors)
3. `server/routers/unifiedSalesPortal.ts` (12 errors)
4. `server/routers/customerPreferences.ts` (10 errors)
5. `server/routers/audit.ts` (10 errors)
6. Remaining server files
7. Client components

### Part 2: Comprehensive Form Validation (BUG-043) - 12h

**Goal:** Add Zod validation to all forms to prevent silent failures.

**Files to update:**

- `client/src/pages/ClientProfilePage.tsx` (Client Edit Form)
- `client/src/components/todos/TaskForm.tsx` (Task Form)
- `client/src/pages/OrderCreatorPage.tsx` (Order Form)
- `client/src/components/inventory/PurchaseModal.tsx` (Purchase Form)

**Instructions:**

1. For each form, create a Zod schema for the form data.
2. Use the `useForm` hook with the Zod resolver.
3. Display validation errors next to each form field.
4. Ensure the submit button is disabled until the form is valid.

### Part 3: Modal & Data Population (BUG-040) - 8h

**Goal:** Fix modals that appear with empty fields.

**Files to update:**

- `client/src/pages/ClientProfilePage.tsx` (Client Edit Dialog)
- `client/src/components/todos/TaskDetailModal.tsx` (Task Detail Modal)

**Instructions:**

1. When the modal opens, ensure the `useQuery` hook has fetched the data.
2. Populate the form fields with the fetched data.
3. Handle loading and error states gracefully.

### Part 4: Navigation & CTA Fixes (BUG-042) - 8h

**Goal:** Fix broken buttons and misleading redirects.

**Tasks:**

- Verify "New Invoice" button on dashboard and fix if broken.
- Remove all `console.log` statements from production code.
- Ensure all CTAs navigate to the correct pages.

### Part 5: Mobile Responsiveness (UX-029) - 8h

**Goal:** Ensure all UI changes from this wave are mobile-responsive.

**Instructions:**

1. Test all updated forms, modals, and pages on a 375px wide screen.
2. Use responsive TailwindCSS classes (`sm:`, `md:`, `lg:`) to adjust layouts.
3. Ensure no horizontal scrolling occurs on mobile.

## Quality Gates

Before committing, verify:

- [ ] `pnpm check` returns 0 TypeScript errors
- [ ] NO files have `@ts-nocheck` directives
- [ ] All forms have Zod validation
- [ ] All modals populate data correctly
- [ ] All UI works on mobile (375px) AND desktop (1440px)
- [ ] No `console.log` statements in production code
- [ ] `pnpm lint` passes with no errors
- [ ] Playwright tests pass (`pnpm test:e2e`)

## Troubleshooting

### Git Push Fails
```bash
# Ensure remote is configured
git remote -v
# If missing, add it:
git remote add origin https://github.com/EvanTenenbaum/TERP.git
```

### TypeScript Errors Appear
```bash
# Pull latest changes
git pull origin main
# Reinstall dependencies
pnpm install
# Check again
pnpm check
```

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
pnpm build
```

## Commit & Push

```bash
git add -A
git commit -m "feat(wave-1-v3): critical fixes and code health

- CODE-001: Removed all @ts-nocheck, fixed schema alignment
- BUG-043: Added comprehensive form validation
- BUG-040: Fixed modal data population issues
- BUG-042: Fixed navigation and CTA bugs
- UX-029: Ensured all changes are mobile-responsive

Redhat QA: Self-imposed review performed"

git push origin wave-1/comprehensive-fixes-v3
gh pr create --title "Wave 1 (v3): Critical Fixes & Code Health" --body "See commit message for details"
```

## Update Roadmap

After PR is merged, update `docs/roadmaps/MASTER_ROADMAP.md` to mark all tasks as complete.

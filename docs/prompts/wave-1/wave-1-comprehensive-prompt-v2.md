# Wave 1 (v2): Critical Fixes & Code Health

## Onboarding

Clone the repository and create your branch:

```bash
gh repo clone EvanTenenbaum/TERP ~/TERP
cd ~/TERP
git checkout -b wave-1/comprehensive-fixes-v2
```

Read these files first to understand the codebase:

- `docs/roadmaps/MASTER_ROADMAP.md` - Current project status
- `docs/CODEBASE_OVERVIEW.md` - Architecture overview
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

### Part 1: TypeScript Cleanup (CODE-001) - 24h

**Goal:** Reduce TypeScript errors from 390 to 0.

**Instructions:**

1. Run `pnpm check` to get the full list of errors.
2. Prioritize fixing errors in `server/` first, then `client/`.
3. Do NOT introduce any new `// @ts-ignore` comments.
4. Document complex fixes in the commit message.

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

- [ ] `pnpm check` returns 0 TypeScript errors.
- [ ] All forms have Zod validation.
- [ ] All modals populate data correctly.
- [ ] All UI works on mobile (375px) AND desktop (1440px).
- [ ] No `console.log` statements in production code.
- [ ] Playwright tests pass (`pnpm test:e2e`).

## Commit & Push

```bash
git add -A
git commit -m "feat(wave-1-v2): critical fixes and code health

- CODE-001: Fixed 390 TypeScript errors
- BUG-043: Added comprehensive form validation
- BUG-040: Fixed modal data population issues
- BUG-042: Fixed navigation and CTA bugs
- UX-029: Ensured all changes are mobile-responsive

Redhat QA: Self-imposed review performed"

git push origin wave-1/comprehensive-fixes-v2
gh pr create --title "Wave 1 (v2): Critical Fixes & Code Health" --body "See commit message for details"
```

## Update Roadmap

After PR is merged, update `docs/roadmaps/MASTER_ROADMAP.md` to mark all tasks as complete.

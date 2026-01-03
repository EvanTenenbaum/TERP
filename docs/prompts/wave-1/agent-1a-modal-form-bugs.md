# Agent 1A: Modal & Form Bugs (Wave 1)

## Context

You are an AI agent tasked with fixing critical modal and form-related bugs in the TERP application. These bugs are blocking Tier 1 customer readiness.

## Tasks

1. **BUG-040: Task/Client edit modal empty fields**
   - **Problem:** When opening the edit modal for a task or client, some fields appear empty even though data exists in the database.
   - **Goal:** Ensure all fields are correctly populated from the data object when the modal opens.
   - **Files:** `client/src/components/modals/TaskEditModal.tsx`, `client/src/components/modals/ClientEditModal.tsx`

2. **BUG-041: Fulfillment batch status update fails**
   - **Problem:** Updating the status of a batch in the fulfillment module fails silently or with an error.
   - **Goal:** Fix the status update logic to ensure batch statuses are correctly persisted.
   - **Files:** `client/src/pages/FulfillmentPage.tsx`, `server/routers/fulfillment.ts`

3. **BUG-043: Form validation missing - silent failures**
   - **Problem:** Many forms lack proper validation, leading to silent failures or database errors when invalid data is submitted.
   - **Goal:** Implement robust client-side and server-side validation using Zod.
   - **Files:** `client/src/components/forms/*`, `server/routers/*`

4. **BUG-047: Make KPI Cards Actionable When Clicked**
   - **Problem:** KPI cards highlight on click but don't perform any action.
   - **Goal:** Add onClick handlers to navigate to relevant filtered views.
   - **Files:** `client/src/components/dashboard/KPICard.tsx`, `client/src/components/dashboard/DashboardMetrics.tsx`

## Quality Gates

- All forms must have Zod validation.
- All modals must populate data correctly.
- KPI cards must navigate to the correct filtered page.
- No TypeScript errors in modified files.
- Playwright tests for these features must pass.

## Branch

`wave-1/modal-form-bugs`

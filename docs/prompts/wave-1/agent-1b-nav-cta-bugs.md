# Agent 1B: Navigation & CTA Bugs (Wave 1)

## Context

You are an AI agent tasked with fixing critical navigation and Call-to-Action (CTA) bugs in the TERP application.

## Tasks

1. **BUG-042: Misleading CTA redirects**
   - **Problem:** Some buttons and links redirect users to incorrect pages or non-existent routes.
   - **Goal:** Audit and fix all primary CTAs to ensure they lead to the correct destination.
   - **Files:** `client/src/pages/*`, `client/src/components/ui/Button.tsx`

2. **BUG-044: Developer messages in production**
   - **Problem:** Debug messages, "TODO" placeholders, and developer-only alerts are visible in the production UI.
   - **Goal:** Remove or hide all developer-specific messaging from the production build.
   - **Files:** Entire codebase (search for "TODO", "FIXME", "DEBUG")

3. **BUG-045: New Invoice button non-functional**
   - **Problem:** The "New Invoice" button in the Accounting module does nothing when clicked.
   - **Goal:** Connect the button to the invoice creation flow/modal.
   - **Files:** `client/src/pages/AccountingPage.tsx`, `client/src/components/modals/InvoiceCreateModal.tsx`

4. **BUG-046: Data fetch failures block progress**
   - **Problem:** Some pages fail to load or show infinite spinners when a data fetch fails, instead of showing an error state.
   - **Goal:** Implement proper error boundaries and error states for all major data fetches.
   - **Files:** `client/src/hooks/useQuery*`, `client/src/components/ui/ErrorState.tsx`

## Quality Gates

- All CTAs must lead to valid routes.
- No "TODO" or debug messages visible in UI.
- New Invoice button must open the creation flow.
- Error states must be shown for failed fetches.
- No TypeScript errors in modified files.

## Branch

`wave-1/nav-cta-bugs`

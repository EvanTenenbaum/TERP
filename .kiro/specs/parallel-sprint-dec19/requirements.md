# Requirements Document

## Introduction

This document defines requirements for a **Parallel Sprint** that can be executed alongside the MVP Sprint (Phases 2-3) without conflicts. The sprint focuses on code quality, security hardening, and UX improvements in modules that are NOT touched by the MVP Sprint's data integrity and workflow validation work.

**Sprint Theme:** Code Quality & Security Hardening
**Duration:** 2-3 days
**Parallelization:** Safe to run with 1-2 agents alongside MVP work

## Glossary

- **TERP**: The ERP system for cannabis businesses
- **Parallel Sprint**: A set of tasks designed to run concurrently with the MVP Sprint without file conflicts
- **Module Isolation**: Ensuring tasks don't modify the same files as concurrent work
- **Security Hardening**: Improving security posture without breaking existing functionality

## Requirements

### Requirement 1: Remove Debug Routes from Production

**User Story:** As a system administrator, I want debug routes removed from production, so that internal debugging tools are not exposed to end users.

#### Acceptance Criteria

1. WHEN the application starts in production mode THEN the system SHALL NOT expose the `/orders-debug` route
2. WHEN a user attempts to access `/orders-debug` in production THEN the system SHALL return a 404 response
3. WHEN the application runs in development mode THEN the system SHALL allow access to debug routes for developers

**Module:** `client/src/App.tsx`, `server/routers/orders.ts`
**Estimate:** 30min
**MVP Task:** BUG-011 (Phase 4 - not conflicting)

---

### Requirement 2: Implement Searchable Client Dropdown

**User Story:** As a sales representative, I want to search for clients in dropdown menus, so that I can quickly find the right client when creating orders.

#### Acceptance Criteria

1. WHEN a user opens a client dropdown THEN the system SHALL display a search input field
2. WHEN a user types in the search field THEN the system SHALL filter clients by name in real-time
3. WHEN the filtered results exceed 10 items THEN the system SHALL display only the first 10 with a "show more" option
4. WHEN no clients match the search THEN the system SHALL display "No clients found" message

**Module:** `client/src/components/ui/` (new combobox component)
**Estimate:** 2h
**MVP Task:** UX-013 (Phase 4 - not conflicting)

---

### Requirement 3: Add Breadcrumb Navigation

**User Story:** As a user navigating the application, I want to see breadcrumb navigation, so that I can understand my current location and navigate back easily.

#### Acceptance Criteria

1. WHEN a user navigates to any page THEN the system SHALL display breadcrumb navigation showing the path
2. WHEN a user clicks a breadcrumb item THEN the system SHALL navigate to that location
3. WHEN the breadcrumb path exceeds 4 levels THEN the system SHALL collapse middle items with an ellipsis
4. WHEN on the root page THEN the system SHALL display only "Home" in the breadcrumb

**Module:** `client/src/components/layout/` (breadcrumb integration)
**Estimate:** 4h
**MVP Task:** UX-009 (Phase 4 - not conflicting)

---

### Requirement 4: Fix Chart of Accounts Edit Button

**User Story:** As an accountant, I want to edit chart of accounts entries, so that I can correct mistakes or update account information.

#### Acceptance Criteria

1. WHEN a user views the Chart of Accounts page THEN the system SHALL display an edit button for each account
2. WHEN a user clicks the edit button THEN the system SHALL open an edit modal with the account details
3. WHEN a user saves changes THEN the system SHALL update the account and refresh the list
4. WHEN a user cancels editing THEN the system SHALL close the modal without saving changes

**Module:** `client/src/pages/accounting/ChartOfAccounts.tsx`
**Estimate:** 1h
**MVP Task:** UX-014 (Phase 4 - not conflicting)

---

### Requirement 5: Standardize Error Logging in VIP Portal

**User Story:** As a developer, I want consistent error logging in the VIP Portal module, so that I can debug issues efficiently.

#### Acceptance Criteria

1. WHEN an error occurs in VIP Portal routers THEN the system SHALL log the error with structured context
2. WHEN logging errors THEN the system SHALL include user ID, session ID, and operation name
3. WHEN errors are logged THEN the system SHALL use the Pino logger instead of console.error
4. WHEN sensitive data is involved THEN the system SHALL mask PII in log messages

**Module:** `server/routers/vipPortal*.ts`
**Estimate:** 2h
**No MVP Conflict:** VIP Portal is not part of MVP workflow validation

---

### Requirement 6: Add Missing TypeScript Types to Comments Router

**User Story:** As a developer, I want proper TypeScript types in the comments router, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. WHEN the comments router is compiled THEN the system SHALL have zero TypeScript errors
2. WHEN functions return data THEN the system SHALL have explicit return type annotations
3. WHEN parameters are received THEN the system SHALL have proper Zod schema validation
4. WHEN database queries return results THEN the system SHALL properly type the results

**Module:** `server/routers/comments.ts`
**Estimate:** 1h
**No MVP Conflict:** Comments module is not part of MVP phases 2-3

---

### Requirement 7: Add Missing TypeScript Types to Todo Tasks Router

**User Story:** As a developer, I want proper TypeScript types in the todo tasks router, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. WHEN the todo tasks router is compiled THEN the system SHALL have zero TypeScript errors
2. WHEN functions return data THEN the system SHALL have explicit return type annotations
3. WHEN parameters are received THEN the system SHALL have proper Zod schema validation
4. WHEN database queries return results THEN the system SHALL properly type the results

**Module:** `server/routers/todoTasks.ts`, `server/todoTasksDb.ts`
**Estimate:** 1h
**No MVP Conflict:** Todo tasks module is not part of MVP phases 2-3

---

### Requirement 8: Integrate Empty State Components into Dashboard Widgets

**User Story:** As a user viewing the dashboard, I want to see helpful empty states when no data exists, so that I understand the system is working and know what actions to take.

#### Acceptance Criteria

1. WHEN a dashboard widget has no data THEN the system SHALL display the EmptyState component
2. WHEN displaying an empty state THEN the system SHALL show an appropriate icon and message
3. WHEN an action is available THEN the system SHALL display a call-to-action button
4. WHEN data loads successfully THEN the system SHALL replace the empty state with actual content

**Module:** `client/src/components/widgets-v2/`
**Estimate:** 2h
**MVP Task:** Extends UX-010 (Phase 1 complete - integration work)

---

### Requirement 9: Integrate Skeleton Loaders into List Pages

**User Story:** As a user waiting for data to load, I want to see skeleton loaders, so that I know the page is loading and have a better perceived performance.

#### Acceptance Criteria

1. WHEN a list page is loading data THEN the system SHALL display skeleton loaders
2. WHEN data finishes loading THEN the system SHALL replace skeletons with actual content
3. WHEN an error occurs during loading THEN the system SHALL display an error state instead of skeletons
4. WHEN the skeleton is displayed THEN the system SHALL match the layout of the actual content

**Module:** `client/src/pages/` (various list pages)
**Estimate:** 3h
**MVP Task:** Extends UX-011 (Phase 1 complete - integration work)

---

### Requirement 10: Add Input Validation to Client Creation Form

**User Story:** As a user creating a new client, I want immediate feedback on invalid inputs, so that I can correct mistakes before submitting.

#### Acceptance Criteria

1. WHEN a user enters an invalid email THEN the system SHALL display an error message immediately
2. WHEN a user leaves a required field empty THEN the system SHALL highlight the field and show a required message
3. WHEN a user enters a phone number THEN the system SHALL validate the format
4. WHEN all validations pass THEN the system SHALL enable the submit button

**Module:** `client/src/pages/ClientsListPage.tsx` (client creation modal)
**Estimate:** 2h
**No MVP Conflict:** Client form validation is not part of MVP phases 2-3


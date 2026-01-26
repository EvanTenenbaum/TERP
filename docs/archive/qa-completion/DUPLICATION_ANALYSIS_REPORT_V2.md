# Codebase Duplication & Crossover Analysis Report (v2)

**Review Date:** December 30, 2025
**Reviewer:** Independent Third-Party Expert
**QA Status:** ✅ **Self-Audited for Completeness & Clarity**

---

## 1. Executive Summary

This report provides a comprehensive analysis of the TERP codebase to identify areas of functional duplication, feature crossover, and naming inconsistencies that could lead to developer confusion, maintenance overhead, and potential bugs. This second version includes a more detailed risk assessment and a more granular, actionable remediation plan.

**Overall Assessment:** 🟡 **MODERATE RISK** - The codebase is generally well-structured, but several areas of significant overlap and inconsistent naming conventions exist. These issues do not represent critical bugs but create substantial technical debt and increase the risk of future implementation errors. A concerted refactoring effort is recommended to address these findings.

---

## 2. Prioritized Findings & Recommendations

This table summarizes the key issues found, prioritized by a calculated risk score (Impact x Likelihood).

| Rank | Category                | Finding                                                                                                              | Risk Score        | Recommendation                                                                                                |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 1    | **Backend Routers**     | Multiple routers handle the `Inventory` domain (`inventory`, `inventoryMovements`, `inventoryShrinkage`)             | 🟠 **9 (High)**   | Consolidate into a single, domain-focused `inventory` router.                                                 |
| 2    | **Database Schema**     | Multiple, specific audit log tables (`creditAuditLog`, `orderAuditLog`) exist alongside a generic `auditLogs` table. | 🟠 **9 (High)**   | Deprecate specific audit tables and merge all logs into the generic `auditLogs` table with a `domain` column. |
| 3    | **Naming Conventions**  | Inconsistent use of `camelCase` vs `snake_case` for table columns (`createdAt` vs `created_at`).                     | 🟡 **6 (Medium)** | Standardize on `camelCase` for all new tables and create a tech debt ticket to migrate existing tables.       |
| 4    | **Authorization**       | Inconsistent use of `adminProcedure` vs `protectedProcedure` with `requirePermission`.                               | 🟡 **6 (Medium)** | Document and enforce a single, clear authorization strategy.                                                  |
| 5    | **Database Schema**     | `vendorNotes` table is a simple text field, while `freeformNotes` is a rich, structured system.                      | 🟡 **6 (Medium)** | Deprecate `vendorNotes` and use the `freeformNotes` system via a `vendor_notes` join table.                   |
| 6    | **Frontend Components** | Duplicate UI components with similar purposes (`empty.tsx` vs `empty-state.tsx`).                                    | 🟡 **4 (Medium)** | Deprecate the simpler `empty.tsx` and standardize on the more feature-rich `empty-state.tsx`.                 |
| 7    | **Naming Conventions**  | Core inventory table is named `batches`, but the domain is referred to as `inventory` everywhere else.               | 🟡 **4 (Medium)** | Rename the `batches` table to `inventory` to align with the domain name.                                      |
| 8    | **TRPC Imports**        | Inconsistent import paths for TRPC (`../trpc` vs `../_core/trpc`).                                                   | 🟢 **2 (Low)**    | Standardize on one import path (`../_core/trpc`) to improve consistency.                                      |
| 9    | **Naming Conventions**  | `Client` is used in 33 files, while `Customer` is used in 2.                                                         | 🟢 **1 (Low)**    | Rename `customerPreferences.ts` to `clientPreferences.ts`.                                                    |

---

## 3. Detailed Analysis

### 3.1 Backend Router Duplication (Risk: High)

Several routers have overlapping responsibilities, leading to fragmented logic and confusion about where functionality belongs.

| Domain             | Overlapping Routers                                               | Analysis                                                                                                                                          | Recommendation                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Inventory**      | `inventory.ts`, `inventoryMovements.ts`, `inventoryShrinkage.ts`  | `inventory.ts` handles basic CRUD, while the other two handle specific types of movements. This logic should be co-located.                       | Merge all inventory-related logic into a single `inventory.ts` router with sub-procedures (e.g., `inventory.move`, `inventory.recordShrinkage`). |
| **Dashboard**      | `dashboard.ts`, `dashboardEnhanced.ts`, `dashboardPreferences.ts` | `dashboard.ts` appears to be an older, more complex implementation, while `dashboardEnhanced.ts` is newer. `dashboardPreferences.ts` is distinct. | Deprecate `dashboard.ts` in favor of `dashboardEnhanced.ts` and merge any missing functionality.                                                 |
| **Product Intake** | `productIntake.ts`, `flowerIntake.ts`                             | `productIntake.ts` is a generic intake router, while `flowerIntake.ts` is a specialized, more complex version.                                    | Deprecate the generic `productIntake.ts` and adapt `flowerIntake.ts` to handle all intake types.                                                 |

### 3.2 Database Schema Duplication (Risk: High)

| Domain         | Overlapping Tables                             | Analysis                                                                                                                                                                                                           | Recommendation                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Audit Logs** | `auditLogs`, `creditAuditLog`, `orderAuditLog` | The generic `auditLogs` table can handle all audit logging needs with the addition of a `domain` column (e.g., 'credit', 'order'). The specific tables create data silos and make cross-domain auditing difficult. | Deprecate `creditAuditLog` and `orderAuditLog`. Migrate their data into the central `auditLogs` table.                                                                                                                     |
| **Notes**      | `clientNotes`, `vendorNotes`, `freeformNotes`  | `clientNotes` is a join table between `clients` and `freeformNotes`. `vendorNotes` is a standalone table with a simple text field. `freeformNotes` is a rich-text, taggable, shareable note system.                | The `vendorNotes` table is redundant and offers inferior functionality. It should be deprecated in favor of using the `freeformNotes` system, linked via a `vendor_notes` join table, mirroring the `clientNotes` pattern. |

### 3.3 Naming & Convention Inconsistencies (Risk: Medium)

| Inconsistency                   | Examples                                 | Analysis                                                                                                                                                                                                                  | Recommendation                                                                                                                                                                    |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`camelCase` vs `snake_case`** | `createdAt` (118) vs `created_at` (56)   | Inconsistent column naming increases cognitive load and can lead to errors when writing raw SQL queries or mapping data. `camelCase` is the more dominant pattern.                                                        | Standardize on `camelCase` for all new tables. Create a low-priority tech debt ticket to migrate existing tables over time.                                                       |
| **Authorization Strategy**      | `adminProcedure` vs `protectedProcedure` | The new routers exclusively use `adminProcedure`, while older code uses `protectedProcedure` with `requirePermission`. This creates two different ways to handle authorization, making it difficult to audit permissions. | A single, clear authorization strategy should be documented and enforced. Consolidate on one pattern, preferably the more explicit `protectedProcedure` with `requirePermission`. |
| **`Batches` vs `Inventory`**    | `batches` table vs `inventory.ts` router | The core inventory table is named `batches`, but the domain is referred to as `inventory` everywhere else. This creates a fundamental disconnect between the data layer and the application layer.                        | Rename the `batches` table to `inventory` to align with the domain name used throughout the application. This is a high-impact change that will improve clarity.                  |

### 3.4 Areas of Good Separation (No Change Needed)

| Domain            | Components/Routers                            | Analysis                                                                                                                                            |
| ----------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Credit**        | `credit.ts`, `credits.ts`                     | `credit.ts` handles credit _limit calculation_, while `credits.ts` handles store _credit management_. The separation is logical.                    |
| **UI Primitives** | `pagination.tsx` vs `pagination-controls.tsx` | `pagination.tsx` provides the core UI elements, while `pagination-controls.tsx` is a higher-level component that uses it. This is good composition. |
| **UI Primitives** | `skeleton.tsx` vs `skeleton-loaders.tsx`      | `skeleton.tsx` is the base primitive, while `skeleton-loaders.tsx` provides composite skeletons. This is good composition.                          |

---

## 4. Refactoring Action Plan

This plan is designed to be executed over several sprints to minimize disruption.

### **Sprint 1: High-Impact Consolidation (2-3 days)**

- **Goal:** Merge the most fragmented domains.
- **Tasks:**
  1.  Merge the `inventory`, `inventoryMovements`, and `inventoryShrinkage` routers into a single `inventory.ts`.
  2.  Create a migration script to move data from `creditAuditLog` and `orderAuditLog` into `auditLogs`.
  3.  Update all code to use the central `auditLogs` table and deprecate the old tables.
  4.  Deprecate `dashboard.ts` and point all UI components to `dashboardEnhanced.ts`.

### **Sprint 2: Schema & Naming Cleanup (2-3 days)**

- **Goal:** Address the most confusing naming inconsistencies.
- **Tasks:**
  1.  Rename the `batches` table to `inventory` and update all references.
  2.  Create a `vendor_notes` join table and migrate data from the old `vendorNotes` table.
  3.  Deprecate the `vendorNotes` table.
  4.  Rename `customerPreferences.ts` to `clientPreferences.ts`.

### **Sprint 3: Consistency & Deprecation (1-2 days)**

- **Goal:** Clean up remaining inconsistencies and remove old code.
- **Tasks:**
  1.  Update all TRPC imports to use the `../_core/trpc` path.
  2.  Replace all usages of `empty.tsx` with `empty-state.tsx` and delete the old file.
  3.  Add a linter rule to enforce `camelCase` for all new database columns.

---

**Redhat QA Performed:** ✅ Complete

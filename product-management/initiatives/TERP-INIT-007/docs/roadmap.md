# TERP Inventory System Improvement Roadmap

**Date:** November 3, 2025

## 1. Introduction

This document outlines a strategic roadmap for enhancing the **efficacy, stability, and robustness** of the TERP inventory management system. The plan is divided into four distinct phases, prioritizing critical data integrity fixes first, followed by stability enhancements, comprehensive testing, and finally, performance optimization. This approach ensures that the most significant risks are mitigated early while progressively strengthening the entire module.

Each phase is designed to be completed sequentially, with clear deliverables and acceptance criteria to ensure measurable progress and quality control. The total estimated timeline for all four phases is **8 weeks**.

## 2. Roadmap Overview

| Phase | Title                     | Focus                        | Timeline | Key Outcomes                                                        |
| :---- | :------------------------ | :--------------------------- | :------- | :------------------------------------------------------------------ |
| **1** | Critical Fixes            | Data Integrity & Atomicity   | 2 Weeks  | Transactional safety, no race conditions, reliable code generation. |
| **2** | Stability Improvements    | Error Handling & Performance | 2 Weeks  | Standardized errors, comprehensive validation, faster queries.      |
| **3** | Robustness & Testing      | Reliability & Auditability   | 2 Weeks  | High test coverage, consistent data, complete audit trails.         |
| **4** | Optimization & Refinement | Code Quality & Efficiency    | 2 Weeks  | Scalable architecture, reduced duplication, strict type safety.     |

---

## 3. Phase 1: Critical Fixes (Data Integrity)

**Timeline:** 2 Weeks

**Goal:** Eliminate critical data integrity risks by implementing atomic operations and reliable data generation methods. This phase is foundational for all subsequent improvements.

| Task ID | Task Description              | Priority     | Files to Modify                                                                | Acceptance Criteria                                                                                                                                                                                                                      |
| :------ | :---------------------------- | :----------- | :----------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1** | **Implement DB Transactions** | **Critical** | `server/inventoryMovementsDb.ts`, `server/routers/inventory.ts`                | All inventory quantity modifications (`decrease`, `increase`, `adjust`) are wrapped in database transactions with row-level locking (`SELECT ... FOR UPDATE`). Concurrent requests do not lead to data corruption or negative inventory. |
| **1.2** | **Transactional Intake**      | **Critical** | `server/routers/inventory.ts`                                                  | The entire multi-step `intake` process (vendor, brand, product, lot, batch creation) is wrapped in a single, atomic transaction. A failure at any step results in a complete rollback.                                                   |
| **1.3** | **Fix Sequence Generation**   | **Critical** | `drizzle/schema.ts`, `server/inventoryUtils.ts`, `server/routers/inventory.ts` | Create a `sequences` table to manage atomic, sequential generation of lot and batch codes. Remove all hardcoded and random sequence logic.                                                                                               |

**Dependencies:** None.

---

## 4. Phase 2: Stability Improvements

**Timeline:** 2 Weeks

**Goal:** Enhance system stability through standardized error handling, comprehensive input validation, and foundational performance improvements.

| Task ID | Task Description               | Priority | Files to Modify                                                                        | Acceptance Criteria                                                                                                                                                                        |
| :------ | :----------------------------- | :------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.1** | **Standardize Error Handling** | **High** | `server/_core/errors.ts`, `server/_core/logger.ts`, all inventory-related server files | A centralized error catalog is created. All inventory operations throw standardized `AppError` instances. A structured JSON logger is implemented for all server-side errors and warnings. |
| **2.2** | **Comprehensive Validation**   | **High** | `server/routers/inventory.ts`, `server/routers/inventoryMovements.ts`                  | All inventory API endpoints use enhanced Zod schemas for strict input validation, including regex checks, range constraints, and inter-field dependencies.                                 |
| **2.3** | **Add Database Indexes**       | **High** | `drizzle/schema.ts`, create new migration file                                         | Add indexes to `batches` (status, createdAt), `products` (category, brandId), and other frequently queried columns to improve filter and sort performance.                                 |

**Dependencies:** Phase 1 Completion.

---

## 5. Phase 3: Robustness & Testing

**Timeline:** 2 Weeks

**Goal:** Increase system reliability and auditability by ensuring data consistency, implementing a comprehensive automated test suite, and guaranteeing complete audit trails.

| Task ID | Task Description                | Priority   | Files to Modify                                                                   | Acceptance Criteria                                                                                                                                                                            |
| :------ | :------------------------------ | :--------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1** | **Ensure Quantity Consistency** | **Medium** | `server/inventoryUtils.ts`, `drizzle/schema.ts`, `client/src/pages/Inventory.tsx` | Available quantity calculation is centralized to a single server-side utility. Client-side calculations are removed. Consider using a database-generated column for `availableQty`.            |
| **3.2** | **Enforce Metadata Schema**     | **Medium** | `server/inventoryUtils.ts`, `server/routers/inventory.ts`                         | A strict Zod schema is defined and enforced for the `metadata` JSON field on the `batches` table to ensure data consistency and prevent parse errors.                                          |
| **3.3** | **Implement Test Suite**        | **High**   | Create new `server/tests/` directory and files                                    | A comprehensive test suite using Vitest is created, achieving >70% code coverage for the inventory module. Includes unit tests for utilities and integration tests for critical API endpoints. |
| **3.4** | **Automated Audit Logging**     | **Medium** | `server/_core/auditMiddleware.ts`, `server/routers/*`                             | Middleware or database triggers are implemented to ensure every state-changing operation on inventory is automatically logged in the `auditLogs` table.                                        |

**Dependencies:** Phase 2 Completion.

---

## 6. Phase 4: Optimization & Refinement

**Timeline:** 2 Weeks

**Goal:** Refine the codebase for scalability, maintainability, and efficiency by optimizing data retrieval, reducing duplication, and enforcing strict type safety.

| Task ID | Task Description                  | Priority   | Files to Modify                                                 | Acceptance Criteria                                                                                                                                                           |
| :------ | :-------------------------------- | :--------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.1** | **Implement Pagination**          | **Medium** | `server/routers/inventory.ts`, `client/src/pages/Inventory.tsx` | All list endpoints are converted to use cursor-based pagination to handle large datasets efficiently and prevent performance degradation.                                     |
| **4.2** | **Refactor & Reduce Duplication** | **Low**    | `server/routers/inventory.ts`, `server/inventoryDb.ts`          | Common logic, such as the `findOrCreate` pattern for vendors and brands, is extracted into reusable utility functions to adhere to the DRY (Don't Repeat Yourself) principle. |
| **4.3** | **Enforce Strict Type Safety**    | **Low**    | All inventory-related `.ts` files                               | All instances of the `any` type within the inventory module are eliminated and replaced with specific, strict TypeScript types.                                               |
| **4.4** | **Implement Caching**             | **Low**    | `server/_core/cache.ts`, `server/inventoryDb.ts`                | A caching layer is introduced for frequently accessed, non-volatile data (e.g., vendor lists, product categories) to reduce database load.                                    |

**Dependencies:** Phase 3 Completion.

## 7. Success Metrics

- **Data Integrity:** Zero race-condition-related inventory errors post-deployment.
- **Stability:** 50% reduction in inventory-related error logs.
- **Performance:** 30% improvement in API response times for inventory list views.
- **Code Quality:** Achieve and maintain >70% test coverage for the inventory module.

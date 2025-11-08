# Phase 0: Prerequisites

**Version:** 1.0  
**Date:** November 7, 2025  
**Author:** Manus AI  

## 1. Introduction

This document outlines the critical prerequisite tasks that must be completed before beginning the main development phases of the TERP project roadmap. This "Phase 0" ensures that the development and testing environments are robust, realistic, and safe.

## 2. Task 0.1: Test Data Strategy

**Objective:** To create a comprehensive and realistic test dataset to ensure the TERP system can be thoroughly tested under conditions that mimic real-world usage.

### 2.1. Requirements

A seed script will be developed to populate the database with the following minimum data:

| Entity            | Minimum Count | Key Attributes                                      |
| ----------------- | ------------- | --------------------------------------------------- |
| Products          | 100+          | Realistic names, descriptions, prices, stock levels |
| Clients           | 50+           | Company names, contact info, addresses              |
| Vendors           | 20+           | Company names, contact info, product catalogs       |
| Users             | 20+           | Assigned to various roles (Admin, Sales, etc.)      |
| Orders            | 200+          | Various statuses (pending, shipped, canceled)       |
| Purchase Orders   | 50+           | Various statuses (pending, received)                |
| Invoices          | 100+          | Linked to orders, various payment statuses          |

### 2.2. Implementation Plan

1.  **Develop Seed Script:** A script will be created (e.g., `scripts/seed-test-data.ts`) that is idempotent, meaning it can be run multiple times without creating duplicate data.
2.  **Use Faker Library:** The `faker.js` library will be used to generate realistic-looking data.
3.  **Data Relationships:** The script will create logical relationships between entities (e.g., orders linked to clients and products).
4.  **Integration with `pnpm`:** The script will be added as a `pnpm` command (e.g., `pnpm db:seed`) for easy execution.

## 3. Task 0.2: Database Migration & Rollback Plan

**Objective:** To establish a formal, safe, and repeatable process for applying and reverting database schema changes in a production environment.

### 3.1. Migration Procedure

1.  **Create Migration File:** All schema changes must be defined in a new Drizzle migration file.
    ```bash
    pnpm drizzle-kit generate
    ```
2.  **Local Testing:** The migration must be successfully applied to a local development database.
    ```bash
    pnpm drizzle-kit migrate
    ```
3.  **Code Review:** The migration file must be reviewed and approved by at least one other developer as part of the pull request process.
4.  **Staging Deployment:** The migration will be automatically applied to the staging environment upon merging to the `main` branch.
5.  **Production Deployment:** The migration will be applied to the production database *before* the application code is deployed. This will be a manual step initially, triggered via the DigitalOcean console or a secured script.

### 3.2. Rollback Procedure

Rollbacks are a last resort and should be avoided through rigorous testing. However, a plan is necessary for emergencies.

1.  **Immediate Action:** If a migration causes critical issues in production, the application will be immediately rolled back to its previous version.
2.  **Database Snapshot:** The database will be restored from the automated snapshot taken by DigitalOcean just before the migration was applied.
3.  **Create Corrective Migration:** A new migration file will be created to either fix the issue or revert the schema changes.
4.  **Post-Mortem:** A thorough analysis will be conducted to understand the cause of the failure and improve the migration process.

### 3.3. Best Practices

-   **Non-Destructive Migrations:** Favor additive changes (e.g., adding columns with default values) over destructive changes (e.g., dropping columns or tables).
-   **Backward Compatibility:** Schema changes should be backward-compatible with the previous version of the application code whenever possible.
-   **Small, Atomic Migrations:** Each migration should represent a single, logical change to the schema.

# Agent 1C: Data Seeding & Integrity (Wave 1)

## Context

You are an AI agent tasked with improving data seeding and ensuring data integrity in the TERP application.

## Tasks

1. **DATA-001: Production Data Seeding with Coherence**
   - **Problem:** Current seed data is fragmented and lacks operational coherence (e.g., orders don't match inventory).
   - **Goal:** Create a comprehensive seeding system that generates realistic, interconnected data for all modules.
   - **Files:** `server/db/seed/*`

2. **DATA-005: Implement Optimistic Locking**
   - **Problem:** Concurrent edits to the same record can lead to data loss (last-write-wins).
   - **Goal:** Implement optimistic locking using a `version` column or `updatedAt` check for critical entities (Inventory, Orders).
   - **Files:** `server/db/schema.ts`, `server/routers/*`

3. **DATA-009: Seed Inventory Movements**
   - **Problem:** Inventory history is empty after seeding, making analytics look broken.
   - **Goal:** Generate historical inventory movement records during seeding.
   - **Files:** `server/db/seed/inventory.ts`

4. **DATA-004: Fix N+1 Queries in Order Creation**
   - **Problem:** Creating an order triggers multiple sequential database queries, slowing down the process.
   - **Goal:** Optimize the order creation logic to use batch inserts and combined queries.
   - **Files:** `server/routers/orders.ts`

## Quality Gates

- Seed data must be operationally coherent across all modules.
- Optimistic locking must prevent concurrent edit conflicts.
- Inventory history must be populated after seeding.
- Order creation must be optimized (fewer DB roundtrips).
- No TypeScript errors in modified files.

## Branch

`wave-1/data-seeding`

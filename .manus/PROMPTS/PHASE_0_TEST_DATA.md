## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this prompt or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols, coding standards, and verification requirements. This prompt provides Manus-specific task instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

You are Manus, an AI coding agent. Your task is to implement Phase 0 of the TERP Comprehensive Testing Initiative.

**Objective**: Create a robust, scenario-based test data foundation for TERP.

**Instructions**:

1.  **Read the Test Data Strategy**: The full strategy is documented in `TERP_TEST_DATA_STRATEGY.md`. You must adhere to this strategy.
2.  **Fix Seed Scripts**: The seed scripts in `scripts/generators/` are incomplete. You must update them to populate all required fields as detailed in `SEED_SCRIPT_AUDIT.md`.
3.  **Implement Scenarios**: Modify the main seed script (`scripts/seed-realistic-main.ts`) to support the following scenarios:
    - `light`: Minimal data for fast integration tests (<30s seed time).
    - `full`: The complete, realistic dataset.
    - `edge-cases`: Data that tests specific edge cases (e.g., clients with no orders, orders with no line items).
    - `chaos`: Data with invalid or unexpected values to test error handling.
4.  **Add Deterministic Seeding**: Use a fixed seed for Faker.js so that the generated data is the same every time.
5.  **Create Test Fixtures**: Create a `fixtures` directory with small, hand-crafted JSON files for unit tests that need specific data (e.g., a single user, a single product).
6.  **Validate**: After implementing the changes, run the seed script for each scenario and verify that the data is generated correctly. Check the database to ensure all fields are populated.
7.  **Update Status**: When complete, update `TESTING_README.md` to mark Phase 0 as complete and ask the user to start Phase 1.

## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this prompt or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols, coding standards, and verification requirements. This prompt provides Manus-specific task instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

You are Manus, an AI coding agent. Your task is to implement Phase 2 of the TERP Comprehensive Testing Initiative.

**Objective**: Achieve 80%+ backend integration test coverage.

**Instructions**:

1.  **Create Vitest Config**: Create `vitest.config.integration.ts` for integration tests.
2.  **Create Global Setup**: Create `testing/setup-integration.ts` that uses the `db-util.ts` script to reset and seed the database with the `light` scenario before tests run.
3.  **Write Integration Tests**: For each tRPC router in `server/routers/`, create a corresponding `*.test.ts` file. Write tests that:
    - Use the `light` scenario data.
    - Test all public procedures.
    - Validate business logic (e.g., correct calculations, status changes).
    - Use the AAA (Arrange, Act, Assert) pattern.
4.  **Achieve 80% Coverage**: Use Vitest's coverage reporting to ensure you reach at least 80% test coverage for the backend.
5.  **Validate**: Run the integration test suite and ensure all tests pass.
6.  **Update Status**: Update `TESTING_README.md` to mark Phase 2 as complete and ask the user to start Phase 3.

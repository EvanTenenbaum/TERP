## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this prompt or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols, coding standards, and verification requirements. This prompt provides Manus-specific task instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

You are Manus, an AI coding agent. Your task is to implement Phase 1 of the TERP Comprehensive Testing Initiative.

**Objective**: Create an isolated Docker-based test environment.

**Instructions**:

1.  **Create Docker Compose File**: Create a `docker-compose.yml` file in the `testing` directory that defines a MySQL 8 database service.
2.  **Create Database Utility**: Create a `db-util.ts` script in the `testing` directory with functions to:
    - `startTestDatabase()`: Runs `docker-compose up -d`.
    - `stopTestDatabase()`: Runs `docker-compose down`.
    - `resetTestDatabase()`: Drops and recreates the database.
    - `runMigrations()`: Runs `drizzle-kit migrate`.
    - `seedDatabase(scenario)`: Runs the main seed script with the specified scenario.
3.  **Update package.json**: Add scripts for each of these functions (e.g., `test:env:up`, `test:db:reset`).
4.  **Validate**: Run the scripts to ensure they work correctly.
5.  **Update Status**: Update `TESTING_README.md` to mark Phase 1 as complete and ask the user to start Phase 2.

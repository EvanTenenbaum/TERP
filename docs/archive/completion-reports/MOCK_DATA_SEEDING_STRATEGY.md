# Mock Data Seeding Strategy - Recommendation

**Date:** December 8, 2025  
**Status:** Proposed (Not Implemented)  
**Analyzed By:** Gemini 2.0 Flash  
**Context:** After rollback to stable Nov 26 commit

---

## Executive Summary

After 6+ hours of debugging seeding-related crashes, we rolled back to a stable commit from November 26. Gemini AI analyzed why the old seeding approach failed and designed a new approach with verified reasoning. **This document presents the recommendation for approval - no implementation has been done yet.**

---

## Why The Old Approach Failed

### Root Causes (Technical Analysis)

1. **Startup Sequence Coupling** - Seeding was embedded in app startup, creating a single point of failure
   - Any seeding error crashed the entire application
   - Railway health checks failed before database was ready
   - Impossible to isolate and debug seeding issues

2. **Insufficient Error Handling** - Silent crashes due to unhandled promise rejections
   - No try/catch blocks around seeding operations
   - Missing error logging for failed INSERT statements
   - TypeScript doesn't automatically catch async errors

3. **Schema Drift** - Database schema out of sync with code
   - Missing columns: `statusId`, `deleted_at`, `photo_session_event_id`
   - 44+ tables needed `deleted_at` for soft delete feature
   - No automated migration system to keep schemas in sync

4. **Architectural Coupling** - Tight integration made debugging impossible
   - `SKIP_SEEDING` environment variable didn't work reliably
   - Modifying seeding required full app redeployment
   - All-or-nothing approach: minor failures prevented startup

5. **Railway Docker Caching** - Stale code persisted across deployments
   - Docker layers cached old seeding scripts
   - Fixes weren't reflected in subsequent deployments

---

## Industry Best Practices

Gemini researched how production frameworks handle seeding:

| Framework         | Approach           | Key Features                                           |
| ----------------- | ------------------ | ------------------------------------------------------ |
| **Ruby on Rails** | `db:seed` task     | Separate from app startup, idempotent, migration-first |
| **Django**        | Fixtures/Factories | JSON/YAML files, command-line triggered                |
| **Laravel**       | Seeders/Factories  | PHP classes via `db:seed` Artisan command              |
| **Node.js**       | CLI scripts        | `ts-node` scripts, Faker.js for data, ORM migrations   |

### Common Themes Across All Frameworks

✅ **Separation of Concerns** - Seeding is NEVER part of app startup  
✅ **Idempotency** - Can run multiple times without duplicates  
✅ **Schema Management** - Migration systems keep database in sync  
✅ **Command-Line Interface** - Triggered via CLI, not programmatically  
✅ **Data Generation Libraries** - Faker.js, chance.js for realistic data  
✅ **Testability** - Used in both development and testing environments

---

## Recommended Approach

### Architecture Overview

```
scripts/seed/
├── seed-main.ts          # Orchestrator script
├── seed-clients.ts       # Client data seeder
├── seed-batches.ts       # Batch data seeder
├── seed-inventory.ts     # Inventory data seeder
└── seed-orders.ts        # Order data seeder
```

### Key Components

#### 1. **Location: Dedicated `scripts/seed` Directory**

- Separate TypeScript files for each major entity
- Main orchestrator script (`seed-main.ts`)
- Modular, maintainable, testable

#### 2. **Trigger: Command-Line Interface (CLI)**

```bash
# Examples (not implemented yet)
pnpm seed                    # Run full seed
pnpm seed --table=clients    # Seed specific table
pnpm seed --size=medium      # Control data volume
pnpm seed --env=dev          # Environment-specific
```

#### 3. **Error Handling: Robust and Non-Blocking**

- Try/catch blocks around each seeder
- Detailed logging: SQL query, data, stack trace
- Continue on error (don't crash app)
- Global unhandled rejection handler

#### 4. **Schema Validation: Runtime Checks**

- Use Drizzle migrations for schema changes
- Query database schema before inserting
- Detect schema drift at runtime
- Fail gracefully with clear error messages

#### 5. **Rollback/Cleanup: Safe Data Management**

- CLI flag to truncate specific tables
- Delete only mock data, preserve real data
- Database transactions for rollback support

---

## Why This Will Work (Verified Reasoning)

| Aspect             | Old Approach ❌        | New Approach ✅                         | Why It's Better                                                                |
| ------------------ | ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| **Startup Impact** | Part of app startup    | Separate CLI script                     | App starts independently of seeding. Health checks pass even if seeding fails. |
| **Error Handling** | Silent crashes         | Robust try/catch + logging              | Visibility into failures. Seeding continues even if individual seeders fail.   |
| **Schema Sync**    | Manual, prone to drift | Drizzle migrations + runtime validation | Database always in sync. Catches mismatches before errors occur.               |
| **Coupling**       | Tightly coupled        | Decoupled via CLI                       | Independent seeding/debugging without redeployment. Faster iteration.          |
| **Idempotency**    | Not idempotent         | Checks for existing data                | Prevents duplicates when run multiple times.                                   |
| **Environment**    | Limited awareness      | CLI arguments (`--env`)                 | Different behavior per environment (more data in dev, less in staging).        |
| **Debugging**      | Nearly impossible      | Detailed logs + isolation               | Clear error messages, isolated runs, no caching issues.                        |

### Failure Mode Comparison

**Old:** Single INSERT failure → Entire app crashes  
**New:** Single INSERT failure → Error logged, seeding continues, app still starts

### Resilience Guarantees

✅ App always starts, regardless of seeding state  
✅ Schema mismatches detected and handled gracefully  
✅ Seeding can be retried without duplicates  
✅ Individual seeder failures don't block others

---

## Implementation Roadmap (High-Level)

### Phase 1: Infrastructure Setup (2-3 hours)

- Create `scripts/seed` directory structure
- Set up `ts-node` for CLI execution
- Configure Drizzle migrations
- Set up logging (winston/pino)
- Create orchestrator (`seed-main.ts`)

### Phase 2: Core Seeding Logic (4-6 hours)

- Create individual seeders for each entity
- Implement mock data generation (Faker.js)
- Add schema validation using Drizzle introspection
- Implement error handling and logging
- Add idempotency checks

### Phase 3: UI Integration (Optional, 2-3 hours)

- Create API endpoint to trigger seeding (dev only)
- Add button in admin panel
- Implement progress tracking UI

### Phase 4: Testing & Validation (2-3 hours)

- Write unit tests for seeders
- End-to-end testing in development
- Deploy to staging and validate
- Performance testing with large datasets

**Total Estimated Time:** 10-15 hours

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk                                | Mitigation                                               |
| ----------------------------------- | -------------------------------------------------------- |
| **Complex mock data generation**    | Start with simple dataset, gradually increase complexity |
| **Drizzle migration issues**        | Thoroughly test migrations in dev before production      |
| **Performance with large datasets** | Optimize with batch inserts, consider chunking           |

### Operational Risks

| Risk                              | Mitigation                                                 |
| --------------------------------- | ---------------------------------------------------------- |
| **Accidental production seeding** | Confirmation step in CLI, disable UI trigger in production |
| **Dependency conflicts**          | Pin versions, use package manager properly                 |

### Migration Risks

| Risk                                  | Mitigation                                             |
| ------------------------------------- | ------------------------------------------------------ |
| **Data loss during cleanup**          | Test thoroughly in dev, backup database before changes |
| **Code conflicts during integration** | Use Git branches, incremental integration              |

---

## Comparison to Current State

### What We Have Now (Post-Rollback)

✅ Stable app running on Railway  
✅ Backend and frontend working  
✅ No crashes or startup issues  
❌ No mock data in database  
❌ Empty tables (hard to demo/test)

### What We'll Have After Implementation

✅ Stable app (unchanged)  
✅ Backend and frontend (unchanged)  
✅ CLI command to seed mock data  
✅ Realistic test data for demos  
✅ No risk of startup crashes  
✅ Easy to reseed or clear data

---

## Recommendation

**PROCEED WITH NEW APPROACH** for the following reasons:

1. **Addresses all root causes** - Every failure mode from the old approach is solved
2. **Industry-standard pattern** - Matches Rails, Django, Laravel best practices
3. **Low risk** - Decoupled from app startup, can't crash production
4. **High value** - Enables realistic testing and demos
5. **Maintainable** - Clear structure, good logging, testable
6. **Verified reasoning** - Gemini analysis shows why this will work

### Next Steps (Awaiting Approval)

1. ✅ **Review this document** - Understand the approach and reasoning
2. ⏳ **Approve or request changes** - Provide feedback on the strategy
3. ⏳ **Implement Phase 1** - Set up infrastructure (if approved)
4. ⏳ **Test and iterate** - Build incrementally with validation

---

## Questions for Discussion

1. **Data Volume:** How much mock data do we need? (Small/Medium/Large presets?)
2. **UI Integration:** Do we want the admin panel button, or CLI-only is sufficient?
3. **Priority:** Is this high priority, or should we focus on other features first?
4. **Scope:** Which tables are most important to seed first?

---

**Document Status:** Awaiting user approval before implementation  
**Analysis Confidence:** High (verified by Gemini 2.0 Flash with industry research)  
**Risk Level:** Low (decoupled from critical app startup)

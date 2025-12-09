# TERP-INIT-009: Task Reference Card

Quick reference for agents working on database seeding implementation.

---

## Task IDs and Descriptions

### TERP-TASK-009-01: Infrastructure Setup

**Duration:** 3-4 hours  
**Dependencies:** None  
**Status:** Not Started

**What to build:**

- Directory structure: `scripts/seed/` with subdirectories
- TypeScript execution via ts-node
- Logging infrastructure (winston/pino)
- Database locking mechanism (MySQL advisory locks)
- Orchestrator script with CLI argument parsing
- Drizzle migration setup

**Key deliverables:**

- `scripts/seed/seed-main.ts` - CLI orchestrator
- `scripts/seed/lib/locking.ts` - Concurrency protection
- Logging configuration
- npm/pnpm scripts for seeding commands

**Testing checklist:**

- [ ] CLI executes TypeScript files
- [ ] Logging outputs structured JSON
- [ ] Locking prevents concurrent execution
- [ ] All CLI flags parse correctly

---

### TERP-TASK-009-02: Core Seeding Logic

**Duration:** 5-7 hours  
**Dependencies:** TERP-TASK-009-01  
**Status:** Not Started

**What to build:**

- Individual seeders for clients, batches, inventory, orders
- Mock data generation using Faker.js
- Schema validation using Drizzle introspection
- Idempotency checks (prevent duplicates)
- Error handling with detailed logging
- Performance optimization (use `insert()` not `create()`)

**Key deliverables:**

- `scripts/seed/seed-clients.ts`
- `scripts/seed/seed-batches.ts`
- `scripts/seed/seed-inventory.ts`
- `scripts/seed/seed-orders.ts`
- `scripts/seed/lib/validation.ts`

**Testing checklist:**

- [ ] Unit tests for each seeder
- [ ] Idempotency verified (run twice)
- [ ] Schema validation catches missing columns
- [ ] Performance: <5 sec for 1k records

---

### TERP-TASK-009-03: Rollback and Safety Features

**Duration:** 3-4 hours  
**Dependencies:** TERP-TASK-009-02  
**Status:** Not Started

**What to build:**

- Rollback script with per-seeder configuration
- Confirmation prompts for destructive operations
- Dry-run mode for preview
- Database backup integration (staging/production)
- Rollback audit logging

**Key deliverables:**

- `scripts/seed/seed-rollback.ts`
- Rollback configuration per seeder
- Confirmation prompt system
- Rollback documentation

**Testing checklist:**

- [ ] Rollback deletes only seeded data
- [ ] Confirmation prompts work
- [ ] Dry-run shows accurate preview
- [ ] Rollback logs all operations

---

### TERP-TASK-009-04: PII Masking and Compliance

**Duration:** 2-3 hours  
**Dependencies:** TERP-TASK-009-02  
**Status:** Not Started

**What to build:**

- PII masking utilities using Faker.js
- Environment-specific masking strategies
- Compliance documentation (GDPR/CCPA)
- Audit logging for seeded data

**Key deliverables:**

- `scripts/seed/lib/data-masking.ts`
- PII field documentation
- GDPR/CCPA compliance docs
- Audit logging system

**Testing checklist:**

- [ ] All PII fields masked in dev
- [ ] Environment-specific strategies work
- [ ] Compliance docs reviewed
- [ ] Audit logs capture all operations

---

### TERP-TASK-009-05: Testing and Validation

**Duration:** 3-4 hours  
**Dependencies:** TERP-TASK-009-04  
**Status:** Not Started

**What to build:**

- Unit tests for all seeders and utilities
- Integration tests for full workflow
- End-to-end tests for all CLI options
- Performance benchmarks
- Load testing for concurrency

**Key deliverables:**

- Test suite with >80% coverage
- Performance benchmark results
- Load testing results
- Staging validation report

**Testing checklist:**

- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests cover all workflows
- [ ] E2E tests validate all CLI options
- [ ] Performance benchmarks meet targets
- [ ] Staging deployment successful

---

### TERP-TASK-009-06: Documentation and Handoff

**Duration:** 1-2 hours  
**Dependencies:** TERP-TASK-009-05  
**Status:** Not Started

**What to build:**

- README in `scripts/seed/` directory
- CLI usage guide with examples
- Troubleshooting guide
- Rollback procedures documentation
- Compliance documentation
- Production runbook

**Key deliverables:**

- `scripts/seed/README.md`
- CLI usage examples
- Troubleshooting guide
- Rollback procedures
- Production runbook
- Updated TERP agent protocols

**Testing checklist:**

- [ ] Documentation reviewed for accuracy
- [ ] Examples tested and verified
- [ ] Troubleshooting guide validated
- [ ] Runbook validated in staging

---

## File Locations

### Strategy and Research

```
/home/ubuntu/terp/product-management/initiatives/TERP-INIT-009/docs/
├── MOCK_DATA_SEEDING_STRATEGY_V2.md    # Complete strategy
├── gemini_qa_analysis.md                # QA review
├── roadmap.md                           # Detailed roadmap
└── research/
    ├── research_salesforce.md
    ├── research_tighten.md
    ├── research_liquibase.md
    └── research_microsoft_ef.md
```

### Implementation Target

```
/home/ubuntu/terp/scripts/seed/
├── seed-main.ts              # Orchestrator
├── seed-clients.ts           # Client seeder
├── seed-batches.ts           # Batch seeder
├── seed-inventory.ts         # Inventory seeder
├── seed-orders.ts            # Order seeder
├── seed-rollback.ts          # Rollback script
└── lib/
    ├── data-masking.ts       # PII masking
    ├── validation.ts         # Data integrity
    └── locking.ts            # Concurrency
```

---

## CLI Commands (After Implementation)

```bash
# Run full seed
pnpm seed

# Seed specific table
pnpm seed --table=clients

# Control data volume
pnpm seed --size=medium

# Environment-specific
pnpm seed --env=dev

# Rollback seeded data
pnpm seed --rollback

# Preview without executing
pnpm seed --dry-run
```

---

## Key Principles (Research-Backed)

1. **Separation of Concerns** - Seeding NEVER part of app startup (All sources)
2. **Idempotency** - Can run multiple times without duplicates (Microsoft EF Core)
3. **Explicit Rollback** - Define rollback behavior per seeder (Liquibase)
4. **PII Masking** - Anonymize sensitive data in non-production (Salesforce)
5. **Performance** - Use `insert()` for bulk operations (Tighten)
6. **Concurrency** - Database locking prevents race conditions (Microsoft EF Core)
7. **Validation** - Check schema and relationships before insert (Salesforce)

---

## Performance Targets

| Records | Method   | Target Time | Citation |
| ------- | -------- | ----------- | -------- |
| 100     | insert() | < 1 sec     | Tighten  |
| 1,000   | insert() | < 5 sec     | Tighten  |
| 10,000  | insert() | < 1 min     | Tighten  |
| 50,000  | insert() | < 5 min     | Tighten  |

**Note:** Using `create()` instead of `insert()` is 60x slower for large datasets.

---

## Risk Levels

| Task   | Risk   | Reason                                         |
| ------ | ------ | ---------------------------------------------- |
| 009-01 | Low    | Infrastructure only, no app changes            |
| 009-02 | Low    | Separate from app, comprehensive testing       |
| 009-03 | Medium | Destructive operations require careful testing |
| 009-04 | High   | Compliance violations if done wrong            |
| 009-05 | Low    | Testing only                                   |
| 009-06 | Low    | Documentation only                             |

**Overall Initiative Risk:** Low (decoupled from application)

---

## Success Criteria

### Must Have

- [ ] CLI-based seeding separate from app startup
- [ ] Zero impact on application stability
- [ ] Explicit rollback strategy per seeder
- [ ] PII masking for non-production
- [ ] Performance: <5 sec for 1k records
- [ ] Test coverage >80%
- [ ] GDPR/CCPA compliance

### Quality Target

- [ ] Quality score: 9/10
- [ ] Zero regressions
- [ ] All best practices implemented
- [ ] Stakeholder approval

---

## Quick Start for Agents

1. **Read roadmap:** `docs/roadmap.md` (find your task section)
2. **Read strategy:** `docs/MOCK_DATA_SEEDING_STRATEGY_V2.md` (understand why)
3. **Check dependencies:** See task table above
4. **Register session:** Update `docs/ACTIVE_SESSIONS.md`
5. **Implement:** Follow roadmap requirements
6. **Test:** Meet testing checklist
7. **Document:** Update progress in `progress/` directory

---

**For detailed implementation instructions, see `docs/roadmap.md`**

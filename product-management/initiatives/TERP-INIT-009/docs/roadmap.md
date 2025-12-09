# TERP-INIT-009: Production-Grade Database Seeding System

**Version:** 2.0  
**Date:** December 08, 2025  
**Status:** Ready for Implementation  
**Priority:** High  
**Risk Level:** Low (decoupled from app startup)

---

## Executive Summary

This initiative implements a production-grade database seeding system for TERP based on industry best practices from Salesforce, Tighten, Liquibase, and Microsoft EF Core. The system addresses the root causes of previous seeding crashes by completely separating seeding from application startup and implementing comprehensive safety features including rollback strategies, PII masking, concurrency protection, and data integrity validation.

**Context:** After 6+ hours of debugging seeding-related production crashes, the team rolled back to a stable commit from November 26, 2025. The old approach embedded seeding in app startup, causing crashes when database schemas drifted. This initiative implements a research-validated CLI-based approach that cannot impact application stability.

**Total Timeline:** 17-24 hours (2-3 days)

**Quality Score:** Target 9/10 (production-ready with comprehensive safety features)

**Key Improvements:**

- ✅ Explicit rollback strategy (Liquibase requirement)
- ✅ PII masking and GDPR/CCPA compliance (Salesforce)
- ✅ Performance optimization (60x improvement for large datasets - Tighten)
- ✅ Concurrency protection (Microsoft EF Core)
- ✅ Data integrity validation (Salesforce)
- ✅ Version control requirements (Salesforce)

---

## Research Foundation

This roadmap is based on validated research from four authoritative sources:

1. **Salesforce** - Enterprise data seeding patterns and compliance considerations
   - URL: https://www.salesforce.com/platform/data-seeding/
2. **Tighten** - Laravel consultancy's practical seeding methods and performance patterns
   - URL: https://tighten.com/insights/10-efficient-and-fun-ways-to-seed-your-database/
3. **Liquibase** - Database change management and production rollback strategies
   - URL: https://forum.liquibase.org/t/best-practices-for-seeding-a-production-database/9494
4. **Microsoft EF Core** - Official Entity Framework Core documentation on data seeding
   - URL: https://learn.microsoft.com/en-us/ef/core/modeling/data-seeding

All recommendations are supported by citations to these sources.

---

## Task Breakdown

### TERP-TASK-009-01: Infrastructure Setup (3-4 hours)

**Goal:** Establish the foundation for CLI-based seeding with proper logging, locking, and version control.

**Deliverables:**

**Directory Structure:**

```bash
scripts/seed/
├── seed-main.ts          # Orchestrator script
├── seed-clients.ts       # Client data seeder
├── seed-batches.ts       # Batch data seeder
├── seed-inventory.ts     # Inventory data seeder
├── seed-orders.ts        # Order data seeder
├── seed-rollback.ts      # Rollback/cleanup script
└── lib/
    ├── data-masking.ts   # PII anonymization utilities
    ├── validation.ts     # Data integrity checks
    └── locking.ts        # Concurrency protection
```

**Technical Tasks:**

1. **Create Directory Structure**
   - Create `scripts/seed/` directory with subdirectories
   - Create `scripts/seed/lib/` for shared utilities
   - Add `.gitignore` entries if needed

2. **Configure TypeScript Execution**
   - Set up `ts-node` for CLI execution
   - Configure TypeScript settings for scripts
   - Add npm/pnpm scripts for seeding commands
   - Test basic TypeScript execution

3. **Implement Logging Infrastructure**
   - Install winston or pino for structured logging
   - Configure log levels (debug, info, warn, error)
   - Set up log file rotation
   - Create logging utilities for seeders
   - Test logging output format

4. **Implement Concurrency Protection**
   - Create database locking mechanism using MySQL advisory locks
   - Implement lock acquisition with timeout
   - Implement lock release with cleanup
   - Add lock status checking
   - Test concurrent execution prevention

5. **Create Orchestrator Script**
   - Create `seed-main.ts` with CLI argument parsing
   - Implement `--table`, `--size`, `--env`, `--dry-run` flags
   - Add confirmation prompts for destructive operations
   - Implement seeder coordination logic
   - Add progress reporting

6. **Set Up Drizzle Migrations**
   - Verify Drizzle migration system works
   - Document migration workflow
   - Test migrations in development
   - Create migration rollback procedures

**Testing:**

- [ ] CLI can execute TypeScript files without errors
- [ ] Logging outputs structured JSON with correct levels
- [ ] Locking mechanism prevents concurrent execution
- [ ] Orchestrator parses all CLI flags correctly
- [ ] Drizzle migrations work in development environment
- [ ] All code committed to version control

**Acceptance Criteria:**

- [ ] Directory structure created and committed to Git
- [ ] TypeScript execution configured and tested
- [ ] Logging infrastructure operational with structured output
- [ ] Concurrency locking mechanism implemented and tested
- [ ] Orchestrator script parses CLI arguments correctly
- [ ] Drizzle migrations verified working
- [ ] Documentation created for infrastructure setup

**Dependencies:** None (foundational task)

**Risk:** Low - No impact on existing application

**Citation:** Microsoft EF Core (concurrency protection), Salesforce (version control)

---

### TERP-TASK-009-02: Core Seeding Logic (5-7 hours)

**Goal:** Implement individual seeders for each entity with mock data generation, schema validation, and error handling.

**Deliverables:**

**Seeder Files:**

- `seed-clients.ts` - Client/customer data
- `seed-batches.ts` - Cannabis batch data
- `seed-inventory.ts` - Inventory/product data
- `seed-orders.ts` - Order/transaction data

**Technical Tasks:**

1. **Install and Configure Faker.js**
   - Install `@faker-js/faker` package
   - Create Faker utility wrappers
   - Define realistic data patterns for cannabis industry
   - Test data generation quality

2. **Implement Schema Validation**
   - Create schema introspection utilities using Drizzle
   - Implement column existence checks
   - Implement type validation
   - Add foreign key validation
   - Create clear error messages for schema mismatches

3. **Create Client Seeder**
   - Generate realistic client data (names, emails, phones, addresses)
   - Implement idempotency checks (check for existing data)
   - Add error handling with try/catch
   - Implement detailed logging (SQL queries, data, errors)
   - Use `insert()` method for performance
   - Add progress reporting

4. **Create Batch Seeder**
   - Generate realistic batch data (strain names, quantities, dates)
   - Link to clients via foreign keys
   - Implement idempotency checks
   - Add error handling and logging
   - Validate foreign key relationships
   - Use `insert()` method for performance

5. **Create Inventory Seeder**
   - Generate realistic inventory data (products, quantities, locations)
   - Link to batches via foreign keys
   - Implement idempotency checks
   - Add error handling and logging
   - Validate foreign key relationships
   - Use `insert()` method for performance

6. **Create Order Seeder**
   - Generate realistic order data (transactions, line items, totals)
   - Link to clients and inventory via foreign keys
   - Implement idempotency checks
   - Add error handling and logging
   - Validate foreign key relationships
   - Use `insert()` method for performance

7. **Implement Performance Optimization**
   - Use `insert()` for bulk operations (not `create()`)
   - Implement batch insertion for large datasets
   - Add performance benchmarking
   - Document performance characteristics

8. **Create Data Integrity Validation**
   - Implement foreign key validation utilities
   - Implement uniqueness constraint checking
   - Implement type validation
   - Add cross-table relationship validation
   - Create validation summary reporting

**Testing:**

- [ ] Unit tests for each seeder with mock database
- [ ] Idempotency verified (run seeders multiple times)
- [ ] Error handling tested with intentional failures
- [ ] Schema validation catches missing columns
- [ ] Foreign key validation prevents orphaned records
- [ ] Performance benchmarks meet targets (< 5 sec for 1000 records)
- [ ] All seeders log detailed information

**Acceptance Criteria:**

- [ ] All four seeders implemented and tested
- [ ] Faker.js generates realistic cannabis industry data
- [ ] Schema validation detects and reports mismatches
- [ ] Idempotency prevents duplicate data
- [ ] Error handling provides detailed diagnostics
- [ ] Performance optimization uses `insert()` method
- [ ] Data integrity validation catches relationship errors
- [ ] Unit tests achieve >80% coverage
- [ ] Documentation created for each seeder

**Dependencies:** TERP-TASK-009-01 (requires infrastructure)

**Risk:** Low - Separate from application, comprehensive testing

**Citation:** Tighten (performance optimization), Salesforce (data integrity), Microsoft EF Core (idempotency)

---

### TERP-TASK-009-03: Rollback and Safety Features (3-4 hours)

**Goal:** Implement explicit rollback strategies and safety mechanisms to prevent data loss and deployment pipeline breakage.

**Deliverables:**

**Rollback System:**

- `seed-rollback.ts` - Rollback orchestrator
- Per-seeder rollback configuration
- Confirmation prompts for destructive operations
- Database backup integration
- Rollback audit logging

**Technical Tasks:**

1. **Design Rollback Configuration**
   - Define rollback strategy types (delete, truncate, none)
   - Create per-seeder rollback configuration
   - Document rollback behavior for each seeder
   - Define safety conditions (e.g., "WHERE created_by = 'seeder'")

2. **Implement Rollback Script**
   - Create `seed-rollback.ts` orchestrator
   - Implement `--table` flag for selective rollback
   - Add confirmation prompts with clear warnings
   - Implement rollback execution logic
   - Add rollback audit logging

3. **Implement Safety Mechanisms**
   - Add confirmation prompts for destructive operations
   - Implement dry-run mode for preview without execution
   - Add database backup integration (staging/production)
   - Create rollback validation checks
   - Implement rollback status reporting

4. **Create Rollback Documentation**
   - Document rollback procedures for each seeder
   - Create troubleshooting guide for rollback failures
   - Document safety mechanisms and confirmation flows
   - Create runbook for emergency rollback

5. **Implement Rollback Testing**
   - Test rollback in development with various scenarios
   - Test confirmation prompts work correctly
   - Test dry-run mode accuracy
   - Validate rollback logs capture all operations
   - Test rollback with partial seeding failures

**Testing:**

- [ ] Rollback deletes only seeded data (not real data)
- [ ] Confirmation prompts prevent accidental deletion
- [ ] Dry-run mode shows accurate preview
- [ ] Rollback logs capture all operations with timestamps
- [ ] Rollback works with partial seeding failures
- [ ] Database backup integration tested (staging)

**Acceptance Criteria:**

- [ ] Rollback script implemented with per-seeder configuration
- [ ] Confirmation prompts prevent accidental data loss
- [ ] Dry-run mode provides accurate preview
- [ ] Rollback audit logging captures all operations
- [ ] Database backup integration working (staging/production)
- [ ] Rollback procedures documented and tested
- [ ] Emergency rollback runbook created
- [ ] All rollback scenarios tested in development

**Dependencies:** TERP-TASK-009-02 (requires seeders to exist)

**Risk:** Medium - Destructive operations require careful testing

**Citation:** Liquibase (explicit rollback requirement), Salesforce (safety mechanisms)

---

### TERP-TASK-009-04: PII Masking and Compliance (2-3 hours)

**Goal:** Implement PII masking and anonymization to comply with GDPR/CCPA regulations for cannabis industry data.

**Deliverables:**

**PII Protection System:**

- `lib/data-masking.ts` - PII masking utilities
- Environment-specific masking strategies
- Compliance documentation
- Audit logging for seeded data access

**Technical Tasks:**

1. **Identify PII Fields**
   - Audit database schema for PII fields
   - Document all PII fields (names, emails, phones, addresses, SSN, medical info)
   - Categorize PII by sensitivity level
   - Define masking requirements per field

2. **Implement Masking Utilities**
   - Create `lib/data-masking.ts` with masking functions
   - Implement email masking using Faker
   - Implement phone number masking
   - Implement name masking
   - Implement address masking
   - Implement SSN/medical info masking
   - Test masking utilities with various data formats

3. **Implement Environment-Specific Strategies**
   - Development: Full masking, use Faker for all PII
   - Staging: Partial masking, preserve data patterns
   - Production: No seeding of customer data, only reference data
   - Add environment detection logic
   - Test masking behavior per environment

4. **Create Compliance Documentation**
   - Document all PII fields and masking strategies
   - Create GDPR compliance documentation
   - Create CCPA compliance documentation
   - Document data retention policies for test data
   - Create audit trail requirements

5. **Implement Audit Logging**
   - Add audit logging for all seeding operations
   - Log PII access and masking operations
   - Create audit trail for compliance review
   - Implement log retention policies

**Testing:**

- [ ] All PII fields properly masked in development
- [ ] Masking utilities work with various data formats
- [ ] Environment-specific strategies apply correctly
- [ ] Compliance documentation reviewed by stakeholders
- [ ] Audit logs capture all required information

**Acceptance Criteria:**

- [ ] All PII fields identified and documented
- [ ] Masking utilities implemented and tested
- [ ] Environment-specific strategies working correctly
- [ ] GDPR/CCPA compliance documentation created
- [ ] Audit logging captures all seeding operations
- [ ] Data retention policies documented
- [ ] Compliance review completed by stakeholders

**Dependencies:** TERP-TASK-009-02 (requires seeders to exist)

**Risk:** High (compliance violations) - Requires stakeholder review

**Citation:** Salesforce (PII masking, GDPR/CCPA compliance)

---

### TERP-TASK-009-05: Testing and Validation (3-4 hours)

**Goal:** Comprehensive testing and validation to ensure production readiness and zero regressions.

**Deliverables:**

**Test Suite:**

- Unit tests for all seeders and utilities
- Integration tests for full seeding workflow
- End-to-end tests in development environment
- Performance benchmarks
- Load testing results

**Technical Tasks:**

1. **Write Unit Tests**
   - Create unit tests for each seeder
   - Create unit tests for masking utilities
   - Create unit tests for validation utilities
   - Create unit tests for locking mechanism
   - Achieve >80% code coverage
   - Run tests in CI pipeline

2. **Create Integration Tests**
   - Test full seeding workflow (all seeders)
   - Test seeding with empty database
   - Test seeding with existing data (idempotency)
   - Test error handling with various failure scenarios
   - Test rollback workflow
   - Test concurrent seeding attempts

3. **End-to-End Testing**
   - Test all CLI flags and options
   - Test confirmation prompts
   - Test dry-run mode
   - Test environment-specific behavior
   - Test logging output
   - Test error reporting

4. **Performance Testing**
   - Benchmark seeding with 100 records
   - Benchmark seeding with 1,000 records
   - Benchmark seeding with 10,000 records
   - Benchmark seeding with 50,000 records
   - Compare `create()` vs `insert()` performance
   - Document performance characteristics

5. **Load Testing**
   - Test concurrent seeding attempts (locking)
   - Test seeding during high database load
   - Test seeding with slow network
   - Test seeding with database errors
   - Validate error recovery

6. **Staging Validation**
   - Deploy seeding system to staging
   - Test with production-like data volume
   - Validate Railway deployment compatibility
   - Test rollback in staging environment
   - Verify no impact on application startup

**Testing:**

- [ ] Unit test suite passes with >80% coverage
- [ ] Integration tests pass for all workflows
- [ ] End-to-end tests pass for all CLI options
- [ ] Performance benchmarks meet targets
- [ ] Load testing validates concurrency protection
- [ ] Staging validation successful

**Acceptance Criteria:**

- [ ] Unit tests achieve >80% code coverage
- [ ] Integration tests cover all workflows
- [ ] End-to-end tests validate all CLI options
- [ ] Performance benchmarks documented and meet targets
- [ ] Load testing validates concurrency protection
- [ ] Staging deployment successful
- [ ] Zero impact on application startup verified
- [ ] Test results documented and reviewed

**Dependencies:** TERP-TASK-009-04 (requires all features implemented)

**Risk:** Low - Comprehensive testing reduces production risk

**Citation:** All sources (testing best practices)

---

### TERP-TASK-009-06: Documentation and Handoff (1-2 hours)

**Goal:** Create comprehensive documentation for long-term maintainability and team onboarding.

**Deliverables:**

**Documentation:**

- README in `scripts/seed/` directory
- CLI usage guide with examples
- Troubleshooting guide
- Rollback procedures
- Compliance documentation
- Runbook for production seeding
- TERP agent protocol updates

**Technical Tasks:**

1. **Create README**
   - Overview of seeding system
   - Architecture diagram
   - Quick start guide
   - CLI command reference
   - Environment-specific behavior
   - Performance characteristics

2. **Document CLI Usage**
   - Document all CLI flags and options
   - Provide examples for common scenarios
   - Document confirmation prompts
   - Document dry-run mode
   - Document rollback commands

3. **Create Troubleshooting Guide**
   - Common errors and solutions
   - Schema drift troubleshooting
   - Performance troubleshooting
   - Rollback troubleshooting
   - Locking troubleshooting

4. **Document Rollback Procedures**
   - Step-by-step rollback instructions
   - Safety checks before rollback
   - Emergency rollback procedures
   - Rollback validation steps

5. **Create Compliance Documentation**
   - PII masking documentation
   - GDPR compliance documentation
   - CCPA compliance documentation
   - Data retention policies
   - Audit trail documentation

6. **Create Production Runbook**
   - When to seed in production (if ever)
   - Pre-seeding checklist
   - Seeding execution steps
   - Post-seeding validation
   - Rollback procedures

7. **Update TERP Agent Protocols**
   - Add seeding guidelines to development protocols
   - Document when to use seeding
   - Document testing requirements
   - Document compliance requirements

**Testing:**

- [ ] Documentation reviewed for accuracy
- [ ] Examples tested and verified
- [ ] Troubleshooting guide validated with real errors
- [ ] Runbook validated in staging

**Acceptance Criteria:**

- [ ] README created with comprehensive overview
- [ ] CLI usage guide with working examples
- [ ] Troubleshooting guide covers common issues
- [ ] Rollback procedures documented and tested
- [ ] Compliance documentation complete
- [ ] Production runbook created and validated
- [ ] TERP agent protocols updated
- [ ] Documentation reviewed by team

**Dependencies:** TERP-TASK-009-05 (requires testing complete)

**Risk:** Low - Documentation only

**Citation:** Salesforce (documentation best practices)

---

## Timeline Summary

| Task                                     | Duration        | Dependencies | Risk    |
| ---------------------------------------- | --------------- | ------------ | ------- |
| TERP-TASK-009-01: Infrastructure Setup   | 3-4 hours       | None         | Low     |
| TERP-TASK-009-02: Core Seeding Logic     | 5-7 hours       | 009-01       | Low     |
| TERP-TASK-009-03: Rollback and Safety    | 3-4 hours       | 009-02       | Medium  |
| TERP-TASK-009-04: PII Masking            | 2-3 hours       | 009-02       | High    |
| TERP-TASK-009-05: Testing and Validation | 3-4 hours       | 009-04       | Low     |
| TERP-TASK-009-06: Documentation          | 1-2 hours       | 009-05       | Low     |
| **Total**                                | **17-24 hours** |              | **Low** |

**Recommended Schedule:**

- Day 1: TERP-TASK-009-01 + start TERP-TASK-009-02 (6-8 hours)
- Day 2: Complete TERP-TASK-009-02 + TERP-TASK-009-03 (6-8 hours)
- Day 3: TERP-TASK-009-04 + TERP-TASK-009-05 + TERP-TASK-009-06 (6-8 hours)

---

## Risk Assessment

### Technical Risks

| Risk                            | Impact | Probability | Mitigation                                 |
| ------------------------------- | ------ | ----------- | ------------------------------------------ |
| Complex mock data generation    | Medium | Medium      | Start simple, use Faker.js patterns        |
| Drizzle migration issues        | High   | Low         | Test thoroughly in dev, have rollback plan |
| Performance with large datasets | Medium | Medium      | Use `insert()`, benchmark early            |
| Concurrency race conditions     | High   | Low         | Database locking, test parallel execution  |
| Schema drift detection failure  | High   | Low         | Runtime validation, comprehensive logging  |

### Operational Risks

| Risk                              | Impact   | Probability | Mitigation                                   |
| --------------------------------- | -------- | ----------- | -------------------------------------------- |
| Accidental production seeding     | Critical | Low         | Confirmation prompts, explicit env flag      |
| PII exposure in test environments | High     | Medium      | Mandatory masking, compliance review         |
| Rollback breaks deployment        | High     | Low         | Explicit rollback per seeder, test scenarios |
| Dependency conflicts              | Low      | Low         | Pin versions, test in CI                     |

### Compliance Risks

| Risk                      | Impact   | Probability | Mitigation                              |
| ------------------------- | -------- | ----------- | --------------------------------------- |
| GDPR/CCPA violations      | Critical | Medium      | PII masking, compliance documentation   |
| Audit trail gaps          | Medium   | Low         | Comprehensive logging, audit trail      |
| Data retention violations | Medium   | Low         | Document and enforce retention policies |

---

## Success Criteria

### Functional Requirements

- [ ] CLI-based seeding system separate from app startup
- [ ] Seeders for clients, batches, inventory, orders
- [ ] Realistic mock data generation using Faker.js
- [ ] Idempotency prevents duplicate data
- [ ] Schema validation detects drift
- [ ] Explicit rollback strategy per seeder
- [ ] PII masking for non-production environments
- [ ] Concurrency protection via locking
- [ ] Data integrity validation
- [ ] Comprehensive error handling and logging

### Non-Functional Requirements

- [ ] Zero impact on application startup
- [ ] Performance: < 5 seconds for 1,000 records
- [ ] Performance: < 1 minute for 10,000 records
- [ ] Test coverage: >80%
- [ ] GDPR/CCPA compliance
- [ ] Production-ready documentation
- [ ] Staging validation successful

### Quality Metrics

- [ ] Quality score: 9/10 (target)
- [ ] Zero regressions in existing functionality
- [ ] All research-backed best practices implemented
- [ ] All critical gaps from QA review addressed
- [ ] Stakeholder approval obtained

---

## Rollback Plan

If issues arise during implementation, the rollback plan is straightforward:

1. **No Code Changes to Application** - Seeding system is completely separate
2. **Delete Seeding Scripts** - Remove `scripts/seed/` directory
3. **Remove npm Scripts** - Remove seeding commands from package.json
4. **Application Unaffected** - App continues running normally

**Risk of Rollback:** None - Seeding system is decoupled from application

---

## Post-Implementation

### Maintenance

**Weekly:**

- Review seeding logs for errors
- Update mock data patterns as schema evolves
- Test seeding in development

**Monthly:**

- Review compliance documentation
- Update PII masking strategies
- Performance benchmarking

**As Needed:**

- Update seeders when schema changes
- Add new seeders for new entities
- Refine data generation patterns

### Future Enhancements

**Phase 2 (Future):**

- Web UI for triggering seeding (admin panel)
- Progress tracking UI
- Seeding analytics and reporting
- CSV import for custom datasets

**Phase 3 (Future):**

- Database-native CSV import for very large datasets
- Seeding templates for common scenarios
- Seeding snapshots for test isolation

---

## References

### Strategy Documents

- **Primary Strategy:** `/home/ubuntu/terp/docs/MOCK_DATA_SEEDING_STRATEGY_V2.md`
- **QA Analysis:** `/tmp/gemini_qa_analysis.md`

### Research Sources

- **Salesforce:** `/tmp/research_salesforce.md`
- **Tighten:** `/tmp/research_tighten.md`
- **Liquibase:** `/tmp/research_liquibase.md`
- **Microsoft EF Core:** `/tmp/research_microsoft_ef.md`

### Related Documentation

- **TERP Development Protocols:** `docs/DEVELOPMENT_PROTOCOLS.md`
- **Project Context:** `docs/PROJECT_CONTEXT.md`
- **Active Sessions:** `docs/ACTIVE_SESSIONS.md`

---

## Questions for Discussion

1. **Data Volume:** How much mock data needed? (Small: 100s, Medium: 1000s, Large: 10,000s?)
2. **PII Fields:** Which specific fields contain PII requiring masking?
3. **Production Seeding:** Should production seeding be allowed at all?
4. **Performance Targets:** What is acceptable seeding time?
5. **Compliance Review:** Who should review PII masking documentation?
6. **Priority:** High priority or defer for other features?
7. **Scope:** Which tables to seed first?

---

**Status:** Ready for Implementation  
**Approval Required:** Yes (stakeholder review of strategy and roadmap)  
**Implementation Start:** Pending approval  
**Estimated Completion:** 2-3 days after approval

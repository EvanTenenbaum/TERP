# TERP-INIT-009: Production-Grade Database Seeding System

**Status:** Ready for Implementation  
**Priority:** High  
**Risk:** Low  
**Timeline:** 2-3 days (17-24 hours)

---

## Quick Reference

### Task IDs for Agent Assignment

| Task ID              | Title                  | Duration  | Dependencies |
| -------------------- | ---------------------- | --------- | ------------ |
| **TERP-TASK-009-01** | Infrastructure Setup   | 3-4 hours | None         |
| **TERP-TASK-009-02** | Core Seeding Logic     | 5-7 hours | 009-01       |
| **TERP-TASK-009-03** | Rollback and Safety    | 3-4 hours | 009-02       |
| **TERP-TASK-009-04** | PII Masking            | 2-3 hours | 009-02       |
| **TERP-TASK-009-05** | Testing and Validation | 3-4 hours | 009-04       |
| **TERP-TASK-009-06** | Documentation          | 1-2 hours | 009-05       |

### Key Documents

**Strategy and Research:**

- `/home/ubuntu/terp/docs/MOCK_DATA_SEEDING_STRATEGY_V2.md` - Complete strategy (V2)
- `/tmp/gemini_qa_analysis.md` - QA review findings
- `/tmp/research_salesforce.md` - Salesforce best practices
- `/tmp/research_tighten.md` - Tighten performance patterns
- `/tmp/research_liquibase.md` - Liquibase rollback strategies
- `/tmp/research_microsoft_ef.md` - Microsoft EF Core documentation

**Roadmap:**

- `docs/roadmap.md` - Detailed implementation roadmap (this initiative)

**Metadata:**

- `initiative.json` - Structured initiative data

---

## For Agents: How to Use This Initiative

### Starting Work on a Task

1. **Reference the task ID** in your session registration:

   ```
   Working on TERP-TASK-009-01 (Infrastructure Setup)
   ```

2. **Read the roadmap** for detailed requirements:

   ```
   /home/ubuntu/terp/product-management/initiatives/TERP-INIT-009/docs/roadmap.md
   ```

3. **Read the strategy** for context and reasoning:

   ```
   /home/ubuntu/terp/docs/MOCK_DATA_SEEDING_STRATEGY_V2.md
   ```

4. **Check dependencies** before starting (see task table above)

5. **Follow TERP protocols** (TDD, no `any` types, session registration)

### Finding Everything You Need

**All documentation is self-contained in these locations:**

```
/home/ubuntu/terp/product-management/initiatives/TERP-INIT-009/
├── README.md              # This file (quick reference)
├── initiative.json        # Structured metadata
├── docs/
│   └── roadmap.md        # Detailed implementation roadmap
└── progress/
    └── [task-progress]   # Progress tracking (created during work)
```

**Research sources are in `/tmp/` directory:**

```
/tmp/research_salesforce.md
/tmp/research_tighten.md
/tmp/research_liquibase.md
/tmp/research_microsoft_ef.md
/tmp/gemini_qa_analysis.md
```

**Strategy document is in main docs:**

```
/home/ubuntu/terp/docs/MOCK_DATA_SEEDING_STRATEGY_V2.md
```

### Task Assignment Example

**User says:** "Work on TERP-TASK-009-01"

**Agent should:**

1. Read `/home/ubuntu/terp/product-management/initiatives/TERP-INIT-009/docs/roadmap.md`
2. Find the section for TERP-TASK-009-01
3. Read the strategy document for context
4. Register session in `docs/ACTIVE_SESSIONS.md`
5. Implement according to roadmap requirements
6. Update progress in `progress/` directory

---

## Executive Summary

This initiative implements a production-grade database seeding system based on research from four authoritative sources: Salesforce, Tighten, Liquibase, and Microsoft EF Core.

**Problem:** Previous seeding approach embedded in app startup caused production crashes when database schemas drifted. After 6+ hours of debugging, rolled back to stable Nov 26 commit.

**Solution:** CLI-based seeding system completely separate from application startup with comprehensive safety features:

- ✅ Explicit rollback strategy (prevents deployment pipeline breakage)
- ✅ PII masking (GDPR/CCPA compliance)
- ✅ Performance optimization (60x improvement for large datasets)
- ✅ Concurrency protection (prevents race conditions)
- ✅ Data integrity validation (catches relationship errors)
- ✅ Version control (reproducibility and traceability)

**Quality Score:** Target 9/10 (production-ready)

**Risk:** Low - Decoupled from application, cannot impact startup

---

## Key Improvements from Previous Approach

| Aspect          | Old Approach ❌        | New Approach ✅                 |
| --------------- | ---------------------- | ------------------------------- |
| **Startup**     | Part of app startup    | Separate CLI script             |
| **Errors**      | Silent crashes         | Robust try/catch + logging      |
| **Schema**      | Manual, prone to drift | Migrations + runtime validation |
| **Rollback**    | No strategy            | Explicit per seeder             |
| **PII**         | No masking             | Faker.js + data masking         |
| **Performance** | Slow (create)          | Optimized (insert) - 60x faster |
| **Concurrency** | No protection          | Database locking                |

---

## Research Foundation

All recommendations are supported by citations to authoritative sources:

1. **Salesforce** - Enterprise patterns, compliance, data integrity
2. **Tighten** - Performance optimization, practical implementation
3. **Liquibase** - Rollback strategies, deployment safety
4. **Microsoft EF Core** - Concurrency protection, idempotency

---

## Success Criteria

### Must Have

- [ ] CLI-based seeding separate from app startup
- [ ] Zero impact on application stability
- [ ] Explicit rollback strategy per seeder
- [ ] PII masking for non-production environments
- [ ] Performance: <5 seconds for 1,000 records
- [ ] Test coverage >80%
- [ ] GDPR/CCPA compliance documentation

### Quality Metrics

- [ ] Quality score: 9/10 (target)
- [ ] Zero regressions in existing functionality
- [ ] All research-backed best practices implemented
- [ ] Stakeholder approval obtained

---

## Questions for User

Before implementation, clarify:

1. **Data Volume:** How much mock data needed? (Small: 100s, Medium: 1000s, Large: 10,000s?)
2. **PII Fields:** Which specific fields contain PII requiring masking?
3. **Production Seeding:** Should production seeding be allowed at all?
4. **Performance Targets:** What is acceptable seeding time?
5. **Compliance Review:** Who should review PII masking documentation?
6. **Priority:** High priority or defer for other features?
7. **Scope:** Which tables to seed first (clients, batches, inventory, orders)?

---

## Current Status

**App Status:** ✅ Stable and operational on Railway  
**Database Status:** Empty (no mock data)  
**Deployment:** https://terp-app-main-main.up.railway.app  
**Last Stable Commit:** f705e123 (Nov 26, 2025)

**Ready to implement:** Yes, pending user approval

---

**For detailed implementation instructions, see `docs/roadmap.md`**

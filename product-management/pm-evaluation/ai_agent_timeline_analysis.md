# AI Agent Timeline Analysis v2.0 - METR Methodology

**Date**: November 4, 2025  
**Methodology**: METR Task-Completion Time Horizon  
**Reference**: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/

---

## Methodology Overview

Based on METR research, AI agent capability should be measured by **human expert task duration**:

### Current AI Agent Capability (Claude 3.7 Sonnet / GPT-4 class)

- **Time Horizon**: ~1 hour (50% success rate)
- **High Success** (<4 min human time): ~100% success
- **Medium Success** (4 min - 1 hour human time): 50-90% success
- **Low Success** (1-4 hours human time): 10-50% success
- **Very Low Success** (>4 hours human time): <10% success

### Key Principle

**Estimate how long an expert human developer would take**, then:
1. Tasks <1 hour (human): AI completes reliably in single session
2. Tasks 1-4 hours (human): AI needs 2-3 attempts or task breakdown
3. Tasks >4 hours (human): Must break into <1 hour subtasks

---

## Initiative Analysis - Human Expert Time Estimates

### TERP-INIT-005: Inventory System Stability

**Total Human Expert Time**: ~40-60 hours

**Phase Breakdown** (expert human time):

#### Phase 1: Critical Fixes (12-16 hours)
- DB transactions + locking: 4-6 hours
  - Understand current code: 1 hour
  - Implement transactions: 2-3 hours
  - Test concurrent scenarios: 1-2 hours
  
- Transactional intake: 4-5 hours
  - Analyze multi-step process: 1 hour
  - Wrap in transaction: 2-3 hours
  - Test rollback scenarios: 1 hour
  
- Sequence generation: 4-5 hours
  - Design sequences table: 1 hour
  - Implement atomic generation: 2-3 hours
  - Migrate existing data: 1 hour

#### Phase 2: Stability (10-14 hours)
- Error handling standardization: 4-5 hours
- Comprehensive validation: 4-5 hours
- Database indexes: 2-4 hours

#### Phase 3: Robustness & Testing (12-18 hours)
- Quantity consistency: 3-4 hours
- Metadata schema enforcement: 2-3 hours
- Test suite (>70% coverage): 5-8 hours
- Audit logging: 2-3 hours

#### Phase 4: Optimization (6-12 hours)
- Pagination: 2-3 hours
- Refactoring (DRY): 2-4 hours
- Type safety: 1-2 hours
- Caching layer: 1-3 hours

**AI Agent Execution Strategy**:
- Break into ~15-20 subtasks of <2 hours each
- Each subtask: 1-2 AI agent sessions
- **Estimated Total**: 15-20 agent sessions over 3-5 days (with QA iterations)

---

### TERP-INIT-006: To-Do Lists + Universal Comments System

**Total Human Expert Time**: ~20-30 hours

**Breakdown** (expert human time):

#### Database + API (6-8 hours)
- Schema design: 2-3 hours
- tRPC procedures: 3-4 hours
- Polymorphic associations: 1 hour

#### Frontend Components (8-12 hours)
- Comment component: 3-4 hours
- Todo list component: 3-4 hours
- Mention autocomplete: 2-4 hours

#### Integration + Polish (6-10 hours)
- Entity integration: 3-5 hours
- @mention system + inbox: 2-3 hours
- Mobile optimization: 1-2 hours

**AI Agent Execution Strategy**:
- Break into ~10-12 subtasks of <3 hours each
- Each subtask: 1-2 AI agent sessions
- **Estimated Total**: 10-12 agent sessions over 2-3 days

---

### TERP-INIT-007: Accounting Module

**Total Human Expert Time**: ~120-180 hours

#### Phase 1: Smart Ledger Core (60-90 hours)

**Week 1: Foundation** (20-25 hours)
- Database schema: 8-10 hours
- Chart of accounts: 4-6 hours
- Core API: 6-8 hours
- Transaction validation: 2-3 hours

**Week 2: Transaction Entry UI** (15-20 hours)
- Entry form (all types): 8-10 hours
- Real-time validation: 4-6 hours
- Keyboard shortcuts: 3-4 hours

**Week 3: Suggestions Engine** (15-20 hours)
- Template system: 6-8 hours
- Suggestion algorithm: 6-8 hours
- Historical analysis: 3-4 hours

**Week 4: Testing + Polish** (10-25 hours)
- Test suite: 6-12 hours
- Edge cases: 2-6 hours
- Performance optimization: 2-7 hours

#### Phase 2: Transaction Splitting (60-90 hours)

**Week 1: Splitting Engine** (20-25 hours)
- Rule schema: 6-8 hours
- Evaluation engine: 8-10 hours
- Validation: 6-7 hours

**Week 2: Rule Management UI** (15-20 hours)
- Rule builder: 8-10 hours
- Templates: 4-6 hours
- Testing/preview: 3-4 hours

**Week 3: Automation** (15-20 hours)
- Recurring rules: 6-8 hours
- Auto-application: 6-8 hours
- Conflict resolution: 3-4 hours

**Week 4: Analytics + Testing** (10-25 hours)
- Analytics dashboard: 4-8 hours
- Testing: 4-10 hours
- Documentation: 2-7 hours

**AI Agent Execution Strategy**:
- Break into ~50-60 subtasks of <3 hours each
- Each subtask: 1-3 AI agent sessions (complex logic may need iterations)
- **Estimated Total**: 50-70 agent sessions over 10-15 days (per phase)
- **Total for both phases**: 20-30 days

---

### TERP-INIT-004: Client Module Improvements

**Total Human Expert Time**: ~16-24 hours

**Breakdown** (expert human time):

#### Enhanced Search (6-8 hours)
- Full-text search implementation: 3-4 hours
- UI enhancements: 2-3 hours
- Performance optimization: 1 hour

#### Keyboard Shortcuts (3-4 hours)
- Shortcut system: 2-3 hours
- Help overlay: 1 hour

#### Payment Allocation + Bulk Ops (5-8 hours)
- Payment allocation logic: 3-4 hours
- Bulk operations: 2-4 hours

#### Testing + Polish (2-4 hours)
- Testing: 1-2 hours
- UI/UX refinement: 1-2 hours

**AI Agent Execution Strategy**:
- Break into ~8-10 subtasks of <3 hours each
- Each subtask: 1-2 AI agent sessions
- **Estimated Total**: 8-10 agent sessions over 2-3 days

---

### TERP-INIT-003: Calendar & Scheduling System

**Total Human Expert Time**: ~80-120 hours

#### Phase 0: Foundation (12-16 hours)
- Database schema: 6-8 hours
- Core API: 4-6 hours
- Recurrence parser: 2-2 hours

#### Phase 1: MVP + Core Integrations (30-40 hours)
- Calendar views: 12-16 hours
- Recurring event engine: 10-14 hours
- Client integration: 6-8 hours
- Inventory integration: 2-2 hours

#### Phase 2: Enhanced Functionality (20-30 hours)
- AP/AR automation: 12-16 hours
- Smart scheduling: 8-14 hours

#### Phase 3: Proactive & Collaborative (18-34 hours)
- Notification engine: 10-18 hours
- Collaborative features: 8-16 hours

**AI Agent Execution Strategy**:
- Break into ~35-45 subtasks of <3 hours each
- Each subtask: 1-3 AI agent sessions (complex calendar logic)
- **Estimated Total**: 40-55 agent sessions over 8-12 days

---

## Revised Timeline Estimates

| Initiative | Human Expert Hours | AI Agent Sessions | Calendar Days | Notes |
|------------|-------------------|-------------------|---------------|-------|
| TERP-INIT-005 | 40-60 hours | 15-20 sessions | 3-5 days | Multiple QA iterations |
| TERP-INIT-006 | 20-30 hours | 10-12 sessions | 2-3 days | Straightforward implementation |
| TERP-INIT-007 Phase 1 | 60-90 hours | 25-35 sessions | 5-8 days | Complex business logic |
| TERP-INIT-007 Phase 2 | 60-90 hours | 25-35 sessions | 5-8 days | Rule engine complexity |
| TERP-INIT-004 | 16-24 hours | 8-10 sessions | 2-3 days | Well-defined scope |
| TERP-INIT-003 | 80-120 hours | 40-55 sessions | 8-12 days | Calendar complexity + integrations |

**Total Sequential**: ~25-40 days  
**Total Parallel (2 agents)**: ~18-28 days

---

## Revised Roadmap Sequence

### Sequential Execution (Single Agent)

```
Days 1-5:     TERP-INIT-005 (Inventory Stability)
Days 6-8:     TERP-INIT-006 (Comments System)
Days 9-16:    TERP-INIT-007 Phase 1 (Smart Ledger Core)
Days 17-19:   TERP-INIT-004 (Client Module)
Days 20-28:   TERP-INIT-007 Phase 2 (Transaction Splitting)
Days 29-40:   TERP-INIT-003 (Calendar System)
```

**Total**: ~40 days (~8 weeks)

---

### Parallel Execution (2 Agents) ⭐ RECOMMENDED

```
Days 1-5:
  Agent 1: TERP-INIT-005 (Inventory Stability)
  Agent 2: Idle or other work

Days 6-8:
  Agent 1: TERP-INIT-006 (Comments System)
  Agent 2: Idle or other work

Days 9-16:
  Agent 1: TERP-INIT-007 Phase 1 (Smart Ledger Core)
  Agent 2: TERP-INIT-004 (Client Module) [Days 9-11] → TERP-INIT-003 Phase 0 [Days 12-14] → Support Agent 1 [Days 15-16]

Days 17-28:
  Agent 1: TERP-INIT-007 Phase 2 (Transaction Splitting)
  Agent 2: TERP-INIT-003 Phases 1-2 (Calendar MVP + Enhanced) [Days 17-26] → Support Agent 1 [Days 27-28]

Days 29-32:
  Agent 1 + Agent 2: TERP-INIT-003 Phase 3 (Calendar Collaborative)
```

**Total**: ~32 days (~6.5 weeks)

**Efficiency Gain**: 20% faster than sequential

---

## Key Assumptions

1. **AI Agent Capability**: Claude 3.7 Sonnet / GPT-4 class (~1 hour time horizon)
2. **Task Breakdown**: All tasks broken into <3 hour subtasks for reliable completion
3. **Iteration Factor**: 1.5-2x for QA, edge cases, and refinement
4. **Integration Time**: Included in phase estimates
5. **Parallel Efficiency**: ~80% (some coordination overhead)

---

## Risk Factors

1. **Underestimated Complexity**: Some tasks may take humans longer than estimated
2. **AI Agent Limitations**: Tasks >2 hours may need more iterations
3. **Integration Issues**: Cross-module integration may require additional time
4. **Edge Cases**: Calendar and Accounting have many edge cases
5. **QA Requirements**: Comprehensive testing adds 30-50% overhead

---

## Validation Strategy

1. **Track Actual vs. Estimated**: Record actual agent sessions per task
2. **Adjust Model**: Update human time estimates based on actual data
3. **Identify Bottlenecks**: Tasks that need >3 iterations indicate underestimation
4. **Refine Breakdown**: Improve task breakdown for future initiatives

---

**Analysis Completed**: November 4, 2025  
**Methodology**: METR Task-Completion Time Horizon  
**Next Review**: After Sprint 1 completion (validate estimates)

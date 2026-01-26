# ST-003: Documentation Consolidation Plan

**Date:** November 12, 2025  
**Status:** In Progress

## Overview

Found 183 markdown files in `docs/` directory. Need to consolidate by archiving outdated/historical documentation while keeping active files accessible.

## Categorization

### ✅ KEEP (Active/Current) - 23 files

**Core Documentation:**

- `AGENT_ONBOARDING.md` - Agent onboarding guide
- ~~`AUTONOMOUS_EXECUTION_PROGRESS.md`~~ → Archived to `archive/completion-reports/`
- `CLAUDE_WORKFLOW.md` - Workflow guide
- `DEVELOPMENT_PROTOCOLS.md` - The Bible
- `ERROR_HANDLING_GUIDE.md` - ST-002 deliverable
- `NEW_AGENT_PROMPT.md` - Agent instructions
- `QUICK_REFERENCE.md` - Quick reference
- `ACTIVE_SESSIONS.md` - Active sessions tracking

**Recent Security Fixes:**

- ~~`CL-002-SECRET-ROTATION-GUIDE.md`~~ → Archived to `archive/guides/`
- ~~`CL-004-INVESTIGATION-REPORT.md`~~ → Archived to `archive/investigation-reports/`
- ~~`CL-005-ENV-FILE-SECURITY.md`~~ → Archived to `archive/guides/`

**Current Roadmaps:**

- `roadmaps/MASTER_ROADMAP.md`
- `roadmaps/ACTIVE.md`
- `roadmaps/README.md`

**Active Sessions:**

- `sessions/active/*` (currently 1 file)
- `sessions/completed/*` (recent completions)

**Current Testing:**

- `testing/TERP_PRE_COMMIT_CHECKLIST.md`
- `testing/TERP_TESTING_BEST_PRACTICES.md`
- `testing/TERP_TESTING_MASTER_PLAN.md`
- `testing/TERP_TESTING_README.md`

**Current Features:**

- `features/README.md`
- `features/FEATURE_ROADMAP.md`

### 📦 ARCHIVE (Outdated/Historical) - 160 files

**Old QA Reports (40+ files):**

- All `*_QA_REPORT.md` files except current ones
- `ADVERSARIAL_QA_REPORT.md`
- `COMPREHENSIVE_QA_REPORT.md`
- `SKEPTICAL_QA_REPORT.md`
- etc.

**Completed Delivery Packages (20+ files):**

- `*_DELIVERY_PACKAGE.md`
- `*_FINAL_DELIVERY.md`
- `*_COMPLETE.md`
- `VIP_PORTAL_*` (completed features)
- `CALENDAR_V3.2_*` (old versions)

**Old Specifications (30+ files):**

- `calendar/CALENDAR_EVOLUTION_SPEC*.md` (multiple versions)
- `specs/VIP_CLIENT_PORTAL_FEATURE_SPEC*.md` (old versions)
- `specs/QUOTE_SALES_*.md` (old specs)
- Duplicate specs with version numbers

**Historical Implementation Guides (20+ files):**

- `IMPLEMENTATION_PLAN_*.md`
- `IMPLEMENTATION_ROADMAP*.md`
- `GENERATED_CODE_IMPLEMENTATION_GUIDE.md`
- `MIGRATION_GUIDE.md` (old migrations)

**Old Testing Reports (15+ files):**

- `E2E_TEST_REPORT.md`
- `PHASE1_SMOKE_TEST_REPORT.md`
- `PHASE2_SMOKE_TEST_REPORT.md`
- `API_ERROR_INVESTIGATION_REPORT.md`
- `API_FIX_COMPLETE_REPORT.md`

**Outdated Analysis/Strategy (15+ files):**

- `CODEBASE_ANALYSIS.md`
- `GAP_ANALYSIS.md`
- `calendar_evolution_analysis.md`
- `calendar_evolution_strategy.md`
- `defaults-analysis.md`

**Completed Features/Fixes (10+ files):**

- `fixes/*` (old fixes)
- `WORKFLOW_QUEUE_IMPLEMENTATION.md`
- `RBAC_IMPLEMENTATION_SUMMARY.md`
- `CREDIT_CENTER_IMPLEMENTATION.md`

**Miscellaneous (10+ files):**

- `roadmap-integration-summary.md` (superseded, now archived)
- `typescript-strictness-progress.md` (old progress tracking)
- `TERP_v3.5.0_QA_REPORT.md` (old version)
- Session summaries from October

## Archive Structure

Create organized archive structure:

```
docs/archive/
├── 2025-11/                    # Current month archives
│   ├── qa-reports/
│   ├── delivery-packages/
│   ├── specifications/
│   ├── implementation-guides/
│   ├── testing-reports/
│   └── analysis/
├── calendar/                   # Calendar module historical docs
├── vip-portal/                # VIP Portal historical docs
├── quote-sales/               # Quote/Sales historical docs
└── misc/                      # Other historical docs
```

## Execution Plan

1. Create archive directory structure
2. Move files by category
3. Update any references in active docs
4. Create `archive/README.md` with index
5. Verify no broken links in active docs
6. Commit changes

## Benefits

- **Cleaner structure:** Easier to find current documentation
- **Faster navigation:** Less clutter in docs/ root
- **Preserved history:** All docs still accessible in archive
- **Better onboarding:** New agents see only relevant docs

## Verification

After consolidation:

- Active docs count: ~23 files
- Archive count: ~160 files
- No broken links in active docs
- All historical context preserved

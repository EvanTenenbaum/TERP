# Deprecated Roadmap Files Archive

**Archive Date:** 2025-11-30  
**Cleanup Initiative:** Roadmap System Consolidation

---

## Purpose

This archive contains all deprecated roadmap documentation files that were removed from the main TERP repository to prevent confusion and maintain a single source of truth for project planning.

## What Was Archived

This cleanup operation archived **42 files** related to old or deprecated roadmap systems, including:

- **Root Directory Files:** Status reports, consolidated roadmaps, and ad-hoc roadmap documents
- **Docs Directory Files:** Multiple versions of roadmap system documentation (V2, V3, V3.1, V3.2)
- **Backup Files:** Old backups of MASTER_ROADMAP.md
- **QA and Analysis Files:** Roadmap audits, reviews, and system design documents

## Current Active Roadmap System

As of November 2025, the TERP project uses a **unified roadmap system** consisting of:

### Active Files

1. **`docs/roadmaps/MASTER_ROADMAP.md`** - Single source of truth for all development tasks
   - Tracks features, bugs, security fixes, and infrastructure changes
   - Includes test status for each task
   - Updated continuously as work progresses

2. **`docs/roadmaps/TESTING_ROADMAP.md`** - Dedicated testing task tracker
   - Links to features in MASTER_ROADMAP
   - Tracks unit, integration, and E2E tests
   - Ensures comprehensive test coverage

3. **`docs/roadmaps/testing_roadmap_diagram.png`** - Visual representation of testing system

### Current Workflow

The current development workflow is documented in:
- **`docs/CLAUDE_WORKFLOW.md`** - Complete workflow guide (read this first)
- **`docs/QUICK_REFERENCE.md`** - 1-page summary for quick reference
- **`docs/NEW_AGENT_PROMPT.md`** - Mandatory prompt for all new agents

### Key Commands

```bash
# Start working on a planned task
pnpm start-task "TASK-ID"

# Start an ad-hoc task
pnpm start-task --adhoc "Description" --category bug

# Run live QA
live qa
```

## Why These Files Were Archived

The TERP project went through several iterations of roadmap systems between October and November 2025:

1. **Early System (Oct-Nov):** Multiple roadmap files in root directory, feature-specific roadmaps
2. **V2 System (Mid-Nov):** Improved roadmap structure with GitHub integration
3. **V3 System (Late-Nov):** GitHub-native roadmap with testing integration
4. **Current System (Nov 19+):** Simplified, unified MASTER_ROADMAP + TESTING_ROADMAP

Each iteration improved upon the previous one, but left behind documentation files that could cause confusion. This cleanup consolidates all historical roadmap documentation into this archive while preserving the current, active system.

## What Was NOT Archived

The following were intentionally kept in their original locations:

- **Product Management Initiatives** (`product-management/initiatives/`) - Separate initiative system for large projects
- **Script Files** (`scripts/roadmap*.ts`) - Tooling for roadmap management
- **Existing Archives** (`docs/archive/`) - Already archived materials
- **Active Roadmap Files** (listed above)

## File Organization

```
docs/archive/2025-11/
├── deprecated-roadmaps/
│   ├── root/          # Files from repository root
│   ├── docs/          # Files from docs/ directory
│   ├── cursor/        # Cursor IDE rules
│   └── other/         # Miscellaneous roadmap files
└── roadmap-backups/   # Old MASTER_ROADMAP backups
```

## Historical Context

### Timeline of Roadmap System Evolution

- **Nov 4, 2025:** TERP-INIT-008 (Codebase Cleanup) initiative created
- **Nov 12, 2025:** DEVELOPMENT_PROTOCOLS.md deprecated in favor of new workflow
- **Nov 19, 2025:** CLAUDE_WORKFLOW.md v2.0 released with unified roadmap system
- **Nov 30, 2025:** This cleanup performed to remove deprecated roadmap files

### Key Lessons Learned

1. **Single Source of Truth:** Multiple roadmap files create confusion
2. **Test-First Development:** Testing roadmap ensures quality
3. **Clear Workflow:** Documented processes prevent drift
4. **Regular Cleanup:** Archiving deprecated files maintains clarity

## Accessing Archived Files

All files in this archive are preserved for historical reference. If you need to access specific information from an archived roadmap file:

1. Check if the information exists in the current MASTER_ROADMAP.md
2. If not, browse this archive by category
3. For questions about archived content, consult the project maintainers

## Questions?

For questions about the current roadmap system, see:
- `docs/CLAUDE_WORKFLOW.md` - Complete workflow documentation
- `docs/QUICK_REFERENCE.md` - Quick reference guide
- `docs/roadmaps/MASTER_ROADMAP.md` - Current active roadmap

---

**Archive Maintained By:** TERP Development Team  
**Last Updated:** 2025-11-30

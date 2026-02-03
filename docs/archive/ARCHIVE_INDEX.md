# Documentation Archive Index

> **Purpose:** This index documents what has been archived and why, providing context for historical documentation.

---

## Archive Policy

- Documents are archived when they become obsolete, are superseded, or represent completed work
- Archives are organized by date and category
- Archived documents should NOT be referenced as current documentation
- If you find yourself needing archived content, consider whether it should be restored or updated

---

## Archive Structure

```
docs/archive/
├── 2025-11/                    # November 2025 archive
│   ├── deprecated-roadmaps/    # Old roadmap system versions
│   ├── qa-reports/             # Historical QA reports
│   ├── testing-reports/        # Historical test results
│   └── specifications/         # Superseded specs
├── agent-prompts/              # Old agent prompt versions
├── completion-reports/         # Task completion reports
├── legacy-reports/             # Pre-2025-11 reports
└── roadmaps/                   # Superseded roadmaps
```

---

## Key Archived Items

### Deprecated Roadmap Systems (docs/archive/2025-11/deprecated-roadmaps/)

The TERP roadmap system went through several iterations. These are archived for historical reference:
- `ROADMAP_SYSTEM_V2_*.md` - Version 2 system (superseded)
- `ROADMAP_SYSTEM_V3_*.md` - Version 3 iterations
- `ROADMAP_SYSTEM_GITHUB_NATIVE_V3.2_FINAL.md` - Final V3 design

**Current system:** See `docs/roadmaps/MASTER_ROADMAP.md`

### Old Agent Prompts (docs/archive/agent-prompts/)

Previous versions of agent instructions. These have been consolidated into:
- `CLAUDE.md` (primary entry point)
- `.kiro/steering/` (detailed protocols)

### Completion Reports (docs/archive/completion-reports/)

Historical task completion reports. Current tasks tracked in `docs/roadmaps/MASTER_ROADMAP.md`.

---

## What Should NOT Be Archived

- Active protocols (`.kiro/steering/`)
- Current roadmaps (`docs/roadmaps/MASTER_ROADMAP.md`)
- Setup and deployment guides
- API documentation
- User guides

---

## Restoration Process

If archived content needs to be restored:
1. Identify the specific document needed
2. Review if updates are required before restoration
3. Move to appropriate active location
4. Update any references
5. Remove from archive

---

*Last updated: 2026-02-03*
*Maintainer: Documentation cleanup initiative*

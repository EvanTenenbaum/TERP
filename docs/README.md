# TERP Documentation

> **Welcome to TERP documentation.** This index helps you find the documentation you need.

---

## Quick Links by Role

### 🤖 For AI Agents
- **Start here:** [`CLAUDE.md`](../CLAUDE.md) - Primary agent protocol
- **Quick reference:** [`UNIVERSAL_AGENT_RULES.md`](../UNIVERSAL_AGENT_RULES.md)
- **Detailed protocols:** [`.kiro/steering/`](../.kiro/steering/)

### 👨‍💻 For Developers
- **Setup:** [`DEV_ENVIRONMENT_SETUP.md`](./DEV_ENVIRONMENT_SETUP.md)
- **Architecture:** [`architecture/`](./architecture/)
- **API Reference:** [`api/`](./api/)
- **Testing:** [`testing/`](./testing/)

### 📊 For Project Management
- **Master Roadmap:** [`roadmaps/MASTER_ROADMAP.md`](./roadmaps/MASTER_ROADMAP.md)
- **Task Management:** [`HOW_TO_ADD_TASK.md`](./HOW_TO_ADD_TASK.md)
- **Sessions:** [`sessions/`](./sessions/)

### 🚀 For Deployment
- **Deployment Guide:** [`deployment/`](./deployment/)
- **Environment Variables:** [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md)
- **DigitalOcean Setup:** [`.do/`](../.do/)

---

## Documentation Structure

| Directory | Purpose |
|-----------|---------|
| `api/` | API endpoint documentation |
| `architecture/` | System design and architecture |
| `deployment/` | Deployment guides and checklists |
| `guides/` | How-to guides for specific tasks |
| `protocols/` | Development protocols and standards |
| `qa/` | QA reports and testing documentation |
| `roadmaps/` | Project roadmaps and task tracking |
| `sessions/` | Agent work session logs |
| `specs/` | Feature specifications |
| `templates/` | Document templates |
| `testing/` | Test documentation and fixtures |
| `user-guide/` | End-user documentation |
| `archive/` | Historical/deprecated docs (see [Archive Index](./archive/ARCHIVE_INDEX.md)) |

---

## Key Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Master Roadmap | `roadmaps/MASTER_ROADMAP.md` | Single source of truth for all tasks |
| Agent Protocol | `../CLAUDE.md` | Primary AI agent instructions |
| Steering Files | `../.kiro/steering/` | Canonical development protocols |
| Quick Reference | `QUICK_REFERENCE.md` | Developer quick reference |
| Testing Guide | `testing/` | Test procedures and coverage |

---

## Finding Documentation

### By Topic
- **Authentication:** `AUTH_SETUP.md`, `CLERK_AUTHENTICATION.md`
- **Database:** `DATABASE_SETUP.md`, `DATABASE_SCHEMA_SYNC.md`
- **Inventory:** `api/inventory.md`, `user-guide/inventory.md`
- **Accounting:** `specs/core-systems/`, `api/accounting.md`

### By Task
- **"How do I add a new task?"** → `HOW_TO_ADD_TASK.md`
- **"How do I deploy?"** → `deployment/`
- **"How do I run tests?"** → `testing/`
- **"How do I rollback?"** → `HOW_TO_ROLLBACK.md`

---

## Documentation Standards

When adding documentation:
1. Place in appropriate directory based on topic
2. Use descriptive filenames (no abbreviations)
3. Include a header with purpose and last-updated date
4. Link from this index if it's a key document
5. Archive outdated docs rather than deleting

---

*Last updated: 2026-02-03*

# Product Management System - User Guide

**Version**: 1.0
**Project**: TERP
**Created**: October 29, 2025

---

## Welcome!

This is your **complete product management system** for TERP. It enables you to:

✅ Capture ideas effortlessly
✅ Plan features with detailed specs
✅ Manage development with multiple agents
✅ Track progress automatically
✅ Ensure quality with comprehensive QA
✅ Never lose context between sessions

**Everything is stored in GitHub** - persistent, version-controlled, always accessible.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Chat System](#chat-system)
4. [Reference System](#reference-system)
5. [Workflows](#workflows)
6. [File Structure](#file-structure)
7. [Scripts & Tools](#scripts--tools)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### First Time Setup

System is already set up! Just start using it.

### Your First Idea

**In a new Manus chat** (Idea Inbox):

```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md

"Users want to export inventory to CSV"
```

That's it! The system will:
- Create a unique ID
- Store the idea
- Tag and categorize it
- Link to related features
- Suggest next steps

### Your First Feature

**In a new Manus chat** (Feature Planning):

```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/planning-context.md

"Build [TERP-IDEA-001]"
```

The system will:
- Generate complete PRD
- Create technical spec
- Analyze dependencies
- Estimate effort
- Auto-generate dev-brief
- Suggest implementation approach

### Your First Development

**In a new Manus chat** (Development):

```
Implement [TERP-FEAT-001]

Context: /home/ubuntu/TERP/product-management/features/planned/TERP-FEAT-001-.../dev-brief.md
```

The dev agent will:
- Load all context automatically
- Implement the feature
- Update progress as it works
- Follow all protocols
- Mark complete when done

---

## System Overview

### Core Concepts

**1. Unique IDs**
- Every idea, feature, bug gets a unique ID
- Format: `TERP-TYPE-###`
- Examples: `TERP-FEAT-015`, `TERP-IDEA-042`, `TERP-BUG-008`
- Use IDs to reference items clearly

**2. GitHub as Source of Truth**
- All data stored in `/home/ubuntu/TERP/product-management/`
- Version controlled
- Always accessible
- No data loss

**3. Multiple Specialized Chats**
- Each chat has a specific purpose
- Load context file at start
- Chats work together seamlessly

**4. Reference System**
- Use `[ID]` to reference items
- Use `[@category/doc]` for documents
- Clear, unambiguous communication

**5. Automation**
- Codebase analysis with caching
- Search indexing
- Dependency tracking
- Progress monitoring

---

## Chat System

### Chat 1: Idea Inbox

**Purpose**: Capture ideas, bugs, feedback

**Start a chat**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md
```

**What you can do**:
- Dump any idea, no matter how vague
- Report bugs
- Give feedback
- Ask questions

**What it does**:
- Creates unique ID
- Classifies and tags
- Links to related items
- Stores in appropriate location
- Suggests next steps

**Example**:
```
You: "Users want dark mode"

System:
✓ Captured as [TERP-IDEA-005]
📂 ideas/inbox/TERP-IDEA-005-dark-mode.md
🏷️ ux, theme, enhancement
🔗 Related to: [TERP-FEAT-002] (Theme System)

Want to build this now or keep in inbox?
```

---

### Chat 2: Feature Planning

**Purpose**: Turn ideas into detailed specs

**Start a chat**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/planning-context.md
```

**What you can do**:
- Turn ideas into features
- Generate PRDs
- Get technical analysis
- Estimate effort
- Explore alternatives

**What it does**:
- Generates comprehensive PRD
- Creates technical specification
- Analyzes dependencies
- Provides time estimates
- Auto-generates dev-brief
- Offers thought partnership

**Example**:
```
You: "Build [TERP-IDEA-005]"

System:
📋 Analyzing [TERP-IDEA-005]: Dark Mode

**Implementation Options**:
1. CSS variables + toggle (2-3 hours)
2. Tailwind dark mode (1-2 hours) ← Recommended
3. Theme context + styled-components (4-6 hours)

**Recommendation**: Option 2 (Tailwind)
- Already using Tailwind
- Built-in dark mode support
- Minimal code changes

Generate full PRD?
```

---

### Chat 3: Product Expert (Optional)

**Purpose**: Holistic view, strategic guidance

**Start a chat**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/expert-context.md
```

**What you can do**:
- Get roadmap overview
- Understand dependencies
- Prioritize features
- Strategic planning

**What it does**:
- Provides big-picture view
- Identifies opportunities
- Warns about conflicts
- Suggests priorities

---

### Chat 4: Development (One per feature)

**Purpose**: Implement features

**Start a chat**:
```
Implement [TERP-FEAT-XXX]

Context: /home/ubuntu/TERP/product-management/features/planned/TERP-FEAT-XXX-.../dev-brief.md
```

**What it does**:
- Loads all context from dev-brief
- Implements feature
- Updates progress.md
- Follows all protocols
- Marks complete when done

**Example**:
```
You: "Implement [TERP-FEAT-019]
      Context: /home/ubuntu/TERP/product-management/features/planned/TERP-FEAT-019-.../dev-brief.md"

Agent:
✓ Loaded dev-brief.md
✓ Loaded [@bible]
✓ Loaded [@context]
✓ Reviewed PRD and technical spec

Starting implementation...
[Works through checklist]
✓ Complete! Ready for QA.
```

---

### Chat 5: QA Agent

**Purpose**: Quality assurance

**Start a chat**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/qa-agent-context.md

QA [TERP-FEAT-XXX] at Level 3
```

**What it does**:
- Loads feature context
- Runs comprehensive tests
- Checks code quality
- Tests user flows
- Creates bug tickets
- Generates detailed report

**Example**:
```
You: "QA [TERP-FEAT-019] at Level 3"

Agent:
🔍 Running comprehensive QA...

✅ Static Analysis: PASS
✅ Code Review: PASS
✅ Functional Testing: PASS
✅ Edge Cases: PASS
✅ Responsive Design: PASS
✅ Integration: PASS

**Status**: PASS
No issues found. Ready to merge!
```

---

## Reference System

### Why References?

**Problem**: "That feature" - which one?
**Solution**: `[TERP-FEAT-015]` - crystal clear

### Reference Types

**1. ID References**
```
[TERP-FEAT-015]  - Feature #15
[TERP-IDEA-042]  - Idea #42
[TERP-BUG-008]   - Bug #8
```

**2. Document References**
```
[@bible]                      - Development protocols
[@context]                    - Project context
[@roadmap]                    - Current roadmap
[@module/inventory]           - Inventory module docs
[@codebase/architecture]      - Architecture docs
```

**3. File References**
```
[@file:client/src/pages/Inventory.tsx]
[@file:server/routers/inventory.ts]
```

**4. Section References**
```
[@roadmap#phase-2]
[@codebase/architecture#data-flow]
```

### Using References

**In your messages**:
```
"Build [TERP-IDEA-042]"
"What's the status of [TERP-FEAT-015]?"
"Does [TERP-FEAT-019] follow [@bible] protocols?"
"Check [@module/inventory] for patterns"
```

**In agent responses**:
```
"[TERP-FEAT-019] depends on [TERP-FEAT-015] (completed ✓).
It will modify [@file:client/src/pages/Inventory.tsx].
Follow patterns from [@module/inventory]."
```

**See full guide**: `_system/REFERENCE_SYSTEM.md`

---

## Workflows

### Workflow 1: Idea to Production

**Step 1: Capture Idea** (Idea Inbox chat)
```
"Users want to export inventory to CSV"
→ Creates [TERP-IDEA-001]
```

**Step 2: Plan Feature** (Feature Planning chat)
```
"Build [TERP-IDEA-001]"
→ Creates [TERP-FEAT-001] with full specs
```

**Step 3: Implement** (New Development chat)
```
"Implement [TERP-FEAT-001]
 Context: .../dev-brief.md"
→ Agent builds it
```

**Step 4: QA** (QA chat)
```
"QA [TERP-FEAT-001] at Level 3"
→ Agent tests it
```

**Step 5: Ship** (If QA passes)
```
Merge to main, deploy!
```

---

### Workflow 2: Bug Fix

**Step 1: Report Bug** (Idea Inbox chat)
```
"Filters crash with >5 categories"
→ Creates [TERP-BUG-001]
```

**Step 2: Fix Bug** (New Development chat)
```
"Fix [TERP-BUG-001]
 Context: .../dev-brief.md"
→ Agent fixes it
```

**Step 3: Verify** (QA chat)
```
"Verify fix for [TERP-BUG-001]"
→ Agent confirms fix
```

---

### Workflow 3: Parallel Development

**Multiple features at once**:

**Chat 1** (Dev Agent A):
```
"Implement [TERP-FEAT-015]"
```

**Chat 2** (Dev Agent B):
```
"Implement [TERP-FEAT-018]"
```

**Chat 3** (Dev Agent C):
```
"Fix [TERP-BUG-008]"
```

All work in parallel, no conflicts!

---

## File Structure

```
/home/ubuntu/TERP/product-management/
├── _system/                          # System files
│   ├── config/
│   │   └── system.json               # Configuration
│   ├── chat-contexts/                # Chat context files
│   │   ├── inbox-context.md
│   │   ├── planning-context.md
│   │   └── qa-agent-context.md
│   ├── scripts/                      # Utility scripts
│   │   ├── analyze-codebase.py
│   │   ├── search.py
│   │   └── id-manager.py
│   ├── templates/                    # File templates
│   │   ├── dev-brief-template.md
│   │   └── progress-template.md
│   ├── cache/                        # Cache files
│   │   ├── analysis-cache.json
│   │   └── search-index.json
│   ├── id-registry.json              # All IDs
│   └── REFERENCE_SYSTEM.md           # Reference guide
│
├── codebase/                         # Codebase analysis
│   ├── snapshot.json                 # Latest analysis
│   ├── architecture.md               # System architecture
│   ├── tech-stack.md                 # Technologies used
│   └── modules/                      # Per-module docs
│       └── inventory.md
│
├── ideas/                            # Ideas
│   ├── inbox/                        # New ideas
│   │   └── TERP-IDEA-001-*.md
│   └── archived/                     # Processed ideas
│
├── features/                         # Features
│   ├── backlog/                      # Not prioritized
│   ├── planned/                      # Ready to build
│   ├── in-progress/                  # Being built
│   │   └── TERP-FEAT-001-*/
│   │       ├── feature.md
│   │       ├── prd.md
│   │       ├── technical-spec.md
│   │       ├── dev-brief.md          # 🔑 KEY FILE
│   │       ├── progress.md
│   │       ├── metadata.json
│   │       └── qa/
│   │           └── qa-report-*.md
│   ├── completed/                    # Done
│   └── on-hold/                      # Paused
│
├── bugs/                             # Bugs
│   ├── open/
│   │   └── TERP-BUG-001-*/
│   │       ├── bug.md
│   │       ├── reproduction.md
│   │       └── dev-brief.md
│   └── closed/
│
├── prds/                             # Detailed specs
│   └── TERP-FEAT-001/
│       ├── prd.md
│       ├── technical-spec.md
│       ├── dependencies.json
│       └── estimates.json
│
├── roadmap/                          # Roadmaps
│   ├── current.json
│   ├── current.md
│   └── history/
│
├── context/                          # Project context
│   ├── vision.md
│   ├── constraints.md
│   └── decisions.md
│
└── changelog/                        # Change logs
    └── 2025-10-29-*.md
```

---

## Scripts & Tools

### Codebase Analysis

**Run analysis**:
```bash
cd /home/ubuntu/TERP
python3 product-management/_system/scripts/analyze-codebase.py
```

**What it does**:
- Analyzes all code files
- Caches results (only re-analyzes changed files)
- Generates codebase snapshot
- Updates module documentation

**When to run**:
- After major code changes
- Before planning new features
- Weekly (automated)

---

### Search

**Search for items**:
```bash
python3 product-management/_system/scripts/search.py "export"
```

**Search by type**:
```bash
python3 product-management/_system/scripts/search.py "inventory" --type FEAT
```

**Search by status**:
```bash
python3 product-management/_system/scripts/search.py "" --status in-progress
```

---

### ID Management

**Generate ID**:
```bash
python3 product-management/_system/scripts/id-manager.py generate FEAT
```

**Register item**:
```bash
python3 product-management/_system/scripts/id-manager.py register IDEA "Export inventory" inbox --tags inventory,export
```

**Get item**:
```bash
python3 product-management/_system/scripts/id-manager.py get TERP-FEAT-001
```

**List items**:
```bash
python3 product-management/_system/scripts/id-manager.py list --type FEAT --status in-progress
```

**Get stats**:
```bash
python3 product-management/_system/scripts/id-manager.py stats
```

---

## Best Practices

### 1. Always Use References

**Good**:
```
"Build [TERP-IDEA-042]"
"Does [TERP-FEAT-015] follow [@bible]?"
```

**Bad**:
```
"Build that export idea"
"Does the filter feature follow the protocols?"
```

---

### 2. One Chat Per Feature

**Recommended**:
- New chat for each feature
- Focused, clear scope
- Easy to pause/resume
- Parallel development

**Alternative** (solo work):
- One long-running dev chat
- Load new context for each feature

---

### 3. Update Progress Regularly

Dev agents should update `progress.md`:
- After each milestone
- When blocked
- When making decisions
- At end of session

---

### 4. Run QA Before Merge

Always QA before merging:
- Level 2 for small changes
- Level 3 for most features
- Level 4 before production

---

### 5. Keep Context Current

Run codebase analysis:
- After major changes
- Before planning sessions
- Weekly

---

### 6. Use Appropriate QA Level

**Level 2** (5-10 min):
- Small features
- Bug fixes
- UI tweaks

**Level 3** (20-30 min):
- Medium features
- New user flows
- Most features

**Level 4** (1-2 hours):
- Major features
- Production releases
- Monthly validation

---

## Troubleshooting

### "Can't find [ID]"

**Solution**:
```bash
# Check if ID exists
python3 product-management/_system/scripts/id-manager.py get TERP-FEAT-001

# Search for it
python3 product-management/_system/scripts/search.py "FEAT-001"

# Rebuild search index
python3 product-management/_system/scripts/search.py
```

---

### "Context file not loading"

**Check path**:
```bash
ls -la /home/ubuntu/TERP/product-management/_system/chat-contexts/
```

**Verify content**:
```bash
cat /home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md
```

---

### "Codebase analysis slow"

**Check cache**:
```bash
cat /home/ubuntu/TERP/product-management/_system/cache/analysis-cache.json
```

**Cache hit rate should be >80% after first run**

If low, cache might be corrupted:
```bash
rm /home/ubuntu/TERP/product-management/_system/cache/analysis-cache.json
python3 product-management/_system/scripts/analyze-codebase.py
```

---

### "Dev agent not following protocols"

**Ensure dev-brief.md includes**:
- Link to [@bible]
- Link to [@context]
- Clear instructions
- All required context

**Check dev-brief**:
```bash
cat /home/ubuntu/TERP/product-management/features/in-progress/TERP-FEAT-*/dev-brief.md
```

---

## Getting Help

### Documentation

- **Reference System**: `_system/REFERENCE_SYSTEM.md`
- **Chat Contexts**: `_system/chat-contexts/`
- **Templates**: `_system/templates/`

### Quick Reference

**Start Idea Inbox**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md
```

**Start Feature Planning**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/planning-context.md
```

**Start Development**:
```
Implement [TERP-FEAT-XXX]
Context: /home/ubuntu/TERP/product-management/features/planned/TERP-FEAT-XXX-.../dev-brief.md
```

**Start QA**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/qa-agent-context.md

QA [TERP-FEAT-XXX] at Level 3
```

---

## System Maintenance

### Daily (Automated)
- Codebase analysis refresh
- Search index update

### Weekly
- Review roadmap
- Check for stale features
- Clean up completed items

### Monthly
- Full system QA (Level 4)
- Archive old items
- Review and update templates

---

**You're all set! Start capturing ideas and building features.**

**First step**: Open a new Manus chat and load the Idea Inbox context!

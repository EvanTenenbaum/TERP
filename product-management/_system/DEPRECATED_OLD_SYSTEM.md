# ⚠️ DEPRECATED: Old PM System

**This file marks the deprecation of the old FEAT/IDEA/BUG-based PM system.**

---

## What Was Deprecated

The following files and structure have been **DEPRECATED** and removed:

### Deprecated Files:
- `_system/id-registry.json` - Old registry using FEAT/IDEA/BUG types
- `_system/config/system.json` - Old configuration with features/ideas/bugs paths

### Deprecated Directory Structure:
```
product-management/
├── features/     ❌ DEPRECATED
├── ideas/        ❌ DEPRECATED
├── bugs/         ❌ DEPRECATED
└── prds/         ❌ DEPRECATED
```

### Deprecated ID Types:
- `TERP-FEAT-XXX` ❌ No longer used
- `TERP-IDEA-XXX` ❌ No longer used
- `TERP-BUG-XXX` ❌ No longer used
- `TERP-IMPROVE-XXX` ❌ No longer used
- `TERP-TECH-XXX` ❌ No longer used

---

## Use the NEW System Instead

### NEW System Location:
`/home/ubuntu/TERP/product-management/`

### NEW ID Type:
- `TERP-INIT-XXX` ✅ Use this for ALL initiatives

### NEW Directory Structure:
```
product-management/
├── initiatives/           ✅ All work goes here
│   ├── TERP-INIT-001/
│   ├── TERP-INIT-002/
│   └── registry.json      ✅ Single source of truth
└── _system/scripts/       ✅ All management scripts
    ├── initiative-manager.py
    ├── status-tracker.py
    ├── pm-evaluator.py
    └── system-context.py
```

### NEW Scripts:
```bash
# Create initiative
python3 _system/scripts/initiative-manager.py create "Title" --tags tag1 tag2

# Update status
python3 _system/scripts/status-tracker.py update TERP-INIT-XXX --status in-progress

# Get next task
python3 _system/scripts/pm-evaluator.py get-next-task

# Scan codebase
python3 _system/scripts/system-context.py scan
```

---

## Why the Change?

The old system had multiple issues:
1. **Fragmented**: Separate directories for features, ideas, bugs
2. **No workflow**: No clear path from idea → implementation
3. **No automation**: Manual tracking and evaluation
4. **No codebase awareness**: Couldn't detect duplicates
5. **No conflict detection**: Agents could work on conflicting features

The NEW system provides:
1. ✅ **Unified initiatives**: Everything in one place
2. ✅ **Automated workflow**: Auto-evaluation and prioritization
3. ✅ **Codebase awareness**: Scans existing code to prevent duplicates
4. ✅ **Conflict detection**: Identifies overlapping work
5. ✅ **File locking**: Prevents concurrent editing conflicts
6. ✅ **QA automation**: Built-in quality checks
7. ✅ **PM oversight**: Complete visibility and control

---

## For Agents with Old Work

If you have work in the old system format (TERP-FEAT-XXX, etc.), you need to migrate it:

### Migration Steps:

1. **Navigate to PM system**:
   ```bash
   cd /home/ubuntu/TERP/product-management
   ```

2. **Create new initiative**:
   ```bash
   python3 _system/scripts/initiative-manager.py create "Your Title" --tags tag1 tag2
   # Note the TERP-INIT-XXX ID
   ```

3. **Copy your documentation**:
   ```bash
   INIT_ID="TERP-INIT-XXX"  # Your new ID
   
   # Copy your PRD/overview
   cp your-old-docs/overview.md initiatives/$INIT_ID/overview.md
   
   # Copy supporting docs
   mkdir -p initiatives/$INIT_ID/docs
   cp your-old-docs/* initiatives/$INIT_ID/docs/
   ```

4. **Submit for evaluation**:
   ```bash
   python3 _system/scripts/status-tracker.py update $INIT_ID --status pending_review
   ```

5. **Read feedback**:
   ```bash
   cat pm-evaluation/feedback/${INIT_ID}-feedback.md
   ```

---

## Date Deprecated

**November 3, 2025**

---

## Questions?

Read the documentation:
- `START_HERE.md` - Quick navigation guide
- `QUICK_START_V2.md` - Getting started with new system
- `AUTONOMOUS_WORKFLOW_GUIDE_V2.md` - Complete workflow guide

Or use the agent prompts:
- `_system/chat-contexts/INITIATIVE_CREATOR_AGENT_PROMPT.md`
- `_system/chat-contexts/PM_AGENT_PROMPT.md`
- `_system/chat-contexts/IMPLEMENTATION_AGENT_PROMPT.md`

---

**The old system is GONE. Use the new INIT-based system only.** ✅

# ⚠️ START HERE - Product Management System

**If you're an agent looking to migrate work or create initiatives, READ THIS FIRST!**

---

## ✅ You're in the RIGHT Place

This is the **new, active Product Management system** for TERP. All initiative creation, evaluation, and roadmap management happens here.

---

## 🚀 Quick Start for Agents

### If you're migrating existing work:

1. **Navigate here**: `/home/ubuntu/TERP/product-management`
2. **Create your initiative**:
   ```bash
   python3 _system/scripts/initiative-manager.py create "Your Title" --tags tag1 tag2
   ```
3. **Follow the self-migration prompt** you were given

### If you're the PM Agent:

1. **Load the PM Agent prompt**: `_system/chat-contexts/pm-agent-context.md`
2. **Start by refreshing context**:
   ```bash
   python3 _system/scripts/system-context.py scan
   ```

### If you're an Implementation Agent:

1. **Load the Implementation Agent prompt**: `_system/chat-contexts/implementation-agent-context.md`
2. **Get your next task**:
   ```bash
   python3 _system/scripts/pm-evaluator.py get-next-task
   ```

---

## 📁 Directory Structure

```
product-management/
├── START_HERE.md              ← You are here
├── README.md                  ← System overview
├── AUTONOMOUS_WORKFLOW_GUIDE_V2.md  ← Complete workflow guide
├── CODEBASE_AWARENESS_GUIDE.md      ← How PM knows what's built
├── initiatives/               ← All initiatives live here
│   └── TERP-INIT-XXX/        ← Individual initiative directories
├── pm-evaluation/             ← Evaluation reports and feedback
│   ├── evaluations/
│   └── feedback/
└── _system/                   ← System tools and scripts
    ├── scripts/               ← All the Python scripts
    │   ├── initiative-manager.py  ← Create/manage initiatives
    │   ├── status-tracker.py      ← Track progress
    │   ├── pm-auto-evaluator.py   ← Auto-evaluate initiatives
    │   ├── pm-evaluator.py        ← Manual PM operations
    │   ├── system-context.py      ← Scan codebase
    │   ├── file-locker.py         ← Prevent conflicts
    │   ├── qa-checklist.py        ← Quality assurance
    │   └── migrate-prd.py         ← Migration helper
    └── chat-contexts/         ← Agent prompts
        ├── initiative-creator-agent-context.md
        ├── pm-agent-context.md
        ├── implementation-agent-context.md
        └── migration-agent-context.md
```

---

## ❌ Common Mistakes to Avoid

### ❌ DON'T look for `features/`, `ideas/`, or `bugs/` directories
Those were part of an old system. They don't exist in this structure.

### ❌ DON'T create files in random locations
All initiative documentation goes in `initiatives/TERP-INIT-XXX/`

### ❌ DON'T skip the scripts
The scripts handle ID generation, conflict detection, and evaluation automatically.

---

## 🆘 If You're Confused

1. **Check which directory you're in**:
   ```bash
   pwd
   # Should be: /home/ubuntu/TERP/product-management
   ```

2. **List the available scripts**:
   ```bash
   ls -la _system/scripts/
   ```

3. **Read the workflow guide**:
   ```bash
   cat AUTONOMOUS_WORKFLOW_GUIDE_V2.md
   ```

---

## 📞 Need Help?

- **For migration**: See `_system/chat-contexts/migration-agent-context.md`
- **For PM operations**: See `_system/chat-contexts/pm-agent-context.md`
- **For implementation**: See `_system/chat-contexts/implementation-agent-context.md`

---

**All scripts are in `_system/scripts/`. All prompts are in `_system/chat-contexts/`. All initiatives are in `initiatives/`.**

**You're in the right place. Just follow the instructions!** 🚀

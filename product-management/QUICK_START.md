# Quick Start Guide

**Get started with the Product Management System in 5 minutes**

---

## Your First Idea (30 seconds)

**1. Open a new Manus chat**

**2. Copy-paste this**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md
```

**3. Say your idea**:
```
"Users want to export inventory to CSV"
```

**Done!** The system captured it with a unique ID.

---

## Your First Feature (2 minutes)

**1. Open a new Manus chat**

**2. Copy-paste this**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/planning-context.md
```

**3. Build the idea**:
```
"Build [TERP-IDEA-001]"
```

(Use the ID from step 1)

**Done!** You now have a complete PRD, technical spec, and dev-brief.

---

## Your First Development (5 minutes)

**1. Open a new Manus chat**

**2. Copy-paste this** (replace with your feature ID):
```
Implement [TERP-FEAT-001]

Context: /home/ubuntu/TERP/product-management/features/planned/TERP-FEAT-001-export-inventory-csv/dev-brief.md
```

(Find the exact path by running: `ls product-management/features/planned/`)

**Done!** The dev agent is building your feature.

---

## Your First QA (3 minutes)

**1. Open a new Manus chat**

**2. Copy-paste this**:
```
Load context: /home/ubuntu/TERP/product-management/_system/chat-contexts/qa-agent-context.md

QA [TERP-FEAT-001] at Level 3
```

**Done!** Comprehensive QA report generated.

---

## Reference Cheat Sheet

**In any chat, use these references**:

| Reference | What it means |
|-----------|---------------|
| `[TERP-FEAT-015]` | Feature #15 |
| `[TERP-IDEA-042]` | Idea #42 |
| `[TERP-BUG-008]` | Bug #8 |
| `[@bible]` | Development protocols |
| `[@context]` | Project context |
| `[@roadmap]` | Current roadmap |
| `[@module/inventory]` | Inventory module docs |

**Examples**:
```
"Build [TERP-IDEA-042]"
"What's the status of [TERP-FEAT-015]?"
"Does this follow [@bible]?"
"Check [@module/inventory] for patterns"
```

---

## Chat Context Paths (Bookmark These)

**Idea Inbox**:
```
/home/ubuntu/TERP/product-management/_system/chat-contexts/inbox-context.md
```

**Feature Planning**:
```
/home/ubuntu/TERP/product-management/_system/chat-contexts/planning-context.md
```

**QA Agent**:
```
/home/ubuntu/TERP/product-management/_system/chat-contexts/qa-agent-context.md
```

---

## Common Commands

**Search for something**:
```bash
python3 product-management/_system/scripts/search.py "export"
```

**List all features**:
```bash
python3 product-management/_system/scripts/id-manager.py list --type FEAT
```

**Get stats**:
```bash
python3 product-management/_system/scripts/id-manager.py stats
```

**Refresh codebase analysis**:
```bash
python3 product-management/_system/scripts/analyze-codebase.py
```

---

## Need More Help?

**Full documentation**: `product-management/USER_GUIDE.md`

**Reference system**: `product-management/_system/REFERENCE_SYSTEM.md`

**Chat contexts**: `product-management/_system/chat-contexts/`

---

**That's it! You're ready to manage TERP development like a pro.**

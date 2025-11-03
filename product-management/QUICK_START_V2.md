# Quick Start Guide - Multi-Agent PM System

**Get started with the new multi-agent development and project management system in 5 minutes.**

---

## What's New?

The TERP Product Management System now supports:

✅ **Multiple development agents** working in parallel  
✅ **Automated status tracking** - no manual check-ins needed  
✅ **Real-time PM dashboard** - see all work at a glance  
✅ **Structured evaluation workflow** - clear prioritization and decision-making  
✅ **Conflict detection** - identify overlaps before they become problems

---

## For Development Agents

### 1. Load Your Context

When starting a new chat session:

```
Load the instructions from: 
product-management/_system/chat-contexts/dev-agent-context.md
```

### 2. Create an Initiative (2 minutes)

```bash
cd /home/ubuntu/TERP

python3 product-management/_system/scripts/initiative-manager.py create \
  "Add Dark Mode Support" \
  --tags "ui,theme,accessibility"
```

**Output**: Creates `TERP-INIT-001` with folder structure

### 3. Document It (3 minutes)

Edit the files in `product-management/initiatives/TERP-INIT-001/`:

- **overview.md** - Describe the initiative
- **features/** - Add feature specifications
- **docs/** - Add technical documentation

### 4. Submit for Review (30 seconds)

```bash
python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-001 \
  --status pending_review \
  --message "Initiative documented and ready for PM evaluation"
```

### 5. Implement (After Approval)

```bash
# Start work
python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-001 \
  --status in-progress \
  --message "Beginning implementation"

# As you work, update progress
python3 product-management/_system/scripts/status-tracker.py complete-task TERP-INIT-001 \
  "Added theme toggle component"

python3 product-management/_system/scripts/status-tracker.py set-progress TERP-INIT-001 35 \
  --message "UI components complete, starting state management"

# Add artifacts
python3 product-management/_system/scripts/status-tracker.py add-artifact TERP-INIT-001 \
  client/src/components/ThemeToggle.tsx \
  --description "Theme toggle component"

# Complete
python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-001 \
  --status completed \
  --message "All features implemented and tested"
```

---

## For the Project Manager Agent

### 1. Load Your Context

When starting a new chat session:

```
Load the instructions from: 
product-management/_system/chat-contexts/pm-agent-context.md
```

### 2. Check the Dashboard (30 seconds)

```bash
cd /home/ubuntu/TERP

python3 product-management/_system/scripts/status-tracker.py dashboard
```

**Shows**:
- All initiatives and their status
- Progress percentages
- Recent activity across all work

### 3. Review New Initiatives (2 minutes)

```bash
# See what's waiting for review
python3 product-management/_system/scripts/pm-evaluator.py list-inbox

# Create an evaluation
python3 product-management/_system/scripts/pm-evaluator.py create-evaluation TERP-INIT-001
```

### 4. Complete Evaluation (10-15 minutes)

Edit the generated evaluation file in `product-management/pm-evaluation/evaluations/`

Fill in:
- Executive summary and recommendation
- Scope analysis (complexity, risk)
- Dependencies
- Conflicts
- Priority assessment
- Effort estimation
- Build order recommendation

### 5. Make Decision (1 minute)

```bash
# Approve
python3 product-management/_system/scripts/initiative-manager.py update TERP-INIT-001 \
  --status approved \
  --priority high

# Or defer
python3 product-management/_system/scripts/initiative-manager.py update TERP-INIT-001 \
  --status deferred
```

### 6. Generate Roadmap (5 minutes)

```bash
python3 product-management/_system/scripts/pm-evaluator.py generate-roadmap
```

Edit `product-management/pm-evaluation/roadmap/current.md` to complete the roadmap.

---

## Key Commands Cheat Sheet

### Development Agents

```bash
# Create initiative
initiative-manager.py create "Title" --tags tag1,tag2

# Update status
status-tracker.py update INIT-ID --status STATUS --message "Message"

# Complete task
status-tracker.py complete-task INIT-ID "Task description"

# Set progress
status-tracker.py set-progress INIT-ID PERCENT --message "Message"

# Add artifact
status-tracker.py add-artifact INIT-ID /path/to/file --description "Description"
```

### PM Agent

```bash
# View dashboard
status-tracker.py dashboard

# List inbox
pm-evaluator.py list-inbox

# Create evaluation
pm-evaluator.py create-evaluation INIT-ID

# Update initiative
initiative-manager.py update INIT-ID --status STATUS --priority PRIORITY

# Generate roadmap
pm-evaluator.py generate-roadmap
```

---

## Example Workflow

### Scenario: Dev Agent Creates and Implements Initiative

```bash
# 1. Create
python3 initiative-manager.py create "Real-time Notifications" --tags notifications,websocket

# 2. Document (edit the files)
# 3. Submit
python3 status-tracker.py update TERP-INIT-002 --status pending_review

# ... PM approves ...

# 4. Start work
python3 status-tracker.py update TERP-INIT-002 --status in-progress

# 5. Track progress
python3 status-tracker.py complete-task TERP-INIT-002 "Set up WebSocket server"
python3 status-tracker.py set-progress TERP-INIT-002 30

python3 status-tracker.py complete-task TERP-INIT-002 "Implemented notification service"
python3 status-tracker.py set-progress TERP-INIT-002 60

python3 status-tracker.py complete-task TERP-INIT-002 "Added UI notifications"
python3 status-tracker.py set-progress TERP-INIT-002 90

# 6. Complete
python3 status-tracker.py update TERP-INIT-002 --status completed
```

### Scenario: PM Agent Monitors and Evaluates

```bash
# 1. Check dashboard
python3 status-tracker.py dashboard

# Output shows:
# - TERP-INIT-001: 45% complete, in-progress
# - TERP-INIT-002: Pending review

# 2. Evaluate new initiative
python3 pm-evaluator.py create-evaluation TERP-INIT-002

# 3. Complete evaluation (edit the file)

# 4. Approve
python3 initiative-manager.py update TERP-INIT-002 --status approved --priority high

# 5. Update roadmap
python3 pm-evaluator.py generate-roadmap
# Edit the roadmap file
```

---

## Next Steps

- **Development Agents**: Read the full guide at `dev-agent-context.md`
- **PM Agent**: Read the full guide at `pm-agent-context.md`
- **Everyone**: See `USER_GUIDE_V2.md` for complete documentation
- **Architecture**: See `SYSTEM_DESIGN.md` for technical details

---

## Tips

✅ **Update frequently** - The more you update, the better visibility everyone has  
✅ **Be specific** - Clear messages help everyone understand progress  
✅ **Check the dashboard** - PM agent should check multiple times per day  
✅ **Document thoroughly** - Good documentation makes evaluation faster  
✅ **Trust the process** - The system works best when everyone follows the workflow

---

**Ready to start? Pick your role and dive in!**

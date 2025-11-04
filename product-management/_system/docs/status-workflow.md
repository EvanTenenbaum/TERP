# Initiative Status Workflow

## Status Definitions

### 1. `approved`
**Definition**: Initiative has been evaluated, approved by PM, and is ready to be assigned to an agent.

**Characteristics**:
- In the queue, waiting for an agent
- All dependencies resolved
- Roadmap position determined

**Transitions To**: `in-progress`

---

### 2. `in-progress`
**Definition**: An agent is actively working on implementing the initiative.

**Characteristics**:
- Assigned to a specific agent
- Agent is writing code, making commits
- Work is happening on a feature branch

**Transitions To**: `ready-to-deploy`

**How to Transition**:
```bash
# Agent marks work complete
python3 simple-queue.py complete <agent_id> <init_id>
```

---

### 3. `ready-to-deploy`
**Definition**: Code is complete, reviewed, approved, and ready for deployment to production.

**Characteristics**:
- All code merged to main branch
- Passed code review
- Ready for production deployment
- Waiting for deployment action

**Transitions To**: `deployed`

**How to Transition**:
```bash
# PM or deployment system marks as deployed
python3 simple-queue.py set-status <init_id> deployed
```

---

### 4. `deployed`
**Definition**: Code has been deployed to production and is live.

**Characteristics**:
- Running in production environment
- Accessible to users
- Waiting for QA verification

**Transitions To**: `qa-verified`

**How to Transition**:
```bash
# QA agent or PM marks as QA verified
python3 simple-queue.py set-status <init_id> qa-verified
```

---

### 5. `qa-verified`
**Definition**: Initiative has been deployed and verified through QA testing. Fully complete.

**Characteristics**:
- Deployed to production
- QA testing completed
- All acceptance criteria met
- Initiative lifecycle complete

**Transitions To**: None (terminal state)

---

## Status Flow Diagram

```
approved
   ↓
   ↓ (agent calls get-next)
   ↓
in-progress
   ↓
   ↓ (agent calls complete)
   ↓
ready-to-deploy
   ↓
   ↓ (deployment system or PM)
   ↓
deployed
   ↓
   ↓ (QA agent or PM)
   ↓
qa-verified (DONE)
```

---

## Commands

### For Implementation Agents

```bash
# Get next task (transitions from approved → in-progress)
cd /home/ubuntu/TERP/product-management
python3 _system/scripts/simple-queue.py get-next <agent_id>

# Mark work complete (transitions from in-progress → ready-to-deploy)
python3 _system/scripts/simple-queue.py complete <agent_id> <init_id>
```

### For PM Agent or Deployment System

```bash
# Mark as deployed (transitions from ready-to-deploy → deployed)
python3 _system/scripts/simple-queue.py set-status <init_id> deployed

# Mark as QA verified (transitions from deployed → qa-verified)
python3 _system/scripts/simple-queue.py set-status <init_id> qa-verified

# Check current status
python3 _system/scripts/simple-queue.py status
```

---

## Dashboard Display

Each status should have a distinct visual indicator:

| Status | Color | Badge | Icon |
|--------|-------|-------|------|
| `approved` | Green | Outline | ✓ |
| `in-progress` | Blue | Solid | ⟳ |
| `ready-to-deploy` | Purple | Solid | ⬆ |
| `deployed` | Orange | Solid | ☁ |
| `qa-verified` | Green | Solid | ✓✓ |

---

## Registry Schema

```json
{
  "initiatives": [
    {
      "id": "TERP-INIT-005",
      "title": "Inventory System Stability",
      "status": "in-progress",
      "assigned_to": "agent-001",
      "created_at": "2025-11-03T00:00:00Z",
      "started_at": "2025-11-03T12:00:00Z",
      "completed_at": null,
      "deployed_at": null,
      "qa_verified_at": null,
      "priority": "high"
    }
  ]
}
```

---

## Automated Status Updates

### When Agent Gets Next Task
- Status: `approved` → `in-progress`
- Set: `assigned_to`, `started_at`

### When Agent Completes Work
- Status: `in-progress` → `ready-to-deploy`
- Set: `completed_at`

### When Deployed
- Status: `ready-to-deploy` → `deployed`
- Set: `deployed_at`

### When QA Verified
- Status: `deployed` → `qa-verified`
- Set: `qa_verified_at`

---

## Benefits

1. **Visibility**: Clear view of where each initiative is in the lifecycle
2. **Accountability**: Know who's responsible at each stage
3. **Metrics**: Track time spent in each stage
4. **Bottleneck Detection**: Identify where initiatives get stuck
5. **Deployment Tracking**: Know what's deployed vs. what's still in development
6. **QA Coordination**: Clear handoff between development and QA

---

## Implementation Notes

- All status transitions should update both `registry.json` and `dashboard.json`
- Status transitions should be logged for audit trail
- Dashboard should auto-refresh to show latest statuses
- Agents should check current status before starting work

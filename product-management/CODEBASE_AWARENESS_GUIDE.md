# Codebase Awareness System Guide

**Purpose**: Enable the PM Agent to maintain complete context of both current system state and future initiatives.

---

## Overview

The Codebase Awareness System is a critical enhancement that gives the PM Agent a "memory" of what has already been built. It prevents duplicate work, improves conflict detection, and enables more strategic decision-making.

---

## How It Works

### 1. System Context Scanner (`system-context.py`)

This script is the heart of the system. It scans the entire TERP codebase and key documentation to build a comprehensive picture of the current state.

**What It Scans**:
- **Code**: `client/` and `server/` directories for routes, API endpoints, and components
- **Docs**: `PROJECT_CONTEXT.md`, `CHANGELOG.md`, `known-issues.md`, and `DEVELOPMENT_PROTOCOLS.md`

**What It Produces**:
- `_system/context/system-state.json`: A machine-readable inventory of all features, components, APIs, and tech stack.
- `_system/context/system-summary.md`: A human-readable summary of the current system state.

**How to Use**:
```bash
# Run a full scan to update the context
python3 _system/scripts/system-context.py scan

# View the raw JSON state
python3 _system/scripts/system-context.py view

# View the human-readable summary
python3 _system/scripts/system-context.py summary
```

---

### 2. Enhanced PM Auto-Evaluator

The `pm-auto-evaluator.py` script now uses the system context to perform smarter evaluations.

**New Workflow**:
1. **Load System Context**: Before evaluating an initiative, it loads `system-state.json`.
2. **Check for Duplicates**: It compares the initiative title and keywords against the existing feature inventory.
3. **Flag Duplicates**: If a potential duplicate is found, it adds a "duplicates" section to the evaluation report.

**Example Evaluation Output**:
```
## Codebase Duplication Check

⚠️ **Potential duplicates found in existing codebase:**

- **Route**: `/login` (Confidence: medium)
  - Location: `client/src/app/login/page.tsx`
- **Component**: `AuthForm` (Confidence: low)

**Recommendation**: Review existing implementation before proceeding.
```

---

### 3. Updated PM Agent Workflow

The PM Agent prompt has been updated to make codebase awareness a core responsibility.

**New Responsibilities**:
1. **Maintain Complete Context**: The PM Agent is now responsible for knowing both what is planned (initiatives) and what is built (codebase).

2. **Context Refresh**: The agent will run `system-context.py scan` regularly to keep its knowledge up-to-date.

3. **Smarter Answers**: The agent can now answer questions like:
   - "What features do we currently have?"
   - "Do we already have authentication?"
   - "Is this new initiative going to conflict with our existing dashboard?"

**New Workflow for Manual Reviews**:
- When a review is required, the PM Agent will now:
  1. Check for conflicts with other initiatives
  2. **Check for duplicates in the existing codebase**
  3. Make a more informed decision (Approve, Reject, or **Merge**)

---

## Benefits of This System

1. **Prevents Redundant Work**: Stops agents from building features that already exist.
2. **Improves Integration**: Ensures new features are designed to work with the existing architecture.
3. **Enhances Strategic Planning**: The PM can make decisions based on a complete picture of the system.
4. **Reduces Technical Debt**: By being aware of known issues, the PM can prioritize initiatives that address them.
5. **Increases Efficiency**: Less time wasted on discovery and rework.

---

## How to Use the Enhanced PM Agent

1. **Start a PM Agent Chat**: Use the updated `pm-agent-context.md` prompt.

2. **Refresh Context**: Start by asking the agent to refresh its context:
   - "Scan the codebase to get the latest system state."
   - The agent will run `system-context.py scan`.

3. **Ask Context-Aware Questions**:
   - "What are our current API endpoints?"
   - "Show me the summary of the system state."
   - "Does the new initiative for a user profile page conflict with anything we already have?"

4. **Evaluate Initiatives**:
   - When a new initiative is submitted, the auto-evaluator will now automatically check for duplicates.
   - If a review is required, the PM Agent will have all the information it needs to make a smart decision.

---

This enhancement transforms the PM Agent from a simple task manager into a true strategic partner with a comprehensive understanding of the entire TERP ecosystem.

#!/usr/bin/env python3
"""
PM Evaluator - Tools for project manager agent to evaluate initiatives

Usage:
    python3 pm-evaluator.py list-inbox
    python3 pm-evaluator.py create-evaluation TERP-INIT-001
    python3 pm-evaluator.py list-evaluations
    python3 pm-evaluator.py generate-roadmap
    python3 pm-evaluator.py analyze-dependencies
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import argparse

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
PM_EVAL_DIR = PM_ROOT / "pm-evaluation"
INBOX_DIR = PM_EVAL_DIR / "inbox"
EVALUATIONS_DIR = PM_EVAL_DIR / "evaluations"
ROADMAP_DIR = PM_EVAL_DIR / "roadmap"
DEPENDENCIES_FILE = PM_EVAL_DIR / "dependencies.json"


def load_dependencies():
    """Load the dependencies graph"""
    if not DEPENDENCIES_FILE.exists():
        return {
            "graph": {},
            "critical_path": [],
            "last_updated": datetime.utcnow().isoformat() + "Z"
        }
    
    with open(DEPENDENCIES_FILE, 'r') as f:
        return json.load(f)


def save_dependencies(deps):
    """Save the dependencies graph"""
    deps["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(DEPENDENCIES_FILE, 'w') as f:
        json.dump(deps, f, indent=2)


def list_inbox():
    """List initiatives in the PM inbox"""
    if not INBOX_DIR.exists():
        print("No initiatives in inbox.")
        return
    
    initiatives = []
    for item in INBOX_DIR.iterdir():
        if item.is_dir():
            manifest_file = item / "manifest.json"
            if manifest_file.exists():
                with open(manifest_file, 'r') as f:
                    manifest = json.load(f)
                    initiatives.append(manifest)
    
    if not initiatives:
        print("No initiatives in inbox.")
        return
    
    print(f"\n{'='*80}")
    print(f"PM Evaluation Inbox - {len(initiatives)} initiative(s) pending review")
    print(f"{'='*80}\n")
    
    for init in initiatives:
        print(f"ID: {init['id']}")
        print(f"Title: {init['title']}")
        print(f"Created: {init['created_at']}")
        print(f"Created By: {init['created_by']}")
        if init.get('tags'):
            print(f"Tags: {', '.join(init['tags'])}")
        print("-" * 80)
    
    print(f"\n💡 Next step: Create evaluation for each initiative")
    print(f"   python3 pm-evaluator.py create-evaluation TERP-INIT-XXX\n")


def create_evaluation_template(init_id):
    """Create an evaluation template for an initiative"""
    # Find the initiative (could be in inbox or initiatives dir)
    init_dir = INBOX_DIR / init_id
    if not init_dir.exists():
        init_dir = INITIATIVES_DIR / init_id
    
    if not init_dir.exists():
        print(f"❌ Initiative {init_id} not found")
        return
    
    manifest_file = init_dir / "manifest.json"
    if not manifest_file.exists():
        print(f"❌ Manifest not found for {init_id}")
        return
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    # Generate evaluation ID
    eval_files = list(EVALUATIONS_DIR.glob("TERP-EVAL-*.md"))
    eval_num = len(eval_files) + 1
    eval_id = f"TERP-EVAL-{eval_num:03d}"
    
    # Create evaluation document
    evaluation = f"""# PM Evaluation: {init_id}

**Evaluation ID**: {eval_id}  
**Initiative**: {manifest['title']}  
**Evaluated By**: PM Agent  
**Date**: {datetime.utcnow().strftime('%Y-%m-%d')}  
**Status**: Draft

---

## Executive Summary

[Provide a 2-3 sentence summary of the initiative and your recommendation]

**Recommendation**: [ ] Approve | [ ] Approve with Conditions | [ ] Defer | [ ] Reject

---

## Initiative Overview

**ID**: {init_id}  
**Title**: {manifest['title']}  
**Created By**: {manifest['created_by']}  
**Created**: {manifest['created_at']}

**Tags**: {', '.join(manifest.get('tags', []))}

[Brief description of what this initiative aims to accomplish]

---

## Scope Analysis

### Features Included
{chr(10).join(f'- {feat}' for feat in manifest.get('features', ['[List features]']))}

### Complexity Assessment
**Level**: [ ] Low | [ ] Medium | [ ] High | [ ] Very High

**Rationale**: [Explain complexity assessment]

### Risk Assessment
**Level**: [ ] Low | [ ] Medium | [ ] High | [ ] Critical

**Key Risks**:
- [Risk 1]
- [Risk 2]

**Mitigation Strategies**:
- [Strategy 1]
- [Strategy 2]

---

## Dependencies Analysis

### This Initiative Depends On
{chr(10).join(f'- {dep}' for dep in manifest.get('dependencies', ['[None identified]']))}

### This Initiative Blocks
- [List initiatives that depend on this one]

### Critical Path Impact
[ ] On critical path | [ ] Not on critical path

**Analysis**: [Explain dependency relationships and critical path impact]

---

## Conflicts & Overlaps

### Conflicts Detected
{chr(10).join(f'- {conf}' for conf in manifest.get('conflicts', ['[None detected]']))}

### Overlapping Work
- [List any overlapping initiatives or features]

### Resolution Recommendations
- [Recommendation 1]
- [Recommendation 2]

---

## Priority Assessment

### Business Value
**Score**: [ ] Low (1-3) | [ ] Medium (4-6) | [ ] High (7-8) | [ ] Critical (9-10)

**Rationale**: [Explain business value assessment]

### Strategic Alignment
**Score**: [ ] Low (1-3) | [ ] Medium (4-6) | [ ] High (7-8) | [ ] Critical (9-10)

**Rationale**: [Explain strategic alignment]

### Urgency
**Score**: [ ] Low (1-3) | [ ] Medium (4-6) | [ ] High (7-8) | [ ] Critical (9-10)

**Rationale**: [Explain urgency]

### Overall Priority
**Calculated Priority**: [Formula: (Business Value × 0.4) + (Strategic Alignment × 0.3) + (Urgency × 0.3)]

**Priority Level**: [ ] Low | [ ] Medium | [ ] High | [ ] Critical

---

## Effort Estimation

### Development Effort
**Estimate**: [X hours/days/weeks]

**Breakdown**:
- Backend: [X hours]
- Frontend: [X hours]
- Testing: [X hours]
- Documentation: [X hours]

### Resource Requirements
- **Developers**: [X]
- **Designers**: [X]
- **QA**: [X]
- **Other**: [Specify]

---

## Build Order Recommendation

### Recommended Sequence
**Position in Roadmap**: [e.g., "Sprint 3, Item 2"]

**Rationale**: [Explain why this position makes sense]

### Prerequisites
Before starting this initiative:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

### Successors
After completing this initiative, these become unblocked:
- [Initiative 1]
- [Initiative 2]

---

## Implementation Considerations

### Technical Considerations
- [Consideration 1]
- [Consideration 2]

### Integration Points
- [Integration point 1]
- [Integration point 2]

### Testing Requirements
- [Requirement 1]
- [Requirement 2]

---

## Conditions & Constraints

### Conditions for Approval
- [ ] [Condition 1]
- [ ] [Condition 2]

### Constraints
- [Constraint 1]
- [Constraint 2]

### Success Criteria
- [Criterion 1]
- [Criterion 2]

---

## Alternative Approaches

### Alternative 1: [Name]
**Description**: [Brief description]  
**Pros**: [List pros]  
**Cons**: [List cons]

### Alternative 2: [Name]
**Description**: [Brief description]  
**Pros**: [List pros]  
**Cons**: [List cons]

### Recommended Approach
[State which approach is recommended and why]

---

## Decision

**Final Recommendation**: [ ] Approve | [ ] Approve with Conditions | [ ] Defer | [ ] Reject

**Rationale**: [Provide clear rationale for the decision]

**Conditions** (if applicable):
- [Condition 1]
- [Condition 2]

**Next Steps**:
- [ ] [Action 1]
- [ ] [Action 2]

---

## Notes

[Any additional notes or context]

---

**Evaluation completed**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  
**Evaluator**: PM Agent
"""
    
    eval_file = EVALUATIONS_DIR / f"{eval_id}.md"
    with open(eval_file, 'w') as f:
        f.write(evaluation)
    
    print(f"✅ Created evaluation template: {eval_id}")
    print(f"   Initiative: {init_id}")
    print(f"   Location: {eval_file}")
    print(f"\n📝 Next steps:")
    print(f"   1. Complete the evaluation in {eval_file}")
    print(f"   2. Update initiative status based on decision")
    print(f"   3. Update roadmap if approved")


def list_evaluations():
    """List all PM evaluations"""
    if not EVALUATIONS_DIR.exists():
        print("No evaluations found.")
        return
    
    eval_files = sorted(EVALUATIONS_DIR.glob("TERP-EVAL-*.md"))
    
    if not eval_files:
        print("No evaluations found.")
        return
    
    print(f"\n{'='*80}")
    print(f"PM Evaluations - {len(eval_files)} evaluation(s)")
    print(f"{'='*80}\n")
    
    for eval_file in eval_files:
        print(f"📄 {eval_file.name}")
        # Try to extract initiative ID from first few lines
        with open(eval_file, 'r') as f:
            lines = f.readlines()[:10]
            for line in lines:
                if "Initiative:" in line or "TERP-INIT-" in line:
                    print(f"   {line.strip()}")
                    break
        print()


def generate_roadmap():
    """Generate a roadmap from evaluations"""
    print(f"\n{'='*80}")
    print(f"Generating Roadmap from Evaluations")
    print(f"{'='*80}\n")
    
    # This is a template - PM agent will fill in details
    roadmap = f"""# TERP Development Roadmap

**Generated**: {datetime.utcnow().strftime('%Y-%m-%d')}  
**Generated By**: PM Agent  
**Status**: Active

---

## Overview

This roadmap represents the prioritized build order for all approved initiatives, based on PM evaluations considering business value, dependencies, complexity, and strategic alignment.

---

## Critical Path

The following initiatives form the critical path:

1. [TERP-INIT-XXX] - [Title]
2. [TERP-INIT-XXX] - [Title]
3. [TERP-INIT-XXX] - [Title]

---

## Sprint Planning

### Current Sprint (Sprint N)

**Focus**: [Sprint theme]

**Initiatives**:
1. **[TERP-INIT-XXX]** - [Title]
   - Priority: High
   - Estimated Effort: [X days]
   - Status: In Progress
   - Dependencies: None

2. **[TERP-INIT-XXX]** - [Title]
   - Priority: High
   - Estimated Effort: [X days]
   - Status: Planned
   - Dependencies: [TERP-INIT-XXX]

### Next Sprint (Sprint N+1)

**Focus**: [Sprint theme]

**Initiatives**:
1. **[TERP-INIT-XXX]** - [Title]
   - Priority: Medium
   - Estimated Effort: [X days]
   - Status: Planned
   - Dependencies: [TERP-INIT-XXX]

### Future Sprints

**Backlog** (prioritized):
1. [TERP-INIT-XXX] - [Title] (Priority: Medium)
2. [TERP-INIT-XXX] - [Title] (Priority: Medium)
3. [TERP-INIT-XXX] - [Title] (Priority: Low)

---

## Deferred Initiatives

The following initiatives have been deferred:

- **[TERP-INIT-XXX]** - [Title]
  - Reason: [Explanation]
  - Review Date: [Date]

---

## Dependency Graph

```
[TERP-INIT-001]
    ↓
[TERP-INIT-002] → [TERP-INIT-004]
    ↓
[TERP-INIT-003]
```

---

## Resource Allocation

### Current Sprint
- **Developers**: [X] assigned
- **Designers**: [X] assigned
- **QA**: [X] assigned

### Bottlenecks
- [Identify any resource bottlenecks]

---

## Risks & Mitigation

### High-Priority Risks
1. **Risk**: [Description]
   - **Impact**: High
   - **Mitigation**: [Strategy]

2. **Risk**: [Description]
   - **Impact**: Medium
   - **Mitigation**: [Strategy]

---

## Metrics

- **Total Initiatives**: [X]
- **Approved**: [X]
- **In Progress**: [X]
- **Completed**: [X]
- **Deferred**: [X]

---

## Notes

[Any additional context or notes about the roadmap]

---

**Last Updated**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  
**Next Review**: [Date]
"""
    
    roadmap_file = ROADMAP_DIR / "current.md"
    with open(roadmap_file, 'w') as f:
        f.write(roadmap)
    
    print(f"✅ Generated roadmap template: {roadmap_file}")
    print(f"\n📝 Next steps:")
    print(f"   1. Review and complete the roadmap")
    print(f"   2. Share with stakeholders")
    print(f"   3. Update as evaluations are completed")


def analyze_dependencies():
    """Analyze and display dependency relationships"""
    deps = load_dependencies()
    
    print(f"\n{'='*80}")
    print(f"Dependency Analysis")
    print(f"{'='*80}\n")
    
    if not deps.get("graph"):
        print("No dependencies recorded yet.")
        print("\n💡 Dependencies are added during PM evaluation.")
        return
    
    print("Dependency Graph:\n")
    
    for init_id, relationships in deps["graph"].items():
        print(f"{init_id}:")
        
        if relationships.get("depends_on"):
            print(f"  Depends on:")
            for dep in relationships["depends_on"]:
                print(f"    - {dep}")
        
        if relationships.get("blocks"):
            print(f"  Blocks:")
            for blocked in relationships["blocks"]:
                print(f"    - {blocked}")
        
        print()
    
    if deps.get("critical_path"):
        print(f"Critical Path:")
        for i, init_id in enumerate(deps["critical_path"], 1):
            print(f"  {i}. {init_id}")
    
    print(f"\nLast Updated: {deps.get('last_updated', 'Unknown')}")


def get_next_task(agent_id=None):
    """Get the next available task from the roadmap (cross-platform)"""
    # Cross-platform file locking
    try:
        import fcntl
        HAS_FCNTL = True
    except ImportError:
        # Windows doesn't have fcntl, use msvcrt instead
        HAS_FCNTL = False
        try:
            import msvcrt
        except ImportError:
            msvcrt = None

    # Load registry with file lock for atomic operation
    registry_file = INITIATIVES_DIR / "registry.json"
    roadmap_order_file = PM_EVAL_DIR / "roadmap_order.json"

    if not registry_file.exists():
        print("ℹ️  No initiatives in registry")
        return None

    with open(registry_file, 'r+') as f:
        # Acquire exclusive lock (cross-platform)
        if HAS_FCNTL:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        elif msvcrt:
            msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)

        try:
            registry = json.load(f)

            # Load roadmap order if available
            roadmap_order = []
            if roadmap_order_file.exists():
                with open(roadmap_order_file, 'r') as rf:
                    roadmap_data = json.load(rf)
                    roadmap_order = [sprint["initiative_id"] for sprint in roadmap_data.get("sprints", [])]

            # Filter to approved initiatives not in progress
            candidates = []
            for init in registry["initiatives"]:
                if init["status"] != "approved":
                    continue

                # Check if dependencies are satisfied
                # (Simplified - assumes no dependencies for now)
                candidates.append(init)

            if not candidates:
                print("ℹ️  No tasks available")
                return None

            # Sort by roadmap order first, then by priority
            def sort_key(init):
                init_id = init["id"]
                # If in roadmap order, use that position (lower is better)
                if init_id in roadmap_order:
                    return (0, roadmap_order.index(init_id))
                # Otherwise sort by priority
                priority_order = {"high": 3, "medium": 2, "low": 1, None: 0}
                return (1, -priority_order.get(init.get("priority"), 0))

            candidates.sort(key=sort_key)

            # Get top task
            next_task = candidates[0]

            # Update status to in-progress atomically
            for init in registry["initiatives"]:
                if init["id"] == next_task["id"]:
                    init["status"] = "in-progress"
                    if agent_id:
                        init["assigned_to"] = agent_id
                    break

            # Write back
            f.seek(0)
            json.dump(registry, f, indent=2)
            f.truncate()

            print(f"✅ Next task: {next_task['id']}")
            print(f"   Title: {next_task['title']}")
            print(f"   Priority: {next_task.get('priority', 'not set')}")
            if agent_id:
                print(f"   Assigned to: {agent_id}")

            return next_task

        finally:
            # Release lock (cross-platform)
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            elif msvcrt:
                f.seek(0)
                msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)



def main():
    parser = argparse.ArgumentParser(description="PM evaluation tools")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # List inbox
    inbox_parser = subparsers.add_parser('list-inbox', help='List initiatives in PM inbox')
    
    # Create evaluation
    eval_parser = subparsers.add_parser('create-evaluation', help='Create evaluation template')
    eval_parser.add_argument('id', help='Initiative ID (e.g., TERP-INIT-001)')
    
    # List evaluations
    list_eval_parser = subparsers.add_parser('list-evaluations', help='List all evaluations')
    
    # Generate roadmap
    roadmap_parser = subparsers.add_parser('generate-roadmap', help='Generate roadmap template')
    
    # Analyze dependencies
    deps_parser = subparsers.add_parser('analyze-dependencies', help='Analyze dependencies')
    
    # Get next task
    next_task_parser = subparsers.add_parser('get-next-task', help='Get next available task from roadmap')
    next_task_parser.add_argument('--agent-id', help='Agent ID claiming the task')
    
    args = parser.parse_args()
    
    if args.command == 'list-inbox':
        list_inbox()
    
    elif args.command == 'create-evaluation':
        create_evaluation_template(args.id)
    
    elif args.command == 'list-evaluations':
        list_evaluations()
    
    elif args.command == 'generate-roadmap':
        generate_roadmap()
    
    elif args.command == 'analyze-dependencies':
        analyze_dependencies()
    
    elif args.command == 'get-next-task':
        task = get_next_task(args.agent_id if hasattr(args, 'agent_id') else None)
        sys.exit(0 if task else 1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()



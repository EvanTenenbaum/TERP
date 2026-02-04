#!/usr/bin/env python3
"""
Linear Backlog Refactoring Tool

Analyzes and refactors the TERP Linear backlog with consistent naming conventions
that visually organize tasks by priority, blockers, and dependencies.

Usage:
    python3 scripts/linear_backlog_refactor.py analyze
    python3 scripts/linear_backlog_refactor.py refactor --dry-run
    python3 scripts/linear_backlog_refactor.py refactor --execute
"""

import sys
import re
from typing import Dict, List, Any, Optional, Tuple
sys.path.insert(0, '/home/ubuntu/TERP/scripts')
from linear_helpers_v2 import *


# ============================================================================
# NAMING CONVENTION
# ============================================================================

def parse_task_title(title: str) -> Dict[str, Any]:
    """
    Parse a task title into components.
    
    Expected format: [P{priority}] {Phase}-{Sequence}: {Description} {[BLOCKED]} {[→ TER-XX]}
    
    Returns dict with: priority, phase, sequence, description, blocked, dependencies
    """
    result = {
        "priority": None,
        "phase": None,
        "sequence": None,
        "description": title,
        "blocked": False,
        "dependencies": []
    }
    
    # Extract priority [P0], [P1], [P2]
    priority_match = re.match(r'^\[P(\d)\]\s*', title)
    if priority_match:
        result["priority"] = int(priority_match.group(1))
        title = title[priority_match.end():]
    
    # Extract phase and sequence: 0-001, 1-015, 0.A-001
    phase_match = re.match(r'^([\d\.A-Z]+)-(\d+):\s*', title)
    if phase_match:
        result["phase"] = phase_match.group(1)
        result["sequence"] = int(phase_match.group(2))
        title = title[phase_match.end():]
    
    # Extract [BLOCKED] tag
    if '[BLOCKED]' in title:
        result["blocked"] = True
        title = title.replace('[BLOCKED]', '').strip()
    
    # Extract dependency tags [→ TER-XX]
    dep_pattern = r'\[→\s*(TER-\d+(?:,\s*TER-\d+)*)\]'
    dep_matches = re.findall(dep_pattern, title)
    if dep_matches:
        for match in dep_matches:
            deps = [d.strip() for d in match.split(',')]
            result["dependencies"].extend(deps)
        title = re.sub(dep_pattern, '', title).strip()
    
    result["description"] = title.strip()
    return result


def build_task_title(components: Dict[str, Any]) -> str:
    """
    Build a task title from components.
    
    Format: [P{priority}] {Phase}-{Sequence}: {Description} {[BLOCKED]} {[→ TER-XX]}
    """
    parts = []
    
    # Priority prefix
    if components.get("priority") is not None:
        parts.append(f"[P{components['priority']}]")
    
    # Phase and sequence
    if components.get("phase") and components.get("sequence") is not None:
        parts.append(f"{components['phase']}-{components['sequence']:03d}:")
    
    # Description
    parts.append(components["description"])
    
    # Blocked tag
    if components.get("blocked"):
        parts.append("[BLOCKED]")
    
    # Dependencies
    if components.get("dependencies"):
        deps_str = ", ".join(components["dependencies"])
        parts.append(f"[→ {deps_str}]")
    
    return " ".join(parts)


# ============================================================================
# ANALYSIS
# ============================================================================

def analyze_backlog() -> Dict[str, Any]:
    """
    Analyze the current backlog and identify issues.
    
    Returns analysis report with issues and recommendations.
    """
    print("🔍 Analyzing Linear backlog...")
    init()
    
    # Get all backlog tasks
    backlog = get_available_tasks(limit=200)
    
    print(f"   Found {len(backlog)} backlog tasks\n")
    
    issues = {
        "missing_priority": [],
        "missing_phase": [],
        "wrong_milestone": [],
        "inconsistent_naming": [],
        "missing_dependencies": [],
        "potential_blockers": []
    }
    
    for task in backlog:
        task_id = task['identifier']
        title = task['title']
        milestone = task.get('milestone', {}).get('name', 'None')
        labels = task.get('labels', [])
        if isinstance(labels, list) and labels and isinstance(labels[0], dict):
            labels = [l['name'] for l in labels]
        elif not isinstance(labels, list):
            labels = []
        
        # Parse title
        parsed = parse_task_title(title)
        
        # Check for missing priority
        if parsed["priority"] is None:
            issues["missing_priority"].append({
                "id": task_id,
                "title": title,
                "labels": labels
            })
        
        # Check for missing phase
        if parsed["phase"] is None:
            issues["missing_phase"].append({
                "id": task_id,
                "title": title,
                "milestone": milestone
            })
        
        # Check milestone alignment
        if parsed["phase"]:
            expected_milestone = get_milestone_for_phase(parsed["phase"])
            if milestone != expected_milestone and milestone != 'None':
                issues["wrong_milestone"].append({
                    "id": task_id,
                    "title": title,
                    "current_milestone": milestone,
                    "expected_milestone": expected_milestone
                })
        
        # Check for potential blockers (high priority, no blocker tag)
        if parsed["priority"] == 0 and not parsed["blocked"]:
            if any(label.startswith("type:bug") for label in labels):
                issues["potential_blockers"].append({
                    "id": task_id,
                    "title": title,
                    "reason": "P0 bug without blocker status"
                })
    
    return {
        "total_tasks": len(backlog),
        "issues": issues,
        "backlog": backlog
    }


def get_milestone_for_phase(phase: str) -> str:
    """Map phase identifier to milestone name."""
    if phase == "0.A":
        return "Phase 0.A: Golden Flow Specification"
    elif phase == "0":
        return "Phase 0: Critical Blockers"
    elif phase == "1":
        return "Phase 1: Core Flow Restoration"
    elif phase.startswith("2"):
        return "Phase 2"
    else:
        return f"Phase {phase}"


# ============================================================================
# REFACTORING
# ============================================================================

def generate_refactoring_plan(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate a refactoring plan based on analysis.
    
    Returns list of proposed changes.
    """
    print("📋 Generating refactoring plan...\n")
    
    plan = []
    backlog = analysis["backlog"]
    
    # Assign priorities based on labels and milestone
    for task in backlog:
        task_id = task['identifier']
        title = task['title']
        milestone = task.get('milestone', {}).get('name', 'None')
        labels = task.get('labels', [])
        if isinstance(labels, list) and labels and isinstance(labels[0], dict):
            labels = [l['name'] for l in labels]
        elif not isinstance(labels, list):
            labels = []
        priority_obj = task.get('priority', {})
        
        parsed = parse_task_title(title)
        
        # Determine priority if missing
        if parsed["priority"] is None:
            # Infer from Linear priority
            linear_priority = priority_obj.get('name', 'Medium')
            if linear_priority == 'Urgent':
                parsed["priority"] = 0
            elif linear_priority == 'High':
                parsed["priority"] = 1
            else:
                parsed["priority"] = 2
            
            # Boost priority for bugs in Phase 0
            if 'type:bug' in labels and ('Phase 0' in milestone or 'Critical' in milestone):
                parsed["priority"] = 0
        
        # Determine phase if missing
        if parsed["phase"] is None:
            if "Phase 0.A" in milestone:
                parsed["phase"] = "0.A"
            elif "Phase 0" in milestone:
                parsed["phase"] = "0"
            elif "Phase 1" in milestone:
                parsed["phase"] = "1"
            else:
                parsed["phase"] = "1"  # Default to Phase 1
        
        # Assign sequence (will be reassigned after sorting)
        if parsed["sequence"] is None:
            parsed["sequence"] = 999
        
        # Build new title
        new_title = build_task_title(parsed)
        
        if new_title != title:
            plan.append({
                "id": task_id,
                "old_title": title,
                "new_title": new_title,
                "milestone": get_milestone_for_phase(parsed["phase"]),
                "priority": parsed["priority"],
                "phase": parsed["phase"],
                "sequence": parsed["sequence"]
            })
    
    # Sort plan by priority, phase, and current sequence
    plan.sort(key=lambda x: (x["priority"], x["phase"], x["sequence"]))
    
    # Reassign sequences within each phase
    phase_counters = {}
    for item in plan:
        phase = item["phase"]
        if phase not in phase_counters:
            phase_counters[phase] = 1
        else:
            phase_counters[phase] += 1
        
        item["sequence"] = phase_counters[phase]
        
        # Rebuild title with new sequence
        parsed = parse_task_title(item["new_title"])
        parsed["sequence"] = item["sequence"]
        item["new_title"] = build_task_title(parsed)
    
    return plan


def print_refactoring_plan(plan: List[Dict[str, Any]]):
    """Print the refactoring plan in a readable format."""
    if not plan:
        print("✅ No refactoring needed! Backlog is already organized.\n")
        return
    
    print(f"📊 Refactoring Plan ({len(plan)} tasks to update)\n")
    print("=" * 100)
    
    for item in plan:
        print(f"\n{item['id']}:")
        print(f"  OLD: {item['old_title']}")
        print(f"  NEW: {item['new_title']}")
        print(f"  Milestone: {item['milestone']}")
        print(f"  Priority: P{item['priority']}")
    
    print("\n" + "=" * 100)


def execute_refactoring(plan: List[Dict[str, Any]], dry_run: bool = True):
    """
    Execute the refactoring plan.
    
    Args:
        plan: List of changes to make
        dry_run: If True, only print what would be done
    """
    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made\n")
        print_refactoring_plan(plan)
        return
    
    print("\n🚀 Executing refactoring...\n")
    init()
    
    for item in plan:
        try:
            linear_call("update_issue", {
                "id": item["id"],
                "title": item["new_title"]
            })
            print(f"✅ Updated {item['id']}: {item['new_title'][:60]}...")
        except Exception as e:
            print(f"❌ Failed to update {item['id']}: {e}")
    
    print(f"\n✅ Refactoring complete! Updated {len(plan)} tasks.\n")


# ============================================================================
# PRIORITY REBALANCING
# ============================================================================

def rebalance_priorities(promote_blockers: bool = True, demote_completed_deps: bool = True):
    """
    Rebalance task priorities based on current state.
    
    Args:
        promote_blockers: Promote tasks that block others to P0
        demote_completed_deps: Demote tasks whose dependencies are complete
    """
    print("⚖️  Rebalancing priorities...\n")
    init()
    
    backlog = get_available_tasks(limit=200)
    updates = []
    
    # Build dependency graph
    blocking_count = {}
    for task in backlog:
        task_id = task['identifier']
        parsed = parse_task_title(task['title'])
        
        for dep in parsed["dependencies"]:
            if dep not in blocking_count:
                blocking_count[dep] = 0
            blocking_count[dep] += 1
    
    # Rebalance
    for task in backlog:
        task_id = task['identifier']
        title = task['title']
        parsed = parse_task_title(title)
        
        original_priority = parsed["priority"]
        new_priority = original_priority
        
        # Promote blockers
        if promote_blockers and task_id in blocking_count:
            blocks_count = blocking_count[task_id]
            if blocks_count >= 3 and new_priority != 0:
                new_priority = 0
                print(f"   Promoting {task_id} to P0 (blocks {blocks_count} tasks)")
        
        # Update if changed
        if new_priority != original_priority:
            parsed["priority"] = new_priority
            new_title = build_task_title(parsed)
            updates.append({
                "id": task_id,
                "title": new_title
            })
    
    # Execute updates
    for update in updates:
        linear_call("update_issue", update)
        print(f"✅ Updated {update['id']}")
    
    print(f"\n✅ Rebalanced {len(updates)} tasks.\n")


# ============================================================================
# CLI
# ============================================================================

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 scripts/linear_backlog_refactor.py analyze")
        print("  python3 scripts/linear_backlog_refactor.py refactor --dry-run")
        print("  python3 scripts/linear_backlog_refactor.py refactor --execute")
        print("  python3 scripts/linear_backlog_refactor.py rebalance")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "analyze":
        analysis = analyze_backlog()
        issues = analysis["issues"]
        
        print("\n📊 Analysis Results\n")
        print("=" * 80)
        
        if issues["missing_priority"]:
            print(f"\n⚠️  {len(issues['missing_priority'])} tasks missing priority prefix:")
            for item in issues["missing_priority"][:5]:
                print(f"   {item['id']}: {item['title'][:60]}")
        
        if issues["missing_phase"]:
            print(f"\n⚠️  {len(issues['missing_phase'])} tasks missing phase identifier:")
            for item in issues["missing_phase"][:5]:
                print(f"   {item['id']}: {item['title'][:60]}")
        
        if issues["wrong_milestone"]:
            print(f"\n⚠️  {len(issues['wrong_milestone'])} tasks in wrong milestone:")
            for item in issues["wrong_milestone"][:5]:
                print(f"   {item['id']}: {item['current_milestone']} → {item['expected_milestone']}")
        
        if not any(issues.values()):
            print("\n✅ No issues found! Backlog is well-organized.\n")
        
        print("\n" + "=" * 80)
    
    elif command == "refactor":
        dry_run = "--execute" not in sys.argv
        
        analysis = analyze_backlog()
        plan = generate_refactoring_plan(analysis)
        execute_refactoring(plan, dry_run=dry_run)
    
    elif command == "rebalance":
        rebalance_priorities()
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()

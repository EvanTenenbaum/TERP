#!/usr/bin/env python3
"""
PM Auto-Evaluator for TERP Product Management

Automatically evaluates new initiatives for conflicts, dependencies, and priority.
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
import re

BASE_DIR = Path(__file__).parent.parent.parent
INITIATIVES_DIR = BASE_DIR / "initiatives"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"
EVALUATIONS_DIR = BASE_DIR / "pm-evaluation" / "evaluations"
FEEDBACK_DIR = BASE_DIR / "pm-evaluation" / "feedback"
DEPENDENCIES_FILE = BASE_DIR / "pm-evaluation" / "dependencies.json"

def load_registry():
    """Load initiative registry"""
    if not REGISTRY_FILE.exists():
        return {"initiatives": []}
    with open(REGISTRY_FILE, 'r') as f:
        return json.load(f)

def load_initiative(init_id):
    """Load initiative manifest and overview"""
    init_dir = INITIATIVES_DIR / init_id
    manifest_file = init_dir / "manifest.json"
    overview_file = init_dir / "overview.md"
    
    if not manifest_file.exists():
        return None
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    overview = ""
    if overview_file.exists():
        with open(overview_file, 'r') as f:
            overview = f.read()
    
    return {
        "manifest": manifest,
        "overview": overview
    }

def detect_conflicts(init_id, initiative_data):
    """Detect conflicts with other initiatives"""
    registry = load_registry()
    conflicts = []
    
    # Get keywords from current initiative
    current_keywords = set()
    overview = initiative_data["overview"].lower()
    tags = initiative_data["manifest"].get("tags", [])
    
    # Extract keywords from overview (simple approach)
    words = re.findall(r'\b\w{4,}\b', overview)
    current_keywords.update(words[:50])  # Limit to first 50 significant words
    current_keywords.update([tag.lower() for tag in tags])
    
    # Compare with other initiatives
    for init in registry["initiatives"]:
        if init["id"] == init_id:
            continue
        
        if init["status"] in ["rejected", "completed"]:
            continue
        
        other_data = load_initiative(init["id"])
        if not other_data:
            continue
        
        other_keywords = set()
        other_overview = other_data["overview"].lower()
        other_tags = other_data["manifest"].get("tags", [])
        
        other_words = re.findall(r'\b\w{4,}\b', other_overview)
        other_keywords.update(other_words[:50])
        other_keywords.update([tag.lower() for tag in other_tags])
        
        # Calculate overlap
        overlap = current_keywords & other_keywords
        overlap_ratio = len(overlap) / max(len(current_keywords), 1)
        
        if overlap_ratio > 0.3:  # >30% keyword overlap
            conflicts.append({
                "initiative_id": init["id"],
                "title": init["title"],
                "overlap_ratio": overlap_ratio,
                "common_keywords": list(overlap)[:10]
            })
    
    return conflicts

def extract_dependencies(overview):
    """Extract potential dependencies from overview text"""
    dependencies = []
    
    # Look for TERP-INIT-XXX mentions
    init_refs = re.findall(r'TERP-INIT-\d+', overview)
    dependencies.extend(init_refs)
    
    # Look for dependency keywords
    dep_patterns = [
        r'depends on ([^.,]+)',
        r'requires ([^.,]+)',
        r'needs ([^.,]+) to be',
        r'after ([^.,]+) is complete'
    ]
    
    for pattern in dep_patterns:
        matches = re.findall(pattern, overview, re.IGNORECASE)
        dependencies.extend(matches)
    
    return list(set(dependencies))

def calculate_priority_score(initiative_data):
    """Calculate priority score based on keywords and tags"""
    score = 50  # Base score
    
    overview = initiative_data["overview"].lower()
    tags = [tag.lower() for tag in initiative_data["manifest"].get("tags", [])]
    
    # High priority keywords
    high_priority = ["critical", "urgent", "blocker", "security", "bug", "fix"]
    for keyword in high_priority:
        if keyword in overview or keyword in tags:
            score += 15
    
    # Medium priority keywords
    medium_priority = ["important", "enhancement", "improvement", "optimize"]
    for keyword in medium_priority:
        if keyword in overview or keyword in tags:
            score += 10
    
    # Strategic alignment keywords
    strategic = ["strategic", "roadmap", "milestone", "goal"]
    for keyword in strategic:
        if keyword in overview or keyword in tags:
            score += 12
    
    # Effort indicators (lower effort = higher priority)
    low_effort = ["quick", "simple", "easy", "small"]
    for keyword in low_effort:
        if keyword in overview:
            score += 8
    
    # Cap at 100
    return min(score, 100)

def generate_evaluation(init_id):
    """Generate automated evaluation for an initiative"""
    print(f"🔍 Evaluating {init_id}...")
    
    initiative_data = load_initiative(init_id)
    if not initiative_data:
        print(f"❌ Initiative {init_id} not found")
        return False
    
    # Detect conflicts
    conflicts = detect_conflicts(init_id, initiative_data)
    
    # Extract dependencies
    dependencies = extract_dependencies(initiative_data["overview"])
    
    # Calculate priority
    priority_score = calculate_priority_score(initiative_data)
    
    # Determine priority level
    if priority_score >= 75:
        priority_level = "high"
    elif priority_score >= 50:
        priority_level = "medium"
    else:
        priority_level = "low"
    
    # Determine recommendation
    if conflicts:
        recommendation = "REVIEW_REQUIRED"
        status = "pending_review"
    else:
        recommendation = "APPROVED"
        status = "approved"
    
    # Generate evaluation report
    eval_id = f"TERP-EVAL-{init_id.split('-')[-1]}"
    eval_file = EVALUATIONS_DIR / f"{eval_id}.md"
    
    EVALUATIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(eval_file, 'w') as f:
        f.write(f"# {eval_id}: Evaluation of {init_id}\n\n")
        f.write(f"**Initiative**: {initiative_data['manifest']['title']}\n")
        f.write(f"**Evaluated**: {datetime.now().isoformat()}\n")
        f.write(f"**Evaluator**: PM Auto-Evaluator (Automated)\n\n")
        f.write("---\n\n")
        
        f.write("## Executive Summary\n\n")
        f.write(f"**Recommendation**: {recommendation}\n")
        f.write(f"**Priority**: {priority_level} (score: {priority_score}/100)\n")
        f.write(f"**Conflicts Detected**: {len(conflicts)}\n")
        f.write(f"**Dependencies Identified**: {len(dependencies)}\n\n")
        
        if conflicts:
            f.write("⚠️ **Manual review required due to potential conflicts.**\n\n")
        else:
            f.write("✅ **No conflicts detected. Recommended for approval.**\n\n")
        
        f.write("---\n\n")
        
        f.write("## Conflict Analysis\n\n")
        if conflicts:
            f.write(f"Found {len(conflicts)} potential conflict(s):\n\n")
            for i, conflict in enumerate(conflicts, 1):
                f.write(f"### Conflict {i}: {conflict['initiative_id']}\n\n")
                f.write(f"**Title**: {conflict['title']}\n")
                f.write(f"**Overlap**: {conflict['overlap_ratio']:.1%}\n")
                f.write(f"**Common Keywords**: {', '.join(conflict['common_keywords'])}\n\n")
                f.write("**Recommendation**: Review both initiatives to determine if they should be merged or if one should be deferred.\n\n")
        else:
            f.write("No conflicts detected with existing initiatives.\n\n")
        
        f.write("---\n\n")
        
        f.write("## Dependency Analysis\n\n")
        if dependencies:
            f.write(f"Identified {len(dependencies)} potential dependenc(ies):\n\n")
            for dep in dependencies:
                f.write(f"- {dep}\n")
            f.write("\n**Action Required**: Verify these dependencies and update the dependency graph.\n\n")
        else:
            f.write("No explicit dependencies identified.\n\n")
        
        f.write("---\n\n")
        
        f.write("## Priority Assessment\n\n")
        f.write(f"**Score**: {priority_score}/100\n")
        f.write(f"**Level**: {priority_level.upper()}\n\n")
        f.write("**Scoring Factors**:\n")
        f.write("- Business value keywords\n")
        f.write("- Strategic alignment indicators\n")
        f.write("- Urgency signals\n")
        f.write("- Effort estimation\n\n")
        
        f.write("---\n\n")
        
        f.write("## Next Steps\n\n")
        if conflicts:
            f.write("1. **Manual Review**: Review conflicts and make a decision\n")
            f.write("2. **Update Status**: Approve, defer, or reject based on review\n")
            f.write("3. **Update Roadmap**: Add to roadmap if approved\n")
        else:
            f.write("1. **Auto-Approved**: Initiative has been automatically approved\n")
            f.write("2. **Roadmap Updated**: Initiative added to roadmap\n")
            f.write("3. **Ready for Implementation**: Can be picked up by Implementation Agent\n")
        f.write("\n")
    
    print(f"✅ Evaluation complete: {eval_file}")
    
    # Generate feedback for Initiative Creator
    generate_feedback(init_id, recommendation, priority_level, priority_score, conflicts, dependencies)
    
    # Update initiative status if no conflicts
    if not conflicts:
        update_initiative_status(init_id, status, priority_level)
    
    return True

def generate_feedback(init_id, recommendation, priority_level, priority_score, conflicts, dependencies):
    """Generate feedback file for Initiative Creator"""
    FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    feedback_file = FEEDBACK_DIR / f"{init_id}-feedback.md"
    
    with open(feedback_file, 'w') as f:
        f.write(f"# PM Evaluation Feedback: {init_id}\n\n")
        f.write(f"**Evaluated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")
        
        f.write("## Status\n\n")
        if recommendation == "APPROVED":
            f.write("✅ **APPROVED** - Your initiative has been automatically approved!\n\n")
        else:
            f.write("⚠️ **REVIEW REQUIRED** - Your initiative needs manual review due to potential conflicts.\n\n")
        
        f.write("## Priority\n\n")
        f.write(f"**Level**: {priority_level.upper()}\n")
        f.write(f"**Score**: {priority_score}/100\n\n")
        
        f.write("## Roadmap Position\n\n")
        if recommendation == "APPROVED":
            f.write(f"Your initiative has been added to the roadmap with **{priority_level}** priority.\n\n")
            if priority_level == "high":
                f.write("**Estimated Start**: Next available sprint\n")
            elif priority_level == "medium":
                f.write("**Estimated Start**: Within 2-3 sprints\n")
            else:
                f.write("**Estimated Start**: Future sprint (backlog)\n")
        else:
            f.write("Roadmap position pending manual review.\n")
        f.write("\n")
        
        if dependencies:
            f.write("## Dependencies\n\n")
            f.write("The following potential dependencies were identified:\n\n")
            for dep in dependencies:
                f.write(f"- {dep}\n")
            f.write("\n")
        
        if conflicts:
            f.write("## Conflicts Detected\n\n")
            f.write(f"Your initiative may overlap with {len(conflicts)} existing initiative(s):\n\n")
            for conflict in conflicts:
                f.write(f"- **{conflict['initiative_id']}**: {conflict['title']} ({conflict['overlap_ratio']:.1%} overlap)\n")
            f.write("\n**Action**: A PM will review and determine if initiatives should be merged or sequenced.\n\n")
        
        f.write("## Next Steps\n\n")
        if recommendation == "APPROVED":
            f.write("1. Your initiative is now in the roadmap\n")
            f.write("2. An Implementation Agent will pick it up based on priority\n")
            f.write("3. You'll be notified when implementation begins\n")
        else:
            f.write("1. Wait for manual PM review\n")
            f.write("2. You may be contacted for clarification\n")
            f.write("3. Check back for updated status\n")
        f.write("\n")
    
    print(f"📝 Feedback generated: {feedback_file}")

def update_initiative_status(init_id, status, priority):
    """Update initiative status in registry"""
    registry = load_registry()
    
    for init in registry["initiatives"]:
        if init["id"] == init_id:
            init["status"] = status
            init["priority"] = priority
            break
    
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)
    
    print(f"✅ Updated {init_id} status to '{status}' with priority '{priority}'")

def main():
    if len(sys.argv) != 2:
        print("Usage: pm-auto-evaluator.py INIT-ID")
        sys.exit(1)
    
    init_id = sys.argv[1]
    success = generate_evaluation(init_id)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

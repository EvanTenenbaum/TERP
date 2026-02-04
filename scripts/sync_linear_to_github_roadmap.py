#!/usr/bin/env python3
"""Sync Linear roadmap to GitHub markdown roadmap"""

import subprocess
import json
from datetime import datetime

def run_mcp_command(tool, input_data):
    """Run manus-mcp-cli command and return JSON result"""
    cmd = [
        'manus-mcp-cli', 'tool', 'call', tool,
        '--server', 'linear',
        '--input', json.dumps(input_data)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        # MCP output might have extra text, try to find JSON
        output = result.stdout.strip()
        # Try to parse the entire output as JSON
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            # If that fails, look for JSON object in output
            import re
            json_match = re.search(r'\{.*\}', output, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
    return None

# Query all issues from Linear
print("Querying Linear for all tasks...")
all_issues = []
cursor = None
has_next = True

while has_next:
    input_data = {"project": "TERP - Golden Flows Beta"}
    if cursor:
        input_data["cursor"] = cursor
    
    data = run_mcp_command("list_issues", input_data)
    if data and 'issues' in data:
        all_issues.extend(data['issues'])
        has_next = data.get('hasNextPage', False)
        cursor = data.get('cursor')
    else:
        break

print(f"Found {len(all_issues)} total tasks in Linear")

# Group by milestone and status
milestones_data = {}
for issue in all_issues:
    milestone_name = issue.get('projectMilestone', {}).get('name', 'No Milestone')
    status = issue.get('status', 'Unknown')
    
    if milestone_name not in milestones_data:
        milestones_data[milestone_name] = {
            'Done': [],
            'In Progress': [],
            'Backlog': [],
            'Canceled': []
        }
    
    if status in milestones_data[milestone_name]:
        milestones_data[milestone_name][status].append(issue)

# Generate GitHub roadmap markdown
roadmap_md = f"""# TERP Golden Flows Beta - Roadmap

**Last Updated:** {datetime.now().strftime('%Y-%m-%d')}  
**Source of Truth:** [Linear Project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)  
**Status:** This file is a backup. Linear is the primary source of truth for roadmap tasks.

---

## Overview

This roadmap tracks the restoration and verification of TERP's 8 Golden Flows for beta release.

"""

# Add milestone sections
milestone_order = [
    "Phase 0.A: Golden Flow Specification",
    "Phase 0: Critical Blockers",
    "Phase 1: Core Flow Restoration"
]

for milestone_name in milestone_order:
    if milestone_name not in milestones_data:
        continue
    
    milestone = milestones_data[milestone_name]
    total = sum(len(tasks) for tasks in milestone.values())
    done_count = len(milestone['Done'])
    progress = (done_count / total * 100) if total > 0 else 0
    
    # Determine status
    if progress == 100:
        status = "✅ COMPLETE"
    elif progress > 0:
        status = f"🟡 IN PROGRESS ({progress:.0f}%)"
    else:
        status = "⏳ NOT STARTED"
    
    roadmap_md += f"""## {milestone_name}

**Status:** {status}  
**Progress:** {done_count}/{total} tasks complete

"""
    
    # Add tasks by status
    for status_name in ['Done', 'In Progress', 'Backlog']:
        tasks = milestone[status_name]
        if not tasks:
            continue
        
        roadmap_md += f"### {status_name}\n\n"
        
        for task in sorted(tasks, key=lambda x: x.get('title', '')):
            identifier = task.get('identifier', 'TER-?')
            title = task.get('title', 'Untitled')
            url = task.get('url', '#')
            priority = task.get('priority', {}).get('name', 'Medium')
            labels = [label for label in task.get('labels', [])]
            
            # Extract mode and type from labels
            mode = next((l.replace('mode:', '').upper() for l in labels if l.startswith('mode:')), 'SAFE')
            task_type = next((l.replace('type:', '').capitalize() for l in labels if l.startswith('type:')), 'Task')
            
            roadmap_md += f"- **[{identifier}]({url}):** {title}\n"
            roadmap_md += f"  - Priority: {priority} | Mode: {mode} | Type: {task_type}\n"
        
        roadmap_md += "\n"
    
    roadmap_md += "---\n\n"

# Add footer
roadmap_md += f"""## Notes

- **Linear is the primary source of truth** for all roadmap tasks
- This GitHub roadmap is a backup and may not be as up-to-date as Linear
- For the most current information, always refer to the [Linear project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)
- Last synced: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

# Write to file
output_path = '/home/ubuntu/TERP-fresh/docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md'
with open(output_path, 'w') as f:
    f.write(roadmap_md)

print(f"✅ GitHub roadmap updated: {output_path}")
print(f"   Total tasks: {len(all_issues)}")
for milestone_name in milestone_order:
    if milestone_name in milestones_data:
        milestone = milestones_data[milestone_name]
        done = len(milestone['Done'])
        total = sum(len(tasks) for tasks in milestone.values())
        print(f"   {milestone_name}: {done}/{total} complete")

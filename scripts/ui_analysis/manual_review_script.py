#!/usr/bin/env python3
"""
Manual Review Script for "Missing Handler" Issues
Categorizes issues into: True Bugs, False Positives, and Needs Investigation
"""

import json
from pathlib import Path
from collections import defaultdict

# Load the refined report
report_path = Path('/home/ubuntu/ui_analysis/refined_report.json')
report = json.loads(report_path.read_text())

# Extract missing_handler issues
missing_handler_issues = []
for file_path, issue_types in report['issues'].items():
    if 'missing_handler' in issue_types:
        for issue in issue_types['missing_handler']:
            missing_handler_issues.append({
                'file': file_path,
                **issue
            })

print(f"Total 'missing_handler' issues: {len(missing_handler_issues)}")
print("\nAnalyzing patterns...\n")

# Categorize by pattern
false_positives = []
true_bugs = []
needs_investigation = []

for issue in missing_handler_issues:
    context = issue.get('context', '')
    file_path = issue['file']
    
    # Pattern 1: Wrapped in Trigger components (FALSE POSITIVE)
    if any(trigger in context for trigger in [
        'DropdownMenuTrigger asChild',
        'PopoverTrigger asChild',
        'DialogTrigger asChild',
        'AlertDialogTrigger asChild',
        'TooltipTrigger asChild',
        'ContextMenuTrigger asChild',
        'MenubarTrigger asChild',
    ]):
        false_positives.append({
            **issue,
            'reason': 'Wrapped in Radix UI Trigger component (provides onClick via composition)'
        })
    
    # Pattern 2: Inside form with onSubmit (FALSE POSITIVE if type="submit")
    elif 'type="submit"' in context or 'type=\'submit\'' in context:
        false_positives.append({
            **issue,
            'reason': 'Submit button inside form (form handles submission)'
        })
    
    # Pattern 3: Disabled button (NEEDS INVESTIGATION)
    elif 'disabled' in context.lower():
        needs_investigation.append({
            **issue,
            'reason': 'Button is disabled - may be intentional or a bug'
        })
    
    # Pattern 4: In table/grid with obvious edit/delete icons (TRUE BUG)
    elif any(icon in context for icon in ['Edit', 'Trash', 'Delete', 'Pencil']):
        true_bugs.append({
            **issue,
            'reason': 'Action button (edit/delete) without handler'
        })
    
    # Pattern 5: Generic button without clear context (NEEDS INVESTIGATION)
    else:
        needs_investigation.append({
            **issue,
            'reason': 'Needs manual review to determine if bug or false positive'
        })

# Generate categorized report
categorized_report = {
    'summary': {
        'total': len(missing_handler_issues),
        'false_positives': len(false_positives),
        'true_bugs': len(true_bugs),
        'needs_investigation': len(needs_investigation)
    },
    'false_positives': false_positives,
    'true_bugs': true_bugs,
    'needs_investigation': needs_investigation
}

# Save categorized report
output_path = Path('/home/ubuntu/ui_analysis/categorized_missing_handlers.json')
output_path.write_text(json.dumps(categorized_report, indent=2))

# Print summary
print("=" * 60)
print("CATEGORIZATION SUMMARY")
print("=" * 60)
print(f"Total issues: {len(missing_handler_issues)}")
print(f"False positives: {len(false_positives)} ({len(false_positives)/len(missing_handler_issues)*100:.1f}%)")
print(f"True bugs: {len(true_bugs)} ({len(true_bugs)/len(missing_handler_issues)*100:.1f}%)")
print(f"Needs investigation: {len(needs_investigation)} ({len(needs_investigation)/len(missing_handler_issues)*100:.1f}%)")
print("\n" + "=" * 60)
print("TRUE BUGS (High Priority)")
print("=" * 60)

# Group true bugs by file
bugs_by_file = defaultdict(list)
for bug in true_bugs:
    bugs_by_file[bug['file']].append(bug)

for file_path, bugs in sorted(bugs_by_file.items()):
    print(f"\n{file_path} ({len(bugs)} issues)")
    for bug in bugs:
        print(f"  Line {bug['line']}: {bug['reason']}")

print("\n" + "=" * 60)
print("NEEDS INVESTIGATION (Manual Review Required)")
print("=" * 60)

# Show first 10 that need investigation
for i, issue in enumerate(needs_investigation[:10], 1):
    print(f"\n{i}. {issue['file']} (Line {issue['line']})")
    print(f"   Reason: {issue['reason']}")
    print(f"   Context snippet: {issue['context'][:100]}...")

if len(needs_investigation) > 10:
    print(f"\n... and {len(needs_investigation) - 10} more issues need investigation")

print(f"\nFull categorized report saved to: {output_path}")

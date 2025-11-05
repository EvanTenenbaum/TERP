#!/usr/bin/env python3
"""
Categorize the strict analysis issues into actionable groups
"""

import json
from pathlib import Path

def main():
    with open('/home/ubuntu/ui_analysis/strict_analysis.json', 'r') as f:
        data = json.load(f)
    
    issues_by_file = data['issues_by_file']
    
    # Categorize issues
    skip_files = [
        'ComponentShowcase.tsx',  # Demo page, buttons are intentionally non-functional
    ]
    
    false_positives = []
    true_bugs = []
    needs_review = []
    
    for filepath, issues in issues_by_file.items():
        filename = Path(filepath).name
        
        # Skip demo/showcase files
        if any(skip in filepath for skip in skip_files):
            for issue in issues:
                false_positives.append({**issue, 'reason': 'Demo/showcase page'})
            continue
        
        for issue in issues:
            # Skip low severity (disabled buttons without comments - usually fine)
            if issue['severity'] == 'low':
                false_positives.append({**issue, 'reason': 'Low severity - disabled buttons'})
                continue
            
            # Check for known patterns
            context = issue.get('context', '')
            
            # CollapsibleTrigger, AccordionTrigger etc - these are wrappers
            if any(trigger in context for trigger in [
                'CollapsibleTrigger', 'AccordionTrigger', 'TabsTrigger',
                'DialogTrigger', 'DropdownMenuTrigger', 'PopoverTrigger'
            ]):
                false_positives.append({**issue, 'reason': 'Radix UI trigger wrapper'})
                continue
            
            # Placeholder text in textarea/input is fine
            if issue['type'] == 'placeholder_button' and 'placeholder=' in issue['code']:
                if 'textarea' in context.lower() or 'input' in context.lower():
                    false_positives.append({**issue, 'reason': 'Placeholder text in input field'})
                    continue
            
            # If it's a missing_handler, it's likely a true bug
            if issue['type'] == 'missing_handler':
                true_bugs.append(issue)
            else:
                needs_review.append(issue)
    
    # Generate categorized report
    print("=" * 80)
    print("CATEGORIZED ISSUE REPORT")
    print("=" * 80)
    print()
    print(f"Total Issues: {sum(len(issues) for issues in issues_by_file.values())}")
    print(f"  ✅ False Positives: {len(false_positives)}")
    print(f"  🔴 True Bugs: {len(true_bugs)}")
    print(f"  ⚠️  Needs Review: {len(needs_review)}")
    print()
    
    print("=" * 80)
    print("TRUE BUGS TO FIX")
    print("=" * 80)
    print()
    
    # Group true bugs by file
    bugs_by_file = {}
    for bug in true_bugs:
        filepath = bug['file'].replace('/home/ubuntu/TERP/client/src/', '')
        if filepath not in bugs_by_file:
            bugs_by_file[filepath] = []
        bugs_by_file[filepath].append(bug)
    
    for i, (filepath, bugs) in enumerate(sorted(bugs_by_file.items()), 1):
        print(f"{i}. {filepath} ({len(bugs)} issues)")
        for bug in bugs:
            print(f"   Line {bug['line']}: {bug['code'][:60]}")
        print()
    
    # Save categorized results
    with open('/home/ubuntu/ui_analysis/categorized_issues.json', 'w') as f:
        json.dump({
            'summary': {
                'total': sum(len(issues) for issues in issues_by_file.values()),
                'false_positives': len(false_positives),
                'true_bugs': len(true_bugs),
                'needs_review': len(needs_review)
            },
            'false_positives': false_positives,
            'true_bugs': true_bugs,
            'needs_review': needs_review,
            'bugs_by_file': bugs_by_file
        }, f, indent=2)
    
    print("✅ Categorized report saved to: categorized_issues.json")

if __name__ == '__main__':
    main()

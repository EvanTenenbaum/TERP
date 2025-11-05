#!/usr/bin/env python3
"""
Mobile-Specific Button Analyzer
Finds buttons that may work on desktop but fail on mobile due to:
- Touch event handlers missing
- Responsive design issues
- Hidden on mobile
- Z-index/overlay issues
"""

import os
import re
import json
from pathlib import Path

def analyze_file(filepath):
    """Analyze a single file for mobile-specific button issues"""
    issues = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Pattern 1: Buttons with className containing "hidden" on mobile
    hidden_mobile_pattern = r'<Button[^>]*className="[^"]*hidden[^"]*md:[^"]*"[^>]*>'
    for match in re.finditer(hidden_mobile_pattern, content, re.IGNORECASE):
        line_num = content[:match.start()].count('\n') + 1
        context_start = max(0, line_num - 2)
        context_end = min(len(lines), line_num + 2)
        context = '\n'.join(lines[context_start:context_end])
        
        issues.append({
            'file': str(filepath),
            'line': line_num,
            'type': 'hidden_on_mobile',
            'severity': 'medium',
            'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
            'context': context
        })
    
    # Pattern 2: Buttons in dropdowns/popovers that might have z-index issues
    dropdown_button_pattern = r'<DropdownMenu[^>]*>.*?<Button[^>]*>.*?</DropdownMenu>'
    for match in re.finditer(dropdown_button_pattern, content, re.DOTALL):
        # Check if there's an onClick inside
        if 'onClick' not in match.group():
            line_num = content[:match.start()].count('\n') + 1
            issues.append({
                'file': str(filepath),
                'line': line_num,
                'type': 'dropdown_button_no_handler',
                'severity': 'high',
                'code': match.group()[:100] + '...',
                'context': match.group()[:200]
            })
    
    # Pattern 3: Save buttons in dialogs/sheets (like v3 dashboard widget save)
    dialog_save_pattern = r'<Dialog[^>]*>.*?<Button[^>]*>.*?[Ss]ave.*?</Button>.*?</Dialog>'
    for match in re.finditer(dialog_save_pattern, content, re.DOTALL):
        button_match = re.search(r'<Button([^>]*)>.*?[Ss]ave', match.group())
        if button_match and 'onClick' not in button_match.group(1):
            line_num = content[:match.start()].count('\n') + 1
            issues.append({
                'file': str(filepath),
                'line': line_num,
                'type': 'dialog_save_no_handler',
                'severity': 'high',
                'code': button_match.group()[:80],
                'context': match.group()[:200]
            })
    
    # Pattern 4: Sheet save buttons (mobile-specific component)
    sheet_save_pattern = r'<Sheet[^>]*>.*?<Button[^>]*>.*?[Ss]ave.*?</Button>.*?</Sheet>'
    for match in re.finditer(sheet_save_pattern, content, re.DOTALL):
        button_match = re.search(r'<Button([^>]*)>.*?[Ss]ave', match.group())
        if button_match and 'onClick' not in button_match.group(1):
            line_num = content[:match.start()].count('\n') + 1
            issues.append({
                'file': str(filepath),
                'line': line_num,
                'type': 'sheet_save_no_handler',
                'severity': 'high',
                'code': button_match.group()[:80],
                'context': match.group()[:200]
            })
    
    # Pattern 5: Buttons with touch-action CSS that might interfere
    touch_action_pattern = r'<Button[^>]*style="[^"]*touch-action:[^"]*"[^>]*>'
    for match in re.finditer(touch_action_pattern, content):
        line_num = content[:match.start()].count('\n') + 1
        context_start = max(0, line_num - 2)
        context_end = min(len(lines), line_num + 2)
        context = '\n'.join(lines[context_start:context_end])
        
        issues.append({
            'file': str(filepath),
            'line': line_num,
            'type': 'touch_action_css',
            'severity': 'low',
            'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
            'context': context
        })
    
    return issues

def find_v3_dashboard_widgets():
    """Specifically look for v3 dashboard widget save buttons"""
    client_dir = Path('/home/ubuntu/TERP/client/src')
    widget_files = []
    
    # Find all files with "widget" in the name
    for filepath in client_dir.rglob('*.tsx'):
        if 'widget' in str(filepath).lower() or 'dashboard' in str(filepath).lower():
            widget_files.append(filepath)
    
    return widget_files

def main():
    client_dir = Path('/home/ubuntu/TERP/client/src')
    all_issues = []
    
    print("=" * 80)
    print("MOBILE-SPECIFIC BUTTON ANALYSIS")
    print("=" * 80)
    print()
    
    # First, find v3 dashboard widget files
    print("Looking for v3 dashboard widget files...")
    widget_files = find_v3_dashboard_widgets()
    print(f"Found {len(widget_files)} widget/dashboard files:")
    for f in widget_files:
        print(f"  - {f.relative_to(client_dir)}")
    print()
    
    # Analyze all React component files
    for ext in ['tsx', 'jsx']:
        for filepath in client_dir.rglob(f'*.{ext}'):
            # Skip node_modules, build, dist
            if 'node_modules' in str(filepath) or 'build' in str(filepath) or 'dist' in str(filepath):
                continue
            
            issues = analyze_file(filepath)
            all_issues.extend(issues)
    
    # Group by type
    by_type = {}
    for issue in all_issues:
        issue_type = issue['type']
        if issue_type not in by_type:
            by_type[issue_type] = []
        by_type[issue_type].append(issue)
    
    # Generate report
    print("=" * 80)
    print("MOBILE BUTTON ISSUES FOUND")
    print("=" * 80)
    print()
    
    for issue_type, issues in sorted(by_type.items()):
        print(f"{issue_type.upper().replace('_', ' ')}: {len(issues)} issues")
        for issue in issues[:5]:  # Show first 5 of each type
            filepath = issue['file'].replace('/home/ubuntu/TERP/client/src/', '')
            print(f"  - {filepath}:{issue['line']}")
        if len(issues) > 5:
            print(f"  ... and {len(issues) - 5} more")
        print()
    
    # Save detailed JSON
    with open('/home/ubuntu/ui_analysis/mobile_analysis.json', 'w') as f:
        json.dump({
            'summary': {
                'total_issues': len(all_issues),
                'by_type': {k: len(v) for k, v in by_type.items()}
            },
            'widget_files': [str(f) for f in widget_files],
            'issues': all_issues
        }, f, indent=2)
    
    print("=" * 80)
    print(f"Total mobile-specific issues found: {len(all_issues)}")
    print("Detailed report saved to: mobile_analysis.json")
    print()

if __name__ == '__main__':
    main()

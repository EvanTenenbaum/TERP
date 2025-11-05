#!/usr/bin/env python3
"""
Strict Button Analyzer - Find ALL broken or placeholder buttons
This script is more aggressive and catches buttons that may have been missed
"""

import os
import re
import json
from pathlib import Path

def analyze_file(filepath):
    """Analyze a single file for broken buttons with strict criteria"""
    issues = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Pattern 1: Buttons without onClick and not inside known wrapper components
    button_pattern = r'<Button[^>]*>'
    for i, line in enumerate(lines, 1):
        if re.search(button_pattern, line, re.IGNORECASE):
            # Check if this button has onClick, type="submit", or is wrapped
            context_start = max(0, i - 5)
            context_end = min(len(lines), i + 5)
            context = '\n'.join(lines[context_start:context_end])
            
            has_onclick = 'onClick' in context or 'onclick' in context
            is_submit = 'type="submit"' in context or "type='submit'" in context
            is_wrapped = any(wrapper in context for wrapper in [
                'DialogTrigger', 'DropdownMenuTrigger', 'PopoverTrigger',
                'AlertDialogTrigger', 'SheetTrigger', 'TooltipTrigger',
                'ContextMenuTrigger', 'MenubarTrigger', 'HoverCardTrigger'
            ])
            is_link = 'asChild' in context and ('<Link' in context or 'href=' in context)
            
            if not (has_onclick or is_submit or is_wrapped or is_link):
                issues.append({
                    'file': str(filepath),
                    'line': i,
                    'type': 'missing_handler',
                    'severity': 'high',
                    'code': line.strip(),
                    'context': context
                })
    
    # Pattern 2: Buttons with placeholder text
    placeholder_patterns = [
        r'coming soon',
        r'todo',
        r'placeholder',
        r'not implemented',
        r'implement.*later',
        r'add.*here',
        r'work in progress',
        r'wip',
        r'tbd',
        r'fixme',
        r'hack',
    ]
    
    for pattern in placeholder_patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            line_num = content[:match.start()].count('\n') + 1
            context_start = max(0, line_num - 3)
            context_end = min(len(lines), line_num + 3)
            context = '\n'.join(lines[context_start:context_end])
            
            # Check if this is near a button
            if '<Button' in context or '<button' in context:
                issues.append({
                    'file': str(filepath),
                    'line': line_num,
                    'type': 'placeholder_button',
                    'severity': 'high',
                    'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
                    'context': context,
                    'placeholder_text': match.group()
                })
    
    # Pattern 3: Empty onClick handlers
    empty_onclick_patterns = [
        r'onClick=\{\(\)\s*=>\s*\{\s*\}\}',
        r'onClick=\{\(\)\s*=>\s*undefined\}',
        r'onClick=\{undefined\}',
        r'onClick=\{null\}',
        r'onClick=\{\s*\}',
    ]
    
    for pattern in empty_onclick_patterns:
        for match in re.finditer(pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            context_start = max(0, line_num - 2)
            context_end = min(len(lines), line_num + 2)
            context = '\n'.join(lines[context_start:context_end])
            
            issues.append({
                'file': str(filepath),
                'line': line_num,
                'type': 'empty_handler',
                'severity': 'high',
                'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
                'context': context
            })
    
    # Pattern 4: Console.log only handlers (likely placeholder)
    console_only_pattern = r'onClick=\{\(\)\s*=>\s*console\.log\([^)]*\)\}'
    for match in re.finditer(console_only_pattern, content):
        line_num = content[:match.start()].count('\n') + 1
        context_start = max(0, line_num - 2)
        context_end = min(len(lines), line_num + 2)
        context = '\n'.join(lines[context_start:context_end])
        
        issues.append({
            'file': str(filepath),
            'line': line_num,
            'type': 'console_only_handler',
            'severity': 'medium',
            'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
            'context': context
        })
    
    # Pattern 5: Alert-only handlers (likely placeholder)
    alert_only_pattern = r'onClick=\{\(\)\s*=>\s*(alert|window\.alert)\([^)]*\)\}'
    for match in re.finditer(alert_only_pattern, content):
        line_num = content[:match.start()].count('\n') + 1
        context_start = max(0, line_num - 2)
        context_end = min(len(lines), line_num + 2)
        context = '\n'.join(lines[context_start:context_end])
        
        issues.append({
            'file': str(filepath),
            'line': line_num,
            'type': 'alert_only_handler',
            'severity': 'medium',
            'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
            'context': context
        })
    
    # Pattern 6: Disabled buttons without explanation
    disabled_pattern = r'<Button[^>]*disabled[^>]*>'
    for match in re.finditer(disabled_pattern, content, re.IGNORECASE):
        line_num = content[:match.start()].count('\n') + 1
        context_start = max(0, line_num - 5)
        context_end = min(len(lines), line_num + 2)
        context = '\n'.join(lines[context_start:context_end])
        
        # Check if there's a comment explaining why it's disabled
        has_comment = '//' in context or '/*' in context or '{/*' in context
        has_conditional = 'disabled={' in context
        
        if not (has_comment or has_conditional):
            issues.append({
                'file': str(filepath),
                'line': line_num,
                'type': 'unexplained_disabled',
                'severity': 'low',
                'code': lines[line_num - 1].strip() if line_num <= len(lines) else '',
                'context': context
            })
    
    return issues

def main():
    client_dir = Path('/home/ubuntu/TERP/client/src')
    all_issues = []
    
    # Find all React component files
    for ext in ['tsx', 'jsx', 'ts', 'js']:
        for filepath in client_dir.rglob(f'*.{ext}'):
            # Skip node_modules, build, dist
            if 'node_modules' in str(filepath) or 'build' in str(filepath) or 'dist' in str(filepath):
                continue
            
            issues = analyze_file(filepath)
            all_issues.extend(issues)
    
    # Group by file
    by_file = {}
    for issue in all_issues:
        filepath = issue['file']
        if filepath not in by_file:
            by_file[filepath] = []
        by_file[filepath].append(issue)
    
    # Sort by severity
    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    for filepath in by_file:
        by_file[filepath].sort(key=lambda x: (severity_order[x['severity']], x['line']))
    
    # Generate report
    print("=" * 80)
    print("STRICT BUTTON ANALYSIS REPORT")
    print("=" * 80)
    print()
    
    high_count = sum(1 for i in all_issues if i['severity'] == 'high')
    medium_count = sum(1 for i in all_issues if i['severity'] == 'medium')
    low_count = sum(1 for i in all_issues if i['severity'] == 'low')
    
    print(f"Total Issues Found: {len(all_issues)}")
    print(f"  🔴 High Severity: {high_count}")
    print(f"  🟡 Medium Severity: {medium_count}")
    print(f"  🟢 Low Severity: {low_count}")
    print(f"Files Affected: {len(by_file)}")
    print()
    
    # Save detailed JSON
    with open('/home/ubuntu/ui_analysis/strict_analysis.json', 'w') as f:
        json.dump({
            'summary': {
                'total_issues': len(all_issues),
                'high_severity': high_count,
                'medium_severity': medium_count,
                'low_severity': low_count,
                'files_affected': len(by_file)
            },
            'issues_by_file': by_file
        }, f, indent=2)
    
    print("✅ Detailed report saved to: strict_analysis.json")
    print()
    
    # Show top 20 high-severity issues
    high_issues = [i for i in all_issues if i['severity'] == 'high']
    print("=" * 80)
    print("TOP 20 HIGH-SEVERITY ISSUES")
    print("=" * 80)
    print()
    
    for i, issue in enumerate(high_issues[:20], 1):
        filepath = issue['file'].replace('/home/ubuntu/TERP/client/src/', '')
        print(f"{i}. {filepath}:{issue['line']}")
        print(f"   Type: {issue['type']}")
        print(f"   Code: {issue['code'][:80]}")
        print()
    
    if len(high_issues) > 20:
        print(f"... and {len(high_issues) - 20} more high-severity issues")
    
    print()
    print("=" * 80)

if __name__ == '__main__':
    main()

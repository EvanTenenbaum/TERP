#!/usr/bin/env python3
"""
Refined UI Issue Analyzer with Context-Aware Filtering
Reduces false positives by understanding React/component context
"""

import os
import re
import json
import ast
from pathlib import Path
from typing import List, Dict, Set, Optional
from collections import defaultdict

class RefinedUIAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.client_path = self.repo_path / "client"
        self.issues = defaultdict(lambda: defaultdict(list))
        
        # Component names that are legitimate (not issues)
        self.legitimate_components = {
            'Switch', 'Route', 'Link', 'Navigate', 'Redirect',
            'TodoListsPage', 'TodoListDetailPage', 'TodoList', 'TodoItem',
            'TodoCard', 'QuickAddTaskModal'
        }
        
    def is_router_switch(self, content: str, match_pos: int) -> bool:
        """Check if Switch is from wouter/react-router"""
        # Look backwards for import
        before_match = content[:match_pos]
        if re.search(r'import.*?Switch.*?from.*?["\'](?:wouter|react-router)', before_match):
            return True
        return False
    
    def is_ui_switch(self, content: str, match_pos: int) -> bool:
        """Check if Switch is a UI toggle component"""
        # Look for @radix-ui or shadcn imports
        before_match = content[:match_pos]
        if re.search(r'import.*?Switch.*?from.*?["\'].*?(?:@radix-ui|@/components/ui)', before_match):
            return True
        return False
    
    def get_line_number(self, content: str, pos: int) -> int:
        """Get line number from character position"""
        return content[:pos].count('\n') + 1
    
    def get_context(self, lines: List[str], line_num: int, before: int = 3, after: int = 3) -> str:
        """Get context around a line"""
        start = max(0, line_num - before - 1)
        end = min(len(lines), line_num + after)
        return '\n'.join(lines[start:end])
    
    def analyze_buttons(self, file_path: Path, content: str, lines: List[str]) -> List[Dict]:
        """Analyze button elements for issues"""
        issues = []
        
        # Find all button-like elements
        button_pattern = r'<(?:button|Button)(?:\s+[^>]*)?>'
        
        for match in re.finditer(button_pattern, content, re.IGNORECASE):
            start_pos = match.start()
            line_num = self.get_line_number(content, start_pos)
            
            # Extract the full button element (simplified)
            # Look for the closing tag
            tag_name = match.group(0).split()[0][1:]  # Get 'button' or 'Button'
            closing_pattern = f'</{tag_name}>'
            
            # Get a reasonable chunk to analyze (500 chars should cover most buttons)
            chunk_end = min(start_pos + 500, len(content))
            chunk = content[start_pos:chunk_end]
            
            # Check for onClick handler
            has_onclick = bool(re.search(r'onClick\s*=', chunk))
            
            # Check if it's a submit button in a form
            is_submit = bool(re.search(r'type\s*=\s*["\']submit["\']', chunk))
            
            # Check if disabled
            is_disabled = bool(re.search(r'disabled(?:\s*=\s*(?:\{true\}|"true"|true)|\s|>)', chunk))
            
            # Check for placeholder/todo text
            has_placeholder_text = bool(re.search(
                r'(?:TODO|FIXME|Placeholder|Coming Soon|TBD|Click me)',
                chunk,
                re.IGNORECASE
            ))
            
            # Check for empty/console.log onClick
            has_empty_handler = bool(re.search(
                r'onClick\s*=\s*\{(?:\s*\(\)\s*=>\s*\{\s*\}|\s*\(\)\s*=>\s*console\.log)',
                chunk
            ))
            
            # Determine if this is an issue
            if not has_onclick and not is_submit:
                issues.append({
                    'type': 'missing_handler',
                    'severity': 'high',
                    'line': line_num,
                    'description': 'Button without onClick handler or submit type',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
            elif has_empty_handler:
                issues.append({
                    'type': 'empty_handler',
                    'severity': 'high',
                    'line': line_num,
                    'description': 'Button with empty or console.log-only handler',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
            elif has_placeholder_text:
                issues.append({
                    'type': 'placeholder_button',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Button with placeholder text',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
            elif is_disabled and 'disabled={true}' in chunk:
                # Check if it's hardcoded disabled (not conditional)
                if not re.search(r'disabled\s*=\s*\{[^}]*(?:isLoading|isDisabled|disabled|!)', chunk):
                    issues.append({
                        'type': 'hardcoded_disabled',
                        'severity': 'low',
                        'line': line_num,
                        'description': 'Button with hardcoded disabled={true}',
                        'context': self.get_context(lines, line_num),
                        'snippet': chunk[:200]
                    })
        
        return issues
    
    def analyze_toggles(self, file_path: Path, content: str, lines: List[str]) -> List[Dict]:
        """Analyze toggle/switch components"""
        issues = []
        
        # Find Switch components that are UI switches (not routers)
        switch_pattern = r'<Switch(?:\s+[^>]*)?>'
        
        for match in re.finditer(switch_pattern, content):
            start_pos = match.start()
            
            # Skip if it's a router Switch
            if self.is_router_switch(content, start_pos):
                continue
            
            # Check if it's a UI Switch
            if not self.is_ui_switch(content, start_pos):
                continue
            
            line_num = self.get_line_number(content, start_pos)
            chunk_end = min(start_pos + 300, len(content))
            chunk = content[start_pos:chunk_end]
            
            # Check for onCheckedChange handler
            has_handler = bool(re.search(r'onCheckedChange\s*=', chunk))
            
            if not has_handler:
                issues.append({
                    'type': 'broken_toggle',
                    'severity': 'high',
                    'line': line_num,
                    'description': 'Switch component without onCheckedChange handler',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
        
        # Check Checkbox components
        checkbox_pattern = r'<Checkbox(?:\s+[^>]*)?>'
        
        for match in re.finditer(checkbox_pattern, content):
            start_pos = match.start()
            line_num = self.get_line_number(content, start_pos)
            chunk_end = min(start_pos + 300, len(content))
            chunk = content[start_pos:chunk_end]
            
            has_handler = bool(re.search(r'onCheckedChange\s*=', chunk))
            
            if not has_handler:
                issues.append({
                    'type': 'broken_checkbox',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Checkbox without onCheckedChange handler',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
        
        return issues
    
    def analyze_forms(self, file_path: Path, content: str, lines: List[str]) -> List[Dict]:
        """Analyze form elements"""
        issues = []
        
        form_pattern = r'<(?:form|Form)(?:\s+[^>]*)?>'
        
        for match in re.finditer(form_pattern, content, re.IGNORECASE):
            start_pos = match.start()
            line_num = self.get_line_number(content, start_pos)
            chunk_end = min(start_pos + 500, len(content))
            chunk = content[start_pos:chunk_end]
            
            has_onsubmit = bool(re.search(r'onSubmit\s*=', chunk))
            
            if not has_onsubmit:
                issues.append({
                    'type': 'incomplete_form',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Form without onSubmit handler',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
        
        return issues
    
    def analyze_async_operations(self, file_path: Path, content: str, lines: List[str]) -> List[Dict]:
        """Analyze async operations for error handling"""
        issues = []
        
        # Find async functions without try-catch
        async_fn_pattern = r'async\s+(?:function\s+\w+|const\s+\w+\s*=)'
        
        for match in re.finditer(async_fn_pattern, content):
            start_pos = match.start()
            line_num = self.get_line_number(content, start_pos)
            
            # Look ahead for try-catch (within next 500 chars)
            chunk_end = min(start_pos + 500, len(content))
            chunk = content[start_pos:chunk_end]
            
            has_try_catch = bool(re.search(r'\btry\s*\{', chunk))
            has_catch_in_promise = bool(re.search(r'\.catch\s*\(', chunk))
            
            if not has_try_catch and not has_catch_in_promise:
                issues.append({
                    'type': 'missing_error_handling',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Async function without try-catch or .catch()',
                    'context': self.get_context(lines, line_num),
                    'snippet': chunk[:200]
                })
        
        return issues
    
    def analyze_todo_comments(self, file_path: Path, content: str, lines: List[str]) -> List[Dict]:
        """Find TODO/FIXME comments (actual issues, not component names)"""
        issues = []
        
        # Match TODO/FIXME in comments only
        todo_pattern = r'(?://|/\*|\{/\*)\s*(?:TODO|FIXME|XXX|HACK|PLACEHOLDER|TBD|IMPLEMENT)(?:\s*:)?\s*([^\n\*]*)'
        
        for match in re.finditer(todo_pattern, content, re.IGNORECASE):
            line_num = self.get_line_number(content, match.start())
            
            issues.append({
                'type': 'todo_comment',
                'severity': 'low',
                'line': line_num,
                'description': f'TODO comment: {match.group(1).strip()}',
                'context': self.get_context(lines, line_num, before=1, after=1),
                'snippet': match.group(0)
            })
        
        return issues
    
    def analyze_file(self, file_path: Path) -> Dict:
        """Analyze a single file comprehensively"""
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')
            
            all_issues = []
            
            # Run all analyzers
            all_issues.extend(self.analyze_buttons(file_path, content, lines))
            all_issues.extend(self.analyze_toggles(file_path, content, lines))
            all_issues.extend(self.analyze_forms(file_path, content, lines))
            all_issues.extend(self.analyze_async_operations(file_path, content, lines))
            all_issues.extend(self.analyze_todo_comments(file_path, content, lines))
            
            return all_issues
            
        except Exception as e:
            return [{'type': 'error', 'description': str(e)}]
    
    def find_component_files(self) -> List[Path]:
        """Find all React component files"""
        patterns = ['**/*.tsx', '**/*.jsx']
        files = []
        for pattern in patterns:
            files.extend(self.client_path.glob(pattern))
        return sorted(files)
    
    def analyze_all_files(self):
        """Analyze all component files"""
        component_files = self.find_component_files()
        
        print(f"Analyzing {len(component_files)} component files...")
        
        for i, file_path in enumerate(component_files, 1):
            if i % 50 == 0:
                print(f"  Progress: {i}/{len(component_files)} files...")
            
            relative_path = str(file_path.relative_to(self.repo_path))
            file_issues = self.analyze_file(file_path)
            
            if file_issues:
                # Organize by type
                for issue in file_issues:
                    issue_type = issue.get('type', 'unknown')
                    self.issues[relative_path][issue_type].append(issue)
        
        return dict(self.issues)
    
    def get_summary(self) -> Dict:
        """Get summary statistics"""
        total_files = len(self.issues)
        issues_by_type = defaultdict(int)
        issues_by_severity = defaultdict(int)
        
        for file_issues in self.issues.values():
            for issue_type, issue_list in file_issues.items():
                issues_by_type[issue_type] += len(issue_list)
                for issue in issue_list:
                    severity = issue.get('severity', 'unknown')
                    issues_by_severity[severity] += 1
        
        return {
            'total_files_with_issues': total_files,
            'total_issues': sum(issues_by_type.values()),
            'issues_by_type': dict(sorted(issues_by_type.items(), key=lambda x: x[1], reverse=True)),
            'issues_by_severity': dict(sorted(issues_by_severity.items(), key=lambda x: x[1], reverse=True))
        }
    
    def generate_markdown_report(self, output_path: Path):
        """Generate comprehensive markdown report"""
        summary = self.get_summary()
        
        md = []
        md.append("# TERP UI Issues - Refined Analysis Report\n")
        md.append("## Executive Summary\n")
        md.append(f"- **Total Files with Issues:** {summary['total_files_with_issues']}")
        md.append(f"- **Total Issues Found:** {summary['total_issues']}\n")
        
        md.append("### Issues by Severity\n")
        severity_order = ['high', 'medium', 'low', 'unknown']
        for severity in severity_order:
            count = summary['issues_by_severity'].get(severity, 0)
            if count > 0:
                icon = '🔴' if severity == 'high' else '🟡' if severity == 'medium' else '🟢'
                md.append(f"- {icon} **{severity.upper()}:** {count}")
        
        md.append("\n### Issues by Type\n")
        for issue_type, count in summary['issues_by_type'].items():
            md.append(f"- **{issue_type.replace('_', ' ').title()}:** {count}")
        
        md.append("\n---\n")
        md.append("## Critical Issues (High Severity)\n")
        
        # Collect all high severity issues
        high_severity_issues = []
        for file_path, file_issues in self.issues.items():
            for issue_type, issue_list in file_issues.items():
                for issue in issue_list:
                    if issue.get('severity') == 'high':
                        high_severity_issues.append({
                            'file': file_path,
                            'type': issue_type,
                            **issue
                        })
        
        # Group by type
        issues_by_type = defaultdict(list)
        for issue in high_severity_issues:
            issues_by_type[issue['type']].append(issue)
        
        for issue_type, issues in sorted(issues_by_type.items()):
            md.append(f"\n### {issue_type.replace('_', ' ').title()} ({len(issues)} issues)\n")
            
            # Group by file
            issues_by_file = defaultdict(list)
            for issue in issues:
                issues_by_file[issue['file']].append(issue)
            
            for file_path, file_issues in sorted(issues_by_file.items())[:10]:  # Limit to 10 files per type
                md.append(f"\n#### `{file_path}`\n")
                for issue in file_issues[:3]:  # Limit to 3 issues per file
                    md.append(f"**Line {issue['line']}:** {issue['description']}")
                    md.append(f"```tsx")
                    md.append(issue['context'])
                    md.append(f"```\n")
        
        md.append("\n---\n")
        md.append("## Detailed Findings by File\n")
        
        # Show top 20 files with most issues
        files_sorted = sorted(
            self.issues.items(),
            key=lambda x: sum(len(issues) for issues in x[1].values()),
            reverse=True
        )[:20]
        
        for file_path, file_issues in files_sorted:
            total_file_issues = sum(len(issues) for issues in file_issues.values())
            md.append(f"\n### `{file_path}` ({total_file_issues} issues)\n")
            
            for issue_type, issue_list in sorted(file_issues.items(), key=lambda x: len(x[1]), reverse=True):
                md.append(f"\n**{issue_type.replace('_', ' ').title()}** ({len(issue_list)} issues):")
                
                for issue in issue_list[:5]:  # Show first 5 of each type
                    severity_icon = '🔴' if issue.get('severity') == 'high' else '🟡' if issue.get('severity') == 'medium' else '🟢'
                    md.append(f"- {severity_icon} Line {issue['line']}: {issue['description']}")
        
        md.append("\n---\n")
        md.append("## Recommendations\n")
        md.append("### Immediate Actions (High Priority)\n")
        md.append("1. **Fix Missing Handlers:** All buttons must have onClick handlers or be type='submit'")
        md.append("2. **Fix Broken Toggles:** All Switch/Checkbox components need proper change handlers")
        md.append("3. **Remove Empty Handlers:** Replace console.log or empty onClick handlers with real functionality\n")
        
        md.append("### Short-term Actions (Medium Priority)\n")
        md.append("1. **Complete Forms:** Add onSubmit handlers to all form elements")
        md.append("2. **Add Error Handling:** Wrap async operations in try-catch or add .catch()")
        md.append("3. **Replace Placeholders:** Remove placeholder text and implement actual functionality\n")
        
        md.append("### Long-term Actions (Low Priority)\n")
        md.append("1. **Resolve TODO Comments:** Address all TODO/FIXME comments")
        md.append("2. **Review Hardcoded Disabled:** Check if buttons should be conditionally disabled")
        md.append("3. **Code Quality:** General cleanup and refactoring\n")
        
        output_path.write_text('\n'.join(md))
    
    def generate_json_report(self, output_path: Path):
        """Generate JSON report"""
        report = {
            'summary': self.get_summary(),
            'issues': dict(self.issues)
        }
        output_path.write_text(json.dumps(report, indent=2))

if __name__ == '__main__':
    analyzer = RefinedUIAnalyzer('/home/ubuntu/TERP')
    
    print("Starting refined UI analysis...")
    analyzer.analyze_all_files()
    
    print("\nGenerating reports...")
    analyzer.generate_json_report(Path('/home/ubuntu/ui_analysis/refined_report.json'))
    analyzer.generate_markdown_report(Path('/home/ubuntu/ui_analysis/refined_report.md'))
    
    summary = analyzer.get_summary()
    print(f"\n✓ Refined analysis complete!")
    print(f"  - Files with issues: {summary['total_files_with_issues']}")
    print(f"  - Total issues: {summary['total_issues']}")
    print(f"\nBy severity:")
    for severity, count in summary['issues_by_severity'].items():
        print(f"  - {severity.upper()}: {count}")
    print(f"\nReports saved to /home/ubuntu/ui_analysis/")

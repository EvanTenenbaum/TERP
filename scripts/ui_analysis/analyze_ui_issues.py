#!/usr/bin/env python3
"""
Comprehensive UI Issue Analyzer for TERP
Identifies broken buttons, placeholder elements, toggle fields, and edge cases
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Set
from collections import defaultdict

class UIIssueAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.client_path = self.repo_path / "client"
        self.issues = defaultdict(list)
        
        # Patterns to detect various UI issues
        self.patterns = {
            'placeholder_buttons': [
                r'onClick=\{.*?(?:console\.log|alert|undefined|null|\(\s*\)|\(\)\s*=>|=>.*?console)',
                r'<[Bb]utton[^>]*>.*?(?:TODO|FIXME|Placeholder|Coming Soon|TBD)',
                r'<[Bb]utton[^>]*disabled[^>]*>',
                r'onClick=\{.*?preventDefault.*?\}(?!\s*\n.*?\w)',  # onClick with only preventDefault
            ],
            'missing_handlers': [
                r'<[Bb]utton(?![^>]*onClick)',  # Button without onClick
                r'<button(?![^>]*onClick)',
                r'<input[^>]*type=["\'](?:submit|button)["\'](?![^>]*onClick)',
            ],
            'broken_toggles': [
                r'<[Ss]witch(?![^>]*onCheckedChange)',
                r'<[Tt]oggle(?![^>]*onPressedChange)',
                r'<[Cc]heckbox(?![^>]*onCheckedChange)',
            ],
            'placeholder_text': [
                r'(?:TODO|FIXME|XXX|HACK|PLACEHOLDER|TBD|IMPLEMENT|COMING SOON)',
            ],
            'empty_functions': [
                r'const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{\s*\}',
                r'function\s+\w+\s*\(\s*\)\s*\{\s*\}',
                r'onClick=\{\(\)\s*=>\s*\{\s*\}\}',
            ],
            'commented_handlers': [
                r'//.*?onClick',
                r'/\*.*?onClick.*?\*/',
            ],
            'incomplete_forms': [
                r'<form(?![^>]*onSubmit)',
                r'<Form(?![^>]*onSubmit)',
            ],
            'hardcoded_disabled': [
                r'disabled=\{true\}',
                r'disabled\s*=\s*"true"',
                r'disabled\s+',
            ],
            'missing_error_handling': [
                r'(?:fetch|axios|api)\s*\([^)]*\)(?!\s*\.(?:catch|then))',
                r'async\s+(?:function|\w+\s*=).*?\{(?!.*?try)',
            ],
            'unhandled_promises': [
                r'\.then\([^)]*\)(?!\s*\.catch)',
            ],
        }
        
    def analyze_file(self, file_path: Path) -> Dict:
        """Analyze a single file for UI issues"""
        try:
            content = file_path.read_text(encoding='utf-8')
            file_issues = defaultdict(list)
            
            lines = content.split('\n')
            
            for category, pattern_list in self.patterns.items():
                for pattern in pattern_list:
                    for match in re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE):
                        # Find line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        # Get context (3 lines before and after)
                        start_line = max(0, line_num - 4)
                        end_line = min(len(lines), line_num + 3)
                        context = '\n'.join(lines[start_line:end_line])
                        
                        file_issues[category].append({
                            'line': line_num,
                            'match': match.group(0)[:100],  # Truncate long matches
                            'context': context,
                            'pattern': pattern
                        })
            
            return dict(file_issues)
            
        except Exception as e:
            return {'error': str(e)}
    
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
        
        print(f"Found {len(component_files)} component files to analyze...")
        
        for file_path in component_files:
            relative_path = file_path.relative_to(self.repo_path)
            file_issues = self.analyze_file(file_path)
            
            if file_issues and 'error' not in file_issues:
                # Only include files with actual issues
                if any(len(v) > 0 for v in file_issues.values()):
                    self.issues[str(relative_path)] = file_issues
        
        return self.issues
    
    def generate_report(self, output_path: Path):
        """Generate a comprehensive report"""
        report = {
            'summary': self.get_summary(),
            'issues_by_file': dict(self.issues),
            'issues_by_category': self.get_issues_by_category()
        }
        
        output_path.write_text(json.dumps(report, indent=2))
        return report
    
    def get_summary(self) -> Dict:
        """Get summary statistics"""
        total_files_with_issues = len(self.issues)
        issues_by_category = defaultdict(int)
        
        for file_issues in self.issues.values():
            for category, issue_list in file_issues.items():
                issues_by_category[category] += len(issue_list)
        
        return {
            'total_files_with_issues': total_files_with_issues,
            'total_issues': sum(issues_by_category.values()),
            'issues_by_category': dict(issues_by_category)
        }
    
    def get_issues_by_category(self) -> Dict:
        """Organize issues by category across all files"""
        by_category = defaultdict(list)
        
        for file_path, file_issues in self.issues.items():
            for category, issue_list in file_issues.items():
                for issue in issue_list:
                    by_category[category].append({
                        'file': file_path,
                        **issue
                    })
        
        return dict(by_category)
    
    def generate_markdown_report(self, output_path: Path):
        """Generate a human-readable markdown report"""
        summary = self.get_summary()
        issues_by_category = self.get_issues_by_category()
        
        md = []
        md.append("# TERP UI Issues Analysis Report\n")
        md.append(f"**Generated:** {Path.cwd()}\n")
        md.append("## Executive Summary\n")
        md.append(f"- **Total Files with Issues:** {summary['total_files_with_issues']}")
        md.append(f"- **Total Issues Found:** {summary['total_issues']}\n")
        
        md.append("### Issues by Category\n")
        for category, count in sorted(summary['issues_by_category'].items(), key=lambda x: x[1], reverse=True):
            md.append(f"- **{category.replace('_', ' ').title()}:** {count}")
        
        md.append("\n---\n")
        md.append("## Detailed Findings by Category\n")
        
        for category, issues in sorted(issues_by_category.items(), key=lambda x: len(x[1]), reverse=True):
            md.append(f"\n### {category.replace('_', ' ').title()} ({len(issues)} issues)\n")
            
            # Group by file
            issues_by_file = defaultdict(list)
            for issue in issues:
                issues_by_file[issue['file']].append(issue)
            
            for file_path, file_issues in sorted(issues_by_file.items()):
                md.append(f"\n#### `{file_path}`\n")
                for issue in file_issues:
                    md.append(f"**Line {issue['line']}:**")
                    md.append(f"```")
                    md.append(issue['context'])
                    md.append(f"```\n")
        
        md.append("\n---\n")
        md.append("## Recommendations\n")
        md.append("1. **Priority 1 (Critical):** Fix missing handlers and broken toggles")
        md.append("2. **Priority 2 (High):** Address placeholder buttons and empty functions")
        md.append("3. **Priority 3 (Medium):** Add error handling for async operations")
        md.append("4. **Priority 4 (Low):** Clean up placeholder text and comments\n")
        
        output_path.write_text('\n'.join(md))

if __name__ == '__main__':
    analyzer = UIIssueAnalyzer('/home/ubuntu/TERP')
    
    print("Starting comprehensive UI analysis...")
    analyzer.analyze_all_files()
    
    print("\nGenerating reports...")
    analyzer.generate_report(Path('/home/ubuntu/ui_analysis/issues_report.json'))
    analyzer.generate_markdown_report(Path('/home/ubuntu/ui_analysis/issues_report.md'))
    
    summary = analyzer.get_summary()
    print(f"\n✓ Analysis complete!")
    print(f"  - Files analyzed: {len(analyzer.find_component_files())}")
    print(f"  - Files with issues: {summary['total_files_with_issues']}")
    print(f"  - Total issues found: {summary['total_issues']}")
    print(f"\nReports saved to /home/ubuntu/ui_analysis/")

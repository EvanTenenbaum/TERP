#!/usr/bin/env python3
"""
Edge Case Analyzer for TERP UI
Identifies potential edge cases and boundary conditions
"""

import re
import json
from pathlib import Path
from typing import List, Dict
from collections import defaultdict

class EdgeCaseAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.client_path = self.repo_path / "client"
        self.issues = defaultdict(list)
        
    def analyze_input_validation(self, content: str, file_path: str) -> List[Dict]:
        """Check for missing input validation"""
        issues = []
        
        # Find input elements
        input_pattern = r'<(?:input|Input|textarea|Textarea)([^>]*)>'
        
        for match in re.finditer(input_pattern, content, re.IGNORECASE):
            attrs = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            
            # Check for validation attributes
            has_required = 'required' in attrs.lower()
            has_pattern = 'pattern' in attrs.lower()
            has_min = 'min' in attrs.lower() or 'minlength' in attrs.lower()
            has_max = 'max' in attrs.lower() or 'maxlength' in attrs.lower()
            
            input_type = re.search(r'type\s*=\s*["\'](\w+)["\']', attrs)
            input_type = input_type.group(1) if input_type else 'text'
            
            # Check for common validation issues
            if input_type in ['email', 'url', 'tel'] and not has_pattern:
                issues.append({
                    'type': 'missing_validation',
                    'severity': 'medium',
                    'line': line_num,
                    'description': f'{input_type} input without pattern validation',
                    'recommendation': f'Add pattern validation for {input_type} input'
                })
            
            if input_type in ['number', 'range'] and not (has_min or has_max):
                issues.append({
                    'type': 'unbounded_numeric_input',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Numeric input without min/max bounds',
                    'recommendation': 'Add min and max attributes to prevent invalid values'
                })
            
            if input_type == 'text' and not has_max:
                issues.append({
                    'type': 'unbounded_text_input',
                    'severity': 'low',
                    'line': line_num,
                    'description': 'Text input without maxLength',
                    'recommendation': 'Consider adding maxLength to prevent extremely long inputs'
                })
        
        return issues
    
    def analyze_array_operations(self, content: str, file_path: str) -> List[Dict]:
        """Check for unsafe array operations"""
        issues = []
        
        # Find array access without bounds checking
        array_access_pattern = r'(\w+)\[(\w+|\d+)\](?!\s*\?)'
        
        for match in re.finditer(array_access_pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            
            # Check if there's a length check nearby
            context_start = max(0, match.start() - 200)
            context_end = min(len(content), match.end() + 200)
            context = content[context_start:context_end]
            
            array_name = match.group(1)
            
            # Look for length check
            has_length_check = bool(re.search(
                rf'{array_name}\.length|{array_name}\?\.|\?{array_name}',
                context
            ))
            
            if not has_length_check and not match.group(1) in ['props', 'state', 'this']:
                issues.append({
                    'type': 'unsafe_array_access',
                    'severity': 'medium',
                    'line': line_num,
                    'description': f'Array access without bounds checking: {match.group(0)}',
                    'recommendation': 'Add optional chaining or length check'
                })
        
        # Find .map() without key prop
        map_pattern = r'\.map\s*\(\s*\([^)]*\)\s*=>\s*<'
        
        for match in re.finditer(map_pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            
            # Check next 100 chars for key prop
            context = content[match.end():match.end() + 100]
            has_key = bool(re.search(r'key\s*=', context))
            
            if not has_key:
                issues.append({
                    'type': 'missing_key_prop',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Array.map() without key prop',
                    'recommendation': 'Add unique key prop to mapped elements'
                })
        
        return issues
    
    def analyze_null_safety(self, content: str, file_path: str) -> List[Dict]:
        """Check for potential null/undefined access"""
        issues = []
        
        # Find property access without optional chaining
        prop_access_pattern = r'(\w+)\.(\w+)(?!\?)'
        
        # Common props that might be null/undefined
        nullable_props = {'user', 'data', 'response', 'result', 'item', 'row', 'record'}
        
        for match in re.finditer(prop_access_pattern, content):
            obj_name = match.group(1)
            
            if obj_name.lower() in nullable_props:
                line_num = content[:match.start()].count('\n') + 1
                
                # Check if there's a null check nearby
                context_start = max(0, match.start() - 200)
                context = content[context_start:match.start()]
                
                has_null_check = bool(re.search(
                    rf'{obj_name}\s*&&|if\s*\(\s*{obj_name}\s*\)|{obj_name}\?',
                    context
                ))
                
                if not has_null_check:
                    issues.append({
                        'type': 'potential_null_access',
                        'severity': 'medium',
                        'line': line_num,
                        'description': f'Potential null/undefined access: {match.group(0)}',
                        'recommendation': 'Add null check or use optional chaining'
                    })
        
        return issues
    
    def analyze_state_mutations(self, content: str, file_path: str) -> List[Dict]:
        """Check for direct state mutations"""
        issues = []
        
        # Find potential state mutations
        mutation_patterns = [
            r'(state|props)\.(\w+)\s*=\s*',  # Direct assignment
            r'(state|props)\.(\w+)\.push\(',  # Array push
            r'(state|props)\.(\w+)\.pop\(',   # Array pop
        ]
        
        for pattern in mutation_patterns:
            for match in re.finditer(pattern, content):
                line_num = content[:match.start()].count('\n') + 1
                
                issues.append({
                    'type': 'state_mutation',
                    'severity': 'high',
                    'line': line_num,
                    'description': f'Direct state/props mutation: {match.group(0)}',
                    'recommendation': 'Use setState or immutable update patterns'
                })
        
        return issues
    
    def analyze_event_handlers(self, content: str, file_path: str) -> List[Dict]:
        """Check for missing event.preventDefault() where needed"""
        issues = []
        
        # Find form submissions without preventDefault
        form_submit_pattern = r'onSubmit\s*=\s*\{([^}]+)\}'
        
        for match in re.finditer(form_submit_pattern, content):
            handler = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            
            # Check if preventDefault is called
            has_prevent_default = 'preventDefault' in handler
            
            if not has_prevent_default and 'handleSubmit' not in handler:
                issues.append({
                    'type': 'missing_prevent_default',
                    'severity': 'medium',
                    'line': line_num,
                    'description': 'Form submit handler without preventDefault',
                    'recommendation': 'Add e.preventDefault() to prevent page reload'
                })
        
        return issues
    
    def analyze_accessibility(self, content: str, file_path: str) -> List[Dict]:
        """Check for accessibility issues"""
        issues = []
        
        # Find images without alt text
        img_pattern = r'<img(?![^>]*alt\s*=)[^>]*>'
        
        for match in re.finditer(img_pattern, content, re.IGNORECASE):
            line_num = content[:match.start()].count('\n') + 1
            
            issues.append({
                'type': 'missing_alt_text',
                'severity': 'medium',
                'line': line_num,
                'description': 'Image without alt text',
                'recommendation': 'Add alt attribute for accessibility'
            })
        
        # Find buttons without aria-label or text
        button_pattern = r'<button(?![^>]*aria-label)[^>]*>\s*<(?:svg|icon|i\s+class)'
        
        for match in re.finditer(button_pattern, content, re.IGNORECASE):
            line_num = content[:match.start()].count('\n') + 1
            
            issues.append({
                'type': 'icon_button_no_label',
                'severity': 'medium',
                'line': line_num,
                'description': 'Icon button without aria-label',
                'recommendation': 'Add aria-label for screen readers'
            })
        
        return issues
    
    def analyze_performance(self, content: str, file_path: str) -> List[Dict]:
        """Check for potential performance issues"""
        issues = []
        
        # Find inline function definitions in render
        inline_fn_pattern = r'(?:onClick|onChange|onSubmit)\s*=\s*\{(?:\([^)]*\)\s*=>|\(\)\s*=>)'
        
        for match in re.finditer(inline_fn_pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            
            # This is actually common in React, so mark as low severity
            issues.append({
                'type': 'inline_function',
                'severity': 'low',
                'line': line_num,
                'description': 'Inline function in JSX (may cause re-renders)',
                'recommendation': 'Consider useCallback for optimization if needed'
            })
        
        # Find missing React.memo for components with props
        component_pattern = r'(?:export\s+)?(?:const|function)\s+(\w+)\s*=?\s*\([^)]*props[^)]*\)\s*(?:=>|:)'
        
        for match in re.finditer(component_pattern, content):
            component_name = match.group(1)
            
            # Check if wrapped in memo
            context_start = max(0, match.start() - 100)
            context = content[context_start:match.start()]
            
            has_memo = bool(re.search(r'React\.memo|memo\s*\(', context))
            
            if not has_memo and component_name[0].isupper():  # Only for components
                line_num = content[:match.start()].count('\n') + 1
                
                issues.append({
                    'type': 'missing_memo',
                    'severity': 'low',
                    'line': line_num,
                    'description': f'Component {component_name} not wrapped in React.memo',
                    'recommendation': 'Consider React.memo for performance optimization'
                })
        
        return issues
    
    def analyze_file(self, file_path: Path) -> List[Dict]:
        """Analyze a single file for edge cases"""
        try:
            content = file_path.read_text(encoding='utf-8')
            
            all_issues = []
            all_issues.extend(self.analyze_input_validation(content, str(file_path)))
            all_issues.extend(self.analyze_array_operations(content, str(file_path)))
            all_issues.extend(self.analyze_null_safety(content, str(file_path)))
            all_issues.extend(self.analyze_state_mutations(content, str(file_path)))
            all_issues.extend(self.analyze_event_handlers(content, str(file_path)))
            all_issues.extend(self.analyze_accessibility(content, str(file_path)))
            all_issues.extend(self.analyze_performance(content, str(file_path)))
            
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
        """Analyze all files"""
        component_files = self.find_component_files()
        
        print(f"Analyzing {len(component_files)} files for edge cases...")
        
        for i, file_path in enumerate(component_files, 1):
            if i % 50 == 0:
                print(f"  Progress: {i}/{len(component_files)}...")
            
            relative_path = str(file_path.relative_to(self.repo_path))
            file_issues = self.analyze_file(file_path)
            
            if file_issues:
                self.issues[relative_path] = file_issues
        
        return dict(self.issues)
    
    def get_summary(self) -> Dict:
        """Get summary statistics"""
        total_files = len(self.issues)
        issues_by_type = defaultdict(int)
        issues_by_severity = defaultdict(int)
        
        for file_issues in self.issues.values():
            for issue in file_issues:
                issue_type = issue.get('type', 'unknown')
                severity = issue.get('severity', 'unknown')
                issues_by_type[issue_type] += 1
                issues_by_severity[severity] += 1
        
        return {
            'total_files_with_issues': total_files,
            'total_issues': sum(issues_by_type.values()),
            'issues_by_type': dict(sorted(issues_by_type.items(), key=lambda x: x[1], reverse=True)),
            'issues_by_severity': dict(sorted(issues_by_severity.items(), key=lambda x: x[1], reverse=True))
        }
    
    def generate_report(self, output_path: Path):
        """Generate JSON report"""
        report = {
            'summary': self.get_summary(),
            'issues': dict(self.issues)
        }
        output_path.write_text(json.dumps(report, indent=2))

if __name__ == '__main__':
    analyzer = EdgeCaseAnalyzer('/home/ubuntu/TERP')
    
    print("Starting edge case analysis...")
    analyzer.analyze_all_files()
    
    print("\nGenerating report...")
    analyzer.generate_report(Path('/home/ubuntu/ui_analysis/edge_case_report.json'))
    
    summary = analyzer.get_summary()
    print(f"\n✓ Edge case analysis complete!")
    print(f"  - Files analyzed: {summary['total_files_with_issues']}")
    print(f"  - Total edge cases found: {summary['total_issues']}")
    print(f"\nBy severity:")
    for severity, count in summary['issues_by_severity'].items():
        print(f"  - {severity.upper()}: {count}")
    print(f"\nReport saved to /home/ubuntu/ui_analysis/edge_case_report.json")

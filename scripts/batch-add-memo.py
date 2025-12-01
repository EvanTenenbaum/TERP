#!/usr/bin/env python3
"""
Batch add React.memo to components
Simple approach: Add memo() wrapper to all component exports
"""

import os
import re
import json

def add_memo_to_file(file_path):
    """Add React.memo to a component file."""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if already has memo
    if 'memo(' in content or 'React.memo' in content:
        return False, "Already has memo"
    
    # Add memo import
    if 'from "react"' in content or "from 'react'" in content:
        # Add memo to existing React import
        content = re.sub(
            r'import\s+{([^}]+)}\s+from\s+["\']react["\']',
            lambda m: f'import {{ memo, {m.group(1)} }} from "react"' if 'memo' not in m.group(1) else m.group(0),
            content
        )
    else:
        # Add new import at the top
        content = 'import { memo } from "react";\n' + content
    
    # Find and wrap export
    # Pattern 1: export function ComponentName
    pattern1 = r'export function (\w+)\s*\('
    match1 = re.search(pattern1, content)
    
    if match1:
        component_name = match1.group(1)
        # Replace export function with export const + memo
        content = re.sub(
            rf'export function {component_name}\s*\(',
            f'export const {component_name} = memo(function {component_name}(',
            content
        )
        
        # Find the closing brace of the function and add closing paren
        # This is tricky - we need to find the last } before the next export or EOF
        # Simple approach: add }); at the very end if it doesn't exist
        if not content.rstrip().endswith('});'):
            # Find the last closing brace
            lines = content.split('\n')
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].strip() == '}':
                    lines[i] = '});'
                    break
            content = '\n'.join(lines)
        
        return True, f"Added memo to {component_name}"
    
    # Pattern 2: export const ComponentName = (props) =>
    pattern2 = r'export const (\w+)\s*=\s*\('
    match2 = re.search(pattern2, content)
    
    if match2:
        component_name = match2.group(1)
        content = re.sub(
            rf'export const {component_name}\s*=\s*\(',
            f'export const {component_name} = memo((',
            content
        )
        # Add closing paren at the end
        if not content.rstrip().endswith(');'):
            content = content.rstrip() + ');\n'
        
        return True, f"Added memo to {component_name}"
    
    return False, "Could not find export pattern"

def main():
    # Load components
    with open("docs/PERF-002-HIGH-VALUE-COMPONENTS.json", 'r') as f:
        data = json.load(f)
    
    components = data['to_memoize']
    
    print("="*80)
    print("BATCH ADDING REACT.MEMO")
    print("="*80)
    print(f"\nProcessing {len(components)} components...\n")
    
    success = []
    failed = []
    
    for comp in components:
        file_path = comp['file_path']
        comp_name = comp['component_name']
        
        print(f"Processing: {comp_name}")
        
        # Skip CommentList (already done manually)
        if 'CommentList' in file_path:
            print(f"  ⏭️  Already processed manually")
            success.append(comp_name)
            continue
        
        try:
            result, message = add_memo_to_file(file_path)
            if result:
                print(f"  ✅ {message}")
                success.append(comp_name)
            else:
                print(f"  ⚠️  {message}")
                failed.append((comp_name, message))
        except Exception as e:
            print(f"  ❌ Error: {e}")
            failed.append((comp_name, str(e)))
    
    print(f"\n{'='*80}")
    print(f"RESULTS")
    print(f"{'='*80}")
    print(f"Success: {len(success)}/{len(components)}")
    print(f"Failed: {len(failed)}")
    
    if failed:
        print(f"\nFailed components:")
        for name, reason in failed:
            print(f"  - {name}: {reason}")

if __name__ == "__main__":
    main()

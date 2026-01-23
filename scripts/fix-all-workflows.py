#!/usr/bin/env python3
"""
Script to fix all GitHub Actions workflows for proper pnpm setup order.
pnpm must be installed BEFORE setup-node when using cache: 'pnpm'
"""

import os
import re
import glob

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

def fix_workflow(content):
    """
    Fix the pnpm setup order in a workflow file.
    This function swaps the order of setup-node and pnpm setup steps.
    """
    lines = content.split('\n')
    
    # Find all step blocks
    step_blocks = []
    current_block_start = None
    current_block_indent = None
    
    for i, line in enumerate(lines):
        # Check for step start (- name: or - uses:)
        step_match = re.match(r'^(\s*)- (name:|uses:)', line)
        if step_match:
            if current_block_start is not None:
                step_blocks.append((current_block_start, i - 1, current_block_indent))
            current_block_start = i
            current_block_indent = len(step_match.group(1))
    
    # Don't forget the last block
    if current_block_start is not None:
        step_blocks.append((current_block_start, len(lines) - 1, current_block_indent))
    
    # Find setup-node and pnpm setup blocks
    setup_node_block = None
    pnpm_setup_block = None
    
    for start, end, indent in step_blocks:
        block_content = '\n'.join(lines[start:end+1])
        if 'setup-node@v4' in block_content or 'Setup Node.js' in block_content:
            setup_node_block = (start, end, indent, block_content)
        if 'pnpm/action-setup' in block_content or 'Setup pnpm' in block_content:
            pnpm_setup_block = (start, end, indent, block_content)
    
    if setup_node_block is None or pnpm_setup_block is None:
        return content, False
    
    # Check if setup-node comes before pnpm setup
    if setup_node_block[0] > pnpm_setup_block[0]:
        return content, False  # Already in correct order
    
    # Swap the blocks
    # Get the lines for each block
    setup_node_lines = lines[setup_node_block[0]:setup_node_block[1]+1]
    pnpm_setup_lines = lines[pnpm_setup_block[0]:pnpm_setup_block[1]+1]
    
    # Find where each block ends (including any blank lines after)
    setup_node_end = setup_node_block[1]
    pnpm_setup_end = pnpm_setup_block[1]
    
    # Create new content with swapped blocks
    new_lines = []
    i = 0
    while i < len(lines):
        if i == setup_node_block[0]:
            # Insert pnpm setup block here instead
            new_lines.extend(pnpm_setup_lines)
            i = setup_node_block[1] + 1
        elif i == pnpm_setup_block[0]:
            # Insert setup-node block here instead
            new_lines.extend(setup_node_lines)
            i = pnpm_setup_block[1] + 1
        else:
            new_lines.append(lines[i])
            i += 1
    
    return '\n'.join(new_lines), True

def main():
    workflows_dir = '/home/ubuntu/TERP/.github/workflows'
    workflow_files = glob.glob(f'{workflows_dir}/*.yml')
    
    fixed_count = 0
    
    for filepath in workflow_files:
        filename = os.path.basename(filepath)
        content = read_file(filepath)
        
        # Check if this workflow uses pnpm
        if 'pnpm/action-setup' not in content:
            continue
        
        new_content, was_fixed = fix_workflow(content)
        
        if was_fixed:
            write_file(filepath, new_content)
            print(f"✅ Fixed: {filename}")
            fixed_count += 1
        else:
            print(f"⏭️  Skipped (already correct or no changes needed): {filename}")
    
    print(f"\nTotal workflows fixed: {fixed_count}")

if __name__ == '__main__':
    main()

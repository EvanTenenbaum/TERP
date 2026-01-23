#!/usr/bin/env python3
"""
AI-powered script to fix all GitHub Actions workflows for proper pnpm setup.
Uses OpenAI API to generate comprehensive fixes.
"""

import os
import glob
import re
from openai import OpenAI

client = OpenAI()

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

def fix_workflow_pnpm_order(content, filename):
    """
    Fix the pnpm setup order in a workflow file.
    pnpm must be installed BEFORE setup-node with cache: 'pnpm'
    """
    # Check if this workflow uses pnpm
    if 'pnpm/action-setup' not in content:
        return content, False
    
    # Check if setup-node comes before pnpm setup
    setup_node_match = re.search(r'(- name: Setup Node\.js\s+uses: actions/setup-node@v4\s+with:\s+node-version:[^\n]+\n(?:\s+cache:[^\n]+\n)?)', content)
    pnpm_setup_match = re.search(r'(- name: Setup pnpm\s+uses: pnpm/action-setup@v2\s+with:\s+version: \d+)', content)
    
    if not setup_node_match or not pnpm_setup_match:
        return content, False
    
    setup_node_pos = setup_node_match.start()
    pnpm_setup_pos = pnpm_setup_match.start()
    
    # If setup-node comes before pnpm setup, we need to fix it
    if setup_node_pos < pnpm_setup_pos:
        # Use AI to fix the workflow
        response = client.responses.create(
            model="gpt-4o",
            input=f"""Fix this GitHub Actions workflow file. The issue is that pnpm must be installed BEFORE setup-node when using cache: 'pnpm'.

Current workflow content:
```yaml
{content}
```

Rules:
1. Move the "Setup pnpm" step to come BEFORE "Setup Node.js"
2. Keep all other steps in their original order
3. Ensure proper indentation (2 spaces per level)
4. Do NOT change any other part of the workflow
5. Return ONLY the fixed YAML content, no explanations

Fixed workflow:"""
        )
        return response.output_text.strip(), True
    
    return content, False

def main():
    workflows_dir = '/home/ubuntu/TERP/.github/workflows'
    workflow_files = glob.glob(f'{workflows_dir}/*.yml')
    
    fixed_count = 0
    
    for filepath in workflow_files:
        filename = os.path.basename(filepath)
        content = read_file(filepath)
        
        # Check if this workflow needs fixing
        if 'pnpm/action-setup' in content and 'setup-node' in content:
            # Check the order
            lines = content.split('\n')
            setup_node_line = -1
            pnpm_setup_line = -1
            
            for i, line in enumerate(lines):
                if 'Setup Node.js' in line or 'setup-node@v4' in line:
                    if setup_node_line == -1:
                        setup_node_line = i
                if 'Setup pnpm' in line or 'pnpm/action-setup' in line:
                    if pnpm_setup_line == -1:
                        pnpm_setup_line = i
            
            if setup_node_line != -1 and pnpm_setup_line != -1:
                if setup_node_line < pnpm_setup_line:
                    print(f"⚠️  {filename}: setup-node (line {setup_node_line}) comes before pnpm (line {pnpm_setup_line}) - NEEDS FIX")
                else:
                    print(f"✅ {filename}: pnpm setup order is correct")
        else:
            print(f"⏭️  {filename}: No pnpm setup found, skipping")
    
    print(f"\nTotal workflows checked: {len(workflow_files)}")

if __name__ == '__main__':
    main()

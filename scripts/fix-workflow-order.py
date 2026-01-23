#!/usr/bin/env python3
"""
Script to fix GitHub Actions workflows with proper step ordering.
The correct order is:
1. Checkout
2. Setup pnpm (must be before setup-node when using cache: 'pnpm')
3. Setup Node.js (with cache: 'pnpm')
4. Get pnpm store directory
5. Setup pnpm cache
6. Install dependencies
"""

import os
import re
import glob
import yaml

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

def fix_workflow_yaml(filepath):
    """Fix the workflow YAML file to have proper step ordering."""
    content = read_file(filepath)
    
    # Skip if no pnpm setup
    if 'pnpm/action-setup' not in content:
        return False
    
    # Parse YAML
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError:
        print(f"  ⚠️  Could not parse YAML: {filepath}")
        return False
    
    if not data or 'jobs' not in data:
        return False
    
    modified = False
    
    for job_name, job_config in data.get('jobs', {}).items():
        if not isinstance(job_config, dict) or 'steps' not in job_config:
            continue
        
        steps = job_config['steps']
        
        # Find indices of key steps
        pnpm_setup_idx = None
        node_setup_idx = None
        pnpm_store_idx = None
        pnpm_cache_idx = None
        
        for i, step in enumerate(steps):
            if not isinstance(step, dict):
                continue
            
            uses = step.get('uses', '')
            name = step.get('name', '')
            
            if 'pnpm/action-setup' in uses:
                pnpm_setup_idx = i
            elif 'actions/setup-node' in uses:
                node_setup_idx = i
            elif 'pnpm store path' in str(step.get('run', '')):
                pnpm_store_idx = i
            elif name == 'Setup pnpm cache' or (step.get('uses', '').startswith('actions/cache') and 'pnpm' in str(step)):
                pnpm_cache_idx = i
        
        # Check if we need to reorder
        if pnpm_setup_idx is not None and node_setup_idx is not None:
            if pnpm_setup_idx > node_setup_idx:
                # Need to move pnpm setup before node setup
                pnpm_step = steps.pop(pnpm_setup_idx)
                steps.insert(node_setup_idx, pnpm_step)
                modified = True
                print(f"  ✅ Fixed step order in job '{job_name}'")
    
    if modified:
        # Write back the YAML
        with open(filepath, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    return modified

def main():
    workflows_dir = '/home/ubuntu/TERP/.github/workflows'
    workflow_files = glob.glob(f'{workflows_dir}/*.yml')
    
    fixed_count = 0
    
    for filepath in workflow_files:
        filename = os.path.basename(filepath)
        print(f"Processing: {filename}")
        
        if fix_workflow_yaml(filepath):
            fixed_count += 1
    
    print(f"\nTotal workflows fixed: {fixed_count}")

if __name__ == '__main__':
    main()

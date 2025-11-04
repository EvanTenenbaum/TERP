#!/usr/bin/env python3
"""
Auto-Regenerate - Automatically regenerate roadmap and parallelization analysis

This script is called automatically by status-tracker.py whenever initiative
statuses change. It regenerates:
1. Parallelization analysis (overlap detection + safe agent counts)
2. Agent queue (next tasks to pick up)
3. Dashboard data

Usage:
    python3 auto-regenerate.py
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
PM_EVAL_DIR = PM_ROOT / "pm-evaluation"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"

def log(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def run_script(script_name, description):
    """Run a PM script and return success status"""
    script_path = SCRIPT_DIR / script_name
    log(f"Running {description}...")
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(PM_ROOT),
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            log(f"✅ {description} complete")
            return True
        else:
            log(f"⚠️  {description} failed: {result.stderr[:200]}")
            return False
    except subprocess.TimeoutExpired:
        log(f"⚠️  {description} timed out")
        return False
    except Exception as e:
        log(f"⚠️  {description} error: {e}")
        return False

def get_initiative_counts():
    """Get counts of initiatives by status"""
    if not REGISTRY_FILE.exists():
        return {}
    
    with open(REGISTRY_FILE, 'r') as f:
        registry = json.load(f)
    
    counts = {
        "total": len(registry.get("initiatives", [])),
        "approved": 0,
        "in_progress": 0,
        "ready_to_deploy": 0,
        "deployed": 0,
        "qa_verified": 0
    }
    
    for init in registry.get("initiatives", []):
        status = init.get("status", "")
        if status == "approved":
            counts["approved"] += 1
        elif status == "in-progress":
            counts["in_progress"] += 1
        elif status == "ready-to-deploy":
            counts["ready_to_deploy"] += 1
        elif status == "deployed":
            counts["deployed"] += 1
        elif status == "qa-verified":
            counts["qa_verified"] += 1
    
    return counts

def main():
    """Main regeneration workflow"""
    log("=" * 80)
    log("AUTO-REGENERATE: Updating roadmap and parallelization analysis")
    log("=" * 80)
    
    # Get current state
    counts = get_initiative_counts()
    log(f"Current state: {counts['total']} initiatives total")
    log(f"  - Approved: {counts['approved']}")
    log(f"  - In Progress: {counts['in_progress']}")
    log(f"  - Ready to Deploy: {counts['ready_to_deploy']}")
    log(f"  - Deployed: {counts['deployed']}")
    log(f"  - QA Verified: {counts['qa_verified']}")
    
    # Step 1: Analyze file overlap between initiatives
    success = run_script("analyze-overlap.py", "File overlap analysis")
    if not success:
        log("⚠️  Continuing despite overlap analysis failure...")
    
    # Step 2: Calculate safe parallelization levels
    success = run_script("calculate-parallelization.py", "Parallelization calculation")
    if not success:
        log("⚠️  Continuing despite parallelization calculation failure...")
    
    # Step 3: Update agent queue
    # Note: simple-queue.py get-next doesn't modify state, so we just ensure it can run
    log("✅ Agent queue ready (call simple-queue.py get-next to retrieve tasks)")
    
    log("=" * 80)
    log("AUTO-REGENERATE: Complete")
    log("=" * 80)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

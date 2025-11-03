#!/usr/bin/env python3
"""
PRD Migration Helper Script

Helps migrate existing PRDs into the PM system.
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
import subprocess

BASE_DIR = Path(__file__).parent.parent.parent
INITIATIVES_DIR = BASE_DIR / "initiatives"

def create_initiative_from_prd(prd_file, title, tags=None):
    """Create an initiative from a PRD file"""
    prd_path = Path(prd_file)
    
    if not prd_path.exists():
        print(f"❌ PRD file not found: {prd_file}")
        return None
    
    # Read PRD content
    with open(prd_path, 'r') as f:
        prd_content = f.read()
    
    # Create initiative using initiative-manager
    cmd = [
        "python3",
        str(BASE_DIR / "_system/scripts/initiative-manager.py"),
        "create",
        title
    ]
    
    if tags:
        cmd.extend(["--tags"] + tags)
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Failed to create initiative: {result.stderr}")
        return None
    
    # Extract initiative ID from output
    output_lines = result.stdout.strip().split('\n')
    init_id = None
    for line in output_lines:
        if "TERP-INIT-" in line:
            # Extract ID
            parts = line.split()
            for part in parts:
                if part.startswith("TERP-INIT-"):
                    init_id = part.strip(',:')
                    break
    
    if not init_id:
        print(f"❌ Could not extract initiative ID from output")
        return None
    
    print(f"✅ Created initiative: {init_id}")
    
    # Create initiative directory structure
    init_dir = INITIATIVES_DIR / init_id
    docs_dir = init_dir / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy PRD content to overview
    overview_file = init_dir / "overview.md"
    with open(overview_file, 'w') as f:
        f.write(f"# {title}\n\n")
        f.write(f"**Migrated from**: `{prd_file}`\n\n")
        f.write("---\n\n")
        f.write(prd_content)
    
    print(f"📄 Created overview: {overview_file}")
    
    # Create reference to original PRD
    original_ref = docs_dir / "original-prd-reference.md"
    with open(original_ref, 'w') as f:
        f.write(f"# Original PRD Reference\n\n")
        f.write(f"**Original Location**: `{prd_file}`\n")
        f.write(f"**Migrated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")
        f.write("This initiative was migrated from an existing PRD. ")
        f.write("The full content has been copied to `overview.md`.\n")
    
    print(f"📝 Created reference: {original_ref}")
    
    return init_id

def submit_for_evaluation(init_id):
    """Submit initiative for PM evaluation"""
    cmd = [
        "python3",
        str(BASE_DIR / "_system/scripts/status-tracker.py"),
        "update",
        init_id,
        "--status",
        "pending_review"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Failed to submit for evaluation: {result.stderr}")
        return False
    
    print(f"✅ Submitted {init_id} for evaluation")
    return True

def wait_for_feedback(init_id, timeout=30):
    """Wait for feedback file to be created"""
    import time
    
    feedback_file = BASE_DIR / "pm-evaluation" / "feedback" / f"{init_id}-feedback.md"
    
    print(f"⏳ Waiting for evaluation feedback...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        if feedback_file.exists():
            print(f"✅ Feedback received: {feedback_file}")
            return feedback_file
        time.sleep(1)
    
    print(f"⚠️  Timeout waiting for feedback (may still be processing)")
    return None

def read_feedback(init_id):
    """Read and display feedback"""
    feedback_file = BASE_DIR / "pm-evaluation" / "feedback" / f"{init_id}-feedback.md"
    
    if not feedback_file.exists():
        print(f"ℹ️  Feedback not yet available for {init_id}")
        return None
    
    with open(feedback_file, 'r') as f:
        content = f.read()
    
    print(f"\n{'='*80}")
    print(f"Feedback for {init_id}")
    print(f"{'='*80}\n")
    print(content)
    print()
    
    return content

def main():
    if len(sys.argv) < 3:
        print("Usage: migrate-prd.py <prd_file> <title> [--tags tag1 tag2 ...]")
        print("\nExample:")
        print("  migrate-prd.py /path/to/AUTH_PRD.md \"Authentication System\" --tags auth security")
        sys.exit(1)
    
    prd_file = sys.argv[1]
    title = sys.argv[2]
    
    # Parse tags
    tags = []
    if len(sys.argv) > 3 and sys.argv[3] == "--tags":
        tags = sys.argv[4:]
    
    print(f"\n{'='*80}")
    print(f"Migrating PRD to PM System")
    print(f"{'='*80}\n")
    print(f"PRD File: {prd_file}")
    print(f"Title: {title}")
    print(f"Tags: {', '.join(tags) if tags else 'None'}")
    print()
    
    # Create initiative
    init_id = create_initiative_from_prd(prd_file, title, tags)
    if not init_id:
        sys.exit(1)
    
    print()
    
    # Submit for evaluation
    if not submit_for_evaluation(init_id):
        sys.exit(1)
    
    print()
    
    # Wait for feedback
    feedback_file = wait_for_feedback(init_id)
    
    if feedback_file:
        read_feedback(init_id)
    else:
        print(f"\nℹ️  Check feedback later at:")
        print(f"   pm-evaluation/feedback/{init_id}-feedback.md")
    
    print(f"\n✅ Migration complete for {init_id}")
    print(f"\nNext steps:")
    print(f"  1. Review the feedback")
    print(f"  2. Check the initiative at: initiatives/{init_id}/")
    print(f"  3. Add any missing documentation to: initiatives/{init_id}/docs/")
    print()

if __name__ == "__main__":
    main()

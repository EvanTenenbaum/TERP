#!/usr/bin/env python3
"""
⚠️ DEPRECATED: This script is from the old PM system

The old FEAT/IDEA/BUG-based system has been deprecated.

Use the NEW system instead:
- initiative-manager.py (for creating initiatives)
- status-tracker.py (for tracking progress)
- pm-evaluator.py (for PM operations)

Read: /home/ubuntu/TERP/product-management/_system/DEPRECATED_OLD_SYSTEM.md
"""

print("=" * 70)
print("⚠️  ERROR: This script is DEPRECATED")
print("=" * 70)
print()
print("The old FEAT/IDEA/BUG-based PM system has been removed.")
print()
print("Use the NEW INIT-based system instead:")
print()
print("  Create initiative:")
print("    python3 _system/scripts/initiative-manager.py create \"Title\" --tags tag1 tag2")
print()
print("  Update status:")
print("    python3 _system/scripts/status-tracker.py update TERP-INIT-XXX --status in-progress")
print()
print("  Get next task:")
print("    python3 _system/scripts/pm-evaluator.py get-next-task")
print()
print("Read the deprecation notice:")
print("  cat /home/ubuntu/TERP/product-management/_system/DEPRECATED_OLD_SYSTEM.md")
print()
print("Or start here:")
print("  cat /home/ubuntu/TERP/product-management/START_HERE.md")
print()
print("=" * 70)

import sys
sys.exit(1)

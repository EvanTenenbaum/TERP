#!/usr/bin/env python3
"""
Initiative Manager - Create and manage development initiatives

Usage:
    python3 initiative-manager.py create "Initiative Title" --tags tag1,tag2
    python3 initiative-manager.py list [--status STATUS]
    python3 initiative-manager.py show TERP-INIT-001
    python3 initiative-manager.py update TERP-INIT-001 --status in-progress
    python3 initiative-manager.py stats
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import argparse

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"
PM_INBOX = PM_ROOT / "pm-evaluation" / "inbox"


def load_registry():
    """Load the initiatives registry"""
    if not REGISTRY_FILE.exists():
        return {
            "initiatives": [],
            "next_id": 1,
            "last_updated": datetime.utcnow().isoformat() + "Z",
            "metadata": {
                "total_count": 0,
                "by_status": {}
            }
        }
    
    with open(REGISTRY_FILE, 'r') as f:
        return json.load(f)


def save_registry(registry):
    """Save the initiatives registry"""
    registry["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)


def create_initiative(title, tags=None, created_by="dev-agent"):
    """Create a new initiative"""
    registry = load_registry()
    
    # Generate ID
    init_id = f"TERP-INIT-{registry['next_id']:03d}"
    registry['next_id'] += 1
    
    # Create initiative directory
    init_dir = INITIATIVES_DIR / init_id
    init_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (init_dir / "features").mkdir(exist_ok=True)
    (init_dir / "docs").mkdir(exist_ok=True)
    (init_dir / "artifacts").mkdir(exist_ok=True)
    
    # Create manifest
    manifest = {
        "id": init_id,
        "title": title,
        "created_by": created_by,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "status": "pending_review",
        "priority": None,
        "estimated_effort": None,
        "features": [],
        "dependencies": [],
        "conflicts": [],
        "tags": tags or [],
        "metadata": {
            "complexity": None,
            "risk_level": None,
            "business_value": None
        }
    }
    
    with open(init_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create overview template
    overview = f"""# {init_id}: {title}

**Status**: Pending Review  
**Created**: {datetime.utcnow().strftime('%Y-%m-%d')}  
**Created By**: {created_by}

---

## Overview

[Provide a high-level description of this initiative]

## Objectives

- [Objective 1]
- [Objective 2]
- [Objective 3]

## Scope

### In Scope
- [Item 1]
- [Item 2]

### Out of Scope
- [Item 1]
- [Item 2]

## Features Included

[List features that are part of this initiative]

## Dependencies

[List any dependencies on other initiatives or external factors]

## Success Criteria

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## Implementation Notes

[Any important notes for implementation]

---

**Next Steps**: Submit for PM evaluation
"""
    
    with open(init_dir / "overview.md", 'w') as f:
        f.write(overview)
    
    # Create progress tracking file
    progress = f"""# Progress Tracking: {init_id}

**Initiative**: {title}  
**Status**: Pending Review

---

## Status Updates

### {datetime.utcnow().strftime('%Y-%m-%d')} - Initiative Created
- Initiative folder created
- Ready for development agent to populate with details

---

## Checklist

### Documentation
- [ ] Overview completed
- [ ] Features documented
- [ ] Dependencies identified
- [ ] Success criteria defined

### Implementation
- [ ] Features developed
- [ ] Tests written
- [ ] Documentation updated
- [ ] Code reviewed

### Review
- [ ] PM evaluation requested
- [ ] PM evaluation completed
- [ ] Approved for implementation

---

**Last Updated**: {datetime.utcnow().strftime('%Y-%m-%d')}
"""
    
    with open(init_dir / "progress.md", 'w') as f:
        f.write(progress)
    
    # Add to registry
    registry["initiatives"].append({
        "id": init_id,
        "title": title,
        "status": "pending_review",
        "created_at": manifest["created_at"],
        "tags": tags or []
    })
    
    # Update metadata
    registry["metadata"]["total_count"] = len(registry["initiatives"])
    status_counts = {}
    for init in registry["initiatives"]:
        status = init.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    registry["metadata"]["by_status"] = status_counts
    
    save_registry(registry)
    
    print(f"✅ Created initiative: {init_id}")
    print(f"   Title: {title}")
    print(f"   Location: {init_dir}")
    print(f"\n📝 Next steps:")
    print(f"   1. Edit {init_dir}/overview.md")
    print(f"   2. Add features to {init_dir}/features/")
    print(f"   3. Add documentation to {init_dir}/docs/")
    print(f"   4. Submit for PM review")
    
    return init_id


def list_initiatives(status_filter=None):
    """List all initiatives"""
    registry = load_registry()
    
    initiatives = registry.get("initiatives", [])
    
    if status_filter:
        initiatives = [i for i in initiatives if i.get("status") == status_filter]
    
    if not initiatives:
        print("No initiatives found.")
        return
    
    print(f"\n{'ID':<20} {'Title':<40} {'Status':<15} {'Tags'}")
    print("-" * 100)
    
    for init in initiatives:
        tags_str = ", ".join(init.get("tags", []))
        print(f"{init['id']:<20} {init['title']:<40} {init.get('status', 'unknown'):<15} {tags_str}")
    
    print(f"\nTotal: {len(initiatives)} initiatives")


def show_initiative(init_id):
    """Show details of a specific initiative"""
    init_dir = INITIATIVES_DIR / init_id
    
    if not init_dir.exists():
        print(f"❌ Initiative {init_id} not found")
        return
    
    manifest_file = init_dir / "manifest.json"
    if not manifest_file.exists():
        print(f"❌ Manifest not found for {init_id}")
        return
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    print(f"\n{'='*80}")
    print(f"Initiative: {manifest['id']}")
    print(f"{'='*80}")
    print(f"\nTitle: {manifest['title']}")
    print(f"Status: {manifest['status']}")
    print(f"Created: {manifest['created_at']}")
    print(f"Created By: {manifest['created_by']}")
    
    if manifest.get('priority'):
        print(f"Priority: {manifest['priority']}")
    
    if manifest.get('estimated_effort'):
        print(f"Estimated Effort: {manifest['estimated_effort']}")
    
    if manifest.get('tags'):
        print(f"Tags: {', '.join(manifest['tags'])}")
    
    if manifest.get('features'):
        print(f"\nFeatures ({len(manifest['features'])}):")
        for feat in manifest['features']:
            print(f"  - {feat}")
    
    if manifest.get('dependencies'):
        print(f"\nDependencies ({len(manifest['dependencies'])}):")
        for dep in manifest['dependencies']:
            print(f"  - {dep}")
    
    if manifest.get('conflicts'):
        print(f"\nConflicts ({len(manifest['conflicts'])}):")
        for conf in manifest['conflicts']:
            print(f"  - {conf}")
    
    print(f"\nMetadata:")
    for key, value in manifest.get('metadata', {}).items():
        if value:
            print(f"  {key}: {value}")
    
    print(f"\nLocation: {init_dir}")
    print(f"{'='*80}\n")


def update_initiative(init_id, status=None, priority=None, effort=None):
    """Update initiative metadata"""
    init_dir = INITIATIVES_DIR / init_id
    manifest_file = init_dir / "manifest.json"
    
    if not manifest_file.exists():
        print(f"❌ Initiative {init_id} not found")
        return
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    updated = False
    
    if status:
        manifest['status'] = status
        updated = True
        print(f"✅ Updated status to: {status}")
    
    if priority:
        manifest['priority'] = priority
        updated = True
        print(f"✅ Updated priority to: {priority}")
    
    if effort:
        manifest['estimated_effort'] = effort
        updated = True
        print(f"✅ Updated estimated effort to: {effort}")
    
    if updated:
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        # Update registry
        registry = load_registry()
        for init in registry["initiatives"]:
            if init["id"] == init_id:
                if status:
                    init["status"] = status
                break
        
        # Update metadata counts
        status_counts = {}
        for init in registry["initiatives"]:
            s = init.get("status", "unknown")
            status_counts[s] = status_counts.get(s, 0) + 1
        registry["metadata"]["by_status"] = status_counts
        
        save_registry(registry)
    else:
        print("⚠️  No updates specified")


def show_stats():
    """Show initiative statistics"""
    registry = load_registry()
    
    print(f"\n{'='*60}")
    print(f"Initiative Statistics")
    print(f"{'='*60}")
    print(f"\nTotal Initiatives: {registry['metadata']['total_count']}")
    print(f"\nBy Status:")
    
    for status, count in registry['metadata']['by_status'].items():
        print(f"  {status:<20} {count:>3}")
    
    print(f"\nLast Updated: {registry['last_updated']}")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Manage development initiatives")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create new initiative')
    create_parser.add_argument('title', help='Initiative title')
    create_parser.add_argument('--tags', help='Comma-separated tags')
    create_parser.add_argument('--created-by', default='dev-agent', help='Creator name')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List initiatives')
    list_parser.add_argument('--status', help='Filter by status')
    
    # Show command
    show_parser = subparsers.add_parser('show', help='Show initiative details')
    show_parser.add_argument('id', help='Initiative ID (e.g., TERP-INIT-001)')
    
    # Update command
    update_parser = subparsers.add_parser('update', help='Update initiative')
    update_parser.add_argument('id', help='Initiative ID')
    update_parser.add_argument('--status', help='New status')
    update_parser.add_argument('--priority', help='New priority')
    update_parser.add_argument('--effort', help='Estimated effort')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show statistics')
    
    args = parser.parse_args()
    
    if args.command == 'create':
        tags = args.tags.split(',') if args.tags else []
        create_initiative(args.title, tags=tags, created_by=args.created_by)
    
    elif args.command == 'list':
        list_initiatives(status_filter=args.status)
    
    elif args.command == 'show':
        show_initiative(args.id)
    
    elif args.command == 'update':
        update_initiative(args.id, status=args.status, priority=args.priority, effort=args.effort)
    
    elif args.command == 'stats':
        show_stats()
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

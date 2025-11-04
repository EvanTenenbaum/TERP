#!/usr/bin/env python3
"""
Archive Manager - Archive completed initiatives

This script archives qa-verified initiatives to keep the active roadmap clean
while preserving complete history of delivered work.

Usage:
    python3 archive.py archive TERP-INIT-001
    python3 archive.py list-archived
    python3 archive.py restore TERP-INIT-001
"""

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path
import argparse

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
ARCHIVE_DIR = PM_ROOT / "archive"
ARCHIVE_INITIATIVES_DIR = ARCHIVE_DIR / "initiatives"
ARCHIVE_METADATA_DIR = ARCHIVE_DIR / "metadata"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"
ARCHIVE_REGISTRY_FILE = ARCHIVE_DIR / "archive-registry.json"


def load_registry():
    """Load initiatives registry"""
    if not REGISTRY_FILE.exists():
        return {"initiatives": [], "next_id": 1, "last_updated": datetime.utcnow().isoformat() + "Z"}
    
    with open(REGISTRY_FILE, 'r') as f:
        return json.load(f)


def save_registry(registry):
    """Save initiatives registry"""
    registry["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)


def load_archive_registry():
    """Load archive registry"""
    if not ARCHIVE_REGISTRY_FILE.exists():
        return {"archived_initiatives": [], "last_updated": datetime.utcnow().isoformat() + "Z"}
    
    with open(ARCHIVE_REGISTRY_FILE, 'r') as f:
        return json.load(f)


def save_archive_registry(archive_registry):
    """Save archive registry"""
    archive_registry["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(ARCHIVE_REGISTRY_FILE, 'w') as f:
        json.dump(archive_registry, f, indent=2)


def archive_initiative(init_id):
    """Archive a completed initiative"""
    init_dir = INITIATIVES_DIR / init_id
    
    if not init_dir.exists():
        print(f"❌ Initiative {init_id} not found in active initiatives")
        return False
    
    # Load initiative manifest
    manifest_file = init_dir / "manifest.json"
    if not manifest_file.exists():
        print(f"❌ Manifest not found for {init_id}")
        return False
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    # Check if initiative is qa-verified
    if manifest.get("status") != "qa-verified":
        print(f"⚠️  Initiative {init_id} is not qa-verified (status: {manifest.get('status')})")
        print(f"   Only qa-verified initiatives can be archived")
        return False
    
    # Create archive metadata
    archive_metadata = {
        "initiative_id": init_id,
        "title": manifest.get("title"),
        "archived_at": datetime.utcnow().isoformat() + "Z",
        "completed_at": manifest.get("progress", {}).get("last_updated"),
        "created_at": manifest.get("created_at"),
        "created_by": manifest.get("created_by"),
        "priority": manifest.get("priority"),
        "tags": manifest.get("tags", []),
        "final_status": "qa-verified",
        "progress_percent": manifest.get("progress", {}).get("percent", 100)
    }
    
    # Move initiative directory to archive
    archive_init_dir = ARCHIVE_INITIATIVES_DIR / init_id
    print(f"📦 Archiving {init_id}...")
    shutil.move(str(init_dir), str(archive_init_dir))
    
    # Save archive metadata
    metadata_file = ARCHIVE_METADATA_DIR / f"{init_id}.json"
    with open(metadata_file, 'w') as f:
        json.dump(archive_metadata, f, indent=2)
    
    # Update archive registry
    archive_registry = load_archive_registry()
    archive_registry["archived_initiatives"].append(archive_metadata)
    save_archive_registry(archive_registry)
    
    # Remove from active registry
    registry = load_registry()
    registry["initiatives"] = [i for i in registry["initiatives"] if i["id"] != init_id]
    save_registry(registry)
    
    print(f"✅ Archived {init_id}: {manifest.get('title')}")
    print(f"   Location: {archive_init_dir}")
    print(f"   Metadata: {metadata_file}")
    
    return True


def list_archived():
    """List all archived initiatives"""
    archive_registry = load_archive_registry()
    archived = archive_registry.get("archived_initiatives", [])
    
    if not archived:
        print("No archived initiatives found.")
        return
    
    print(f"\n{'='*80}")
    print(f"ARCHIVED INITIATIVES - {len(archived)} total")
    print(f"{'='*80}\n")
    
    # Sort by archived date (most recent first)
    archived_sorted = sorted(archived, key=lambda x: x.get("archived_at", ""), reverse=True)
    
    for init in archived_sorted:
        print(f"📦 {init['initiative_id']} - {init['title']}")
        print(f"   Archived: {init.get('archived_at', 'Unknown')[:10]}")
        print(f"   Priority: {init.get('priority', 'N/A')}")
        print(f"   Tags: {', '.join(init.get('tags', []))}")
        print()


def restore_initiative(init_id):
    """Restore an archived initiative back to active"""
    archive_init_dir = ARCHIVE_INITIATIVES_DIR / init_id
    
    if not archive_init_dir.exists():
        print(f"❌ Initiative {init_id} not found in archive")
        return False
    
    # Load archive metadata
    metadata_file = ARCHIVE_METADATA_DIR / f"{init_id}.json"
    if not metadata_file.exists():
        print(f"❌ Archive metadata not found for {init_id}")
        return False
    
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    
    # Move back to active initiatives
    active_init_dir = INITIATIVES_DIR / init_id
    print(f"📤 Restoring {init_id}...")
    shutil.move(str(archive_init_dir), str(active_init_dir))
    
    # Load manifest and update status
    manifest_file = active_init_dir / "manifest.json"
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    # Add back to active registry
    registry = load_registry()
    registry["initiatives"].append({
        "id": init_id,
        "title": metadata.get("title"),
        "status": "qa-verified",  # Keep as qa-verified
        "priority": metadata.get("priority"),
        "created_at": metadata.get("created_at"),
        "created_by": metadata.get("created_by"),
        "tags": metadata.get("tags", [])
    })
    save_registry(registry)
    
    # Remove from archive registry
    archive_registry = load_archive_registry()
    archive_registry["archived_initiatives"] = [
        i for i in archive_registry["archived_initiatives"] 
        if i["initiative_id"] != init_id
    ]
    save_archive_registry(archive_registry)
    
    # Remove metadata file
    metadata_file.unlink()
    
    print(f"✅ Restored {init_id}: {metadata.get('title')}")
    print(f"   Location: {active_init_dir}")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="Archive Manager for TERP Initiatives")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Archive command
    archive_parser = subparsers.add_parser("archive", help="Archive a qa-verified initiative")
    archive_parser.add_argument("init_id", help="Initiative ID (e.g., TERP-INIT-001)")
    
    # List archived command
    subparsers.add_parser("list-archived", help="List all archived initiatives")
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore an archived initiative")
    restore_parser.add_argument("init_id", help="Initiative ID (e.g., TERP-INIT-001)")
    
    args = parser.parse_args()
    
    if args.command == "archive":
        success = archive_initiative(args.init_id)
        sys.exit(0 if success else 1)
    
    elif args.command == "list-archived":
        list_archived()
        sys.exit(0)
    
    elif args.command == "restore":
        success = restore_initiative(args.init_id)
        sys.exit(0 if success else 1)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

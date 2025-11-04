#!/usr/bin/env python3
"""
Status Tracker - Automated status updates for initiatives

This script is called by development agents to automatically update initiative status
as work progresses. It provides real-time visibility to the PM agent.

Usage:
    python3 status-tracker.py update TERP-INIT-001 --status in-progress --message "Started backend implementation"
    python3 status-tracker.py complete-task TERP-INIT-001 "Implement user authentication"
    python3 status-tracker.py add-artifact TERP-INIT-001 /path/to/file.py --description "Auth service implementation"
    python3 status-tracker.py set-progress TERP-INIT-001 45
    python3 status-tracker.py dashboard
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import argparse
import shutil
import subprocess

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
ARCHIVE_DIR = PM_ROOT / "archive"
ARCHIVE_INITIATIVES_DIR = ARCHIVE_DIR / "initiatives"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"
ARCHIVE_REGISTRY_FILE = ARCHIVE_DIR / "archive-registry.json"
PM_DASHBOARD = PM_ROOT / "pm-evaluation" / "dashboard.json"


def load_initiative(init_id):
    """Load initiative manifest"""
    init_dir = INITIATIVES_DIR / init_id
    manifest_file = init_dir / "manifest.json"
    
    if not manifest_file.exists():
        raise FileNotFoundError(f"Initiative {init_id} not found")
    
    with open(manifest_file, 'r') as f:
        return json.load(f), init_dir


def save_initiative(init_dir, manifest):
    """Save initiative manifest"""
    manifest_file = init_dir / "manifest.json"
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)


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


def sync_manifests_with_registry():
    """Sync manifest files with registry to ensure status consistency"""
    registry = load_registry()
    synced_count = 0
    status_changes = []  # Track status changes for auto-regeneration
    
    for init_entry in registry.get("initiatives", []):
        try:
            manifest, init_dir = load_initiative(init_entry["id"])
            
            # Check if status or priority differs
            registry_status = init_entry.get("status")
            registry_priority = init_entry.get("priority")
            manifest_status = manifest.get("status")
            manifest_priority = manifest.get("priority")
            
            needs_update = False
            
            # Sync status
            if registry_status and registry_status != manifest_status:
                manifest["status"] = registry_status
                needs_update = True
                status_changes.append((manifest_status, registry_status))
                print(f"  Syncing {init_entry['id']}: status {manifest_status} → {registry_status}")
            
            # Sync priority
            if registry_priority != manifest_priority:
                manifest["priority"] = registry_priority
                needs_update = True
                if registry_priority:
                    print(f"  Syncing {init_entry['id']}: priority {manifest_priority} → {registry_priority}")
            
            if needs_update:
                save_initiative(init_dir, manifest)
                synced_count += 1
        
        except Exception as e:
            print(f"Warning: Could not sync {init_entry['id']}: {e}")
            continue
    
    # Trigger auto-regeneration if any significant status changes occurred
    for old_status, new_status in status_changes:
        # Check if this is a significant change (especially approvals)
        if new_status == "approved" or old_status == "pending_review":
            print(f"\n🔄 Detected approval during sync, triggering auto-regeneration...")
            trigger_auto_regeneration(old_status, new_status)
            break  # Only trigger once even if multiple changes
    
    return synced_count


def load_archive_registry():
    """Load archive registry"""
    if not ARCHIVE_REGISTRY_FILE.exists():
        return {"archived_initiatives": [], "last_updated": datetime.utcnow().isoformat() + "Z"}
    
    with open(ARCHIVE_REGISTRY_FILE, 'r') as f:
        return json.load(f)


def update_dashboard():
    """Update the PM dashboard with current status of all initiatives"""
    # First, sync manifests with registry to ensure consistency
    sync_manifests_with_registry()
    
    registry = load_registry()
    archive_registry = load_archive_registry()
    
    dashboard = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total": 0,
            "by_status": {},
            "by_priority": {},
            "total_progress": 0,
            "archived_count": len(archive_registry.get("archived_initiatives", []))
        },
        "initiatives": [],
        "archived_initiatives": [],
        "recent_activity": [],
        "roadmap_sequence": [],
        "parallelization_analysis": {},
        "timeline_estimates": {}
    }
    
    total_progress = 0
    initiative_count = 0
    
    for init_entry in registry.get("initiatives", []):
        try:
            manifest, init_dir = load_initiative(init_entry["id"])
            
            # Load progress data
            progress_data = manifest.get("progress", {})
            
            initiative_summary = {
                "id": manifest["id"],
                "title": manifest["title"],
                "status": manifest["status"],
                "priority": manifest.get("priority", "not-set"),
                "progress_percent": progress_data.get("percent", 0),
                "created_at": manifest["created_at"],
                "last_updated": progress_data.get("last_updated", manifest["created_at"]),
                "created_by": manifest["created_by"],
                "tags": manifest.get("tags", []),
                "completed_tasks": progress_data.get("completed_tasks", 0),
                "total_tasks": progress_data.get("total_tasks", 0),
                "recent_updates": progress_data.get("recent_updates", [])[-3:]  # Last 3 updates
            }
            
            dashboard["initiatives"].append(initiative_summary)
            
            # Update summary stats
            status = manifest["status"]
            dashboard["summary"]["by_status"][status] = dashboard["summary"]["by_status"].get(status, 0) + 1
            
            priority = manifest.get("priority", "not-set")
            dashboard["summary"]["by_priority"][priority] = dashboard["summary"]["by_priority"].get(priority, 0) + 1
            
            if status in ["in-progress", "approved"]:
                total_progress += progress_data.get("percent", 0)
                initiative_count += 1
            
            # Add to recent activity
            for update in progress_data.get("recent_updates", [])[-5:]:
                dashboard["recent_activity"].append({
                    "initiative_id": manifest["id"],
                    "initiative_title": manifest["title"],
                    "timestamp": update.get("timestamp"),
                    "message": update.get("message"),
                    "type": update.get("type", "update")
                })
        
        except Exception as e:
            print(f"Warning: Could not load {init_entry['id']}: {e}")
            continue
    
    dashboard["summary"]["total"] = len(dashboard["initiatives"])
    
    if initiative_count > 0:
        dashboard["summary"]["total_progress"] = round(total_progress / initiative_count, 1)
    
    # Sort recent activity by timestamp (most recent first)
    dashboard["recent_activity"].sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    dashboard["recent_activity"] = dashboard["recent_activity"][:20]  # Keep last 20
    
    # Add archived initiatives
    for archived in archive_registry.get("archived_initiatives", []):
        dashboard["archived_initiatives"].append({
            "id": archived["initiative_id"],
            "title": archived["title"],
            "status": "archived",
            "priority": archived.get("priority", "not-set"),
            "progress_percent": 100,
            "created_at": archived.get("created_at"),
            "archived_at": archived.get("archived_at"),
            "completed_at": archived.get("completed_at"),
            "created_by": archived.get("created_by"),
            "tags": archived.get("tags", [])
        })
    
    # Load roadmap data if available
    roadmap_file = PM_ROOT / "pm-evaluation" / "roadmap_order.json"
    if roadmap_file.exists():
        try:
            with open(roadmap_file, 'r') as f:
                roadmap_data = json.load(f)
                dashboard["roadmap_sequence"] = roadmap_data.get("sprints", [])
                dashboard["timeline_estimates"] = {
                    "single_agent": roadmap_data.get("total_timeline", {}),
                    "parallel_agents": roadmap_data.get("parallel_timeline", {})
                }
        except Exception as e:
            print(f"Warning: Could not load roadmap data: {e}")
    
    # Load parallelization data if available
    parallel_file = PM_ROOT / "pm-evaluation" / "parallelization.json"
    if parallel_file.exists():
        try:
            with open(parallel_file, 'r') as f:
                parallel_data = json.load(f)
                dashboard["parallelization_analysis"] = parallel_data
        except Exception as e:
            print(f"Warning: Could not load parallelization data: {e}")
    
    # Save dashboard
    with open(PM_DASHBOARD, 'w') as f:
        json.dump(dashboard, f, indent=2)
    
    return dashboard


def trigger_archiving(init_id, new_status):
    """Trigger automatic archiving when initiative reaches qa-verified status"""
    if new_status != "qa-verified":
        return
    
    print(f"\n📦 Initiative {init_id} is qa-verified, triggering archiving...")
    
    # Run archive script
    archive_script = SCRIPT_DIR / "archive.py"
    
    try:
        result = subprocess.run(
            [sys.executable, str(archive_script), "archive", init_id],
            cwd=str(PM_ROOT),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Archiving complete")
            # Print output for visibility
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    print(f"   {line}")
        else:
            print(f"⚠️  Archiving failed: {result.stderr[:200]}")
    
    except subprocess.TimeoutExpired:
        print("⚠️  Archiving timed out")
    except Exception as e:
        print(f"⚠️  Archiving error: {e}")


def trigger_auto_regeneration(old_status, new_status):
    """Trigger automatic roadmap and parallelization regeneration on status changes"""
    # Determine if this status change warrants regeneration
    significant_transitions = [
        ("pending_review", "approved"),  # New initiative enters roadmap
        ("approved", "in-progress"),     # Initiative starts (affects capacity)
        ("in-progress", "ready-to-deploy"),  # Work complete (frees capacity)
        ("ready-to-deploy", "deployed"),     # Deployment stage
        ("deployed", "qa-verified"),         # QA verification complete
    ]
    
    # Check if this is a significant transition
    is_significant = (old_status, new_status) in significant_transitions
    
    # Also regenerate if moving to/from in-progress (affects parallelization)
    if new_status == "in-progress" or old_status == "in-progress":
        is_significant = True
    
    if not is_significant:
        return
    
    print(f"\n🔄 Triggering auto-regeneration (status change: {old_status} → {new_status})...")
    
    # Run auto-regenerate script
    auto_regen_script = SCRIPT_DIR / "auto-regenerate.py"
    
    try:
        result = subprocess.run(
            [sys.executable, str(auto_regen_script)],
            cwd=str(PM_ROOT),
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print("✅ Auto-regeneration complete")
            # Print output for visibility
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    print(f"   {line}")
        else:
            print(f"⚠️  Auto-regeneration failed: {result.stderr[:200]}")
    
    except subprocess.TimeoutExpired:
        print("⚠️  Auto-regeneration timed out")
    except Exception as e:
        print(f"⚠️  Auto-regeneration error: {e}")


def update_status(init_id, status, message=None, update_type="status_change"):
    """Update initiative status"""
    manifest, init_dir = load_initiative(init_id)
    
    old_status = manifest["status"]
    manifest["status"] = status
    
    # Initialize progress tracking if not exists
    if "progress" not in manifest:
        manifest["progress"] = {
            "percent": 0,
            "completed_tasks": 0,
            "total_tasks": 0,
            "recent_updates": [],
            "last_updated": datetime.utcnow().isoformat() + "Z"
        }
    
    # Add update to history
    update_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": update_type,
        "message": message or f"Status changed from {old_status} to {status}",
        "old_status": old_status,
        "new_status": status
    }
    
    manifest["progress"]["recent_updates"].append(update_entry)
    manifest["progress"]["last_updated"] = update_entry["timestamp"]
    
    # Auto-calculate progress based on status
    if status in ["ready-to-deploy", "deployed", "qa-verified"]:
        manifest["progress"]["percent"] = 100
    elif status == "in-progress" and manifest["progress"]["percent"] == 0:
        manifest["progress"]["percent"] = 10  # Started
    
    save_initiative(init_dir, manifest)
    
    # Update registry
    registry = load_registry()
    for init in registry["initiatives"]:
        if init["id"] == init_id:
            init["status"] = status
            break
    
    # Update status counts
    status_counts = {}
    for init in registry["initiatives"]:
        s = init.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    registry["metadata"]["by_status"] = status_counts
    
    save_registry(registry)
    
    # Update dashboard
    update_dashboard()
    
    print(f"✅ Updated {init_id}")
    print(f"   Status: {old_status} → {status}")
    if message:
        print(f"   Message: {message}")
    
    # Trigger archiving if initiative is qa-verified
    trigger_archiving(init_id, status)
    
    # Trigger auto-regeneration of roadmap and parallelization analysis
    # This runs whenever status changes to keep the roadmap current
    trigger_auto_regeneration(old_status, status)
    
    # Update progress.md file
    update_progress_file(init_dir, manifest)


def complete_task(init_id, task_description):
    """Mark a task as complete"""
    manifest, init_dir = load_initiative(init_id)
    
    if "progress" not in manifest:
        manifest["progress"] = {
            "percent": 0,
            "completed_tasks": 0,
            "total_tasks": 0,
            "recent_updates": [],
            "last_updated": datetime.utcnow().isoformat() + "Z"
        }
    
    manifest["progress"]["completed_tasks"] += 1
    
    # Add update
    update_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": "task_completed",
        "message": f"Completed: {task_description}",
        "task": task_description
    }
    
    manifest["progress"]["recent_updates"].append(update_entry)
    manifest["progress"]["last_updated"] = update_entry["timestamp"]
    
    # Recalculate progress if total tasks is known
    if manifest["progress"]["total_tasks"] > 0:
        manifest["progress"]["percent"] = round(
            (manifest["progress"]["completed_tasks"] / manifest["progress"]["total_tasks"]) * 100,
            1
        )
    
    save_initiative(init_dir, manifest)
    update_dashboard()
    
    print(f"✅ Task completed in {init_id}")
    print(f"   Task: {task_description}")
    print(f"   Progress: {manifest['progress']['completed_tasks']}/{manifest['progress']['total_tasks']} tasks")
    print(f"   Percent: {manifest['progress']['percent']}%")
    
    update_progress_file(init_dir, manifest)


def set_progress(init_id, percent, message=None):
    """Set progress percentage"""
    manifest, init_dir = load_initiative(init_id)
    
    if "progress" not in manifest:
        manifest["progress"] = {
            "percent": 0,
            "completed_tasks": 0,
            "total_tasks": 0,
            "recent_updates": [],
            "last_updated": datetime.utcnow().isoformat() + "Z"
        }
    
    old_percent = manifest["progress"]["percent"]
    manifest["progress"]["percent"] = percent
    
    update_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": "progress_update",
        "message": message or f"Progress updated: {old_percent}% → {percent}%",
        "old_percent": old_percent,
        "new_percent": percent
    }
    
    manifest["progress"]["recent_updates"].append(update_entry)
    manifest["progress"]["last_updated"] = update_entry["timestamp"]
    
    save_initiative(init_dir, manifest)
    update_dashboard()
    
    print(f"✅ Progress updated for {init_id}")
    print(f"   Progress: {old_percent}% → {percent}%")
    if message:
        print(f"   Message: {message}")
    
    update_progress_file(init_dir, manifest)


def add_artifact(init_id, file_path, description=None, artifact_type="file"):
    """Add an artifact (file, document, etc.) to the initiative"""
    manifest, init_dir = load_initiative(init_id)
    
    artifacts_dir = init_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    
    source_path = Path(file_path)
    if not source_path.exists():
        print(f"❌ File not found: {file_path}")
        return
    
    # Copy file to artifacts directory
    dest_path = artifacts_dir / source_path.name
    shutil.copy2(source_path, dest_path)
    
    # Track artifact in manifest
    if "artifacts" not in manifest:
        manifest["artifacts"] = []
    
    artifact_entry = {
        "filename": source_path.name,
        "path": str(dest_path.relative_to(PM_ROOT)),
        "type": artifact_type,
        "description": description or source_path.name,
        "added_at": datetime.utcnow().isoformat() + "Z"
    }
    
    manifest["artifacts"].append(artifact_entry)
    
    # Add update
    if "progress" not in manifest:
        manifest["progress"] = {
            "percent": 0,
            "completed_tasks": 0,
            "total_tasks": 0,
            "recent_updates": [],
            "last_updated": datetime.utcnow().isoformat() + "Z"
        }
    
    update_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": "artifact_added",
        "message": f"Added artifact: {source_path.name}",
        "artifact": artifact_entry
    }
    
    manifest["progress"]["recent_updates"].append(update_entry)
    manifest["progress"]["last_updated"] = update_entry["timestamp"]
    
    save_initiative(init_dir, manifest)
    update_dashboard()
    
    print(f"✅ Artifact added to {init_id}")
    print(f"   File: {source_path.name}")
    print(f"   Location: {dest_path}")
    if description:
        print(f"   Description: {description}")


def update_progress_file(init_dir, manifest):
    """Update the progress.md file with current status"""
    progress_file = init_dir / "progress.md"
    
    progress_data = manifest.get("progress", {})
    recent_updates = progress_data.get("recent_updates", [])
    
    content = f"""# Progress Tracking: {manifest['id']}

**Initiative**: {manifest['title']}  
**Status**: {manifest['status']}  
**Progress**: {progress_data.get('percent', 0)}%  
**Last Updated**: {progress_data.get('last_updated', 'N/A')}

---

## Current Status

**Overall Progress**: {progress_data.get('percent', 0)}%  
**Tasks Completed**: {progress_data.get('completed_tasks', 0)} / {progress_data.get('total_tasks', 0)}  
**Status**: {manifest['status']}

---

## Recent Activity

"""
    
    if recent_updates:
        for update in reversed(recent_updates[-10:]):  # Last 10 updates, most recent first
            timestamp = update.get('timestamp', 'Unknown')
            # Format timestamp nicely
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                timestamp_str = dt.strftime('%Y-%m-%d %H:%M UTC')
            except:
                timestamp_str = timestamp
            
            content += f"### {timestamp_str}\n"
            content += f"**Type**: {update.get('type', 'update')}\n\n"
            content += f"{update.get('message', 'No message')}\n\n"
    else:
        content += "*No activity recorded yet*\n\n"
    
    content += """---

## Artifacts

"""
    
    if manifest.get("artifacts"):
        for artifact in manifest["artifacts"]:
            content += f"- **{artifact['filename']}**\n"
            content += f"  - Type: {artifact['type']}\n"
            content += f"  - Description: {artifact['description']}\n"
            content += f"  - Added: {artifact['added_at']}\n\n"
    else:
        content += "*No artifacts added yet*\n\n"
    
    content += f"""---

**Auto-generated by status-tracker.py**  
**Last sync**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
"""
    
    with open(progress_file, 'w') as f:
        f.write(content)


def show_dashboard():
    """Display the PM dashboard"""
    if not PM_DASHBOARD.exists():
        print("Dashboard not initialized. Generating...")
        dashboard = update_dashboard()
    else:
        with open(PM_DASHBOARD, 'r') as f:
            dashboard = json.load(f)
    
    print(f"\n{'='*80}")
    print(f"PM DASHBOARD - Real-Time Initiative Status")
    print(f"{'='*80}")
    print(f"Last Updated: {dashboard['last_updated']}\n")
    
    summary = dashboard['summary']
    print(f"📊 Summary")
    print(f"   Total Initiatives: {summary['total']}")
    print(f"   Average Progress: {summary['total_progress']}%")
    print()
    
    print(f"📈 By Status:")
    for status, count in summary['by_status'].items():
        print(f"   {status:<20} {count:>3}")
    print()
    
    print(f"🎯 By Priority:")
    for priority, count in summary['by_priority'].items():
        print(f"   {priority:<20} {count:>3}")
    print()
    
    print(f"🚀 Active Initiatives:")
    active = [i for i in dashboard['initiatives'] if i['status'] in ['in-progress', 'approved']]
    if active:
        for init in active:
            print(f"\n   {init['id']} - {init['title']}")
            print(f"   Status: {init['status']} | Progress: {init['progress_percent']}%")
            print(f"   Priority: {init['priority']} | Tasks: {init['completed_tasks']}/{init['total_tasks']}")
    else:
        print("   No active initiatives")
    
    print(f"\n📝 Recent Activity (Last 10):")
    for activity in dashboard['recent_activity'][:10]:
        timestamp = activity.get('timestamp', 'Unknown')
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            timestamp_str = dt.strftime('%m-%d %H:%M')
        except:
            timestamp_str = timestamp[:10]
        
        print(f"   [{timestamp_str}] {activity['initiative_id']}: {activity['message']}")
    
    print(f"\n{'='*80}\n")


def main():
    parser = argparse.ArgumentParser(description="Automated status tracking for initiatives")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Update status
    update_parser = subparsers.add_parser('update', help='Update initiative status')
    update_parser.add_argument('id', help='Initiative ID')
    update_parser.add_argument('--status', required=True, help='New status')
    update_parser.add_argument('--message', help='Update message')
    
    # Complete task
    task_parser = subparsers.add_parser('complete-task', help='Mark a task as complete')
    task_parser.add_argument('id', help='Initiative ID')
    task_parser.add_argument('task', help='Task description')
    
    # Set progress
    progress_parser = subparsers.add_parser('set-progress', help='Set progress percentage')
    progress_parser.add_argument('id', help='Initiative ID')
    progress_parser.add_argument('percent', type=float, help='Progress percentage (0-100)')
    progress_parser.add_argument('--message', help='Update message')
    
    # Add artifact
    artifact_parser = subparsers.add_parser('add-artifact', help='Add an artifact')
    artifact_parser.add_argument('id', help='Initiative ID')
    artifact_parser.add_argument('file', help='File path')
    artifact_parser.add_argument('--description', help='Artifact description')
    artifact_parser.add_argument('--type', default='file', help='Artifact type')
    
    # Dashboard
    dashboard_parser = subparsers.add_parser('dashboard', help='Show PM dashboard')
    
    # Refresh dashboard
    refresh_parser = subparsers.add_parser('refresh', help='Refresh dashboard data')
    
    # Sync manifests with registry
    sync_parser = subparsers.add_parser('sync', help='Sync manifest files with registry')
    
    args = parser.parse_args()
    
    try:
        if args.command == 'update':
            update_status(args.id, args.status, args.message)
        
        elif args.command == 'complete-task':
            complete_task(args.id, args.task)
        
        elif args.command == 'set-progress':
            set_progress(args.id, args.percent, args.message)
        
        elif args.command == 'add-artifact':
            add_artifact(args.id, args.file, args.description, args.type)
        
        elif args.command == 'dashboard':
            show_dashboard()
        
        elif args.command == 'refresh':
            print("Refreshing dashboard...")
            update_dashboard()
            print("✅ Dashboard refreshed")
        
        elif args.command == 'sync':
            print("Syncing manifest files with registry...")
            synced_count = sync_manifests_with_registry()
            print(f"✅ Synced {synced_count} initiative(s)")
            print("\nRefreshing dashboard...")
            update_dashboard()
            print("✅ Dashboard refreshed")
        
        else:
            parser.print_help()
    
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

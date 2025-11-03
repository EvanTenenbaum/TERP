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

# Get the product-management root directory
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
INITIATIVES_DIR = PM_ROOT / "initiatives"
REGISTRY_FILE = INITIATIVES_DIR / "registry.json"
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


def update_dashboard():
    """Update the PM dashboard with current status of all initiatives"""
    registry = load_registry()
    
    dashboard = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total": 0,
            "by_status": {},
            "by_priority": {},
            "total_progress": 0
        },
        "initiatives": [],
        "recent_activity": []
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
    
    # Save dashboard
    with open(PM_DASHBOARD, 'w') as f:
        json.dump(dashboard, f, indent=2)
    
    return dashboard


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
    if status == "completed":
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

#!/usr/bin/env python3
"""
Simple Queue Manager
Manages which agents are working on which initiatives
"""

import json
import sys
from pathlib import Path
from datetime import datetime

QUEUE_FILE = Path("pm-evaluation/agent-queue.json")

def load_queue():
    """Load the agent queue"""
    if not QUEUE_FILE.exists():
        return {
            "queue": [],
            "in_progress": {},
            "completed": []
        }
    
    with open(QUEUE_FILE) as f:
        return json.load(f)

def save_queue(queue_data):
    """Save the agent queue"""
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(QUEUE_FILE, 'w') as f:
        json.dump(queue_data, f, indent=2)

def load_registry():
    """Load the initiatives registry"""
    registry_path = Path("initiatives/registry.json")
    if not registry_path.exists():
        print("❌ Error: initiatives/registry.json not found")
        return None
    
    with open(registry_path) as f:
        return json.load(f)

def save_registry(registry):
    """Save the initiatives registry"""
    with open(Path("initiatives/registry.json"), 'w') as f:
        json.dump(registry, f, indent=2)

def refresh_queue():
    """Refresh queue from registry"""
    registry = load_registry()
    if not registry:
        return
    
    queue_data = load_queue()
    
    # Build queue from approved initiatives (in roadmap order if available)
    roadmap_path = Path("pm-evaluation/roadmap_order.json")
    if roadmap_path.exists():
        with open(roadmap_path) as f:
            roadmap = json.load(f)
        
        # Use roadmap sequence
        queue_order = []
        for sprint in roadmap.get('roadmap_sequence', []):
            init_id = sprint['initiative_id']
            # Check if it's approved and not in progress
            for init in registry['initiatives']:
                if init['id'] == init_id and init['status'] == 'approved':
                    if init_id not in queue_data['in_progress']:
                        queue_order.append(init_id)
        
        queue_data['queue'] = queue_order
    else:
        # Fallback: just use approved initiatives
        queue_data['queue'] = [
            init['id'] for init in registry['initiatives'] 
            if init['status'] == 'approved' and init['id'] not in queue_data['in_progress']
        ]
    
    # Update in_progress from registry
    for init in registry['initiatives']:
        if init['status'] == 'in-progress':
            if init['id'] not in queue_data['in_progress']:
                queue_data['in_progress'][init['id']] = {
                    "agent": init.get('assigned_to', 'Unknown'),
                    "branch": f"{init.get('assigned_to', 'agent')}/{init['id'].lower()}",
                    "started": datetime.utcnow().isoformat() + 'Z'
                }
    
    # Update completed from registry (includes ready-to-deploy, deployed, qa-verified)
    completed_statuses = ['ready-to-deploy', 'deployed', 'qa-verified']
    completed_ids = [init['id'] for init in registry['initiatives'] if init['status'] in completed_statuses]
    queue_data['completed'] = list(set(queue_data['completed'] + completed_ids))
    
    save_queue(queue_data)
    
    print("✅ Queue refreshed from registry")
    print(f"   Queue: {len(queue_data['queue'])} initiatives")
    print(f"   In Progress: {len(queue_data['in_progress'])} initiatives")
    print(f"   Completed: {len(queue_data['completed'])} initiatives")

def get_next_task(agent_id):
    """Get next task for an agent"""
    queue_data = load_queue()
    registry = load_registry()
    
    if not registry:
        return
    
    if not queue_data['queue']:
        print("❌ No tasks in queue")
        return
    
    # Pop next task from queue
    next_init_id = queue_data['queue'].pop(0)
    
    # Add to in_progress
    branch_name = f"{agent_id}/{next_init_id.lower()}"
    queue_data['in_progress'][next_init_id] = {
        "agent": agent_id,
        "branch": branch_name,
        "started": datetime.utcnow().isoformat() + 'Z'
    }
    
    save_queue(queue_data)
    
    # Update registry
    for init in registry['initiatives']:
        if init['id'] == next_init_id:
            init['status'] = 'in-progress'
            init['assigned_to'] = agent_id
            break
    
    save_registry(registry)
    
    print(f"✅ Task assigned to {agent_id}")
    print(f"   Initiative: {next_init_id}")
    print(f"   Branch: {branch_name}")
    print()
    print(f"📋 Next steps:")
    print(f"   1. Create branch: git checkout -b {branch_name}")
    print(f"   2. Work on initiative")
    print(f"   3. When done: python3 simple-queue.py complete {agent_id} {next_init_id}")

def complete_task(agent_id, init_id):
    """Mark a task as complete"""
    queue_data = load_queue()
    registry = load_registry()
    
    if not registry:
        return
    
    if init_id not in queue_data['in_progress']:
        print(f"❌ {init_id} is not in progress")
        return
    
    # Move from in_progress to completed
    del queue_data['in_progress'][init_id]
    if init_id not in queue_data['completed']:
        queue_data['completed'].append(init_id)
    
    save_queue(queue_data)
    
    # Update registry to ready-to-deploy
    for init in registry['initiatives']:
        if init['id'] == init_id:
            init['status'] = 'ready-to-deploy'
            init['completed_at'] = datetime.utcnow().isoformat() + 'Z'
            break
    
    save_registry(registry)
    
    print(f"✅ Task completed by {agent_id}")
    print(f"   Initiative: {init_id}")
    print(f"   Status: ready-to-deploy")
    print()
    print(f"📋 Next steps:")
    print(f"   1. Merge branch to main")
    print(f"   2. Push to GitHub")
    print(f"   3. Deploy to production")
    print(f"   4. Mark as deployed: python3 simple-queue.py set-status {init_id} deployed")
    print(f"   5. Get next task: python3 simple-queue.py get-next {agent_id}")

def set_status(init_id, new_status):
    """Set initiative status"""
    valid_statuses = ['approved', 'in-progress', 'ready-to-deploy', 'deployed', 'qa-verified']
    
    if new_status not in valid_statuses:
        print(f"❌ Invalid status: {new_status}")
        print(f"   Valid statuses: {', '.join(valid_statuses)}")
        return
    
    registry = load_registry()
    if not registry:
        return
    
    found = False
    for init in registry['initiatives']:
        if init['id'] == init_id:
            old_status = init['status']
            init['status'] = new_status
            
            # Set timestamp fields
            if new_status == 'in-progress' and 'started_at' not in init:
                init['started_at'] = datetime.utcnow().isoformat() + 'Z'
            elif new_status == 'ready-to-deploy' and 'completed_at' not in init:
                init['completed_at'] = datetime.utcnow().isoformat() + 'Z'
            elif new_status == 'deployed' and 'deployed_at' not in init:
                init['deployed_at'] = datetime.utcnow().isoformat() + 'Z'
            elif new_status == 'qa-verified' and 'qa_verified_at' not in init:
                init['qa_verified_at'] = datetime.utcnow().isoformat() + 'Z'
            
            found = True
            break
    
    if not found:
        print(f"❌ Initiative not found: {init_id}")
        return
    
    save_registry(registry)
    
    print(f"✅ Status updated")
    print(f"   Initiative: {init_id}")
    print(f"   {old_status} → {new_status}")

def show_status():
    """Show current queue status"""
    queue_data = load_queue()
    
    print("\n" + "="*80)
    print("QUEUE STATUS")
    print("="*80 + "\n")
    
    print(f"📋 Waiting ({len(queue_data['queue'])}):")
    if queue_data['queue']:
        for i, init_id in enumerate(queue_data['queue'], 1):
            print(f"   {i}. {init_id}")
    else:
        print("   (empty)")
    
    print(f"\n🔵 In Progress ({len(queue_data['in_progress'])}):")
    if queue_data['in_progress']:
        for init_id, info in queue_data['in_progress'].items():
            print(f"   - {init_id}")
            print(f"     Agent: {info['agent']}")
            print(f"     Branch: {info['branch']}")
            print(f"     Started: {info['started']}")
    else:
        print("   (none)")
    
    print(f"\n✅ Completed ({len(queue_data['completed'])}):")
    if queue_data['completed']:
        for init_id in queue_data['completed'][-5:]:  # Show last 5
            print(f"   - {init_id}")
        if len(queue_data['completed']) > 5:
            print(f"   ... and {len(queue_data['completed'])-5} more")
    else:
        print("   (none)")
    
    print()

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 simple-queue.py refresh                      # Refresh queue from registry")
        print("  python3 simple-queue.py status                       # Show queue status")
        print("  python3 simple-queue.py get-next <agent_id>          # Get next task")
        print("  python3 simple-queue.py complete <agent_id> <init_id> # Mark complete (→ ready-to-deploy)")
        print("  python3 simple-queue.py set-status <init_id> <status> # Set status manually")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "refresh":
        refresh_queue()
    elif command == "status":
        show_status()
    elif command == "get-next":
        if len(sys.argv) < 3:
            print("❌ Error: agent_id required")
            sys.exit(1)
        get_next_task(sys.argv[2])
    elif command == "complete":
        if len(sys.argv) < 4:
            print("❌ Error: agent_id and init_id required")
            sys.exit(1)
        complete_task(sys.argv[2], sys.argv[3])
    elif command == "set-status":
        if len(sys.argv) < 4:
            print("❌ Error: init_id and status required")
            sys.exit(1)
        set_status(sys.argv[2], sys.argv[3])
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()

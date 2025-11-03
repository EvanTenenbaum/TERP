#!/usr/bin/env python3
"""
File Locking System for TERP Product Management

Prevents multiple agents from editing the same files simultaneously.
"""

import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

LOCKS_FILE = Path(__file__).parent.parent.parent / "pm-evaluation" / "file-locks.json"

def load_locks():
    """Load current file locks"""
    if not LOCKS_FILE.exists():
        return {"locks": {}}
    
    with open(LOCKS_FILE, 'r') as f:
        return json.load(f)

def save_locks(locks_data):
    """Save file locks"""
    LOCKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCKS_FILE, 'w') as f:
        json.dump(locks_data, f, indent=2)

def clean_stale_locks(locks_data, max_age_hours=24):
    """Remove locks older than max_age_hours"""
    now = datetime.now()
    stale_files = []
    
    for file_path, lock_info in list(locks_data["locks"].items()):
        locked_at = datetime.fromisoformat(lock_info["locked_at"].replace('Z', '+00:00'))
        age = now - locked_at.replace(tzinfo=None)
        
        if age > timedelta(hours=max_age_hours):
            stale_files.append(file_path)
            del locks_data["locks"][file_path]
    
    if stale_files:
        print(f"🧹 Cleaned {len(stale_files)} stale locks (>{max_age_hours}h old)")
    
    return locks_data

def claim_files(initiative_id, files, agent_id="unknown"):
    """Claim files for an initiative"""
    locks_data = load_locks()
    locks_data = clean_stale_locks(locks_data)
    
    # Check if any files are already locked
    conflicts = []
    for file_path in files:
        if file_path in locks_data["locks"]:
            existing_lock = locks_data["locks"][file_path]
            if existing_lock["initiative_id"] != initiative_id:
                conflicts.append((file_path, existing_lock))
    
    if conflicts:
        print("❌ Cannot claim files - conflicts detected:")
        for file_path, lock in conflicts:
            print(f"   {file_path}")
            print(f"   └─ Locked by {lock['initiative_id']} ({lock['locked_by']})")
        return False
    
    # Claim all files
    now = datetime.now().isoformat() + 'Z'
    for file_path in files:
        locks_data["locks"][file_path] = {
            "initiative_id": initiative_id,
            "locked_at": now,
            "locked_by": agent_id
        }
    
    save_locks(locks_data)
    print(f"✅ Claimed {len(files)} file(s) for {initiative_id}")
    for file_path in files:
        print(f"   📄 {file_path}")
    return True

def release_files(initiative_id):
    """Release all files claimed by an initiative"""
    locks_data = load_locks()
    
    # Find and remove all locks for this initiative
    released = []
    for file_path, lock_info in list(locks_data["locks"].items()):
        if lock_info["initiative_id"] == initiative_id:
            released.append(file_path)
            del locks_data["locks"][file_path]
    
    if released:
        save_locks(locks_data)
        print(f"✅ Released {len(released)} file(s) from {initiative_id}")
        for file_path in released:
            print(f"   📄 {file_path}")
    else:
        print(f"ℹ️  No files locked by {initiative_id}")
    
    return True

def check_locks(files):
    """Check if files are locked"""
    locks_data = load_locks()
    locks_data = clean_stale_locks(locks_data)
    
    locked_files = []
    for file_path in files:
        if file_path in locks_data["locks"]:
            locked_files.append((file_path, locks_data["locks"][file_path]))
    
    if locked_files:
        print(f"🔒 {len(locked_files)} file(s) are locked:")
        for file_path, lock in locked_files:
            print(f"   {file_path}")
            print(f"   └─ {lock['initiative_id']} ({lock['locked_by']}) since {lock['locked_at']}")
        return False
    else:
        print(f"✅ All {len(files)} file(s) are available")
        return True

def list_locks():
    """List all current locks"""
    locks_data = load_locks()
    locks_data = clean_stale_locks(locks_data)
    save_locks(locks_data)
    
    if not locks_data["locks"]:
        print("ℹ️  No files currently locked")
        return
    
    print(f"🔒 {len(locks_data['locks'])} file(s) currently locked:")
    print()
    
    # Group by initiative
    by_initiative = {}
    for file_path, lock in locks_data["locks"].items():
        init_id = lock["initiative_id"]
        if init_id not in by_initiative:
            by_initiative[init_id] = []
        by_initiative[init_id].append((file_path, lock))
    
    for init_id, files in sorted(by_initiative.items()):
        print(f"📦 {init_id}")
        for file_path, lock in files:
            print(f"   📄 {file_path}")
            print(f"      Agent: {lock['locked_by']}")
            print(f"      Since: {lock['locked_at']}")
        print()

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  file-locker.py claim INIT-ID file1 [file2 ...] [--agent-id AGENT_ID]")
        print("  file-locker.py release INIT-ID")
        print("  file-locker.py check file1 [file2 ...]")
        print("  file-locker.py list")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "claim":
        if len(sys.argv) < 4:
            print("❌ Usage: file-locker.py claim INIT-ID file1 [file2 ...] [--agent-id AGENT_ID]")
            sys.exit(1)
        
        initiative_id = sys.argv[2]
        
        # Parse arguments
        agent_id = "unknown"
        files = []
        i = 3
        while i < len(sys.argv):
            if sys.argv[i] == "--agent-id" and i + 1 < len(sys.argv):
                agent_id = sys.argv[i + 1]
                i += 2
            else:
                files.append(sys.argv[i])
                i += 1
        
        success = claim_files(initiative_id, files, agent_id)
        sys.exit(0 if success else 1)
    
    elif command == "release":
        if len(sys.argv) != 3:
            print("❌ Usage: file-locker.py release INIT-ID")
            sys.exit(1)
        
        initiative_id = sys.argv[2]
        release_files(initiative_id)
        sys.exit(0)
    
    elif command == "check":
        if len(sys.argv) < 3:
            print("❌ Usage: file-locker.py check file1 [file2 ...]")
            sys.exit(1)
        
        files = sys.argv[2:]
        available = check_locks(files)
        sys.exit(0 if available else 1)
    
    elif command == "list":
        list_locks()
        sys.exit(0)
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Valid commands: claim, release, check, list")
        sys.exit(1)

if __name__ == "__main__":
    main()

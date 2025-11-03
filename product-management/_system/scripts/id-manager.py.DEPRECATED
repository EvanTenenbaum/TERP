#!/usr/bin/env python3
"""
ID Management Utility
Generates unique IDs and manages the registry
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

PM_ROOT = Path("/home/ubuntu/TERP/product-management")
REGISTRY_FILE = PM_ROOT / "_system/id-registry.json"
CONFIG_FILE = PM_ROOT / "_system/config/system.json"


def load_config() -> Dict:
    """Load system configuration"""
    with open(CONFIG_FILE) as f:
        return json.load(f)


def load_registry() -> Dict:
    """Load ID registry"""
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE) as f:
            return json.load(f)
    return {
        "schema_version": "1.0",
        "last_updated": datetime.now().isoformat(),
        "total_count": 0,
        "by_type": {},
        "by_status": {},
        "registry": {}
    }


def save_registry(registry: Dict):
    """Save ID registry"""
    registry["last_updated"] = datetime.now().isoformat()
    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)


def save_config(config: Dict):
    """Save system configuration"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def generate_id(item_type: str) -> str:
    """
    Generate next unique ID for given type
    
    Args:
        item_type: Type of item (IDEA, FEAT, BUG, IMPROVE, TECH)
    
    Returns:
        Unique ID string (e.g., "TERP-FEAT-001")
    """
    config = load_config()
    prefix = config["id_system"]["prefix"]
    
    # Get next ID number
    next_id = config["id_system"]["next_ids"].get(item_type, 1)
    
    # Format ID
    item_id = f"{prefix}-{item_type}-{next_id:03d}"
    
    # Increment counter
    config["id_system"]["next_ids"][item_type] = next_id + 1
    save_config(config)
    
    return item_id


def register_item(
    item_type: str,
    title: str,
    status: str,
    tags: List[str] = None,
    path: str = None,
    related: List[str] = None,
    metadata: Dict = None
) -> str:
    """
    Register a new item and generate ID
    
    Args:
        item_type: Type (IDEA, FEAT, BUG, etc.)
        title: Item title
        status: Current status
        tags: List of tags
        path: File path
        related: Related item IDs
        metadata: Additional metadata
    
    Returns:
        Generated ID
    """
    registry = load_registry()
    
    # Generate ID
    item_id = generate_id(item_type)
    
    # Create registry entry
    entry = {
        "type": item_type,
        "title": title,
        "status": status,
        "created": datetime.now().isoformat(),
        "updated": datetime.now().isoformat(),
        "tags": tags or [],
        "related": related or [],
        "path": path
    }
    
    if metadata:
        entry.update(metadata)
    
    # Add to registry
    registry["registry"][item_id] = entry
    
    # Update counters
    registry["total_count"] = len(registry["registry"])
    registry["by_type"][item_type] = registry["by_type"].get(item_type, 0) + 1
    registry["by_status"][status] = registry["by_status"].get(status, 0) + 1
    
    save_registry(registry)
    
    return item_id


def update_item(item_id: str, updates: Dict):
    """Update an existing item"""
    registry = load_registry()
    
    if item_id not in registry["registry"]:
        raise ValueError(f"Item {item_id} not found in registry")
    
    # Track old status for counter updates
    old_status = registry["registry"][item_id].get("status")
    
    # Update entry
    registry["registry"][item_id].update(updates)
    registry["registry"][item_id]["updated"] = datetime.now().isoformat()
    
    # Update status counter if status changed
    new_status = registry["registry"][item_id].get("status")
    if old_status != new_status:
        if old_status:
            registry["by_status"][old_status] = max(0, registry["by_status"].get(old_status, 0) - 1)
        if new_status:
            registry["by_status"][new_status] = registry["by_status"].get(new_status, 0) + 1
    
    save_registry(registry)


def get_item(item_id: str) -> Optional[Dict]:
    """Get item by ID"""
    registry = load_registry()
    return registry["registry"].get(item_id)


def list_items(
    item_type: Optional[str] = None,
    status: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> List[Dict]:
    """List items with optional filters"""
    registry = load_registry()
    items = []
    
    for item_id, item in registry["registry"].items():
        # Apply filters
        if item_type and item["type"] != item_type:
            continue
        if status and item["status"] != status:
            continue
        if tags and not any(tag in item.get("tags", []) for tag in tags):
            continue
        
        items.append({
            "id": item_id,
            **item
        })
    
    return items


def get_stats() -> Dict:
    """Get registry statistics"""
    registry = load_registry()
    return {
        "total": registry["total_count"],
        "by_type": registry["by_type"],
        "by_status": registry["by_status"]
    }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  id-manager.py generate <TYPE>")
        print("  id-manager.py register <TYPE> <TITLE> <STATUS> [--tags TAG1,TAG2]")
        print("  id-manager.py get <ID>")
        print("  id-manager.py list [--type TYPE] [--status STATUS]")
        print("  id-manager.py stats")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "generate":
        if len(sys.argv) < 3:
            print("Usage: id-manager.py generate <TYPE>")
            sys.exit(1)
        item_type = sys.argv[2]
        item_id = generate_id(item_type)
        print(item_id)
    
    elif command == "register":
        if len(sys.argv) < 5:
            print("Usage: id-manager.py register <TYPE> <TITLE> <STATUS> [--tags TAG1,TAG2]")
            sys.exit(1)
        item_type = sys.argv[2]
        title = sys.argv[3]
        status = sys.argv[4]
        tags = []
        if "--tags" in sys.argv:
            idx = sys.argv.index("--tags")
            if idx + 1 < len(sys.argv):
                tags = sys.argv[idx + 1].split(',')
        item_id = register_item(item_type, title, status, tags=tags)
        print(f"Registered: {item_id}")
    
    elif command == "get":
        if len(sys.argv) < 3:
            print("Usage: id-manager.py get <ID>")
            sys.exit(1)
        item_id = sys.argv[2]
        item = get_item(item_id)
        if item:
            print(json.dumps(item, indent=2))
        else:
            print(f"Item {item_id} not found")
    
    elif command == "list":
        item_type = None
        status = None
        if "--type" in sys.argv:
            idx = sys.argv.index("--type")
            if idx + 1 < len(sys.argv):
                item_type = sys.argv[idx + 1]
        if "--status" in sys.argv:
            idx = sys.argv.index("--status")
            if idx + 1 < len(sys.argv):
                status = sys.argv[idx + 1]
        items = list_items(item_type=item_type, status=status)
        for item in items:
            print(f"[{item['id']}] {item['title']} ({item['status']})")
    
    elif command == "stats":
        stats = get_stats()
        print(json.dumps(stats, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

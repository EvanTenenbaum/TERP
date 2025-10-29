#!/usr/bin/env python3
"""
Search System for Product Management Platform
Enables fast search across all features, ideas, bugs, and documents
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

PM_ROOT = Path("/home/ubuntu/TERP/product-management")
REGISTRY_FILE = PM_ROOT / "_system/id-registry.json"
SEARCH_INDEX_FILE = PM_ROOT / "_system/cache/search-index.json"


def load_registry() -> Dict:
    """Load ID registry"""
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE) as f:
            return json.load(f)
    return {"registry": {}}


def build_search_index():
    """Build search index from all content"""
    print("🔍 Building search index...")
    
    index = {
        "built": datetime.now().isoformat(),
        "total_items": 0,
        "items": {}
    }
    
    registry = load_registry()
    
    # Index all items from registry
    for item_id, item_data in registry.get("registry", {}).items():
        # Read content from file
        content = ""
        if "path" in item_data and item_data["path"]:
            filepath = PM_ROOT / item_data["path"]
            if filepath.exists():
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                except:
                    pass
        
        # Build searchable text
        searchable = f"{item_id} {item_data.get('title', '')} {content}"
        searchable += " " + " ".join(item_data.get('tags', []))
        
        index["items"][item_id] = {
            "id": item_id,
            "type": item_data.get("type"),
            "title": item_data.get("title"),
            "status": item_data.get("status"),
            "tags": item_data.get("tags", []),
            "path": item_data.get("path"),
            "searchable": searchable.lower(),
            "created": item_data.get("created"),
            "updated": item_data.get("updated")
        }
    
    index["total_items"] = len(index["items"])
    
    # Save index
    SEARCH_INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SEARCH_INDEX_FILE, 'w') as f:
        json.dump(index, f, indent=2)
    
    print(f"✅ Indexed {index['total_items']} items")
    return index


def load_search_index() -> Dict:
    """Load search index"""
    if SEARCH_INDEX_FILE.exists():
        with open(SEARCH_INDEX_FILE) as f:
            return json.load(f)
    return build_search_index()


def search(
    query: str,
    item_type: Optional[str] = None,
    status: Optional[str] = None,
    tags: Optional[List[str]] = None,
    limit: int = 20
) -> List[Dict]:
    """
    Search for items
    
    Args:
        query: Search query string
        item_type: Filter by type (IDEA, FEAT, BUG, etc.)
        status: Filter by status
        tags: Filter by tags
        limit: Maximum results to return
    
    Returns:
        List of matching items
    """
    index = load_search_index()
    query_lower = query.lower()
    results = []
    
    for item_id, item in index["items"].items():
        # Apply filters
        if item_type and item["type"] != item_type:
            continue
        if status and item["status"] != status:
            continue
        if tags and not any(tag in item["tags"] for tag in tags):
            continue
        
        # Search in searchable text
        if query_lower in item["searchable"]:
            # Calculate relevance score
            score = 0
            
            # Exact ID match
            if query.upper() == item_id:
                score += 100
            
            # Title match
            if query_lower in item["title"].lower():
                score += 50
            
            # Tag match
            if any(query_lower in tag.lower() for tag in item["tags"]):
                score += 25
            
            # Content match
            if query_lower in item["searchable"]:
                score += 10
            
            results.append({
                **item,
                "score": score
            })
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results[:limit]


def search_by_id(item_id: str) -> Optional[Dict]:
    """Search for item by exact ID"""
    index = load_search_index()
    return index["items"].get(item_id)


def search_by_tags(tags: List[str], limit: int = 20) -> List[Dict]:
    """Search for items with specific tags"""
    return search("", tags=tags, limit=limit)


def search_by_status(status: str, limit: int = 50) -> List[Dict]:
    """Get all items with specific status"""
    return search("", status=status, limit=limit)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: search.py <query> [--type TYPE] [--status STATUS] [--tags TAG1,TAG2]")
        sys.exit(1)
    
    query = sys.argv[1]
    item_type = None
    status = None
    tags = None
    
    # Parse arguments
    for i, arg in enumerate(sys.argv[2:]):
        if arg == "--type" and i + 3 < len(sys.argv):
            item_type = sys.argv[i + 3]
        elif arg == "--status" and i + 3 < len(sys.argv):
            status = sys.argv[i + 3]
        elif arg == "--tags" and i + 3 < len(sys.argv):
            tags = sys.argv[i + 3].split(',')
    
    # Perform search
    results = search(query, item_type=item_type, status=status, tags=tags)
    
    if not results:
        print(f"No results found for '{query}'")
    else:
        print(f"\n🔍 Found {len(results)} results for '{query}':\n")
        for result in results:
            print(f"[{result['id']}] {result['title']}")
            print(f"  Status: {result['status']} | Tags: {', '.join(result['tags'])}")
            print(f"  Score: {result['score']}")
            print()

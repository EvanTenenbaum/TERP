#!/usr/bin/env python3
"""
Identify critical procedures that need custom error handling.
Focus on high-value business operations: orders, payments, inventory transfers.
"""

import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

CRITICAL_ROUTERS = {
    "orders.ts": "Order management",
    "accounting.ts": "Payment and accounting",
    "inventory.ts": "Inventory operations",
    "inventoryMovements.ts": "Inventory transfers",
}

CRITICAL_OPERATIONS = [
    "create", "update", "delete", "transfer", "apply", "process", "fulfill"
]

def analyze_router(router_file):
    """Analyze a router for critical procedures"""
    content = router_file.read_text()
    
    procedures = []
    
    # Find all procedure definitions
    for match in re.finditer(r'(\w+):\s*(?:protected|public|admin)Procedure', content):
        proc_name = match.group(1)
        
        # Check if it's a critical operation
        is_critical = any(op in proc_name.lower() for op in CRITICAL_OPERATIONS)
        
        if is_critical:
            # Check if it already has try-catch
            proc_start = match.start()
            # Look ahead for try-catch within next 500 chars
            context = content[proc_start:proc_start + 500]
            has_try_catch = 'try {' in context or 'try{' in context
            
            procedures.append({
                "name": proc_name,
                "has_error_handling": has_try_catch,
                "line": content[:proc_start].count('\n') + 1
            })
    
    return procedures

def main():
    print("=" * 80)
    print("IDENTIFYING CRITICAL PROCEDURES FOR CUSTOM ERROR HANDLING")
    print("=" * 80)
    print()
    
    routers_dir = TERP_ROOT / "server" / "routers"
    
    total_critical = 0
    total_needs_handling = 0
    
    for router_name, description in CRITICAL_ROUTERS.items():
        router_file = routers_dir / router_name
        
        if not router_file.exists():
            print(f"⚠️  {router_name}: File not found")
            continue
        
        procedures = analyze_router(router_file)
        
        if not procedures:
            continue
        
        needs_handling = [p for p in procedures if not p["has_error_handling"]]
        
        print(f"\n📁 {router_name} - {description}")
        print("-" * 80)
        print(f"Critical procedures: {len(procedures)}")
        print(f"Need custom error handling: {len(needs_handling)}")
        
        if needs_handling:
            print("\nProcedures needing custom error handling:")
            for proc in needs_handling[:10]:  # Show first 10
                print(f"  - Line {proc['line']}: {proc['name']}")
            if len(needs_handling) > 10:
                print(f"  ... and {len(needs_handling) - 10} more")
        
        total_critical += len(procedures)
        total_needs_handling += len(needs_handling)
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total critical procedures: {total_critical}")
    print(f"Need custom error handling: {total_needs_handling}")
    print(f"Already have error handling: {total_critical - total_needs_handling}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION")
    print("=" * 80)
    print(f"Focus on top {min(20, total_needs_handling)} procedures for Phase 3")
    print("Priority order:")
    print("  1. Order creation/fulfillment")
    print("  2. Payment application")
    print("  3. Inventory transfers")
    print("  4. Critical updates/deletes")

if __name__ == "__main__":
    main()

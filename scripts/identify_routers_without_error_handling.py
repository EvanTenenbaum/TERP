#!/usr/bin/env python3
"""
Identify routers without proper error handling.
Lists all routers that need try-catch blocks added.
"""

import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

def check_router_error_handling(router_file):
    """Check if a router has proper error handling"""
    content = router_file.read_text()
    
    # Count procedures
    procedures = len(re.findall(r'\.(query|mutation)\s*\(', content))
    
    # Check for try-catch blocks
    has_try_catch = 'try {' in content and 'catch' in content
    
    # Check for handleError usage
    has_handle_error = 'handleError' in content
    
    # Count try-catch blocks
    try_catch_count = len(re.findall(r'try\s*\{', content))
    
    return {
        "file": str(router_file.relative_to(TERP_ROOT)),
        "procedures": procedures,
        "has_try_catch": has_try_catch,
        "has_handle_error": has_handle_error,
        "try_catch_count": try_catch_count,
        "needs_work": not has_try_catch or try_catch_count < procedures
    }

def main():
    print("=" * 80)
    print("ROUTER ERROR HANDLING ANALYSIS")
    print("=" * 80)
    print()
    
    routers_dir = TERP_ROOT / "server" / "routers"
    
    with_error_handling = []
    without_error_handling = []
    
    for router_file in sorted(routers_dir.glob("*.ts")):
        result = check_router_error_handling(router_file)
        
        if result["has_try_catch"]:
            with_error_handling.append(result)
        else:
            without_error_handling.append(result)
    
    print("ROUTERS WITH ERROR HANDLING")
    print("-" * 80)
    for result in with_error_handling:
        print(f"✅ {result['file']}")
        print(f"   Procedures: {result['procedures']}, Try-catch blocks: {result['try_catch_count']}")
    
    print(f"\nTotal: {len(with_error_handling)} routers")
    print()
    
    print("ROUTERS WITHOUT ERROR HANDLING")
    print("-" * 80)
    for result in without_error_handling:
        print(f"❌ {result['file']}")
        print(f"   Procedures: {result['procedures']}")
    
    print(f"\nTotal: {len(without_error_handling)} routers")
    print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ With error handling: {len(with_error_handling)}/{len(with_error_handling) + len(without_error_handling)}")
    print(f"❌ Without error handling: {len(without_error_handling)}/{len(with_error_handling) + len(without_error_handling)}")
    
    completion = round((len(with_error_handling) / (len(with_error_handling) + len(without_error_handling))) * 100, 1)
    print(f"\n📊 Error Handling Coverage: {completion}%")
    
    # Save list of routers needing work
    output_file = TERP_ROOT / "scripts" / "routers_needing_error_handling.txt"
    with open(output_file, 'w') as f:
        for result in without_error_handling:
            f.write(f"{result['file']}\n")
    
    print(f"\n📄 List saved to: {output_file.relative_to(TERP_ROOT)}")

if __name__ == "__main__":
    main()

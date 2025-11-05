#!/usr/bin/env python3
"""
Analyze 'return result[0] || null' patterns to determine which should throw NOT_FOUND.
"""

import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

def analyze_function(content, match_start):
    """Analyze the function containing this return statement"""
    # Find function name
    func_search = content[:match_start]
    func_match = re.search(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', func_search[::-1])
    if func_match:
        func_name = func_match.group(1)[::-1]
    else:
        func_name = "unknown"
    
    # Determine if this is a getById/getByX function (should throw NOT_FOUND)
    should_throw = any(pattern in func_name.lower() for pattern in [
        'getby', 'findby', 'fetch'
    ])
    
    return func_name, should_throw

def analyze_db_file(db_file):
    """Analyze a DB file for result[0] || null patterns"""
    content = db_file.read_text()
    
    issues = []
    
    # Find all 'return result[0] || null' patterns
    for match in re.finditer(r'return\s+result\[0\]\s*\|\|\s*null', content):
        line_num = content[:match.start()].count('\n') + 1
        func_name, should_throw = analyze_function(content, match.start())
        
        issues.append({
            "line": line_num,
            "function": func_name,
            "should_throw": should_throw,
            "current": match.group(0)
        })
    
    return {
        "file": str(db_file.relative_to(TERP_ROOT)),
        "issues": issues
    }

def main():
    print("=" * 80)
    print("ANALYZING 'return result[0] || null' PATTERNS")
    print("=" * 80)
    print()
    
    server_dir = TERP_ROOT / "server"
    db_files = list(server_dir.glob("*Db.ts"))
    
    should_throw_count = 0
    optional_count = 0
    
    for db_file in sorted(db_files):
        result = analyze_db_file(db_file)
        
        if not result["issues"]:
            continue
        
        print(f"\n📁 {result['file']}")
        print("-" * 80)
        
        for issue in result["issues"]:
            if issue["should_throw"]:
                print(f"  ❌ Line {issue['line']}: {issue['function']}()")
                print(f"     → Should throw NOT_FOUND error")
                should_throw_count += 1
            else:
                print(f"  ✅ Line {issue['line']}: {issue['function']}()")
                print(f"     → Returning null is OK (optional data)")
                optional_count += 1
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"❌ Should throw NOT_FOUND: {should_throw_count}")
    print(f"✅ Returning null is OK: {optional_count}")
    print(f"📊 Total patterns: {should_throw_count + optional_count}")
    
    # Create fix list
    print("\n" + "=" * 80)
    print("FUNCTIONS NEEDING MANUAL FIXES")
    print("=" * 80)
    
    for db_file in sorted(db_files):
        result = analyze_db_file(db_file)
        needs_fix = [i for i in result["issues"] if i["should_throw"]]
        
        if needs_fix:
            print(f"\n{result['file']}:")
            for issue in needs_fix:
                print(f"  - Line {issue['line']}: {issue['function']}()")

if __name__ == "__main__":
    main()

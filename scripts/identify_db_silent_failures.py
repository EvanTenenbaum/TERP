#!/usr/bin/env python3
"""
Identify DB layer functions with silent failures.
Finds patterns like 'return null' and 'return []' that should throw errors instead.
"""

import re
from pathlib import Path
from collections import defaultdict

TERP_ROOT = Path("/home/ubuntu/TERP")

def analyze_db_file(db_file):
    """Analyze a DB file for silent failure patterns"""
    content = db_file.read_text()
    
    issues = []
    
    # Pattern 1: if (!db) return null/[]
    for match in re.finditer(r'if\s*\(\s*!db\s*\)\s*return\s*(null|\[\])', content):
        line_num = content[:match.start()].count('\n') + 1
        issues.append({
            "line": line_num,
            "pattern": "Missing DB connection",
            "current": match.group(0),
            "fix": "throw ErrorCatalog.DATABASE.CONNECTION_ERROR()"
        })
    
    # Pattern 2: return result[0] || null
    for match in re.finditer(r'return\s+result\[0\]\s*\|\|\s*null', content):
        line_num = content[:match.start()].count('\n') + 1
        issues.append({
            "line": line_num,
            "pattern": "Silent not found",
            "current": match.group(0),
            "fix": "Check if result[0] exists, throw NOT_FOUND if missing"
        })
    
    # Pattern 3: return null (in functions)
    for match in re.finditer(r'^\s*return\s+null;', content, re.MULTILINE):
        line_num = content[:match.start()].count('\n') + 1
        # Skip if it's after a valid check
        context_start = max(0, match.start() - 200)
        context = content[context_start:match.start()]
        if 'if' not in context[-100:]:  # Simple heuristic
            issues.append({
                "line": line_num,
                "pattern": "Unconditional null return",
                "current": match.group(0).strip(),
                "fix": "Consider if this should throw an error"
            })
    
    # Pattern 4: return [] (empty array)
    for match in re.finditer(r'if\s*\(\s*!db\s*\)\s*return\s*\[\]', content):
        line_num = content[:match.start()].count('\n') + 1
        issues.append({
            "line": line_num,
            "pattern": "Empty array on DB failure",
            "current": match.group(0),
            "fix": "throw ErrorCatalog.DATABASE.CONNECTION_ERROR()"
        })
    
    return {
        "file": str(db_file.relative_to(TERP_ROOT)),
        "issues": issues,
        "total_issues": len(issues)
    }

def main():
    print("=" * 80)
    print("DB LAYER SILENT FAILURE ANALYSIS")
    print("=" * 80)
    print()
    
    server_dir = TERP_ROOT / "server"
    
    # Find all DB files
    db_files = list(server_dir.glob("*Db.ts")) + list(server_dir.glob("*Service.ts"))
    
    results = []
    total_issues = 0
    
    for db_file in sorted(db_files):
        result = analyze_db_file(db_file)
        if result["total_issues"] > 0:
            results.append(result)
            total_issues += result["total_issues"]
    
    # Sort by number of issues
    results.sort(key=lambda x: x["total_issues"], reverse=True)
    
    # Print results
    print("FILES WITH SILENT FAILURES (sorted by issue count)")
    print("=" * 80)
    
    for result in results:
        print(f"\n📁 {result['file']} ({result['total_issues']} issues)")
        print("-" * 80)
        
        # Group by pattern
        by_pattern = defaultdict(list)
        for issue in result['issues']:
            by_pattern[issue['pattern']].append(issue)
        
        for pattern, issues in by_pattern.items():
            print(f"\n  {pattern}: {len(issues)} occurrence(s)")
            for issue in issues[:3]:  # Show first 3 of each pattern
                print(f"    Line {issue['line']}: {issue['current']}")
                print(f"    → {issue['fix']}")
            if len(issues) > 3:
                print(f"    ... and {len(issues) - 3} more")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Files with issues: {len(results)}")
    print(f"Total issues found: {total_issues}")
    
    # Categorize by priority
    print("\n" + "=" * 80)
    print("PRIORITY CATEGORIZATION")
    print("=" * 80)
    
    high_priority = [
        "ordersDb.ts",
        "accountingDb.ts",
        "inventoryDb.ts",
        "clientsDb.ts",
        "inventoryMovementsDb.ts"
    ]
    
    print("\n🔴 HIGH PRIORITY (Critical business operations)")
    for result in results:
        if any(hp in result['file'] for hp in high_priority):
            print(f"  - {result['file']}: {result['total_issues']} issues")
    
    print("\n🟡 MEDIUM PRIORITY (Supporting operations)")
    for result in results:
        if not any(hp in result['file'] for hp in high_priority):
            print(f"  - {result['file']}: {result['total_issues']} issues")
    
    # Save detailed report
    output_file = TERP_ROOT / "scripts" / "db_silent_failures_report.txt"
    with open(output_file, 'w') as f:
        for result in results:
            f.write(f"{result['file']}\n")
            for issue in result['issues']:
                f.write(f"  Line {issue['line']}: {issue['pattern']}\n")
            f.write("\n")
    
    print(f"\n📄 Detailed report saved to: {output_file.relative_to(TERP_ROOT)}")

if __name__ == "__main__":
    main()

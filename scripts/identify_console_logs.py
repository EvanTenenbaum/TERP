#!/usr/bin/env python3
"""
Identify all console.log/error/warn statements in the codebase.
Categorize by file and type for systematic replacement.
"""

import re
from pathlib import Path
from collections import defaultdict

TERP_ROOT = Path("/home/ubuntu/TERP")

def analyze_file(file_path):
    """Analyze a file for console statements"""
    try:
        content = file_path.read_text()
    except:
        return []
    
    statements = []
    
    # Find all console.log/error/warn/info/debug
    for match in re.finditer(r'console\.(log|error|warn|info|debug)\s*\(', content):
        line_num = content[:match.start()].count('\n') + 1
        console_type = match.group(1)
        
        # Get the line content for context
        lines = content.split('\n')
        line_content = lines[line_num - 1].strip() if line_num <= len(lines) else ""
        
        statements.append({
            "line": line_num,
            "type": console_type,
            "content": line_content[:80]  # First 80 chars
        })
    
    return statements

def main():
    print("=" * 80)
    print("IDENTIFYING CONSOLE.LOG STATEMENTS")
    print("=" * 80)
    print()
    
    # Analyze server files
    server_dir = TERP_ROOT / "server"
    server_files = list(server_dir.glob("**/*.ts"))
    
    # Analyze client files  
    client_dir = TERP_ROOT / "client" / "src"
    client_files = list(client_dir.glob("**/*.ts")) + list(client_dir.glob("**/*.tsx"))
    
    all_files = server_files + client_files
    
    by_type = defaultdict(int)
    by_file = {}
    total = 0
    
    for file_path in all_files:
        statements = analyze_file(file_path)
        
        if statements:
            rel_path = str(file_path.relative_to(TERP_ROOT))
            by_file[rel_path] = statements
            total += len(statements)
            
            for stmt in statements:
                by_type[stmt["type"]] += 1
    
    # Sort files by number of console statements
    sorted_files = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)
    
    print("TOP 20 FILES WITH MOST CONSOLE STATEMENTS")
    print("=" * 80)
    for file_path, statements in sorted_files[:20]:
        print(f"\n📁 {file_path} ({len(statements)} statements)")
        
        # Show breakdown by type
        type_counts = defaultdict(int)
        for stmt in statements:
            type_counts[stmt["type"]] += 1
        
        type_summary = ", ".join(f"{t}: {c}" for t, c in type_counts.items())
        print(f"   Types: {type_summary}")
        
        # Show first 3 examples
        for stmt in statements[:3]:
            print(f"   Line {stmt['line']}: console.{stmt['type']}(...)")
        if len(statements) > 3:
            print(f"   ... and {len(statements) - 3} more")
    
    print("\n" + "=" * 80)
    print("SUMMARY BY TYPE")
    print("=" * 80)
    for console_type, count in sorted(by_type.items(), key=lambda x: x[1], reverse=True):
        print(f"console.{console_type}: {count}")
    
    print("\n" + "=" * 80)
    print("SUMMARY BY LOCATION")
    print("=" * 80)
    server_count = sum(len(stmts) for path, stmts in by_file.items() if path.startswith('server/'))
    client_count = sum(len(stmts) for path, stmts in by_file.items() if path.startswith('client/'))
    print(f"Server files: {server_count}")
    print(f"Client files: {client_count}")
    print(f"Total: {total}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION")
    print("=" * 80)
    print("Priority order for replacement:")
    print("  1. Server files (backend logging is critical)")
    print("  2. Client files (can use console in development)")
    print()
    print(f"Focus on top {min(20, len(sorted_files))} files with most statements")
    print("These files account for majority of console usage")
    
    # Save detailed report
    output_file = TERP_ROOT / "scripts" / "console_log_report.txt"
    with open(output_file, 'w') as f:
        for file_path, statements in sorted_files:
            f.write(f"{file_path}\n")
            for stmt in statements:
                f.write(f"  Line {stmt['line']}: console.{stmt['type']}\n")
            f.write("\n")
    
    print(f"\n📄 Detailed report saved to: {output_file.relative_to(TERP_ROOT)}")

if __name__ == "__main__":
    main()

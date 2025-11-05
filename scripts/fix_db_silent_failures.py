#!/usr/bin/env python3
"""
Automatically fix DB layer silent failures.
Replaces 'return null/[]' with proper error throwing.
"""

import re
from pathlib import Path
import sys

TERP_ROOT = Path("/home/ubuntu/TERP")

def fix_db_file(db_file):
    """Fix silent failures in a DB file"""
    content = db_file.read_text()
    original_content = content
    
    # Check if ErrorCatalog is already imported
    has_error_catalog = 'ErrorCatalog' in content
    
    # Add ErrorCatalog import if missing
    if not has_error_catalog:
        # Find the last import statement
        import_matches = list(re.finditer(r'^import\s+.*?;$', content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            insert_pos = last_import.end()
            content = (
                content[:insert_pos] +
                '\nimport { ErrorCatalog } from "./_core/errors";' +
                content[insert_pos:]
            )
    
    modifications = 0
    
    # Fix Pattern 1: if (!db) return null
    pattern1 = r'if\s*\(\s*!db\s*\)\s*return\s+null;'
    replacement1 = 'if (!db) throw ErrorCatalog.DATABASE.CONNECTION_ERROR();'
    new_content, count1 = re.subn(pattern1, replacement1, content)
    if count1 > 0:
        content = new_content
        modifications += count1
    
    # Fix Pattern 2: if (!db) return []
    pattern2 = r'if\s*\(\s*!db\s*\)\s*return\s+\[\];'
    replacement2 = 'if (!db) throw ErrorCatalog.DATABASE.CONNECTION_ERROR();'
    new_content, count2 = re.subn(pattern2, replacement2, content)
    if count2 > 0:
        content = new_content
        modifications += count2
    
    # Fix Pattern 3: throw new Error("Database not available")
    pattern3 = r'throw\s+new\s+Error\s*\(\s*["\']Database not available["\']\s*\);'
    replacement3 = 'throw ErrorCatalog.DATABASE.CONNECTION_ERROR();'
    new_content, count3 = re.subn(pattern3, replacement3, content)
    if count3 > 0:
        content = new_content
        modifications += count3
    
    if content == original_content:
        return None, "No changes needed"
    
    return content, f"Fixed {modifications} silent failure(s)"

def main():
    if len(sys.argv) > 1:
        # Fix specific file
        db_file = Path(sys.argv[1])
        if not db_file.exists():
            print(f"Error: File {db_file} not found")
            return
        
        new_content, message = fix_db_file(db_file)
        if new_content:
            db_file.write_text(new_content)
            print(f"✅ {db_file.name}: {message}")
        else:
            print(f"⏭️  {db_file.name}: {message}")
    else:
        # Fix all DB files with issues
        report_file = TERP_ROOT / "scripts" / "db_silent_failures_report.txt"
        
        if not report_file.exists():
            print("Error: db_silent_failures_report.txt not found")
            print("Run identify_db_silent_failures.py first")
            return
        
        # Parse report to get list of files
        content = report_file.read_text()
        files = []
        for line in content.split('\n'):
            if line.startswith('server/'):
                files.append(line.strip())
        
        print("=" * 80)
        print("FIXING DB LAYER SILENT FAILURES")
        print("=" * 80)
        print()
        
        success = 0
        skipped = 0
        errors = 0
        
        for file_path in files:
            db_file = TERP_ROOT / file_path
            
            if not db_file.exists():
                print(f"❌ {db_file.name}: File not found")
                errors += 1
                continue
            
            try:
                new_content, message = fix_db_file(db_file)
                if new_content:
                    db_file.write_text(new_content)
                    print(f"✅ {db_file.name}: {message}")
                    success += 1
                else:
                    print(f"⏭️  {db_file.name}: {message}")
                    skipped += 1
            except Exception as e:
                print(f"❌ {db_file.name}: Error - {e}")
                errors += 1
        
        print()
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"✅ Success: {success}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"❌ Errors: {errors}")
        print(f"📊 Total: {success + skipped + errors}")
        print()
        print("⚠️  NOTE: This script fixes automatic patterns only.")
        print("   Manual review needed for 'return result[0] || null' patterns.")

if __name__ == "__main__":
    main()

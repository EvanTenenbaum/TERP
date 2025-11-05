#!/usr/bin/env python3
"""
Automatically add error handling to router procedures.
Wraps all query/mutation procedures in try-catch blocks with proper error handling.
"""

import re
from pathlib import Path
import sys

TERP_ROOT = Path("/home/ubuntu/TERP")

def add_error_handling_to_router(router_file):
    """Add error handling to all procedures in a router"""
    content = router_file.read_text()
    
    # Check if already has error handling
    if 'try {' in content and 'catch' in content:
        return None, "Already has error handling"
    
    # Check if handleError is imported
    has_handle_error_import = 'handleError' in content
    
    # Add handleError import if not present
    if not has_handle_error_import:
        # Find the import section
        import_match = re.search(r'(import.*?from.*?["\'];?\s*)+', content, re.MULTILINE)
        if import_match:
            last_import_end = import_match.end()
            # Add handleError import after last import
            content = (
                content[:last_import_end] +
                '\nimport { handleError } from "../_core/errors";\n' +
                content[last_import_end:]
            )
    
    # Pattern to match procedures
    # Matches: .query(async ({ input }) => { ... })
    # or: .mutation(async ({ input, ctx }) => { ... })
    procedure_pattern = r'(\.(query|mutation)\s*\(\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{)'
    
    # Find all procedures
    procedures = list(re.finditer(procedure_pattern, content))
    
    if not procedures:
        return None, "No procedures found"
    
    # Process procedures in reverse order to maintain positions
    modifications = 0
    for match in reversed(procedures):
        start = match.end()
        
        # Find the matching closing brace
        brace_count = 1
        pos = start
        while pos < len(content) and brace_count > 0:
            if content[pos] == '{':
                brace_count += 1
            elif content[pos] == '}':
                brace_count -= 1
            pos += 1
        
        if brace_count != 0:
            continue  # Skip if we can't find matching brace
        
        end = pos - 1  # Position of closing brace
        
        # Get the procedure body
        body = content[start:end]
        
        # Check if already wrapped in try-catch
        if body.strip().startswith('try {'):
            continue
        
        # Get router name from file
        router_name = router_file.stem
        
        # Wrap in try-catch
        wrapped_body = f'''
    try {{
{body}
    }} catch (error) {{
      return handleError(error, "{router_name}.{match.group(2)}");
    }}
  '''
        
        # Replace the body
        content = content[:start] + wrapped_body + content[end:]
        modifications += 1
    
    if modifications == 0:
        return None, "No modifications needed"
    
    return content, f"Added error handling to {modifications} procedure(s)"

def main():
    if len(sys.argv) > 1:
        # Process specific file
        router_file = Path(sys.argv[1])
        if not router_file.exists():
            print(f"Error: File {router_file} not found")
            return
        
        new_content, message = add_error_handling_to_router(router_file)
        if new_content:
            router_file.write_text(new_content)
            print(f"✅ {router_file.name}: {message}")
        else:
            print(f"⏭️  {router_file.name}: {message}")
    else:
        # Process all routers without error handling
        routers_file = TERP_ROOT / "scripts" / "routers_needing_error_handling.txt"
        
        if not routers_file.exists():
            print("Error: routers_needing_error_handling.txt not found")
            print("Run identify_routers_without_error_handling.py first")
            return
        
        routers = routers_file.read_text().strip().split('\n')
        
        print("=" * 80)
        print("ADDING ERROR HANDLING TO ROUTERS")
        print("=" * 80)
        print()
        
        success = 0
        skipped = 0
        errors = 0
        
        for router_path in routers:
            router_file = TERP_ROOT / router_path.strip()
            
            if not router_file.exists():
                print(f"❌ {router_file.name}: File not found")
                errors += 1
                continue
            
            try:
                new_content, message = add_error_handling_to_router(router_file)
                if new_content:
                    router_file.write_text(new_content)
                    print(f"✅ {router_file.name}: {message}")
                    success += 1
                else:
                    print(f"⏭️  {router_file.name}: {message}")
                    skipped += 1
            except Exception as e:
                print(f"❌ {router_file.name}: Error - {e}")
                errors += 1
        
        print()
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"✅ Success: {success}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"❌ Errors: {errors}")
        print(f"📊 Total: {success + skipped + errors}")

if __name__ == "__main__":
    main()

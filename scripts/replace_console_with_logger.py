#!/usr/bin/env python3
"""
Automatically replace console.log/error/warn with logger calls.
"""

import re
from pathlib import Path
import sys

TERP_ROOT = Path("/home/ubuntu/TERP")

def fix_file(file_path):
    """Replace console statements with logger in a file"""
    try:
        content = file_path.read_text()
    except:
        return None, "Could not read file"
    
    original_content = content
    
    # Check if logger is already imported
    has_logger = 'from "./_core/logger"' in content or 'from "../_core/logger"' in content or 'from "../../_core/logger"' in content
    
    # Add logger import if missing
    if not has_logger and ('console.log' in content or 'console.error' in content or 'console.warn' in content):
        # Determine correct import path based on file location
        if 'server/routers' in str(file_path):
            import_line = 'import { logger } from "../_core/logger";'
        elif 'server/services' in str(file_path):
            import_line = 'import { logger } from "../_core/logger";'
        elif 'server/_core' in str(file_path):
            import_line = 'import { logger } from "./logger";'
        else:
            import_line = 'import { logger } from "./_core/logger";'
        
        # Find the last import statement
        import_matches = list(re.finditer(r'^import\s+.*?;$', content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            insert_pos = last_import.end()
            content = content[:insert_pos] + '\n' + import_line + content[insert_pos:]
        else:
            # No imports found, add at the top after any comments
            lines = content.split('\n')
            insert_line = 0
            for i, line in enumerate(lines):
                if not line.strip().startswith('//') and not line.strip().startswith('/*') and not line.strip().startswith('*') and line.strip():
                    insert_line = i
                    break
            lines.insert(insert_line, import_line)
            content = '\n'.join(lines)
    
    modifications = 0
    
    # Replace console.error with logger.error
    new_content, count = re.subn(r'\bconsole\.error\b', 'logger.error', content)
    if count > 0:
        content = new_content
        modifications += count
    
    # Replace console.warn with logger.warn
    new_content, count = re.subn(r'\bconsole\.warn\b', 'logger.warn', content)
    if count > 0:
        content = new_content
        modifications += count
    
    # Replace console.log with logger.info
    new_content, count = re.subn(r'\bconsole\.log\b', 'logger.info', content)
    if count > 0:
        content = new_content
        modifications += count
    
    # Replace console.info with logger.info
    new_content, count = re.subn(r'\bconsole\.info\b', 'logger.info', content)
    if count > 0:
        content = new_content
        modifications += count
    
    # Replace console.debug with logger.debug
    new_content, count = re.subn(r'\bconsole\.debug\b', 'logger.debug', content)
    if count > 0:
        content = new_content
        modifications += count
    
    if content == original_content:
        return None, "No changes needed"
    
    return content, f"Replaced {modifications} console statement(s)"

def main():
    if len(sys.argv) > 1:
        # Fix specific file
        file_path = Path(sys.argv[1])
        if not file_path.exists():
            print(f"Error: File {file_path} not found")
            return
        
        new_content, message = fix_file(file_path)
        if new_content:
            file_path.write_text(new_content)
            print(f"✅ {file_path.name}: {message}")
        else:
            print(f"⏭️  {file_path.name}: {message}")
    else:
        # Fix all server files
        print("=" * 80)
        print("REPLACING CONSOLE STATEMENTS WITH LOGGER")
        print("=" * 80)
        print()
        
        server_dir = TERP_ROOT / "server"
        server_files = list(server_dir.glob("**/*.ts"))
        
        success = 0
        skipped = 0
        errors = 0
        total_replacements = 0
        
        for file_path in sorted(server_files):
            try:
                new_content, message = fix_file(file_path)
                if new_content:
                    file_path.write_text(new_content)
                    # Extract number of replacements
                    match = re.search(r'Replaced (\d+)', message)
                    if match:
                        count = int(match.group(1))
                        total_replacements += count
                    print(f"✅ {file_path.relative_to(TERP_ROOT)}: {message}")
                    success += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"❌ {file_path.relative_to(TERP_ROOT)}: Error - {e}")
                errors += 1
        
        print()
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"✅ Files modified: {success}")
        print(f"⏭️  Files skipped: {skipped}")
        print(f"❌ Errors: {errors}")
        print(f"📊 Total files: {success + skipped + errors}")
        print(f"🔄 Total replacements: {total_replacements}")
        print()
        print("⚠️  NOTE: Client files not modified (console.log OK in development)")
        print("   Run TypeScript check to verify no errors introduced")

if __name__ == "__main__":
    main()

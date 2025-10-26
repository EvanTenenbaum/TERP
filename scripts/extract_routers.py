#!/usr/bin/env python3
"""
Extract routers from server/routers.ts into separate files.
This script safely refactors the monolithic routers file into domain-specific modules.
"""

import re
from pathlib import Path

# Read the original routers file
routers_file = Path("/home/ubuntu/TERP/server/routers.ts")
content = routers_file.read_text()

# Find all top-level router definitions
router_pattern = r"^  (\w+): router\(\{$"
router_matches = list(re.finditer(router_pattern, content, re.MULTILINE))

print(f"Found {len(router_matches)} routers to extract:")
for match in router_matches:
    router_name = match.group(1)
    line_num = content[:match.start()].count('\n') + 1
    print(f"  - {router_name} (line {line_num})")

# Extract imports from the original file
imports_section = content.split("export const appRouter")[0]

# Routers to skip (already extracted or should stay in main file)
skip_routers = {'system', 'auth'}

# Extract each router
for i, match in enumerate(router_matches):
    router_name = match.group(1)
    
    if router_name in skip_routers:
        print(f"\nSkipping {router_name} (already extracted or system router)")
        continue
    
    print(f"\nExtracting {router_name}...")
    
    # Find the start and end of this router
    start_pos = match.start()
    
    # Find the end by counting braces
    brace_count = 0
    in_router = False
    end_pos = start_pos
    
    for j in range(start_pos, len(content)):
        char = content[j]
        if char == '{':
            brace_count += 1
            in_router = True
        elif char == '}':
            brace_count -= 1
            if in_router and brace_count == 0:
                # Found the closing brace, now find the end of this line
                end_pos = content.find('\n', j) + 1
                if end_pos == 0:  # No newline found
                    end_pos = len(content)
                break
    
    # Extract the router content
    router_content = content[match.start():end_pos]
    
    # Extract just the router body (without the name and assignment)
    # Pattern: "  routerName: router({"  ->  "export const routerNameRouter = router({"
    router_body = re.sub(
        r"^  \w+: router\(\{",
        f"export const {router_name}Router = router({{",
        router_content,
        count=1,
        flags=re.MULTILINE
    )
    
    # Determine which imports this router needs
    needed_imports = set()
    
    if 'inventoryDb.' in router_body:
        needed_imports.add('inventoryDb')
    if 'inventoryUtils.' in router_body:
        needed_imports.add('inventoryUtils')
    if 'accountingDb.' in router_body:
        needed_imports.add('accountingDb')
    if 'arApDb.' in router_body:
        needed_imports.add('arApDb')
    if 'cashExpensesDb.' in router_body:
        needed_imports.add('cashExpensesDb')
    if 'freeformNotesDb.' in router_body:
        needed_imports.add('freeformNotesDb')
    if 'clientsDb.' in router_body:
        needed_imports.add('clientsDb')
    if 'creditEngine.' in router_body:
        needed_imports.add('creditEngine')
    if 'pricingEngine.' in router_body:
        needed_imports.add('pricingEngine')
    if 'salesSheetsDb.' in router_body:
        needed_imports.add('salesSheetsDb')
    if 'ordersDb.' in router_body:
        needed_imports.add('ordersDb')
    if 'scratchPadDb.' in router_body:
        needed_imports.add('scratchPadDb')
    if 'dashboardDb.' in router_body:
        needed_imports.add('dashboardDb')
    if 'seedStrainsFromCSV' in router_body:
        needed_imports.add('seedStrains')
    if 'Batch' in router_body:
        needed_imports.add('schema_types')
    
    # Build imports
    import_lines = []
    import_lines.append('import { z } from "zod";')
    import_lines.append('import { protectedProcedure, router } from "../_core/trpc";')
    
    if 'publicProcedure' in router_body:
        import_lines[-1] = 'import { publicProcedure, protectedProcedure, router } from "../_core/trpc";'
    
    for imp in sorted(needed_imports):
        if imp == 'seedStrains':
            import_lines.append('import { seedStrainsFromCSV } from "../seedStrains";')
        elif imp == 'schema_types':
            import_lines.append('import type { Batch } from "../../drizzle/schema";')
        else:
            import_lines.append(f'import * as {imp} from "../{imp}";')
    
    # Create the new file
    new_file_content = '\n'.join(import_lines) + '\n\n' + router_body
    
    # Write to file
    output_file = Path(f"/home/ubuntu/TERP/server/routers/{router_name}.ts")
    output_file.write_text(new_file_content)
    print(f"  ✓ Created {output_file}")

print("\n✅ Router extraction complete!")
print("\nNext steps:")
print("1. Update server/routers.ts to import and use these routers")
print("2. Run TypeScript check to verify")
print("3. Test the application")


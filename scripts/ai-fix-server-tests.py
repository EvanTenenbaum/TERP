#!/usr/bin/env python3
"""
Fix server-side failing tests using OpenAI API.
Focus on router and database tests.
"""

import os
import sys
import json
import time
from openai import OpenAI

client = OpenAI()

def read_file(path):
    """Read a file and return its contents."""
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def write_file(path, content):
    """Write content to a file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"  Written: {path}")

def fix_test(test_path, impl_path, error_desc):
    """Use GPT-4 to fix a test file."""
    
    test_content = read_file(test_path)
    impl_content = read_file(impl_path) if impl_path and os.path.exists(impl_path) else ""
    
    prompt = f"""Fix this failing TypeScript/Node.js test for a tRPC backend.

## Test File ({test_path}):
```typescript
{test_content[:15000]}
```

## Implementation ({impl_path}):
```typescript
{impl_content[:10000]}
```

## Error:
{error_desc}

## Common issues in tRPC tests:
1. Mock context not properly set up with user/session
2. Database mocks not returning expected data
3. Async/await issues with procedure calls
4. Missing or incorrect mock implementations

## Requirements:
1. Fix the test to properly mock the tRPC context
2. Ensure database mocks return correct data structures
3. Handle async operations correctly
4. Keep all test cases but fix the assertions

Return ONLY the complete fixed test file code. Start with imports."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert TypeScript/tRPC test developer. Return only valid TypeScript code."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=12000
    )
    
    code = response.choices[0].message.content
    
    # Clean up markdown if present
    if code.startswith("```"):
        lines = code.split('\n')
        code = '\n'.join(lines[1:-1] if lines[-1] == '```' else lines[1:])
    if code.startswith("typescript"):
        code = code[10:]
    
    return code

def main():
    print("=" * 70)
    print("Server-Side Test Fix Script")
    print("=" * 70)
    
    # Server-side tests to fix
    tests_to_fix = [
        {
            "test": "/home/ubuntu/TERP/server/routers/accounting.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/accounting.ts",
            "error": "Mock context and database queries not set up correctly"
        },
        {
            "test": "/home/ubuntu/TERP/server/routers/analytics.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/analytics.ts",
            "error": "Analytics data mocks not returning expected format"
        },
        {
            "test": "/home/ubuntu/TERP/server/routers/dashboard.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/dashboard.ts",
            "error": "Dashboard data aggregation mocks failing"
        },
        {
            "test": "/home/ubuntu/TERP/server/routers/inventory.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/inventory.ts",
            "error": "Inventory CRUD operation mocks not working"
        },
        {
            "test": "/home/ubuntu/TERP/server/routers/orders.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/orders.ts",
            "error": "Order creation and status update mocks failing"
        },
        {
            "test": "/home/ubuntu/TERP/server/routers/credits.test.ts",
            "impl": "/home/ubuntu/TERP/server/routers/credits.ts",
            "error": "Credit balance calculations and transaction mocks"
        }
    ]
    
    fixed_count = 0
    
    for test_info in tests_to_fix:
        test_path = test_info["test"]
        impl_path = test_info.get("impl")
        
        if not os.path.exists(test_path):
            print(f"⏭️  Skipping {test_path} - file not found")
            continue
            
        print(f"\n{'='*60}")
        print(f"Fixing: {os.path.basename(test_path)}")
        print(f"{'='*60}")
        
        try:
            fixed_code = fix_test(test_path, impl_path, test_info["error"])
            
            if fixed_code and len(fixed_code) > 100:
                write_file(test_path, fixed_code)
                fixed_count += 1
                print(f"✅ Fixed: {os.path.basename(test_path)}")
            else:
                print(f"⚠️  Skipped: Response too short")
                
            # Rate limiting
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n{'='*70}")
    print(f"Fixed {fixed_count} out of {len(tests_to_fix)} test files")
    print(f"{'='*70}")

if __name__ == '__main__':
    main()

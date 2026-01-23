#!/usr/bin/env python3
"""
Use Claude API to analyze and fix failing tests in the TERP repository.
"""

import os
import sys
import json
import anthropic

# Initialize with explicit API key
api_key = os.environ.get('ANTHROPIC_API_KEY')
if not api_key:
    print("Error: ANTHROPIC_API_KEY not set")
    sys.exit(1)

client = anthropic.Anthropic(api_key=api_key)

def read_file(path):
    """Read a file and return its contents."""
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def write_file(path, content):
    """Write content to a file."""
    with open(path, 'w') as f:
        f.write(content)

def analyze_test_failure(test_file_path, implementation_file_path, error_log):
    """Use Claude to analyze a test failure and suggest fixes."""
    
    test_content = read_file(test_file_path)
    impl_content = read_file(implementation_file_path) if implementation_file_path else "N/A"
    
    prompt = f"""You are an expert TypeScript/React developer. Analyze this failing test and provide a fix.

## Test File: {test_file_path}
```typescript
{test_content[:8000]}
```

## Implementation File: {implementation_file_path}
```typescript
{impl_content[:8000]}
```

## Error from test run:
{error_log[:2000]}

## Task:
1. Identify why the test is failing
2. Determine if the issue is in the test or the implementation
3. Provide the COMPLETE fixed file (test or implementation)

Respond with:
1. ANALYSIS: Brief explanation of the issue
2. FIX_TYPE: "test" or "implementation"
3. FILE_PATH: The path of the file to fix
4. FIXED_CODE: The complete fixed file content (not just the changes)
"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    return message.content[0].text

def main():
    # List of failing tests to analyze
    failing_tests = [
        {
            "test": "client/src/hooks/work-surface/__tests__/useExport.test.ts",
            "impl": "client/src/hooks/work-surface/useExport.ts",
            "error": "Tests failing on hook initialization - state not matching expected values"
        },
        {
            "test": "client/src/hooks/work-surface/__tests__/usePrint.test.ts", 
            "impl": "client/src/hooks/work-surface/usePrint.ts",
            "error": "isPrinting state test failing"
        },
        {
            "test": "server/routers/rbac-permissions.test.ts",
            "impl": "server/routers/rbac-permissions.ts",
            "error": "Permission check verification failing"
        }
    ]
    
    results = []
    
    for test_info in failing_tests:
        print(f"\n{'='*60}")
        print(f"Analyzing: {test_info['test']}")
        print(f"{'='*60}")
        
        try:
            test_path = f"/home/ubuntu/TERP/{test_info['test']}"
            impl_path = f"/home/ubuntu/TERP/{test_info['impl']}" if test_info['impl'] else None
            
            analysis = analyze_test_failure(test_path, impl_path, test_info['error'])
            
            results.append({
                "test": test_info['test'],
                "analysis": analysis
            })
            
            print(analysis[:2000])
            
        except Exception as e:
            print(f"Error analyzing {test_info['test']}: {e}")
            results.append({
                "test": test_info['test'],
                "error": str(e)
            })
    
    # Save results
    with open('/home/ubuntu/TERP/scripts/claude-analysis-results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n\nResults saved to /home/ubuntu/TERP/scripts/claude-analysis-results.json")

if __name__ == '__main__':
    main()

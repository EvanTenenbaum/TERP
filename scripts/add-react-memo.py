#!/usr/bin/env python3
"""
Add React.memo to components using Gemini API
Part of PERF-002: Add React.memo to Components
"""

import os
import sys
import json
from pathlib import Path
from google import genai

def add_memo_to_component(file_path, client):
    """Use Gemini to add React.memo to a component."""
    
    print(f"\nProcessing: {Path(file_path).name}")
    
    with open(file_path, 'r') as f:
        original_content = f.read()
    
    prompt = f"""Add React.memo to this component. Follow these rules:

1. Import memo from React if not already imported
2. Wrap the component export with memo()
3. If component has object/array props, add a custom comparison function
4. Preserve all existing code, comments, and formatting
5. Only modify the export and imports

Component file: {file_path}

```tsx
{original_content}
```

Return the COMPLETE modified file content. Do not truncate or summarize.
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config={
                'temperature': 0.1,
                'max_output_tokens': 8192
            }
        )
        
        modified_content = response.text
        
        # Extract code from markdown if present
        if '```tsx' in modified_content:
            start = modified_content.find('```tsx') + 6
            end = modified_content.rfind('```')
            modified_content = modified_content[start:end].strip()
        elif '```typescript' in modified_content:
            start = modified_content.find('```typescript') + 13
            end = modified_content.rfind('```')
            modified_content = modified_content[start:end].strip()
        
        # Verify it's valid (basic check)
        if 'export' not in modified_content or len(modified_content) < len(original_content) * 0.8:
            print(f"  ❌ Generated content seems invalid")
            return False
        
        # Write back
        with open(file_path, 'w') as f:
            f.write(modified_content)
        
        print(f"  ✅ Added React.memo")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    # Load components to memoize
    with open("docs/PERF-002-HIGH-VALUE-COMPONENTS.json", 'r') as f:
        data = json.load(f)
    
    components = data['to_memoize']
    
    print("="*80)
    print("ADDING REACT.MEMO TO COMPONENTS")
    print("="*80)
    print(f"\nComponents to process: {len(components)}")
    print("Using Gemini API for intelligent memoization...\n")
    
    # Initialize Gemini
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)
    
    client = genai.Client(api_key=api_key)
    
    success_count = 0
    failed = []
    
    for comp in components:
        file_path = comp['file_path']
        if add_memo_to_component(file_path, client):
            success_count += 1
        else:
            failed.append(file_path)
    
    print(f"\n{'='*80}")
    print(f"COMPLETE")
    print(f"{'='*80}")
    print(f"Success: {success_count}/{len(components)}")
    if failed:
        print(f"Failed: {len(failed)}")
        for f in failed:
            print(f"  - {f}")

if __name__ == "__main__":
    main()

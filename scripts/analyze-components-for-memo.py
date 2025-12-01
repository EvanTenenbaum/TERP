#!/usr/bin/env python3
"""
Analyze React components to identify candidates for React.memo
Uses Gemini API for intelligent analysis
Part of PERF-002: Add React.memo to Components
"""

import os
import sys
import json
from pathlib import Path
from google import genai

def analyze_component_file(file_path, client):
    """Analyze a single component file for memo candidacy."""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if already memoized
    if 'React.memo' in content or 'memo(' in content:
        return None
    
    # Use Gemini to analyze the component
    prompt = f"""Analyze this React component for React.memo candidacy.

Component file: {file_path}

```tsx
{content[:3000]}  
```

Evaluate based on:
1. **Complexity**: Number of JSX elements, hooks, computations
2. **Props**: Number and types of props (objects/arrays need custom comparison)
3. **Render Frequency**: Is it used in lists, loops, or frequently re-rendered contexts?
4. **Benefit Score**: How much would React.memo help? (1-10)

Respond in JSON format:
{{
  "component_name": "ComponentName",
  "should_memoize": true/false,
  "benefit_score": 1-10,
  "complexity": "low/medium/high",
  "props_count": number,
  "has_object_props": true/false,
  "needs_custom_comparison": true/false,
  "usage_pattern": "list-item/widget/form/page/utility",
  "reasoning": "Brief explanation"
}}

If file contains multiple components, analyze the main export.
If it's a simple component (<10 lines, no props), return {{"should_memoize": false}}.
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config={'temperature': 0.1}
        )
        
        # Extract JSON from response
        text = response.text
        json_start = text.find('{')
        json_end = text.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            result = json.loads(text[json_start:json_end])
            result['file_path'] = str(file_path)
            return result
        
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
    
    return None

def main():
    print("="*80)
    print("REACT COMPONENT MEMOIZATION ANALYSIS")
    print("="*80)
    print("\nUsing Gemini API for intelligent component analysis...\n")
    
    # Initialize Gemini
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)
    
    client = genai.Client(api_key=api_key)
    
    # Find all component files
    component_dir = Path("client/src/components")
    component_files = list(component_dir.rglob("*.tsx"))
    
    print(f"Found {len(component_files)} component files")
    print(f"Analyzing components...\n")
    
    # Analyze components in batches
    results = []
    
    # Focus on high-value directories first
    priority_patterns = [
        "dashboard/widgets",
        "lists",
        "tables", 
        "forms",
        "common"
    ]
    
    # Prioritize files
    priority_files = []
    other_files = []
    
    for f in component_files:
        if any(pattern in str(f) for pattern in priority_patterns):
            priority_files.append(f)
        else:
            other_files.append(f)
    
    print(f"Priority files: {len(priority_files)}")
    print(f"Other files: {len(other_files)}\n")
    
    # Analyze priority files first
    files_to_analyze = priority_files[:50]  # Limit to 50 for efficiency
    
    for i, file_path in enumerate(files_to_analyze, 1):
        print(f"[{i}/{len(files_to_analyze)}] Analyzing: {file_path.name}")
        result = analyze_component_file(file_path, client)
        if result and result.get('should_memoize'):
            results.append(result)
            print(f"  ✓ Candidate: Score {result.get('benefit_score', 0)}/10")
    
    # Sort by benefit score
    results.sort(key=lambda x: x.get('benefit_score', 0), reverse=True)
    
    # Save results
    output_file = "docs/PERF-002-COMPONENT-ANALYSIS.json"
    with open(output_file, 'w') as f:
        json.dump({
            "total_analyzed": len(files_to_analyze),
            "candidates_found": len(results),
            "top_20": results[:20],
            "all_candidates": results
        }, f, indent=2)
    
    print(f"\n{'='*80}")
    print(f"ANALYSIS COMPLETE")
    print(f"{'='*80}")
    print(f"Total analyzed: {len(files_to_analyze)}")
    print(f"Candidates found: {len(results)}")
    print(f"Top 20 saved to: {output_file}\n")
    
    # Print top 20
    print("TOP 20 COMPONENTS FOR MEMOIZATION:")
    print("-" * 80)
    for i, comp in enumerate(results[:20], 1):
        print(f"{i:2}. {comp['component_name']:30} | Score: {comp['benefit_score']}/10 | {comp['usage_pattern']}")
        print(f"    {comp['file_path']}")
        print(f"    {comp['reasoning'][:80]}...")
        print()

if __name__ == "__main__":
    main()

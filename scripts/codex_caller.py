#!/usr/bin/env python3
"""
Codex API caller for TERP PM tasks.
Uses OpenAI API with gpt-4.1-2025-04-14 model for code generation.
"""

import os
import sys
import json
import requests

def call_codex(task_description: str, context_files: dict) -> str:
    """Call Codex API for code generation."""
    
    # Build context string
    context = "\n\n".join([
        f"=== {path} ===\n{content}" 
        for path, content in context_files.items()
    ])
    
    # Build prompt
    prompt = f"""You are a senior TypeScript developer working on TERP, a hemp wholesale ERP.

TECH STACK: Next.js 14, tRPC, Drizzle ORM, MySQL, TailwindCSS, React 19

CRITICAL RULES (MUST FOLLOW):
1. SOFT DELETES ONLY: Use deletedAt timestamp, never DELETE FROM
2. ACTOR ATTRIBUTION: createdBy/updatedBy from ctx.user.id, NEVER from input
3. PARTY MODEL: Use clients table (isSeller/isBuyer), never vendors table
4. NO ANY TYPE: Use proper TypeScript types
5. NO FALLBACK IDS: Never ctx.user?.id || 1

CURRENT CODEBASE CONTEXT:
{context}

TASK:
{task_description}

OUTPUT FORMAT:
For each file that needs changes, output:
```filepath:/path/to/file.ts
[complete file content]
```

If creating a new file, use the same format.
Only output files that need changes."""

    api_key = os.environ.get('OPENAI_API_KEY')
    api_base = os.environ.get('OPENAI_API_BASE') or 'https://api.openai.com/v1'
    
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    response = requests.post(
        f"{api_base}/responses",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "o3",
            "input": prompt,
            "reasoning": {"effort": "high"},
            "max_output_tokens": 100000
        },
        timeout=300
    )
    
    if response.status_code != 200:
        raise Exception(f"API error: {response.status_code} - {response.text}")
    
    result = response.json()
    
    # Extract text from response
    if "output" in result and len(result["output"]) > 1:
        return result["output"][1]["content"][0]["text"]
    elif "output" in result and len(result["output"]) > 0:
        # Handle different response formats
        for item in result["output"]:
            if item.get("type") == "message" and "content" in item:
                for content in item["content"]:
                    if content.get("type") == "output_text":
                        return content.get("text", "")
    
    return str(result)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 codex_caller.py <task_file.json>")
        print("Task file should contain: {task: string, files: {path: content}}")
        sys.exit(1)
    
    task_file = sys.argv[1]
    
    with open(task_file, 'r') as f:
        task_data = json.load(f)
    
    task = task_data.get('task', '')
    files = task_data.get('files', {})
    
    print(f"Calling Codex with task: {task[:100]}...")
    print(f"Context files: {list(files.keys())}")
    
    result = call_codex(task, files)
    
    # Write result to output file
    output_file = task_file.replace('.json', '_output.txt')
    with open(output_file, 'w') as f:
        f.write(result)
    
    print(f"Output written to: {output_file}")
    print("\n--- CODEX OUTPUT ---\n")
    print(result)


if __name__ == "__main__":
    main()

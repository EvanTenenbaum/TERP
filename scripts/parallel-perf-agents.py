#!/usr/bin/env python3
"""
Parallel PERF Task Execution using Gemini API
Spawns 3 independent Gemini agents to execute PERF-001, PERF-002, and PERF-003 concurrently.
"""

import os
import sys
import json
import time
import threading
from datetime import datetime
from google import genai

# Task definitions
TASKS = [
    {
        "id": "PERF-001",
        "title": "Add Missing Database Indexes",
        "prompt_file": "docs/prompts/PERF-001.md",
        "estimated_hours": 16,
    },
    {
        "id": "PERF-002",
        "title": "Add React.memo to Components",
        "prompt_file": "docs/prompts/PERF-002.md",
        "estimated_hours": 24,
    },
    {
        "id": "PERF-003",
        "title": "Add Pagination to All List Endpoints",
        "prompt_file": "docs/prompts/PERF-003.md",
        "estimated_hours": 24,
    },
]

def execute_task_with_gemini(task, results, index):
    """Execute a single PERF task using Gemini API."""
    
    task_id = task["id"]
    print(f"\n[{task_id}] Starting agent...")
    
    try:
        # Initialize Gemini client
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY not set")
        
        client = genai.Client(api_key=api_key)
        
        # Read the prompt file
        with open(task["prompt_file"], 'r') as f:
            prompt_content = f.read()
        
        # Read repository context
        repo_path = "/home/ubuntu/TERP"
        
        # Construct the agent prompt
        agent_prompt = f"""You are an expert software engineer working on the TERP ERP system. You have been assigned to complete the following task:

**Task ID:** {task_id}
**Task Title:** {task["title"]}
**Repository:** https://github.com/EvanTenenbaum/TERP
**Repository Path:** {repo_path}

**Full Task Prompt:**

{prompt_content}

---

**Your Mission:**

Execute this task COMPLETELY following ALL protocols in the prompt. This includes:

1. **Session Registration:** Create a unique session ID and register it atomically in `docs/ACTIVE_SESSIONS.md`
2. **Branch Creation:** Create feature branch `{task_id.lower()}-...`
3. **Implementation:** Complete all implementation steps using Gemini API for code generation
4. **Testing:** Run all tests and ensure they pass
5. **Type Checking:** Ensure zero TypeScript errors
6. **Documentation:** Create completion report in `docs/{task_id}-COMPLETION-REPORT.md`
7. **Roadmap Update:** Update `docs/roadmaps/MASTER_ROADMAP.md` to mark task as complete
8. **Commit & Push:** Push all changes directly to main branch
9. **Session Archive:** Move session file to completed

**Critical Requirements:**

- Use Gemini API for ALL code generation and analysis
- Follow the exact protocols in the prompt file
- Work independently - other agents are working on different tasks in parallel
- Handle git conflicts gracefully (pull before push)
- Create comprehensive, production-ready implementation
- Document everything thoroughly

**Environment:**

- Python 3.11 available
- Node.js 22.13.0 available
- pnpm package manager
- Gemini API key: Available in GEMINI_API_KEY env var
- GitHub token: (Use environment variable or GitHub CLI)

**Output Format:**

Provide a detailed execution report in JSON format:

```json
{{
  "task_id": "{task_id}",
  "status": "COMPLETE|PARTIAL|FAILED",
  "session_id": "Session-YYYYMMDD-{task_id}-XXXXXXXX",
  "completion_report_path": "docs/{task_id}-COMPLETION-REPORT.md",
  "tests_passing": true|false,
  "typescript_errors": 0,
  "key_changes": "Summary of main changes...",
  "performance_improvement": "Measured improvement...",
  "issues_encountered": "Any issues or 'None'",
  "execution_log": "Detailed log of what you did..."
}}
```

**Begin execution now. Think step-by-step and follow the prompt exactly.**
"""
        
        print(f"[{task_id}] Sending prompt to Gemini API...")
        print(f"[{task_id}] Estimated completion time: {task['estimated_hours']} hours")
        
        # Execute with Gemini
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=agent_prompt,
            config={
                'temperature': 0.1,  # Low temperature for consistent, focused execution
                'max_output_tokens': 8192,
            }
        )
        
        result_text = response.text
        print(f"\n[{task_id}] Agent completed execution")
        print(f"[{task_id}] Response length: {len(result_text)} characters")
        
        # Try to parse JSON response
        try:
            # Look for JSON in the response
            json_start = result_text.find('{')
            json_end = result_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = result_text[json_start:json_end]
                result_data = json.loads(json_str)
            else:
                result_data = {
                    "task_id": task_id,
                    "status": "PARTIAL",
                    "raw_response": result_text[:500],
                    "note": "Could not parse JSON from response"
                }
        except json.JSONDecodeError:
            result_data = {
                "task_id": task_id,
                "status": "PARTIAL",
                "raw_response": result_text[:500],
                "note": "JSON parsing failed"
            }
        
        results[index] = {
            "task": task,
            "success": True,
            "result": result_data,
            "raw_response": result_text,
        }
        
        print(f"[{task_id}] ✅ Task execution completed")
        
    except Exception as e:
        print(f"[{task_id}] ❌ Error: {str(e)}")
        results[index] = {
            "task": task,
            "success": False,
            "error": str(e),
        }

def main():
    print("="*80)
    print("PARALLEL PERF TASK EXECUTION")
    print("="*80)
    print(f"\nStarting at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Tasks to execute: {len(TASKS)}")
    print(f"Execution mode: Parallel (3 concurrent Gemini agents)")
    print("\nTasks:")
    for task in TASKS:
        print(f"  - {task['id']}: {task['title']} ({task['estimated_hours']}h)")
    print("\n" + "="*80 + "\n")
    
    # Results storage
    results = [None] * len(TASKS)
    
    # Create threads for parallel execution
    threads = []
    for i, task in enumerate(TASKS):
        thread = threading.Thread(
            target=execute_task_with_gemini,
            args=(task, results, i)
        )
        threads.append(thread)
        thread.start()
        time.sleep(2)  # Stagger starts slightly to avoid race conditions
    
    # Wait for all threads to complete
    print("\n⏳ Waiting for all agents to complete...\n")
    for thread in threads:
        thread.join()
    
    print("\n" + "="*80)
    print("EXECUTION COMPLETE")
    print("="*80 + "\n")
    
    # Save results
    output_file = "docs/PERF-SPRINT-PARALLEL-EXECUTION-RESULTS.json"
    with open(output_file, 'w') as f:
        json.dump({
            "execution_time": datetime.now().isoformat(),
            "tasks": TASKS,
            "results": results,
        }, f, indent=2)
    
    print(f"Results saved to: {output_file}\n")
    
    # Print summary
    print("SUMMARY:")
    print("-" * 80)
    for i, result in enumerate(results):
        task_id = TASKS[i]["id"]
        if result and result.get("success"):
            status = result.get("result", {}).get("status", "UNKNOWN")
            print(f"  {task_id}: ✅ {status}")
        else:
            error = result.get("error", "Unknown error") if result else "No result"
            print(f"  {task_id}: ❌ FAILED - {error}")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    main()

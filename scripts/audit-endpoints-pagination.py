#!/usr/bin/env python3
"""Audit all endpoints for pagination using Gemini API"""
import os
import json
from pathlib import Path
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

routers = list(Path("server/routers").rglob("*.ts"))
print(f"Auditing {len(routers)} router files...\n")

endpoints_needing_pagination = []
endpoints_with_pagination = []

for router_file in routers:
    with open(router_file) as f:
        code = f.read()
    
    # Skip if file is too small
    if len(code) < 200:
        continue
    
    # Use Gemini to analyze
    prompt = f"""Analyze this tRPC router file and identify list endpoints that return arrays.

For each endpoint that returns an array of items:
- Does it have pagination (limit/offset or cursor)?
- What is the endpoint name?
- What does it return?

File: {router_file}

Code:
{code[:4000]}

Return JSON:
{{"endpoints": [{{"name": "endpointName", "has_pagination": true/false, "returns": "description"}}]}}
"""
    
    try:
        result = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config={'temperature': 0}
        ).text
        
        # Extract JSON
        if '{' in result:
            json_str = result[result.find('{'):result.rfind('}')+1]
            data = json.loads(json_str)
            
            for ep in data.get('endpoints', []):
                ep['file'] = str(router_file)
                if ep.get('has_pagination'):
                    endpoints_with_pagination.append(ep)
                else:
                    endpoints_needing_pagination.append(ep)
                    print(f"❌ {router_file.name}: {ep['name']} - {ep['returns']}")
    except:
        pass

print(f"\n{'='*80}")
print(f"AUDIT RESULTS")
print(f"{'='*80}")
print(f"Endpoints needing pagination: {len(endpoints_needing_pagination)}")
print(f"Endpoints with pagination: {len(endpoints_with_pagination)}")

with open("docs/PERF-003-ENDPOINT-AUDIT.json", 'w') as f:
    json.dump({
        "needs_pagination": endpoints_needing_pagination,
        "has_pagination": endpoints_with_pagination
    }, f, indent=2)

print(f"\nResults saved to docs/PERF-003-ENDPOINT-AUDIT.json")

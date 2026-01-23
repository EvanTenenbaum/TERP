#!/usr/bin/env python3
"""
OpenAI API script to diagnose GitHub Actions test failures and generate fixes.
"""

import os
from openai import OpenAI

# Initialize the OpenAI client
client = OpenAI()

# Gather context about the failures
context = """
# GitHub Actions Test Failure Analysis for TERP Repository

## Primary Issue
The Nightly Mega QA Pipeline and other test workflows are failing with the following error:

```
WARN  Ignoring not compatible lockfile at /home/runner/work/TERP/TERP/pnpm-lock.yaml
ERR_PNPM_LOCKFILE_CONFIG_MISMATCH  Cannot proceed with the frozen installation. The current "overrides" configuration doesn't match the value found in the lockfile
Update your lockfile using "pnpm install --no-frozen-lockfile"
```

## Current Configuration
- pnpm-lock.yaml lockfileVersion: '9.0'
- package.json packageManager: "pnpm@10.4.1+sha512..."
- pnpm.overrides in package.json: {"tailwindcss>nanoid": "3.3.7"}
- pnpm-lock.yaml overrides: tailwindcss>nanoid: 3.3.7

## Workflow Files Using pnpm
1. daily-qa.yml - uses pnpm version 8
2. coverage.yml - uses pnpm version 8
3. e2e-live-site.yml - uses pnpm version 10

## Test Infrastructure
The repository has comprehensive test infrastructure including:
- Vitest for unit tests
- Playwright for E2E tests
- Mega QA pipeline for comprehensive testing
- Database integration tests with MySQL

## Questions to Answer
1. Why is there a lockfile configuration mismatch?
2. How should we fix the pnpm version inconsistency across workflows?
3. What changes are needed to make all test workflows pass?
4. How can we ensure the tests provide useful and accurate information?
"""

# Create the message
response = client.responses.create(
    model="gpt-4o",
    input=f"""You are a DevOps expert analyzing GitHub Actions test failures. 

{context}

Please provide:
1. A detailed diagnosis of why the tests are failing
2. Specific fixes needed for each workflow file
3. Any additional changes needed to make the test infrastructure robust
4. Recommendations for ensuring tests provide useful and accurate information

Format your response as a structured analysis with clear action items."""
)

# Print the response
print("=" * 80)
print("OPENAI API DIAGNOSIS RESULTS")
print("=" * 80)
print(response.output_text)
print("=" * 80)

# Save the response to a file
with open('/home/ubuntu/TERP/scripts/ai-diagnosis-result.md', 'w') as f:
    f.write("# AI Diagnosis Results\n\n")
    f.write(response.output_text)

print("\nDiagnosis saved to /home/ubuntu/TERP/scripts/ai-diagnosis-result.md")

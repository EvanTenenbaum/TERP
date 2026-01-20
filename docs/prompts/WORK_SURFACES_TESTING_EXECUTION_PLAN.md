# Work Surfaces Testing Suite - Execution Plan

## Problem Analysis

The original execution of `WORK_SURFACES_EXHAUSTIVE_TEST_PROMPT.md` failed with "Prompt is too long" error due to:

1. **Excessive parallel agents**: 8 agents launched simultaneously
2. **Large output aggregation**: All 8 TaskOutput calls attempted in a single message
3. **Heavy context preloading**: 14+ files read upfront before agents started
4. **Unbounded agent outputs**: No limits on what each agent produced

## Solution Architecture

### Strategy 1: Batched Agent Execution

Instead of launching all 8 agents in parallel, batch them into groups of 2-3:

```
Batch 1 (Critical Path):
- Agent 1: Static Analysis Agent
- Agent 2: RBAC Validation Agent

[Wait for completion, write results to files, clear context]

Batch 2 (Logic Validation):
- Agent 3: Business Logic Agent
- Agent 4: tRPC Integration Agent

[Wait for completion, write results to files, clear context]

Batch 3 (Flow Testing):
- Agent 5: Golden Flow Agent
- Agent 6: Feature Flag Agent

[Wait for completion, write results to files, clear context]

Batch 4 (Edge Cases):
- Agent 7: Adversarial Testing Agent
- Agent 8: Unit Test Analysis Agent

[Wait for completion, aggregate all results]
```

### Strategy 2: File-Based Output Coordination

Each agent should write results directly to files instead of returning large outputs:

```typescript
// Agent prompt modification
TASK: Run static code analysis checks
OUTPUT: Write findings to docs/qa/outputs/static_analysis_results.md
MAX_OUTPUT: Return only summary statistics (issue counts, severity breakdown)
```

Output files location:
```
docs/qa/outputs/
├── static_analysis_results.md
├── rbac_validation_results.md
├── business_logic_results.md
├── trpc_integration_results.md
├── golden_flow_results.md
├── feature_flag_results.md
├── adversarial_results.md
└── unit_test_results.md
```

### Strategy 3: Incremental Context Loading

Don't load all 14+ files upfront. Load context incrementally per-batch:

```
Phase 0a: Load shared context only
- FLOW_GUIDE.md (skim for procedure counts)
- QA_AUTH.md (role definitions only)

Phase 0b-per-batch: Load relevant files for each batch
- Static analysis batch → Load Work Surface component files
- RBAC batch → Load rbacDefinitions.ts + USER_FLOW_MATRIX.csv
- Integration batch → Load tRPC router files
```

### Strategy 4: Scoped Agent Instructions

Make each agent's scope narrower with specific output limits:

```markdown
## Agent 1: Static Analysis Agent (SCOPED)

TASK: Analyze Work Surface components for code quality issues

SCOPE LIMITS:
- Only analyze files in client/src/components/work-surface/
- Focus on: TODO/FIXME, type safety, console.log statements
- DO NOT analyze business logic (covered by Agent 3)

OUTPUT FORMAT:
Return a markdown summary with:
1. Total issues found (number)
2. Issues by severity (P0: X, P1: X, P2: X, P3: X)
3. Top 10 most critical issues with file:line references

WRITE DETAILED RESULTS TO: docs/qa/outputs/static_analysis_results.md
```

### Strategy 5: Sequential Output Retrieval

Never call multiple TaskOutput tools in the same message:

```
BAD (causes context overflow):
TaskOutput(agent1), TaskOutput(agent2), TaskOutput(agent3), ...

GOOD (process incrementally):
TaskOutput(agent1) → Read summary → Note key findings
TaskOutput(agent2) → Read summary → Note key findings
[Continue one at a time]
```

## Revised Execution Workflow

### Phase 0: Minimal Context Load
```
Read only:
1. QA_AUTH.md (role list)
2. ATOMIC_ROADMAP.md (work surface list)
DO NOT read all 9 work surface files upfront
```

### Phase 1: Launch Batch 1 (Static + RBAC)
```
Agent 1: Static Analysis
- Read work surface files as needed
- Write results to docs/qa/outputs/static_analysis_results.md
- Return: {issueCount: N, severityBreakdown: {...}}

Agent 2: RBAC Validation
- Read rbacDefinitions.ts
- Write results to docs/qa/outputs/rbac_validation_results.md
- Return: {violationsFound: N, rolesChecked: [...]}
```

### Phase 2: Process Batch 1 Results
```
TaskOutput(Agent 1) - process
TaskOutput(Agent 2) - process
Read output files if needed for detail
Update running issue ledger
```

### Phase 3: Launch Batch 2 (Business Logic + tRPC)
```
Agent 3: Business Logic
Agent 4: tRPC Integration
```

### Phase 4: Process Batch 2 Results
```
Same pattern as Phase 2
```

### Phase 5: Launch Batch 3 (Flows + Flags)
```
Agent 5: Golden Flow
Agent 6: Feature Flag
```

### Phase 6: Process Batch 3 Results
```
Same pattern
```

### Phase 7: Launch Batch 4 (Adversarial + Unit Tests)
```
Agent 7: Adversarial Testing
Agent 8: Unit Test Analysis
```

### Phase 8: Final Aggregation
```
Read all output files from docs/qa/outputs/
Combine into final deliverables:
- QA_ISSUE_LEDGER.md
- COVERAGE_MATRIX.md
- FIX_PATCH_SET.md (for P0/P1 only)
- RECOMMENDATIONS.md
```

## Agent Prompt Templates

### Template: Scoped Analysis Agent

```markdown
You are a focused QA agent. Your task is specific and bounded.

TASK: [Specific task description]

FILES TO ANALYZE:
[Explicit list - max 5 files]

OUTPUT REQUIREMENTS:
1. Write detailed findings to: [specific output file path]
2. Return ONLY a brief summary (under 500 tokens):
   - Issue count by severity
   - Top 3 critical findings (file:line format)
   - Next recommended action

DO NOT:
- Return full file contents
- Include full code blocks in return message
- Analyze files outside your scope
```

### Template: Background Agent with File Output

```markdown
TASK: [Task description]

EXECUTION MODE: Background with file output

WRITE ALL RESULTS TO: docs/qa/outputs/[filename].md

RETURN MESSAGE FORMAT:
```
STATUS: Complete
ISSUES_FOUND: [number]
OUTPUT_FILE: docs/qa/outputs/[filename].md
SUMMARY: [2-3 sentence summary]
```

This ensures the agent's return value is minimal while full results are persisted.
```

## Monitoring Progress

Use these commands to check agent status without loading full outputs:

```bash
# Check if output files exist
ls -la docs/qa/outputs/

# Check output file sizes
wc -l docs/qa/outputs/*.md

# Tail specific results
tail -50 docs/qa/outputs/static_analysis_results.md
```

## Error Recovery

If context limit is approached:

1. **Immediate**: Stop launching new agents
2. **Persist**: Ensure all partial results are written to files
3. **Resume**: Start new session, read output files, continue from last batch
4. **Skip**: If one agent's output is too large, read only summary sections

## Implementation Checklist

- [ ] Create docs/qa/outputs/ directory before execution
- [ ] Modify agent prompts to include file output requirements
- [ ] Batch agents into groups of 2-3 maximum
- [ ] Process TaskOutput calls sequentially (one at a time)
- [ ] Load context files incrementally per-batch
- [ ] Set explicit scope limits in each agent prompt
- [ ] Write intermediate results to files for recovery

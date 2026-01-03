# Parallel Wave Execution Prompts

This directory contains agent prompts for the parallel wave execution plan.

## Wave Structure

| Wave | Focus | Agents | Status |
|------|-------|--------|--------|
| 0 | Prerequisites | 1 | Manual |
| 1 | Critical Bug Fixes | 4 | Ready |
| 2 | High Priority UX & Logic | 4 | Ready |
| 3 | Features & Code Quality | 4 | Ready |
| 4 | Polish & Documentation | 3 | Ready |
| 5 | Integration & Final QA | 1 | Manual |

## How to Use

1. Complete Wave 0 prerequisites manually
2. Distribute Wave 1 prompts to 4 agents simultaneously
3. Wait for all Wave 1 agents to complete
4. Integrate Wave 1 branches
5. Repeat for Waves 2-4
6. Complete Wave 5 integration manually

## Prompt Files

See `PARALLEL_WAVE_EXECUTION_PLAN.md` in `docs/roadmaps/` for the full execution plan.


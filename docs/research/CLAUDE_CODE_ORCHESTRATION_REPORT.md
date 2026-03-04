# Claude Code Parallel Orchestration — Research Report

**Date**: 2026-03-04
**Purpose**: Comprehensive reference for orchestrating parallel Claude Code sessions across large codebases. Project-agnostic — usable as-is for execution or as input for building a Claude skill.
**Scope**: `/batch`, Agent Teams, custom agents, skills, hooks, worktrees, CLAUDE.md optimization, plan mode

---

## 1. `/batch` Command — Parallel Worktree Orchestration (Built-in)

### What It Does

`/batch` is a built-in Claude Code command (shipped v2.1.63, Feb 28 2026) that orchestrates large-scale codebase changes in parallel. You describe the change in natural language, and it handles decomposition, isolation, execution, and PR creation automatically.

### How It Works — Three Phases

**Phase 1 — Research and Plan**: The orchestrator enters plan mode, launches Explore agents to find all files/patterns/call sites that need to change. It decomposes work into 5-30 self-contained units and presents the plan for approval.

**Phase 2 — Parallel Execution**: After approval, spawns one background agent per unit in an isolated git worktree. Each agent's prompt is fully self-contained. After implementing, each worker runs `/simplify`, executes tests, commits, pushes, and opens a PR with `gh pr create`.

**Phase 3 — Track Progress**: Renders a status table updated as agents complete, pulling PR URLs from each output.

### When to Use

- Repetitive changes across many files (renaming, API migrations, pattern enforcement)
- Independent UI normalization passes across component families
- Codemod-style transformations that touch 5+ files with no inter-file dependencies

### Limitations

- Only works for parallelizable, independent changes (no cross-unit dependencies)
- Each worktree needs its own dependency install (no shared `node_modules`)
- Requires a Git repository

### References

- [Claude Code /simplify and /batch: Complete Guide](https://pasqualepillitteri.it/en/news/331/claude-code-simplify-batch-complete-guide) — Full walkthrough of the three-phase architecture, worktree isolation, and when to use vs. alternatives
- [Claude Code /simplify and /batch Commands Guide (claudefa.st)](https://claudefa.st/blog/guide/mechanics/simplify-batch-commands) — Command syntax and configuration options
- [Claude Code Batch Processing Complete Guide (SmartScope)](https://smartscope.blog/en/generative-ai/claude/claude-code-batch-processing/) — Headless mode integration and CI/CD usage patterns

---

## 2. Agent Teams — Multi-Instance Coordination

### What It Does

Agent Teams is an experimental feature that coordinates multiple Claude Code instances working together. One session acts as team lead, teammates work independently in their own context windows, and they communicate via shared task lists and mailboxes.

### How to Enable

Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `settings.json` or set as environment variable. Agent Teams are disabled by default.

### Architecture

- **Team Lead**: Creates the team, spawns teammates, coordinates work, synthesizes results
- **Teammates**: Separate Claude Code instances with their own context windows
- **Task List**: Shared list of work items that teammates claim from
- **Mailbox**: Messaging system for inter-agent communication

### Key Difference from Subagents

Subagents run within a single session and can only report back to the main agent. They can't message each other or coordinate without the main agent as intermediary. Agent Teams removes that bottleneck — teammates message each other directly, claim tasks from a shared list, and collaborate.

### Critical Hooks

Two hook events integrate with the Agent Teams lifecycle:

| Hook | Trigger | Exit Code 2 Behavior |
|------|---------|---------------------|
| `TeammateIdle` | When a teammate runs out of tasks | Sends feedback message, keeps teammate working |
| `TaskCompleted` | When a task is being marked complete | Blocks completion, sends feedback (e.g., "tests failing") |

### Delegate Mode

Press `Shift+Tab` to cycle into delegate mode after starting a team. This restricts the lead to coordination-only tools: spawning teammates, messaging, shutting them down, and managing tasks. The lead can't touch code directly — it focuses entirely on orchestration.

### When to Use

- Multiple related but independent work streams (e.g., frontend + backend + tests in parallel)
- Work that benefits from peer-to-peer coordination between agents
- Projects where a single orchestrator can't hold all context

### When NOT to Use

- Sequential tasks or same-file edits (use a single session or subagents instead)
- Fewer than 3 parallel tasks (overhead exceeds benefit)

### Best Practices

- Start with 3-5 teammates (beyond this, coordination overhead outweighs gains)
- Size tasks to produce a clear deliverable (function, test file, review section)
- Use `TaskCompleted` hooks to enforce quality gates (tests, lint, type-check)
- Token costs scale linearly — each teammate has its own context window

### References

- [Orchestrate teams of Claude Code sessions — Official Docs](https://code.claude.com/docs/en/agent-teams) — Canonical reference for Agent Teams API, hooks, and configuration
- [Claude Code Agent Teams: The Complete Guide 2026 (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams) — End-to-end guide covering enabling, delegate mode, and practical patterns
- [Agent Teams Controls: Delegate Mode, Hooks & More (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams-controls) — Deep dive on `TeammateIdle`, `TaskCompleted` hooks and exit code behavior
- [Claude Code Beyond Sub-Agents: Orchestrating Peer-to-Peer AI (Medium)](https://medium.com/@kumaran.isk/claude-code-beyond-sub-agents-orchestrating-peer-to-peer-ai-with-agent-teams-3406d2169bfd) — Architectural comparison of subagents vs. Agent Teams
- [Shipyard: Multi-agent orchestration for Claude Code in 2026](https://shipyard.build/blog/claude-code-multi-agent/) — Industry context and when to use teams vs. subagents vs. third-party tools

---

## 3. Custom Agent Definitions (`.claude/agents/`)

### What It Does

Persistent, reusable agent definitions stored as Markdown files with YAML frontmatter. Checked into version control so the entire team shares them.

### Storage Locations

| Location | Scope | Priority |
|----------|-------|----------|
| `.claude/agents/` | Project-specific, shared via git | Higher |
| `~/.claude/agents/` | Personal, available in all projects | Lower |

When multiple agents share the same name, the higher-priority location wins.

### YAML Frontmatter Fields

```yaml
---
name: my-agent-name
description: "What this agent does — shown in agent selection UI"
model: sonnet          # sonnet, opus, haiku, or inherit (default)
isolation: worktree    # Each invocation gets its own git worktree
background: true       # Runs in background by default
memory: true           # Persistent MEMORY.md injected into system prompt
maxTurns: 50           # Maximum API round-trips
tools:                 # Allowlist (overrides inherited tools)
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
disallowedTools:       # Denylist (alternative to allowlist)
  - Agent              # Prevent recursive agent spawning
skills:                # Skills to preload
  - my-verification-skill
  - my-domain-skill
permissionMode: auto   # auto, manual, or custom
hooks:
  TaskCompleted:
    command: "npm test && npm run lint && npm run typecheck"
---

# Agent Instructions

The markdown body contains the full instructions for the agent.
This is loaded when the agent is invoked.
```

### CLI-Defined Agents

For one-off use, agents can be passed as JSON via the `--agents` flag when launching Claude Code. Same fields as file-based definitions.

### Cross-Tool Compatibility

VS Code also detects `.md` files in `.claude/agents/`, following the same format. Agent definitions work across Claude Code CLI, Desktop app, and IDE extensions.

### Practical Patterns

| Pattern | Agent Config |
|---------|-------------|
| Parallel feature implementation | `isolation: worktree`, `background: true`, specific `tools` allowlist |
| Code review / QA agent | `disallowedTools: [Write, Edit]`, `model: opus` |
| Bulk rename / migration | `isolation: worktree`, `hooks.TaskCompleted: "npm test"` |
| Documentation generator | `tools: [Read, Write, Grep, Glob]`, `model: haiku` |

### References

- [Create custom subagents — Official Docs](https://code.claude.com/docs/en/sub-agents) — Canonical reference for YAML frontmatter fields, storage locations, and isolation modes
- [ClaudeLog: Custom Agents Guide](https://claudelog.com/mechanics/custom-agents/) — Practical examples and field-by-field documentation
- [Claude Code's Custom Agent Framework Changes Everything (DEV Community)](https://dev.to/therealmrmumba/claude-codes-custom-agent-framework-changes-everything-4o4m) — Real-world usage patterns and team collaboration
- [Agents and Subagents Best Practices (DeepWiki)](https://deepwiki.com/shanraisshan/claude-code-best-practice/3.2-agents-and-subagents) — When to use file-based vs. CLI-defined agents

---

## 4. Skills — Progressive Disclosure / Lazy Loading

### What It Does

Skills are markdown-based instruction sets in `.claude/skills/` that Claude loads on demand, not upfront. This is the mechanism for keeping context lean while having deep domain knowledge available.

### Three Loading Tiers

| Tier | When Loaded | Token Cost | Content |
|------|-------------|-----------|---------|
| **Metadata** | Every conversation start | ~100 tokens per skill | Name (max 64 chars) + description (max 1,024 chars) |
| **Skill body** | When Claude determines relevance | ~5,000 tokens | Full instruction set in `SKILL.md` |
| **Referenced files** | When body references them | Unlimited | Additional markdown, folders, scripts in skill directory |

### Skill File Structure

```
.claude/skills/
├── verification-protocol/
│   ├── SKILL.md           # Frontmatter + instructions
│   └── checklist.md       # Referenced on demand
├── migration-guide/
│   ├── SKILL.md
│   └── examples/          # Referenced on demand
└── code-review/
    └── SKILL.md
```

### SKILL.md Format

```markdown
---
name: verification-protocol
description: "Quality gate protocol — test/lint/typecheck commands, output template, and definition of done criteria"
---

# Verification Protocol

## Required Commands
- `npm test` — Unit tests
- `npm run lint` — Linting
- `npm run typecheck` — Type checking
- `npm run build` — Build verification

## Definition of Done
1. All commands pass
2. No new warnings introduced
3. Coverage threshold met
...
```

### User-Invocable Skills

Skills with a `name` field become invocable as `/skill-name`. Claude also auto-loads them when it determines they're relevant to the current task based on the description.

### Key Design Principle

Only ~100 tokens per skill are loaded at conversation start (name + description). The full body (~5,000 tokens) loads only when relevant. This means you can have dozens of skills without bloating every conversation.

### Common Skill Types

| Skill Category | What It Contains | When Loaded |
|---------------|-----------------|-------------|
| Verification / QA | Test commands, quality checklist, output template | Any commit or task completion |
| Architecture guide | Schema patterns, query examples, forbidden patterns | When touching data layer |
| Migration protocol | Step-by-step migration procedures, rollback plans | Schema or API changes |
| File collision matrix | Files that multiple agents may touch, sequencing rules | Parallel agent sessions |
| Deployment runbook | Deploy commands, health checks, log monitoring | Post-merge verification |

### Why This Matters for CLAUDE.md

Large CLAUDE.md files (500+ lines) cause instruction loss — Claude starts ignoring rules buried deep in the document. Boris Cherny (Anthropic, Claude Code lead) keeps his at ~2,500 tokens (~1 page). The recommendation: CLAUDE.md should be 60-150 lines with everything else in skills.

> "For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"
> — [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

### References

- [Extend Claude with skills — Official Docs](https://code.claude.com/docs/en/skills) — Canonical reference for SKILL.md format, frontmatter fields, and loading behavior
- [Claude Skills & Subagents: Escaping the Prompt Engineering Hamster Wheel (Towards Data Science)](https://towardsdatascience.com/claude-skills-and-subagents-escaping-the-prompt-engineering-hamster-wheel/) — Deep dive on the three-tier progressive disclosure model
- [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — CLAUDE.md sizing guidance and the "every mistake becomes a rule" philosophy
- [CLAUDE.md Best Practices (Arize)](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/) — Prompt optimization research showing 5%+ gains from system prompt tuning
- [How I Use Every Claude Code Feature (sshh.io)](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) — Practical guide to skills, commands, and progressive disclosure in daily use

---

## 5. Hooks — Deterministic Quality Gates

### What It Does

Hooks are shell scripts that run automatically at specific points in Claude's workflow. Unlike CLAUDE.md instructions (which are advisory), hooks are **deterministic** — they guarantee the action happens every time.

### Available Hook Events

| Hook | Trigger | Use Case |
|------|---------|----------|
| `PreToolUse` | Before any tool call | Block writes to protected files |
| `PostToolUse` | After any tool call | Log all file modifications |
| `TaskCompleted` | When task marked complete | Run test suite, block if failing |
| `TeammateIdle` | Teammate runs out of work | Reassign to remaining items |
| `PermissionRequest` | Permission dialog shown | Auto-approve safe operations |

### Exit Code Behavior

| Exit Code | Meaning |
|-----------|---------|
| 0 | Allow action to proceed |
| 2 | Block action + send stdout as feedback to agent |
| Other | Error (action still proceeds) |

### Configuration

Hooks are configured in `settings.json` or `.claude/settings.json`:

```json
{
  "hooks": {
    "TaskCompleted": {
      "command": "npm test && npm run lint && npm run typecheck && npm run build",
      "timeout": 120000
    },
    "PreToolUse": {
      "command": "scripts/check-file-safety.sh",
      "timeout": 5000
    }
  }
}
```

### Practical Hook Patterns

| Hook | Command | Purpose |
|------|---------|---------|
| `TaskCompleted` | `npm test && npm run lint && npm run typecheck` | Enforce verification before any task closes |
| `PreToolUse` | Check if target file is in a protected list | Block writes to files being edited by other agents |
| `TeammateIdle` | Check shared task list for unclaimed work | Keep idle teammates productive |
| `PostToolUse` | Append to modification log | Audit trail of all file changes |
| `TaskCompleted` | Check for required binaries/dependencies | Fast-fail if prerequisites missing |

### Key Insight

> "Use hooks for actions that must happen every time with zero exceptions. Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens."
> — [Best Practices for Claude Code — Official Docs](https://code.claude.com/docs/en/best-practices)

### References

- [Best Practices for Claude Code — Official Docs](https://code.claude.com/docs/en/best-practices) — Hooks as deterministic enforcement vs. advisory CLAUDE.md
- [Agent Teams Controls: Hooks & More (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams-controls) — `TeammateIdle` and `TaskCompleted` hook patterns with exit code examples
- [Claude Code Customization Guide (alexop.dev)](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) — Hooks configuration in settings.json with practical examples

---

## 6. Worktree Isolation — Foundation for All Parallelism

### What It Does

Git worktrees give each agent its own branch and working directory while sharing the same `.git` history and remote connections. This is the foundation that makes `/batch`, Agent Teams, and parallel subagents safe.

### How to Use

**CLI flag**: `claude --worktree` or `claude --worktree my-feature-name`

**In agent definitions**: `isolation: worktree` in YAML frontmatter

**In subagent calls**: `isolation: "worktree"` parameter

### Directory Structure

Worktrees are created at `.claude/worktrees/<name>/`. Each gets a full checkout of the repo with its own branch.

### Cleanup Behavior

| Scenario | What Happens |
|----------|-------------|
| No changes made | Worktree + branch auto-removed |
| Changes or commits exist | Prompt to keep or remove |

### Critical Requirements

1. **Add `.claude/worktrees/` to `.gitignore`** — prevents worktree dirs from showing as untracked
2. **Run dependency installs per worktree** — `node_modules` is not shared. Each worktree needs its own install
3. **Custom VCS support** — `WorktreeCreate` and `WorktreeRemove` hooks for non-Git systems

### When Worktrees Are Used Automatically

- `/batch` creates one worktree per decomposed unit
- Agent Teams create one worktree per teammate (when configured)
- Subagents with `isolation: "worktree"` get their own worktree
- `claude --worktree` starts the entire session in an isolated worktree

### References

- [Claude Code Worktrees: Run Parallel Sessions Without Conflicts (claudefa.st)](https://claudefa.st/blog/guide/development/worktree-guide) — Complete worktree guide with cleanup behavior and best practices
- [Parallel AI Coding with Git Worktrees (Agent Interviews)](https://docs.agentinterviews.com/blog/parallel-ai-coding-with-gitworktrees/) — Practical patterns for parallel agent execution
- [The Complete Guide to Git Worktrees with Claude Code (Engineering Notes)](https://notes.muthu.co/2026/02/the-complete-guide-to-git-worktrees-with-claude-code/) — Deep technical guide on worktree + agent integration
- [Boris Cherny (Anthropic) on Threads](https://www.threads.com/@boris_cherny/post/DVAAnexgRUj/) — Official announcement of built-in worktree support with subagent isolation

---

## 7. CLAUDE.md Optimization

### The Problem

Large CLAUDE.md files (500+ lines) cause **instruction loss** — Claude deprioritizes rules buried deep in long documents. This is the most common configuration mistake.

### Recommended Size

> "CLAUDE.md should not exceed 150+ lines. 60 lines is recommended."
> — [50 Claude Code Tips & Tricks (Geeky Gadgets)](https://www.geeky-gadgets.com/claude-code-tips-2/)

> "Cherny's own CLAUDE.md is about 2,500 tokens — roughly one page of text."
> — [How I Use Every Claude Code Feature (sshh.io)](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)

### What Belongs in CLAUDE.md vs. Skills

| In CLAUDE.md (~60-150 lines) | In Skills (lazy-loaded on demand) |
|------------------------------|----------------------------------|
| Tech stack (1-2 lines) | Architecture deep dive |
| Build/test/lint commands | Full verification protocol |
| Top 5 forbidden patterns | Complete forbidden patterns list |
| Data model one-liner | Data model query patterns |
| Git commit format | Session management protocol |
| Critical security rules | Estimation protocol, audit system |

### The `@import` Syntax

CLAUDE.md supports `@path/to/file` imports for referencing additional context:
```markdown
See @docs/architecture.md for architecture details
See @package.json for available commands
```

### File Placement Hierarchy

| File | Scope | Loaded When |
|------|-------|-------------|
| `CLAUDE.md` (repo root) | All sessions in this repo | Every conversation start |
| `.claude/CLAUDE.md` | Same as above, alternative location | Every conversation start |
| `src/CLAUDE.md` | Only when working in `src/` | When Claude reads files in `src/` |
| `~/.claude/CLAUDE.md` | All repos for this user | Every conversation start |

### Team Maintenance Philosophy

> "At Anthropic, whenever someone sees Claude make a mistake during a PR review, they don't just fix the code — they add a rule to CLAUDE.md so it never happens again. Every mistake becomes a rule."
> — [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

### References

- [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — The definitive guide to CLAUDE.md structure and maintenance
- [CLAUDE.md Best Practices (Arize)](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/) — Research showing 5%+ coding performance gains from prompt optimization
- [Best Practices for Claude Code — Official Docs](https://code.claude.com/docs/en/best-practices) — Official guidance on file placement hierarchy and @import syntax
- [Claude Code Tips & Tricks for Advanced Users (Cuttlesoft)](https://cuttlesoft.com/blog/2026/02/03/claude-code-for-advanced-users/) — WHAT/WHY/HOW structure and monorepo strategies
- [50 Claude Code Tips (Geeky Gadgets)](https://www.geeky-gadgets.com/claude-code-tips-2/) — Line count recommendations and `/clear` between tasks

---

## 8. Plan Mode + Adaptive Thinking (Opus 4.6)

### Current State

"Ultrathink" is deprecated as of January 17, 2026. Opus 4.6 uses **adaptive thinking** that dynamically allocates reasoning tokens based on query complexity and effort parameter. Extended thinking is enabled by default.

### Recommended Workflow

The Explore → Plan → Code → Commit pattern:

1. **EXPLORE**: Let Claude read files. Don't write code yet.
2. **PLAN**: Enter plan mode (`Shift+Tab` to cycle). Claude analyzes with read-only operations.
3. **CODE**: Implement based on confirmed plan.
4. **COMMIT**: Ask Claude to commit and create PR.

### Plan Mode Benefits

- Claude uses `AskUserQuestion` to gather requirements before proposing
- Read-only operations prevent accidental changes during analysis
- Delegating repo scanning to Explore subagents keeps main context lean

### Context Management

- `/clear` between distinct tasks (wipes conversation, re-reads CLAUDE.md)
- `/compact` for partial context reduction mid-session
- Manual `/compact` at 50% context to avoid the "agent dumb zone" (degraded performance when context is nearly full)

### References

- [UltraThink is Dead. Long Live Extended Thinking (Decode Claude)](https://decodeclaude.com/ultrathink-deprecated/) — Deprecation notice and adaptive thinking explanation
- [Claude Code Deep Thinking: Unlock Better Results (claudefa.st)](https://claudefa.st/blog/guide/performance/deep-thinking-techniques) — Thinking techniques comparison and when each helps
- [Extended Thinking Tips — Official Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips) — Anthropic's guidance on adaptive vs. manual extended thinking
- [Common workflows — Official Docs](https://code.claude.com/docs/en/common-workflows) — Plan mode, /compact, /clear usage patterns

---

## 9. Decision Framework — Which Tool When

### Choosing the Right Orchestration Mechanism

```
How many parallel tasks?
├── 1 task → Single session (no orchestration needed)
├── 2-3 tasks → Subagents with isolation: "worktree"
├── 4-6 independent, similar tasks → /batch
├── 4-6 related tasks needing coordination → Agent Teams
└── 7+ tasks → Split into waves, use /batch or Agent Teams per wave

Are the tasks independent?
├── Yes, all independent → /batch (auto-decomposes)
├── Mostly independent, some sequencing → Agent Teams (task dependencies)
└── Highly sequential → Single session, no parallelism

Do agents need to communicate?
├── No → /batch or parallel subagents
├── Yes, simple status → Subagents reporting to orchestrator
└── Yes, peer-to-peer → Agent Teams with mailbox
```

### Feature Comparison Matrix

| Feature | Subagents | `/batch` | Agent Teams |
|---------|-----------|----------|-------------|
| Isolation | Per-agent worktree (optional) | Per-unit worktree (automatic) | Per-teammate worktree (optional) |
| Communication | Report to parent only | None (fully independent) | Peer-to-peer mailbox |
| Task management | Manual | Automatic decomposition | Shared task list |
| Quality gates | Parent checks results | `/simplify` + tests per unit | `TaskCompleted` hook |
| Setup effort | Low | None (describe in English) | Medium (enable experimental flag) |
| Max parallelism | ~10 (context limit) | 5-30 (built-in) | 3-5 (recommended) |
| Token cost | Shared context | Per-unit context | Per-teammate context |

### Implementation Priorities (Generic)

When adopting these features for any project:

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Add `TaskCompleted` hook for test/lint/typecheck | ~5 min | Deterministic quality — can't be skipped |
| 2 | Create `.claude/skills/` for domain protocols | ~20 min | Lazy-loads context, keeps conversations lean |
| 3 | Create `.claude/agents/` for reusable session types | ~15 min | Version-controlled, shareable agent configs |
| 4 | Slim CLAUDE.md to ~150 lines, move rest to skills | ~30 min | Prevents instruction loss from context bloat |
| 5 | Use `/batch` for repetitive multi-file changes | At use time | Replaces manual subagent orchestration |
| 6 | Evaluate Agent Teams for coordinated parallel work | At use time | Peer-to-peer coordination with idle/completion hooks |

---

## Appendix: All References

### Official Anthropic Documentation
1. [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
2. [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
3. [Extend Claude with skills](https://code.claude.com/docs/en/skills)
4. [Best Practices for Claude Code](https://code.claude.com/docs/en/best-practices)
5. [Common workflows](https://code.claude.com/docs/en/common-workflows)
6. [Extended Thinking Tips](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips)
7. [Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### Community Guides & Analysis
8. [Claude Code Agent Teams: Complete Guide 2026 (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams)
9. [Agent Teams Controls: Delegate Mode, Hooks & More (claudefa.st)](https://claudefa.st/blog/guide/agents/agent-teams-controls)
10. [Claude Code /simplify and /batch: Complete Guide (Pillitteri)](https://pasqualepillitteri.it/en/news/331/claude-code-simplify-batch-complete-guide)
11. [Claude Code Worktrees Guide (claudefa.st)](https://claudefa.st/blog/guide/development/worktree-guide)
12. [Claude Code Deep Thinking Techniques (claudefa.st)](https://claudefa.st/blog/guide/performance/deep-thinking-techniques)
13. [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
14. [CLAUDE.md Prompt Learning Best Practices (Arize)](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)
15. [How I Use Every Claude Code Feature (sshh.io)](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)
16. [Claude Code Tips for Advanced Users (Cuttlesoft)](https://cuttlesoft.com/blog/2026/02/03/claude-code-for-advanced-users/)
17. [50 Claude Code Tips & Tricks (Geeky Gadgets)](https://www.geeky-gadgets.com/claude-code-tips-2/)
18. [Parallel AI Coding with Git Worktrees (Agent Interviews)](https://docs.agentinterviews.com/blog/parallel-ai-coding-with-gitworktrees/)
19. [Complete Guide to Git Worktrees with Claude Code (Engineering Notes)](https://notes.muthu.co/2026/02/the-complete-guide-to-git-worktrees-with-claude-code/)
20. [Claude Skills & Subagents (Towards Data Science)](https://towardsdatascience.com/claude-skills-and-subagents-escaping-the-prompt-engineering-hamster-wheel/)
21. [UltraThink is Dead (Decode Claude)](https://decodeclaude.com/ultrathink-deprecated/)
22. [Claude Code Customization Guide (alexop.dev)](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
23. [ClaudeLog: Custom Agents Guide](https://claudelog.com/mechanics/custom-agents/)

### Announcements & Primary Sources
24. [Boris Cherny — Built-in worktree support (Threads)](https://www.threads.com/@boris_cherny/post/DVAAnexgRUj/)
25. [Boris Cherny — Subagent worktree isolation (Threads)](https://www.threads.com/@boris_cherny/post/DVAAqhLgWQY/)
26. [Claude Code System Prompts (Piebald-AI/GitHub)](https://github.com/Piebald-AI/claude-code-system-prompts)
27. [Awesome Claude Code (community index)](https://github.com/hesreallyhim/awesome-claude-code)
28. [Shipyard: Multi-agent orchestration for Claude Code 2026](https://shipyard.build/blog/claude-code-multi-agent/)
29. [Claude Code Beyond Sub-Agents (Medium)](https://medium.com/@kumaran.isk/claude-code-beyond-sub-agents-orchestrating-peer-to-peer-ai-with-agent-teams-3406d2169bfd)
30. [Claude Code's Custom Agent Framework Changes Everything (DEV Community)](https://dev.to/therealmrmumba/claude-codes-custom-agent-framework-changes-everything-4o4m)
31. [Agents and Subagents Best Practices (DeepWiki)](https://deepwiki.com/shanraisshan/claude-code-best-practice/3.2-agents-and-subagents)

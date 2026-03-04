# Claude Code Orchestration Research Report

**Date**: 2026-03-04
**Purpose**: Research findings for executing the TERP Epic Parallel Execution Plan (40 tasks, 4 roadmaps, 3 concurrent sessions)
**Audience**: Evan (execution), Claude agents (skill creation)

---

## 1. `/batch` Command — Parallel Worktree Orchestration (Built-in)

### What It Does

`/batch` is a built-in Claude Code command (shipped v2.1.63, Feb 28 2026) that orchestrates large-scale codebase changes in parallel. You describe the change in natural language, and it handles decomposition, isolation, execution, and PR creation automatically.

### How It Works — Three Phases

**Phase 1 — Research and Plan**: The orchestrator enters plan mode, launches Explore agents to find all files/patterns/call sites that need to change. It decomposes work into 5-30 self-contained units and presents the plan for approval.

**Phase 2 — Parallel Execution**: After approval, spawns one background agent per unit in an isolated git worktree. Each agent's prompt is fully self-contained. After implementing, each worker runs `/simplify`, executes tests, commits, pushes, and opens a PR with `gh pr create`.

**Phase 3 — Track Progress**: Renders a status table updated as agents complete, pulling PR URLs from each output.

### Application to TERP Epic

LEX Phase 7 (tasks LEX-008 through LEX-013) is a textbook `/batch` use case: 6 independent UI text normalization passes across different component families. Instead of manually orchestrating 6 subagents with collision avoidance, a single `/batch "Rename all UI instances of 'Vendor' to 'Supplier' per terminology bible at docs/terminology-bible.md"` could decompose and execute the entire burst.

### Limitations

- Only works for parallelizable, independent changes
- Each worktree needs its own `pnpm install` (no shared `node_modules`)
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
- **Task List**: Shared list of work items that teammates claim
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

### Application to TERP Epic

Session B (UX Master Plan) would benefit most from Agent Teams. The team lead coordinates two sub-streams (Inventory: H1→H2→H3∥H4, Dashboard: H5∥H6) with `TaskCompleted` hooks enforcing `pnpm check && pnpm lint && pnpm test && pnpm build` before any task closes.

### Best Practices

- Start with 3-5 teammates (beyond this, coordination overhead outweighs gains)
- Size tasks to produce a clear deliverable (function, test file, review section)
- For sequential tasks or same-file edits, use a single session or subagents instead
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
name: lex-normalizer
description: "Executes terminology normalization passes on UI components"
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
  - terminology-gate
  - verification-protocol
permissionMode: auto   # auto, manual, or custom
hooks:
  TaskCompleted:
    command: "pnpm check && pnpm lint && pnpm test"
---

# LEX Normalizer Agent

Instructions for the agent go here in markdown...
```

### CLI-Defined Agents

For one-off use, agents can be passed as JSON via the `--agents` flag when launching Claude Code. Same fields as file-based definitions.

### Cross-Tool Compatibility

VS Code also detects `.md` files in `.claude/agents/`, following the same format. Agent definitions work across Claude Code CLI, Desktop app, and IDE extensions.

### Application to TERP Epic

Create three agent definitions encoding all session rules:

| Agent File | Purpose | Key Config |
|-----------|---------|------------|
| `.claude/agents/lex-session.md` | Session A: LEX terminology bible | `isolation: worktree`, skills: `[terminology-gate, verification-protocol]` |
| `.claude/agents/ux-session.md` | Session B: UX master plan | Skills: `[file-collision-matrix, verification-protocol]`, hooks: `TaskCompleted` |
| `.claude/agents/stx-session.md` | Session C: STX stress testing | Skills: `[stx-prerequisites, verification-protocol]` |

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
├── terminology-gate/
│   ├── SKILL.md           # Frontmatter + instructions
│   ├── collision-matrix.md # Referenced on demand
│   └── examples/          # Referenced on demand
├── verification-protocol/
│   └── SKILL.md
└── stx-prerequisites/
    └── SKILL.md
```

### SKILL.md Format

```markdown
---
name: terminology-gate
description: "Gate protocol for LEX terminology normalization — file collision matrix, sequencing rules, and verification commands"
---

# Terminology Gate Protocol

## File Collision Matrix
[5 collision files with exact line numbers...]

## Sequencing Rules
[LEX-011 before LEX-012, UX-H before LEX-008...]

## Verification Commands
[pnpm check, pnpm lint, etc.]
```

### User-Invocable Skills

Skills with a `name` field become invocable as `/skill-name`. Claude also auto-loads them when it determines they're relevant to the current task based on the description.

### Application to TERP Epic

Convert the execution plan's protocol sections into lazy-loaded skills:

| Skill | Content | Loaded When |
|-------|---------|-------------|
| `verification-protocol` | The 12-criteria DoD, verification commands, output template | Any commit or completion |
| `terminology-gate` | File collision matrix, LEX sequencing rules, normalization policies | LEX Phase 7 tasks |
| `stx-prerequisites` | k6 install commands, BullMQ warning, connection pool limits, staging app ID | STX Wave S0-S2 |
| `file-collision-matrix` | The 5 confirmed collision files with line numbers | Any cross-session work |
| `ux-inventory-safety` | H1-H4 file scope, InventoryWorkSurface.tsx section boundaries | UX inventory tasks |

### Why This Matters for CLAUDE.md

Current CLAUDE.md is ~600+ lines. Research consistently says this causes instruction loss. Boris Cherny (Anthropic, Claude Code lead) keeps his at ~2,500 tokens (~1 page). The recommendation: CLAUDE.md should be 60-150 lines with everything else in skills.

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
      "command": "pnpm check && pnpm lint && pnpm test && pnpm build",
      "timeout": 120000
    },
    "PreToolUse": {
      "command": "scripts/check-file-safety.sh",
      "timeout": 5000
    }
  }
}
```

### Application to TERP Epic

| Hook | Purpose | Session |
|------|---------|---------|
| `TaskCompleted` → `pnpm check && pnpm lint && pnpm test && pnpm build` | Enforce verification quartet before any task closes | All sessions |
| `PreToolUse` → check if target file is in collision matrix | Block writes to collision files before Gate 2 clears | Session A (LEX) |
| `TeammateIdle` → check for unclaimed LEX normalization tasks | Reassign idle agents during Phase 7 burst | Session A (LEX) |
| `TaskCompleted` → check for k6 binary before STX-005 | Fast-fail if prerequisite missing | Session C (STX) |

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
2. **Run dependency installs per worktree** — `node_modules` is not shared. Each worktree needs its own `pnpm install`
3. **Custom VCS support** — `WorktreeCreate` and `WorktreeRemove` hooks for non-Git systems

### Application to TERP Epic

Every parallel pattern in the plan depends on worktree isolation:
- LEX Phase 7 `/batch` normalization: 6 worktrees
- Agent Teams teammates: each in own worktree
- STX parallel wave S2: 4 worktrees for STX-002/003/004/006

### References

- [Claude Code Worktrees: Run Parallel Sessions Without Conflicts (claudefa.st)](https://claudefa.st/blog/guide/development/worktree-guide) — Complete worktree guide with cleanup behavior and best practices
- [Parallel AI Coding with Git Worktrees (Agent Interviews)](https://docs.agentinterviews.com/blog/parallel-ai-coding-with-gitworktrees/) — Practical patterns for parallel agent execution
- [The Complete Guide to Git Worktrees with Claude Code (Engineering Notes)](https://notes.muthu.co/2026/02/the-complete-guide-to-git-worktrees-with-claude-code/) — Deep technical guide on worktree + agent integration
- [Boris Cherny (Anthropic) on Threads](https://www.threads.com/@boris_cherny/post/DVAAnexgRUj/) — Official announcement of built-in worktree support with subagent isolation

---

## 7. CLAUDE.md Optimization

### Current State

TERP's CLAUDE.md is ~600+ lines. Research shows this causes instruction loss.

### Recommended Structure

> "CLAUDE.md should not exceed 150+ lines. 60 lines is recommended."
> — [50 Claude Code Tips & Tricks (Geeky Gadgets)](https://www.geeky-gadgets.com/claude-code-tips-2/)

> "Cherny's own CLAUDE.md is about 2,500 tokens — roughly one page of text."
> — [How I Use Every Claude Code Feature (sshh.io)](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)

### What Belongs in CLAUDE.md vs. Skills

| In CLAUDE.md (~60-150 lines) | In Skills (lazy-loaded) |
|------------------------------|------------------------|
| Tech stack overview | Architecture deep dive |
| Build/test/lint commands | Verification protocol (12 criteria) |
| Critical forbidden patterns (top 5) | Full deprecated systems list |
| Party model one-liner | Party model query patterns |
| Git commit format | Session management protocol |
| Actor attribution rule | Roadmap management protocol |
| | Estimation protocol |
| | Audit system |

### The `@import` Syntax

CLAUDE.md supports `@path/to/file` imports for referencing additional context:
```markdown
See @docs/protocols/CANONICAL_DICTIONARY.md for term definitions
See @package.json for available commands
```

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
- Manual `/compact` at 50% context to avoid the "agent dumb zone"

### References

- [UltraThink is Dead. Long Live Extended Thinking (Decode Claude)](https://decodeclaude.com/ultrathink-deprecated/) — Deprecation notice and adaptive thinking explanation
- [Claude Code Deep Thinking: Unlock Better Results (claudefa.st)](https://claudefa.st/blog/guide/performance/deep-thinking-techniques) — Thinking techniques comparison and when each helps
- [Extended Thinking Tips — Official Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips) — Anthropic's guidance on adaptive vs. manual extended thinking
- [Common workflows — Official Docs](https://code.claude.com/docs/en/common-workflows) — Plan mode, /compact, /clear usage patterns

---

## 9. Concrete Recommendations for TERP Epic

### Priority 1: Create `.claude/agents/` Definitions (Immediate)

Create three agent definition files that encode all session rules, replacing copy-paste prompts with version-controlled, reusable configs.

### Priority 2: Create Skills for Gate Protocols (Immediate)

Extract verification protocol, file collision matrix, and STX prerequisites into `.claude/skills/` for lazy loading.

### Priority 3: Add `TaskCompleted` Hook (Immediate)

Configure in `.claude/settings.json` to deterministically enforce the verification quartet before any task closes.

### Priority 4: Use `/batch` for LEX Phase 7 (At Execution Time)

When Session A reaches Wave L4b, invoke `/batch` instead of manually orchestrating 6 parallel normalization subagents.

### Priority 5: Evaluate Agent Teams for Session B (At Execution Time)

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is available, use it for UX session with `TaskCompleted` and `TeammateIdle` hooks.

### Priority 6: Slim Down CLAUDE.md (Follow-up)

Move ~400 lines of protocol/architecture/deprecated systems content into skills. Keep CLAUDE.md at ~150 lines.

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

### Announcements & Primary Sources
23. [Boris Cherny — Built-in worktree support (Threads)](https://www.threads.com/@boris_cherny/post/DVAAnexgRUj/)
24. [Boris Cherny — Subagent worktree isolation (Threads)](https://www.threads.com/@boris_cherny/post/DVAAqhLgWQY/)
25. [Claude Code System Prompts (Piebald-AI/GitHub)](https://github.com/Piebald-AI/claude-code-system-prompts)
26. [Awesome Claude Code (community index)](https://github.com/hesreallyhim/awesome-claude-code)
27. [Shipyard: Multi-agent orchestration for Claude Code 2026](https://shipyard.build/blog/claude-code-multi-agent/)
28. [Claude Code Beyond Sub-Agents (Medium)](https://medium.com/@kumaran.isk/claude-code-beyond-sub-agents-orchestrating-peer-to-peer-ai-with-agent-teams-3406d2169bfd)

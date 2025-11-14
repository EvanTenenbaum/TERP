# Roadmap System - Requirements Verification

**Date:** 2025-11-13  
**Purpose:** Verify V3 design addresses ALL user requirements

---

## ✅ User Requirements Checklist

### Requirement 1: "Put the full prompt with absolutely everything needed for a new agent to succeed - IN the roadmap"

**Status:** ✅ ADDRESSED

**How:**

- Prompts are in `docs/prompts/ST-XXX.md` (linked from roadmap)
- Each prompt is completely self-contained
- Includes all 4 phases, code examples, step-by-step instructions
- No external dependencies

**Location in V3 Design:**

- Layer 2: Prompts (Self-Contained Instructions)
- Example prompt shows complete structure

---

### Requirement 2: "I want to be able to deploy agents just by telling them to visit the roadmap in TERP and find and execute the prompt associated with [task id]"

**Status:** ✅ ADDRESSED

**How:**

- Agent reads `.claude/AGENT_ONBOARDING.md`
- Navigates to `docs/roadmaps/MASTER_ROADMAP.md`
- Finds task by ID
- Clicks prompt link
- Follows prompt exactly

**User command:** "Execute ST-005 from TERP roadmap"
**Agent action:** Opens roadmap → Finds ST-005 → Clicks prompt → Executes

**Location in V3 Design:**

- "How Agents Use the System" → Scenario 1

---

### Requirement 3: "Ensure any new task in the roadmap follows this protocol and structure exactly"

**Status:** ✅ ADDRESSED

**How:**

- Template at `docs/templates/TASK_TEMPLATE.md`
- Checklist at `docs/HOW_TO_ADD_TASK.md`
- GitHub branch protection (can't push to main)
- PR review required
- Optional GitHub Actions validation

**Enforcement:**

1. Documentation tells agent "DO NOT edit directly"
2. Template provides exact format
3. Checklist ensures all fields filled
4. PR review catches mistakes
5. GitHub Actions validates structure

**Location in V3 Design:**

- Layer 3: Enforcement (GitHub-Native)
- Layer 4: Workflows (Documented Processes)

---

### Requirement 4: "If it's ever forgotten or not followed it will cause confusion"

**Status:** ✅ ADDRESSED

**How:**

- Multi-layer enforcement prevents forgetting
- Can't bypass GitHub branch protection
- PR review is human checkpoint
- Clear error messages if validation fails

**Enforcement Layers:**

1. Documentation (awareness)
2. Templates (guidance)
3. Branch protection (technical block)
4. PR review (human verification)
5. GitHub Actions (automated check)

**Location in V3 Design:**

- "Enforcement Summary" table

---

### Requirement 5: "Figure out how to take that into account in the system so we can always be running the max number of agents but not getting into risky territory"

**Status:** ✅ ADDRESSED

**How:**

- Agent reads roadmap
- Identifies tasks with `status: ready`
- Checks dependencies
- Checks module conflicts (reads ACTIVE_SESSIONS.md)
- Recommends 3-4 safe tasks

**Process:**

1. User asks: "What's the next batch?"
2. Agent reads MASTER_ROADMAP.md
3. Agent filters by status: ready
4. Agent sorts by priority
5. Agent checks ACTIVE_SESSIONS.md for conflicts
6. Agent recommends safe batch size (3-4 tasks)

**Location in V3 Design:**

- "How Agents Use the System" → Scenario 3

---

### Requirement 6: "This obviously all needs to work outside of this sandbox/manus"

**Status:** ✅ ADDRESSED

**How:**

- Zero Manus-specific tools
- Pure GitHub + markdown
- Works with ANY AI agent (Claude.ai, ChatGPT, Cursor, etc.)
- No sandbox assumptions

**Platform Support:**

- ✅ Claude.ai (web)
- ✅ ChatGPT (web)
- ✅ Cursor (IDE)
- ✅ Any agent with GitHub access

**Location in V3 Design:**

- "Core Principle" section
- "Platform Agnostic" advantages

---

### Requirement 7: "It needs to live in the GitHub. All of it include the constraints and everything"

**Status:** ✅ ADDRESSED

**How:**

- Everything in repository
- No external tools required
- All enforcement via GitHub features
- All documentation in markdown

**What's in GitHub:**

- ✅ Roadmap (`docs/roadmaps/MASTER_ROADMAP.md`)
- ✅ Prompts (`docs/prompts/*.md`)
- ✅ Templates (`docs/templates/*.md`)
- ✅ Workflows (`docs/HOW_TO_*.md`)
- ✅ Enforcement (GitHub branch protection)
- ✅ Validation (GitHub Actions)
- ✅ Sessions (`docs/sessions/`)
- ✅ Protocols (`.claude/AGENT_ONBOARDING.md`)

**Location in V3 Design:**

- "System Architecture" - all 4 layers
- "Complete File Structure"

---

### Requirement 8: "Anytime I tell a new agent add to the terp roadmap x, I want it to absolutely always immediately go into this whole protocol we're building"

**Status:** ✅ ADDRESSED

**How:**

- `.claude/AGENT_ONBOARDING.md` has prominent section
- Says "STOP - Do NOT edit directly"
- Points to `docs/HOW_TO_ADD_TASK.md`
- Checklist ensures protocol followed
- PR review enforces compliance

**Agent sees:**

```markdown
## If user says: "Add task to TERP roadmap"

1. STOP - Do NOT edit MASTER_ROADMAP.md directly
2. Read `docs/HOW_TO_ADD_TASK.md`
3. Follow checklist
4. Submit PR (never push to main)
```

**Location in V3 Design:**

- Layer 3: Enforcement Mechanism 1
- Layer 4: Workflows

---

### Requirement 9: "The entire roadmap system we've built and every component of it needs to live within GitHub so I can send any ai agent to terp and it will operate with this framework with all enforcement etc"

**Status:** ✅ ADDRESSED

**How:**

- Complete system in GitHub
- Self-documenting
- No external dependencies
- Works for any AI agent

**Components in GitHub:**

1. ✅ Roadmap structure
2. ✅ Task definitions
3. ✅ Prompts (self-contained)
4. ✅ Templates
5. ✅ Workflows
6. ✅ Enforcement (branch protection)
7. ✅ Validation (GitHub Actions)
8. ✅ Documentation
9. ✅ Session tracking
10. ✅ Protocols

**Location in V3 Design:**

- Entire document describes GitHub-native system
- "Complete File Structure" section

---

### Requirement 10: "Give me a prompt for each of them" (for parallel agents)

**Status:** ✅ ADDRESSED

**How:**

- Each task has prompt file at `docs/prompts/ST-XXX.md`
- Prompt is completely self-contained
- User can send: "Execute ST-005 from TERP roadmap"
- Agent finds and follows prompt

**Deployment:**

```
User to Agent 1: "Execute ST-005 from TERP roadmap"
User to Agent 2: "Execute ST-007 from TERP roadmap"
User to Agent 3: "Execute ST-008 from TERP roadmap"
```

**Location in V3 Design:**

- Layer 2: Prompts
- Example prompt for ST-005

---

### Requirement 11: "Ensure compliance to protocol and successful integration of all the parts"

**Status:** ✅ ADDRESSED

**How:**

- 4-phase workflow enforced in every prompt
- TDD required
- Pre-commit hooks (optional)
- PR review required
- GitHub Actions validation

**Protocol Enforcement:**

- ✅ Phase 1: Pre-Flight Check (register session, check conflicts)
- ✅ Phase 2: Session Startup (update roadmap, create branch)
- ✅ Phase 3: Development (TDD, tests passing)
- ✅ Phase 4: Completion (all deliverables, PR, notify user)

**Location in V3 Design:**

- Every prompt includes all 4 phases
- "Important Rules" section in prompts

---

### Requirement 12: "Make it more efficient" (while keeping all functionality)

**Status:** ✅ ADDRESSED

**How:**

- Removed complex tooling
- Pure markdown (fast to parse)
- Agent reads and reasons (no scripts needed)
- GitHub-native (no external systems)

**Efficiency Gains:**

- No parsing overhead (human-readable markdown)
- No script maintenance
- No CI/CD complexity (optional, not required)
- Works immediately (no setup)

**Location in V3 Design:**

- "Advantages of GitHub-Native Approach"
- "Low Maintenance" section

---

### Requirement 13: "Adversarial QA and improve"

**Status:** ⏳ PENDING

**Next Steps:**

1. Expert QA on V3 design
2. Improve based on expert QA
3. Adversarial QA on improved design
4. Final improvements
5. Report to user

---

## 📊 Summary

**Total Requirements:** 13  
**Addressed:** 12 ✅  
**Pending:** 1 ⏳ (QA process)

**Missing from V3:** None identified

**Gaps:** None identified

**Recommendations:**

- Proceed with expert QA
- Then adversarial QA
- Then implement

---

## ✅ Verification Complete

All user requirements are captured and addressed in the V3 GitHub-Native design.

**Ready for:** Expert QA → Improve → Adversarial QA → Improve → Report

# TERP Notes & Feedback

**Purpose:** Store project owner's thoughts, feedback, ideas, and one-off notes that development agents should be aware of.

**Last Updated:** October 27, 2025

---

## Available Notes

### [User Feedback](./user-feedback.md)
Ongoing feedback, thoughts, and observations from the project owner. **Agents should check this file at the start of every session.**

### [Feature Ideas](./feature-ideas.md)
Future feature ideas and enhancement requests that aren't yet part of a roadmap.

### [Known Issues](./known-issues.md)
Bugs, issues, and technical debt that need to be addressed.

---

## How to Use

### For Project Owner

**Adding Feedback:**
1. Open `user-feedback.md`
2. Add a new dated entry at the top
3. Write your thoughts, feedback, or observations
4. Save and commit (or just save - agent will see it)

**Adding Feature Ideas:**
1. Open `feature-ideas.md`
2. Add your idea with a brief description
3. Mark priority if known (High/Medium/Low)

**Reporting Issues:**
1. Open `known-issues.md`
2. Add the issue with reproduction steps if applicable
3. Mark severity if known (Critical/High/Medium/Low)

---

### For Development Agents

**At Start of Session:**
1. **Always check `user-feedback.md` first** - this is where the owner communicates with you
2. Check `feature-ideas.md` for context on future direction
3. Check `known-issues.md` for problems to be aware of

**During Work:**
1. If you discover an issue, add it to `known-issues.md`
2. If you fix an issue, mark it as resolved in `known-issues.md`
3. If you implement a feature idea, move it from `feature-ideas.md` to the appropriate roadmap

---

## Note Format

### User Feedback Format
```markdown
## [Date] - [Topic]

[Your feedback, thoughts, or observations]

**Action Required:** [Yes/No - what should the agent do?]

---
```

### Feature Ideas Format
```markdown
### [Feature Name]
**Priority:** [High/Medium/Low]  
**Status:** [Idea/Planned/In Progress/Complete]

**Description:**
[What is the feature?]

**Use Case:**
[Why is it needed?]

**Notes:**
[Any additional context]

---
```

### Known Issues Format
```markdown
### [Issue Title]
**Severity:** [Critical/High/Medium/Low]  
**Status:** [Open/In Progress/Resolved]  
**Reported:** [Date]

**Description:**
[What is the issue?]

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]

**Expected Behavior:**
[What should happen?]

**Actual Behavior:**
[What actually happens?]

**Notes:**
[Any additional context]

---
```

---

**Maintained by:** Project owner and development agents  
**Purpose:** Continuous communication and knowledge sharing


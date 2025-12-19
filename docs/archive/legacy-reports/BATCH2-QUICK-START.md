# Batch 2 - Quick Start Guide

**Launch 6-8 parallel agents with these prompts**

---

## 🎯 Required Agents (6 minimum)

### Agent 1: QA-028 - Fix Old Sidebar Navigation

**Priority:** P1 High | **Time:** 4-8h | **Complexity:** Medium

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-028.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT1-QA-028.md`

```bash
cat /tmp/batch2-prompts/AGENT1-QA-028.md
```

</details>

---

### Agent 2: QA-033 - Fix Custom Layout Blank Dashboard

**Priority:** P1 High | **Time:** 8-16h | **Complexity:** High

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-033.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT2-QA-033.md`

```bash
cat /tmp/batch2-prompts/AGENT2-QA-033.md
```

</details>

---

### Agent 3: QA-034 - Fix Widget Visibility Disappearing

**Priority:** P1 High | **Time:** 4-8h | **Complexity:** Medium

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-034.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT3-QA-034.md`

```bash
cat /tmp/batch2-prompts/AGENT3-QA-034.md
```

</details>

---

### Agent 4: QA-044 - Implement Event Invitation Workflow

**Priority:** P1 High | **Time:** 16-24h | **Complexity:** Very High

⚠️ **Most complex task - assign to your best agent**

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-044.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT4-QA-044.md`

```bash
cat /tmp/batch2-prompts/AGENT4-QA-044.md
```

</details>

---

### Agent 5: QA-015 - Fix Matchmaking Add Need Button

**Priority:** P2 Medium | **Time:** 4-6h | **Complexity:** Low-Medium

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-015.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT5-QA-015.md`

```bash
cat /tmp/batch2-prompts/AGENT5-QA-015.md
```

</details>

---

### Agent 6: QA-016 - Fix Matchmaking Add Supply Button

**Priority:** P2 Medium | **Time:** 4-6h | **Complexity:** Low-Medium

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-016.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT6-QA-016.md`

```bash
cat /tmp/batch2-prompts/AGENT6-QA-016.md
```

</details>

---

## 🚀 Optional Agents (2 additional)

### Agent 7: QA-036 - Fix Time Period Filters on Widgets

**Priority:** P2 Medium | **Time:** 4-8h | **Complexity:** Medium

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-036.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT7-QA-036-OPTIONAL.md`

```bash
cat /tmp/batch2-prompts/AGENT7-QA-036-OPTIONAL.md
```

</details>

---

### Agent 8: QA-045 - Link Events to Clients

**Priority:** P2 Medium | **Time:** 8-16h | **Complexity:** High

<details>
<summary>📋 Click to view prompt location</summary>

**File:** `docs/prompts/QA-045.md`  
**Copied to:** `/tmp/batch2-prompts/AGENT8-QA-045-OPTIONAL.md`

```bash
cat /tmp/batch2-prompts/AGENT8-QA-045-OPTIONAL.md
```

</details>

---

## ⚡ Quick Launch Commands

### Get All Prompts at Once

```bash
cd /home/ubuntu/TERP

# Required (6 agents)
cat /tmp/batch2-prompts/AGENT1-QA-028.md
cat /tmp/batch2-prompts/AGENT2-QA-033.md
cat /tmp/batch2-prompts/AGENT3-QA-034.md
cat /tmp/batch2-prompts/AGENT4-QA-044.md
cat /tmp/batch2-prompts/AGENT5-QA-015.md
cat /tmp/batch2-prompts/AGENT6-QA-016.md

# Optional (2 agents)
cat /tmp/batch2-prompts/AGENT7-QA-036-OPTIONAL.md
cat /tmp/batch2-prompts/AGENT8-QA-045-OPTIONAL.md
```

---

## 📊 Expected Results

**With 6 agents:**

- Complete: 41/50 tasks (82%)
- All P1 tasks done!
- Time: 6-10 hours

**With 8 agents:**

- Complete: 43/50 tasks (86%)
- All P1 tasks done!
- Time: 8-12 hours

---

## 🎯 What Each Agent Needs

1. **The prompt** (from files above)
2. **Repository access** (GitHub: EvanTenenbaum/TERP)
3. **Instructions:** "Follow the 4-phase protocol exactly"

That's it! The agents will handle everything else automatically.

---

## 📈 Monitor Progress

```bash
# Watch active sessions
watch -n 10 'ls docs/sessions/active/ | grep QA | wc -l'

# Watch completion count
watch -n 30 'grep "Status.*✅ Complete" docs/roadmaps/MASTER_ROADMAP.md | wc -l'

# Watch deployments
watch -n 30 'gh run list --limit 5'
```

---

## ✅ Success Criteria

- ✅ All 4 P1 tasks complete
- ✅ At least 2 P2 tasks complete
- ✅ All deployments successful
- ✅ No merge conflicts
- ✅ Sessions properly archived

---

**Ready? Copy the prompts and launch your agents!** 🚀

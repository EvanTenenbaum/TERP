# TERP Visual Dashboard Guide

## 📊 View Your Progress Visually

You now have **two dashboard options** to visualize all tasks and initiatives:

---

## Option 1: Terminal Dashboard (Quick)

**Best for:** Quick status checks during development

```bash
npm run dashboard
```

**Shows:**

- Overall progress bar
- Status breakdown (complete, in-progress, ready, blocked)
- Active initiatives
- High priority tasks
- Recent activity
- Recommended next actions

**Updates:** Run command anytime to refresh

---

## Option 2: HTML Dashboard (Beautiful)

**Best for:** Presentations, detailed review, sharing with team

```bash
npm run dashboard:html
```

This will:

1. Generate `dashboard.html` in your project root
2. Automatically open it in your browser

**Shows:**

- Beautiful visual progress bars
- Color-coded status cards
- High priority task list with badges
- Responsive design (works on mobile)

**Updates:** Run command to regenerate with latest data

---

## What Gets Tracked

### From Roadmap

- All tasks from `docs/roadmaps/MASTER_ROADMAP.md`
- Task status (ready, in-progress, complete, blocked)
- Priority levels (HIGH, MEDIUM, LOW)
- Time estimates

### From Initiatives

- All initiatives from `docs/initiatives/`
- Initiative phases
- Phase progress

### From Sessions

- Active agent sessions
- Session status and progress

---

## Dashboard Features

### Terminal Dashboard

✅ Real-time status overview  
✅ Color-coded priorities  
✅ Progress bars  
✅ Next action recommendations  
✅ Recent activity feed

### HTML Dashboard

✅ Beautiful visual design  
✅ Interactive cards  
✅ Responsive layout  
✅ Shareable (send HTML file)  
✅ Print-friendly

---

## Usage Examples

### Daily Standup

```bash
# Quick check before standup
npm run dashboard

# Shows:
# - What's complete
# - What's in progress
# - What's blocked
# - Next priorities
```

### Weekly Review

```bash
# Generate visual report
npm run dashboard:html

# Share dashboard.html with team
# Review progress visually
```

### Before Starting Work

```bash
# Check what to work on next
npm run dashboard

# Look at "Recommended Next Actions"
# Pick a high-priority ready task
```

### After Completing Tasks

```bash
# Update roadmap status
# Then regenerate dashboard
npm run dashboard:html

# See your progress!
```

---

## Customization

### Add More Metrics

Edit `scripts/dashboard.ts` to add:

- Test coverage percentage
- Deployment status
- Bug counts
- Performance metrics

### Change Colors/Layout

Edit `scripts/generate-html-dashboard.ts` to customize:

- Color scheme
- Card layout
- Progress bar styles
- Font sizes

---

## Integration with Kiro

### Ask Kiro to Generate Dashboard

```
"Generate the dashboard"
"Show me project status"
"What's the current progress?"
```

Kiro can run the dashboard commands and show you the output.

### Ask Kiro to Update Roadmap

```
"Mark TASK-123 as complete"
"Update roadmap with my progress"
```

Then regenerate dashboard to see changes.

---

## Troubleshooting

### Dashboard shows 0 tasks

- Check that `docs/roadmaps/MASTER_ROADMAP.md` exists
- Verify task format matches expected pattern
- Run `npm run roadmap:validate`

### HTML dashboard won't open

- Manually open `dashboard.html` in browser
- Check that file was generated
- Try different browser

### Progress seems wrong

- Verify task statuses in roadmap
- Run `npm run roadmap:validate`
- Check for parsing errors

---

## Quick Reference

```bash
# Terminal dashboard (quick check)
npm run dashboard

# HTML dashboard (visual report)
npm run dashboard:html

# Validate roadmap first
npm run roadmap:validate

# Check capacity
npm run roadmap:capacity

# Get next tasks
npm run roadmap:next-batch
```

---

## What's Next?

1. **Run the dashboard now:**

   ```bash
   npm run dashboard
   ```

2. **See your current state visually**

3. **Use it to guide your work:**
   - Focus on high priority tasks
   - Track your progress
   - Celebrate completions!

---

**The dashboard gives you instant visibility into your entire project. Use it daily to stay on track toward beta launch!**

# Dashboard Auto-Update Setup

## ✅ Automatic Dashboard Updates Configured

Your dashboard now updates automatically in **three ways**:

---

## 1. 🔄 Local Auto-Update (Post-Push Hook)

**When:** Every time you push to GitHub  
**What:** Regenerates `dashboard.html` locally  
**Location:** `.husky/post-push`

```bash
# Happens automatically after:
git push origin main

# You'll see:
📊 Generating project dashboard...
✅ Dashboard updated: dashboard.html
```

**Benefit:** Your local dashboard is always current

---

## 2. 🤖 GitHub Action Auto-Update

**When:** When roadmap or initiatives change  
**What:** Regenerates dashboard and commits it  
**Location:** `.github/workflows/update-dashboard.yml`

**Triggers on changes to:**

- `docs/roadmaps/MASTER_ROADMAP.md`
- `docs/initiatives/**`
- `docs/ACTIVE_SESSIONS.md`
- Dashboard scripts

**What it does:**

1. Detects roadmap changes
2. Generates fresh dashboard
3. Commits updated `dashboard.html`
4. Pushes back to repo

**Benefit:** Dashboard stays in sync with roadmap automatically

---

## 3. 🌐 GitHub Pages Hosting (Optional)

**When:** When `dashboard.html` changes  
**What:** Publishes dashboard to web  
**Location:** `.github/workflows/deploy-dashboard-pages.yml`

### Setup GitHub Pages (One-Time)

1. Go to your repo on GitHub
2. Settings → Pages
3. Source: "GitHub Actions"
4. Save

**Your dashboard will be live at:**

```
https://[your-username].github.io/[repo-name]/dashboard.html
```

**Benefit:** View dashboard from anywhere, share with team

---

## How It Works

### Workflow

```
You update roadmap
    ↓
Commit & push
    ↓
Post-push hook runs
    ↓
Dashboard regenerated locally
    ↓
GitHub Action detects change
    ↓
Regenerates dashboard in CI
    ↓
Commits back to repo
    ↓
GitHub Pages deploys
    ↓
Dashboard live on web
```

### Smart Triggers

The GitHub Action only runs when relevant files change:

- ✅ Roadmap updated → Dashboard regenerates
- ✅ Initiative added → Dashboard regenerates
- ✅ Sessions changed → Dashboard regenerates
- ❌ Code changes → Dashboard unchanged (saves CI time)

---

## Manual Updates

You can still manually regenerate anytime:

```bash
# Terminal view (quick check)
npm run dashboard

# HTML view (opens in browser)
npm run dashboard:html
```

---

## Viewing Your Dashboard

### Local

```bash
open dashboard.html
```

### Online (after GitHub Pages setup)

```
https://[your-username].github.io/[repo-name]/dashboard.html
```

### From Anywhere

The dashboard is committed to your repo, so you can:

- View it on GitHub: `dashboard.html` in repo root
- Download and open locally
- Share the GitHub Pages URL

---

## Customization

### Change Update Frequency

Edit `.github/workflows/update-dashboard.yml`:

```yaml
# Add schedule trigger for periodic updates
on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours
```

### Change What Triggers Updates

Edit the `paths` section:

```yaml
paths:
  - "docs/roadmaps/**"
  - "docs/initiatives/**"
  - "docs/sessions/**" # Add sessions
```

### Disable Auto-Commit

Remove the "Commit dashboard" step if you don't want automatic commits.

---

## Troubleshooting

### Dashboard not updating locally

Check post-push hook:

```bash
cat .husky/post-push | grep dashboard
```

Should see dashboard generation code.

### GitHub Action not running

1. Check Actions tab on GitHub
2. Verify workflow file exists: `.github/workflows/update-dashboard.yml`
3. Check if paths match your changes

### GitHub Pages not working

1. Verify Pages is enabled in repo settings
2. Check Actions tab for deployment status
3. Wait 1-2 minutes after push

---

## Benefits

✅ **Always Current:** Dashboard reflects latest roadmap  
✅ **No Manual Work:** Updates happen automatically  
✅ **Shareable:** GitHub Pages URL for team access  
✅ **Version Controlled:** Dashboard changes tracked in git  
✅ **Fast:** Only regenerates when needed

---

## What Gets Updated

The dashboard shows:

- Overall progress percentage
- Status breakdown (complete, in-progress, ready, blocked)
- High priority tasks
- Active initiatives and phases
- Recent completions
- Next recommended actions

All pulled from:

- `docs/roadmaps/MASTER_ROADMAP.md`
- `docs/initiatives/*.md`
- `docs/ACTIVE_SESSIONS.md`

---

**Your dashboard now updates automatically on every push! 🎉**

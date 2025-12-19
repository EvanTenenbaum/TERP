# Mobile AI Assistant - Quick Start

## 🎯 What You're Getting

A Slack bot you can chat with naturally from your phone that has **complete knowledge** of your TERP project - just like talking to Kiro.

---

## ⚡ Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Get Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up (free tier available)
3. Create API key
4. Copy it

### 3. Add to .env
```bash
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
```

### 4. Run the Bot
```bash
npm run slack-bot:ai
```

### 5. Test from Phone
1. Open Slack app
2. DM your TERP bot
3. Say: "What's the current status?"

---

## 💬 Example Conversations

### Quick Status Check
```
You: status

Bot: TERP is at 45% completion. 21 tasks complete, 
2 in progress, 24 ready. Currently in Phase 1 of 
Beta Readiness - Foundation Audit.
```

### Get Guidance
```
You: what should i work on next?

Bot: Start with AUDIT-001 (Feature Completeness Audit). 
It's Phase 1 of your Beta Readiness plan and will give 
you visibility into what needs to be done. Estimated 8h.

Want me to explain what it involves?
```

### Ask Questions
```
You: explain the beta readiness plan

Bot: It's an 8-week systematic plan to get TERP ready 
for beta testing:

Phase 1 (Week 1): Foundation Audit ← YOU ARE HERE
Phase 2 (Weeks 2-3): Critical Path Completion
Phase 3 (Weeks 4-5): Feature Completion
Phase 4 (Week 6): Quality Assurance
Phase 5 (Week 7): Beta Preparation
Phase 6 (Week 8): Beta Launch

Currently you should focus on AUDIT-001 through AUDIT-004.
```

### Make Decisions
```
You: should i use optimistic locking or row-level locking?

Bot: Use both, they solve different problems:

Row-level locking (DATA-003): ✅ Already complete
- Prevents race conditions during order creation
- Uses SELECT FOR UPDATE

Optimistic locking (DATA-005): Ready to implement
- Prevents lost updates from concurrent edits
- Uses version numbers

For your order system, you need both. Row-level for 
inventory updates, optimistic for draft editing.
```

---

## 🤖 What the Bot Knows

**Automatically loaded every message:**

✅ All steering files (protocols, standards, workflows)  
✅ Current roadmap (all tasks and statuses)  
✅ Active sessions (what's being worked on)  
✅ Beta readiness initiative  
✅ Recent git commits  
✅ Project statistics  

**It's like having Kiro in your pocket!**

---

## 📱 Mobile Usage Tips

### Quick Commands
```
status          → Project overview
dashboard       → Dashboard link
tasks           → Ready tasks
next            → What to work on
help            → Get guidance
```

### Natural Language
```
What's blocking us?
How do I fix the login bug?
Explain AUDIT-001
Should I deploy now?
What changed yesterday?
```

### Continuous Conversation
The bot remembers context:
```
You: What's AUDIT-001?
Bot: [explains]

You: How long?
Bot: [knows you mean AUDIT-001]

You: Start it
Bot: [knows to start AUDIT-001]
```

---

## 💰 Cost

**Anthropic Claude:**
- ~$0.07 per message
- ~$7/day for 100 messages
- Free tier available for testing

**Alternative:** Use OpenAI GPT-4 (similar pricing)

---

## 🚀 Production Deployment

### Option 1: Run Locally (Easiest)
```bash
npm run slack-bot:ai
```

### Option 2: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start npm --name "terp-ai" -- run slack-bot:ai
pm2 save
```

### Option 3: DigitalOcean (Best)
Add to `.do/app.yaml`:
```yaml
workers:
  - name: slack-ai-bot
    run_command: npm run slack-bot:ai
```

---

## 🆚 Comparison

### Before (Command-based)
```
/terp-status
/terp-dashboard
/terp-tasks
/terp-run TASK-ID
```
❌ Have to remember commands  
❌ Limited functionality  
❌ Not conversational  

### After (AI-powered)
```
what's the status?
show me the dashboard
what should i work on?
start AUDIT-001
```
✅ Natural language  
✅ Full project knowledge  
✅ Conversational  
✅ Makes decisions with you  

---

## 📚 Full Documentation

- **Setup Guide**: `docs/SLACK-AI-BOT-SETUP.md`
- **Mobile Workflows**: `docs/MOBILE-WORKFLOW-GUIDE.md`
- **Bot Code**: `scripts/slack-bot-ai.ts`

---

## ✅ Next Steps

1. **Run setup** (5 minutes)
2. **Test from phone** (1 minute)
3. **Start using it** (immediately!)

```bash
# One command to get started:
npm install --legacy-peer-deps && npm run slack-bot:ai
```

Then DM your bot in Slack: "What's the current status?"

---

**You'll have a mobile AI assistant with complete project knowledge in 5 minutes!** 🎉

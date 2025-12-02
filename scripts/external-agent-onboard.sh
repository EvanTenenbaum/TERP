#!/bin/bash

# External Agent Onboarding Script
# Run this to get all context needed for external agents (Claude, ChatGPT, etc.)

set -e

echo "🤖 TERP External Agent Onboarding"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from TERP root directory"
    exit 1
fi

echo "📋 Step 1: Reading all steering files..."
echo ""

# Create a consolidated context file
OUTPUT_FILE="EXTERNAL_AGENT_CONTEXT.md"

cat > "$OUTPUT_FILE" << 'EOF'
# TERP External Agent Context Bundle

**Generated**: $(date)
**Purpose**: Complete context for external AI agents working on TERP

---

EOF

echo "## External Agent Handoff Protocol" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/05-external-agent-handoff.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Core Identity" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/00-core-identity.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Development Standards" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/01-development-standards.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Workflows" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/02-workflows.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Agent Coordination" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/03-agent-coordination.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## Infrastructure" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat .kiro/steering/04-infrastructure.md >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "✅ Created: $OUTPUT_FILE"
echo ""

echo "📊 Step 2: Checking current state..."
echo ""

echo "Active Sessions:"
if [ -f "docs/ACTIVE_SESSIONS.md" ]; then
    cat docs/ACTIVE_SESSIONS.md
else
    echo "  (none)"
fi
echo ""

echo "Recent Commits:"
git log --oneline -5
echo ""

echo "Current Branch:"
git branch --show-current
echo ""

echo "📦 Step 3: Generating session template..."
echo ""

SESSION_ID="Session-$(date +%Y%m%d)-TASKID-$(openssl rand -hex 3)"
SESSION_FILE="docs/sessions/active/$SESSION_ID.md"

cat > "$SESSION_FILE" << 'TEMPLATE'
# Session: TASK-ID - [Replace with Task Title]

**Status**: In Progress
**Started**: $(date)
**Agent Type**: External (Claude/ChatGPT/Other)
**Platform**: [Specify: Claude, ChatGPT, etc.]
**Files**: [List files you'll edit]

## Progress
- [ ] Read all steering files
- [ ] Register session
- [ ] Phase 1: [Description]
- [ ] Phase 2: [Description]
- [ ] Tests written
- [ ] Deployment verified

## Notes
Working from external platform - following handoff protocol

## Handoff Notes for Kiro Agents
(Fill this in when complete)

**What was completed:**
- 

**What's pending:**
- 

**Known issues:**
- 

**Files modified:**
- 

**Commits:**
- 
TEMPLATE

echo "✅ Created session template: $SESSION_FILE"
echo ""

echo "🎯 Next Steps:"
echo ""
echo "1. Read the generated context file:"
echo "   cat $OUTPUT_FILE"
echo ""
echo "2. Edit the session template with your task details:"
echo "   nano $SESSION_FILE"
echo ""
echo "3. Register your session:"
echo "   echo '- $SESSION_ID: TASK-ID - Task Title [Platform: External]' >> docs/ACTIVE_SESSIONS.md"
echo "   git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md"
echo "   git commit -m 'chore: register external agent session $SESSION_ID'"
echo "   git push origin main"
echo ""
echo "4. Start working (follow the protocols in $OUTPUT_FILE)"
echo ""

echo "📋 Quick Reference:"
echo ""
echo "  Check sessions:     cat docs/ACTIVE_SESSIONS.md"
echo "  Check roadmap:      cat docs/roadmaps/MASTER_ROADMAP.md"
echo "  Run tests:          pnpm test"
echo "  Type check:         pnpm typecheck"
echo "  Validate roadmap:   pnpm roadmap:validate"
echo "  Watch deployment:   bash scripts/watch-deploy.sh"
echo ""

echo "✨ Onboarding complete! Copy $OUTPUT_FILE to your external agent."

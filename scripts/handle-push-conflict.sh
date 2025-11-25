#!/bin/bash
# Handle git push conflicts with retry logic
# Usage: bash scripts/handle-push-conflict.sh [branch-name]
# This script is called when a push is rejected due to remote changes

set -e

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
MAX_ATTEMPTS=3
INITIAL_DELAY=2
MAX_DELAY=30

echo "🔄 Handling push conflict for branch: $BRANCH"
echo ""

# Function to pull and rebase
pull_and_rebase() {
  echo "📥 Pulling latest changes from origin/$BRANCH..."
  git fetch origin "$BRANCH"
  
  # Check if we need to rebase or merge
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")
  
  if [ -z "$REMOTE" ]; then
    echo "⚠️  Remote branch not found, creating it..."
    git push -u origin "$BRANCH"
    return 0
  fi
  
  # Check if local is behind
  if git merge-base --is-ancestor "$LOCAL" "$REMOTE" 2>/dev/null; then
    echo "✅ Local is up to date"
    return 0
  fi
  
  # Try rebase first (preferred for cleaner history)
  echo "🔄 Attempting rebase..."
  if git rebase "origin/$BRANCH" 2>/dev/null; then
    echo "✅ Rebase successful"
    return 0
  fi
  
  # If rebase fails, check for conflicts
  if [ -d ".git/rebase-merge" ] || [ -f ".git/MERGE_HEAD" ]; then
    echo "⚠️  Conflicts detected during rebase"
    
    # Try auto-resolution
    if [ -f "scripts/auto-resolve-conflicts.sh" ]; then
      echo "🔧 Attempting auto-resolution..."
      if bash scripts/auto-resolve-conflicts.sh; then
        echo "✅ Auto-resolution successful"
        git rebase --continue 2>/dev/null || true
        return 0
      fi
    fi
    
    # If auto-resolution fails, abort rebase and try merge
    echo "⚠️  Auto-resolution failed, trying merge instead..."
    git rebase --abort 2>/dev/null || true
  fi
  
  # Fallback to merge
  echo "🔄 Attempting merge..."
  git merge "origin/$BRANCH" --no-edit || {
    # If merge also has conflicts, try auto-resolution
    if [ -f "scripts/auto-resolve-conflicts.sh" ]; then
      echo "🔧 Attempting auto-resolution for merge conflicts..."
      bash scripts/auto-resolve-conflicts.sh || {
        echo "❌ Auto-resolution failed - manual resolution required"
        return 1
      }
    else
      echo "❌ Merge conflicts - manual resolution required"
      return 1
    fi
  }
  
  echo "✅ Merge successful"
  return 0
}

# Retry loop with exponential backoff
ATTEMPT=1
DELAY=$INITIAL_DELAY

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo ""
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS"
  
  if pull_and_rebase; then
    echo ""
    echo "✅ Ready to push. Attempting push..."
    if git push origin "$BRANCH"; then
      echo ""
      echo "✅ Push successful!"
      exit 0
    else
      echo "⚠️  Push failed (non-conflict error)"
      exit 1
    fi
  else
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
      echo ""
      echo "⏳ Waiting ${DELAY}s before retry (exponential backoff)..."
      sleep $DELAY
      DELAY=$((DELAY * 2))
      if [ $DELAY -gt $MAX_DELAY ]; then
        DELAY=$MAX_DELAY
      fi
    fi
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ Failed to resolve conflicts after $MAX_ATTEMPTS attempts"
echo "   Manual intervention required:"
echo "   1. Review conflicts: git status"
echo "   2. Resolve manually or run: bash scripts/auto-resolve-conflicts.sh"
echo "   3. Continue: git rebase --continue (or git merge --continue)"
echo "   4. Push: git push origin $BRANCH"
exit 1


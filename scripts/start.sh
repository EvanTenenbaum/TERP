#!/bin/sh
# scripts/start.sh

echo "--- 🚀 BOOT SEQUENCE INITIATED ---"

# 1. ENVIRONMENT DIAGNOSTIC
# We check if the variable exists in the container shell.
if [ -z "$DATABASE_URL" ]; then
  echo "❌ CRITICAL: DATABASE_URL is completely missing from the container environment."
  echo "   This is a DigitalOcean Config issue. Check App Settings."
  exit 1
else
  # Print partial hash to verify it's not empty/whitespace
  echo "✅ DATABASE_URL detected (Length: ${#DATABASE_URL})"
fi

# 2. MIGRATIONS (Fail Fast)
echo "--- 🛠 RUNNING MIGRATIONS ---"
# We run this in a subshell to ensure it doesn't pollute the main process
node scripts/migrate.js
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
  echo "❌ MIGRATION FAILED (Exit Code: $MIGRATION_EXIT_CODE). Aborting deployment."
  exit 1
fi
echo "✅ Migrations Complete."

# 3. START MAIN APPLICATION
echo "--- 🟢 STARTING SERVER ---"
# We use 'exec' to replace the shell with the node process (PID 1)
# ensuring signals (SIGTERM) are passed correctly.
exec node dist/index.js

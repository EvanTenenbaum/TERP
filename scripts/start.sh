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

# 2. MIGRATIONS (Handled by autoMigrate.ts on server startup)
# Migrations are now handled automatically by server/autoMigrate.ts
# which runs when the server starts. This includes:
# - Creating client_needs, vendor_supply, match_records tables
# - Adding columns and indexes as needed
# - All migrations are idempotent (safe to run multiple times)
echo "--- 🛠 MIGRATIONS ---"
echo "✅ Migrations will run automatically on server startup (via autoMigrate.ts)"

# 3. START MAIN APPLICATION
echo "--- 🟢 STARTING SERVER ---"
# We use 'exec' to replace the shell with the node process (PID 1)
# ensuring signals (SIGTERM) are passed correctly.
exec node dist/index.js

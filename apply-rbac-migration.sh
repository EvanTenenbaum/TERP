#!/bin/bash

# DEPRECATED - Apply RBAC migration to database
#
# NOTE: TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.
# This script is kept for historical reference only.
#
# Current Platform: DigitalOcean App Platform
# Production URL: https://terp-app-b9s35.ondigitalocean.app
#
# For DigitalOcean, use: pnpm db:migrate

echo "⚠️  WARNING: This script is DEPRECATED. TERP uses DigitalOcean, not Railway."
echo "Use 'pnpm db:migrate' instead."
exit 1

# Original Railway code below (kept for reference):
# echo "🔧 Applying RBAC migration to Railway database..."

# Use railway run to execute mysql with the migration SQL
railway run --service terp-app bash -c 'mysql -h mysql.railway.internal -u root -p"$MYSQLPASSWORD" -D railway < drizzle/0022_create_rbac_tables.sql'

if [ $? -eq 0 ]; then
  echo "✅ RBAC migration applied successfully!"
else
  echo "❌ Migration failed. Check the error above."
  exit 1
fi

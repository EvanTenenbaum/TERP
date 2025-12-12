#!/bin/bash

# Apply RBAC migration to Railway database
# This script connects to Railway MySQL and applies the 0022 migration

echo "🔧 Applying RBAC migration to Railway database..."

# Use railway run to execute mysql with the migration SQL
railway run --service terp-app bash -c 'mysql -h mysql.railway.internal -u root -p"$MYSQLPASSWORD" -D railway < drizzle/0022_create_rbac_tables.sql'

if [ $? -eq 0 ]; then
  echo "✅ RBAC migration applied successfully!"
else
  echo "❌ Migration failed. Check the error above."
  exit 1
fi

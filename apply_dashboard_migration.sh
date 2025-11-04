#!/bin/bash

# Script to apply Dashboard V3 migration
# This will recreate the userDashboardPreferences table with the correct schema

echo "=========================================="
echo "Dashboard V3 Migration Script"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Drop the old userDashboardPreferences table"
echo "  2. Create a new table with the correct schema for Dashboard V3"
echo ""
echo "WARNING: This will delete any existing dashboard preferences!"
echo "Users will need to recustomize their dashboards."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Please provide database connection details:"
read -p "Host (default: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com): " DB_HOST
DB_HOST=${DB_HOST:-terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com}

read -p "Port (default: 25060): " DB_PORT
DB_PORT=${DB_PORT:-25060}

read -p "Username (default: doadmin): " DB_USER
DB_USER=${DB_USER:-doadmin}

read -sp "Password: " DB_PASSWORD
echo ""

read -p "Database (default: defaultdb): " DB_NAME
DB_NAME=${DB_NAME:-defaultdb}

echo ""
echo "Applying migration..."

mysql -h "$DB_HOST" \
      -P "$DB_PORT" \
      -u "$DB_USER" \
      -p"$DB_PASSWORD" \
      --ssl-mode=REQUIRED \
      "$DB_NAME" < drizzle/0026_recreate_dashboard_preferences.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Verifying table structure..."
    echo "DESCRIBE userDashboardPreferences;" | mysql -h "$DB_HOST" \
          -P "$DB_PORT" \
          -u "$DB_USER" \
          -p"$DB_PASSWORD" \
          --ssl-mode=REQUIRED \
          "$DB_NAME"
    echo ""
    echo "✅ Dashboard V3 is now ready to use!"
else
    echo ""
    echo "❌ Migration failed. Please check the error message above."
    exit 1
fi

#!/usr/bin/env python3
"""Apply the missing part of migration 0030: rename reason to notes."""

import ssl
import pymysql

# Database credentials
DB_CONFIG = {
    'host': 'terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com',
    'port': 25060,
    'user': 'doadmin',
    'password': '<REDACTED>',
    'database': 'defaultdb',
}

def apply_migration():
    """Apply the missing migration to rename reason to notes."""
    try:
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            ssl=ssl_context,
            autocommit=False
        )
        
        cursor = conn.cursor()
        
        print("=" * 80)
        print("Applying Migration: Rename 'reason' to 'notes' in inventoryMovements")
        print("=" * 80)
        
        # First, check current state
        cursor.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'defaultdb'
              AND TABLE_NAME = 'inventoryMovements'
              AND COLUMN_NAME IN ('reason', 'notes')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        print(f"Current columns: {existing_columns}")
        
        if 'notes' in existing_columns:
            print("✅ 'notes' column already exists. Migration already applied.")
            cursor.close()
            conn.close()
            return True
        
        if 'reason' not in existing_columns:
            print("❌ 'reason' column not found. Cannot apply migration.")
            cursor.close()
            conn.close()
            return False
        
        print("\nApplying migration...")
        
        # Rename reason column to notes
        cursor.execute("""
            ALTER TABLE inventoryMovements
            CHANGE COLUMN reason notes TEXT
        """)
        
        conn.commit()
        print("✅ Successfully renamed 'reason' to 'notes'")
        
        # Verify the change
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'defaultdb'
              AND TABLE_NAME = 'inventoryMovements'
              AND COLUMN_NAME IN ('reason', 'notes', 'adjustmentReason')
            ORDER BY ORDINAL_POSITION
        """)
        
        print("\n" + "=" * 80)
        print("Post-Migration Verification")
        print("=" * 80)
        print(f"{'COLUMN_NAME':<25} {'DATA_TYPE':<15} {'COLUMN_TYPE':<40}")
        print("-" * 80)
        
        results = cursor.fetchall()
        for row in results:
            print(f"{row[0]:<25} {row[1]:<15} {str(row[2]):<40}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    success = apply_migration()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        exit(1)

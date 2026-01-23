#!/usr/bin/env python3
"""Check current database state for DEPLOY-DATA-010 migration."""

import ssl
import pymysql

# Database credentials
DB_CONFIG = {
    'host': 'terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com',
    'port': 25060,
    'user': 'doadmin',
    'password': '<REDACTED>',
    'database': 'defaultdb',
    'ssl': {'ssl': True}
}

def check_inventory_movements_columns():
    """Check the inventoryMovements table structure."""
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
            ssl=ssl_context
        )
        
        cursor = conn.cursor()
        
        # Query to check inventoryMovements columns
        query = """
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'defaultdb'
          AND TABLE_NAME = 'inventoryMovements'
        ORDER BY ORDINAL_POSITION;
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print("=" * 80)
        print("inventoryMovements Table Structure")
        print("=" * 80)
        print(f"{'COLUMN_NAME':<25} {'DATA_TYPE':<15} {'COLUMN_TYPE':<40} {'NULLABLE':<10}")
        print("-" * 80)
        
        column_names = []
        for row in results:
            column_names.append(row[0])
            print(f"{row[0]:<25} {row[1]:<15} {str(row[2]):<40} {row[3]:<10}")
        
        print("\n" + "=" * 80)
        print("Migration Status Check")
        print("=" * 80)
        
        # Check expected columns per deployment prompt
        has_reason = 'reason' in column_names
        has_notes = 'notes' in column_names
        has_adjustmentReason = 'adjustmentReason' in column_names
        
        print(f"Has 'reason' column: {has_reason}")
        print(f"Has 'notes' column: {has_notes}")
        print(f"Has 'adjustmentReason' column: {has_adjustmentReason}")
        
        if has_notes and has_adjustmentReason:
            print("\n✅ Migration has ALREADY been applied. Skip to Phase 3.")
        elif has_reason and not has_notes and not has_adjustmentReason:
            print("\n⚠️ Migration has NOT been applied yet. Proceed with Phase 2.")
        else:
            print("\n⚠️ Unexpected state. Manual review required.")
        
        # Also check order_status_history for deleted_at
        query2 = """
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'defaultdb'
          AND TABLE_NAME = 'order_status_history'
          AND COLUMN_NAME = 'deleted_at';
        """
        cursor.execute(query2)
        deleted_at_result = cursor.fetchall()
        
        print(f"\norder_status_history.deleted_at exists: {len(deleted_at_result) > 0}")
        
        cursor.close()
        conn.close()
        
        return has_notes and has_adjustmentReason
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

if __name__ == "__main__":
    check_inventory_movements_columns()

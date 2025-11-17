#!/usr/bin/env python3.11
"""
Script to add missing indexes to drizzle/schema.ts
Based on analysis showing 26 missing indexes on foreign keys
"""

import re

# Define the missing indexes to add (from our analysis)
MISSING_INDEXES = {
    'batches': [
        ('statusId', 'idx_batches_status_id'),
        ('photoSessionEventId', 'idx_batches_photo_session_event_id'),
    ],
    'creditSystemSettings': [
        ('updatedBy', 'idx_credit_system_settings_updated_by'),
    ],
    'creditSystemTriggers': [
        ('triggeredBy', 'idx_credit_system_triggers_triggered_by'),
    ],
    'dashboardWidgetLayouts': [
        ('userId', 'idx_dashboard_widget_layouts_user_id'),
    ],
    'pricingProfiles': [
        ('templateId', 'idx_pricing_profiles_template_id'),
    ],
    'orders': [
        ('intakeEventId', 'idx_orders_intake_event_id'),
        ('packedBy', 'idx_orders_packed_by'),
        ('shippedBy', 'idx_orders_shipped_by'),
    ],
    'credits': [
        ('transactionId', 'idx_credits_transaction_id'),
    ],
    'sampleRequests': [
        ('fulfilledBy', 'idx_sample_requests_fulfilled_by'),
        ('cancelledBy', 'idx_sample_requests_cancelled_by'),
        ('relatedOrderId', 'idx_sample_requests_related_order_id'),
    ],
    'inventoryAlerts': [
        ('acknowledgedBy', 'idx_inventory_alerts_acknowledged_by'),
    ],
    'clientNeeds': [
        ('strainId', 'idx_client_needs_strain_id'),
    ],
    'strainMatches': [
        ('inventoryBatchId', 'idx_strain_matches_inventory_batch_id'),
        ('vendorSupplyId', 'idx_strain_matches_vendor_supply_id'),
        ('historicalOrderId', 'idx_strain_matches_historical_order_id'),
        ('actionedBy', 'idx_strain_matches_actioned_by'),
        ('saleOrderId', 'idx_strain_matches_sale_order_id'),
    ],
    'todoTasks': [
        ('completedBy', 'idx_todo_tasks_completed_by'),
    ],
    'comments': [
        ('resolvedBy', 'idx_comments_resolved_by'),
    ],
    'calendarEventInstances': [
        ('modifiedAssignedTo', 'idx_calendar_event_instances_modified_assigned_to'),
        ('modifiedBy', 'idx_calendar_event_instances_modified_by'),
    ],
    'calendarEventInvitations': [
        ('overriddenBy', 'idx_calendar_event_invitations_overridden_by'),
    ],
    'batchStatusHistory': [
        ('fromStatusId', 'idx_batch_status_history_from_status_id'),
    ],
}

def add_indexes_to_table(content, table_name, indexes):
    """Add indexes to a specific table in the schema"""
    
    # Find the table's index section
    # Pattern: table name followed by indexes block
    table_pattern = rf'export const {table_name} = mysqlTable\(["\'](\w+)["\'],.*?\n  \(table\) => \(\{{(.*?)\n  }}\)'
    
    match = re.search(table_pattern, content, re.DOTALL)
    if not match:
        print(f"  ⚠️  Could not find index section for table {table_name}")
        return content
    
    db_table_name = match.group(1)
    index_block = match.group(2)
    
    # Check if indexes already exist
    new_indexes = []
    for field_name, index_name in indexes:
        if field_name in index_block:
            print(f"  ℹ️  Index for {field_name} already exists, skipping")
            continue
        new_indexes.append((field_name, index_name))
    
    if not new_indexes:
        return content
    
    # Generate index definitions
    index_defs = []
    for field_name, index_name in new_indexes:
        index_def = f'    {field_name}Idx: index("{index_name}").on(table.{field_name}),'
        index_defs.append(index_def)
    
    # Find the last index in the block and add after it
    # Look for the last line before the closing brace
    lines = index_block.split('\n')
    insert_pos = len(lines) - 1
    
    # Insert the new indexes
    new_index_block = '\n'.join(lines[:insert_pos] + index_defs + lines[insert_pos:])
    
    # Replace the old index block with the new one
    new_content = content.replace(index_block, new_index_block)
    
    print(f"  ✅ Added {len(new_indexes)} index(es) to {table_name}")
    return new_content

def main():
    print("=" * 80)
    print("ADDING MISSING INDEXES TO SCHEMA")
    print("=" * 80)
    print()
    
    # Read the schema file
    with open('drizzle/schema.ts', 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Add indexes for each table
    for table_name, indexes in MISSING_INDEXES.items():
        print(f"Processing table: {table_name}")
        content = add_indexes_to_table(content, table_name, indexes)
        print()
    
    # Write back to file
    if content != original_content:
        with open('drizzle/schema.ts', 'w') as f:
            f.write(content)
        print("=" * 80)
        print("✅ Schema updated successfully!")
        print("=" * 80)
    else:
        print("=" * 80)
        print("ℹ️  No changes needed")
        print("=" * 80)

if __name__ == '__main__':
    main()

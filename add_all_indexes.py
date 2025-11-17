#!/usr/bin/env python3.11
"""
Add all remaining missing indexes to schema.ts
This script adds indexes to tables that already have index sections
"""

import re

# Read schema
with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

# Define indexes to add to existing index sections
INDEXES_TO_ADD = [
    # orders table - add to existing index section
    {
        'table': 'orders',
        'indexes': [
            ('intakeEventId', 'idx_orders_intake_event_id'),
            ('packedBy', 'idx_orders_packed_by'),
            ('shippedBy', 'idx_orders_shipped_by'),
        ]
    },
    # credits table - add to existing index section
    {
        'table': 'credits',
        'indexes': [
            ('transactionId', 'idx_credits_transaction_id'),
        ]
    },
    # sampleRequests table - add to existing index section
    {
        'table': 'sampleRequests',
        'indexes': [
            ('fulfilledBy', 'idx_sample_requests_fulfilled_by'),
            ('cancelledBy', 'idx_sample_requests_cancelled_by'),
            ('relatedOrderId', 'idx_sample_requests_related_order_id'),
        ]
    },
    # inventoryAlerts table - add to existing index section
    {
        'table': 'inventoryAlerts',
        'indexes': [
            ('acknowledgedBy', 'idx_inventory_alerts_acknowledged_by'),
        ]
    },
    # clientNeeds table - add to existing index section
    {
        'table': 'clientNeeds',
        'indexes': [
            ('strainId', 'idx_client_needs_strain_id'),
        ]
    },
    # strainMatches table - add to existing index section
    {
        'table': 'strainMatches',
        'indexes': [
            ('inventoryBatchId', 'idx_strain_matches_inventory_batch_id'),
            ('vendorSupplyId', 'idx_strain_matches_vendor_supply_id'),
            ('historicalOrderId', 'idx_strain_matches_historical_order_id'),
            ('actionedBy', 'idx_strain_matches_actioned_by'),
            ('saleOrderId', 'idx_strain_matches_sale_order_id'),
        ]
    },
    # todoTasks table - add to existing index section
    {
        'table': 'todoTasks',
        'indexes': [
            ('completedBy', 'idx_todo_tasks_completed_by'),
        ]
    },
    # comments table - add to existing index section
    {
        'table': 'comments',
        'indexes': [
            ('resolvedBy', 'idx_comments_resolved_by'),
        ]
    },
    # calendarEventInstances table - add to existing index section
    {
        'table': 'calendarEventInstances',
        'indexes': [
            ('modifiedAssignedTo', 'idx_calendar_event_instances_modified_assigned_to'),
            ('modifiedBy', 'idx_calendar_event_instances_modified_by'),
        ]
    },
    # calendarEventInvitations table - add to existing index section
    {
        'table': 'calendarEventInvitations',
        'indexes': [
            ('overriddenBy', 'idx_calendar_event_invitations_overridden_by'),
        ]
    },
    # batchStatusHistory table - add to existing index section
    {
        'table': 'batchStatusHistory',
        'indexes': [
            ('fromStatusId', 'idx_batch_status_history_from_status_id'),
        ]
    },
]

def add_indexes_to_existing_section(content, table_name, indexes):
    """Add indexes to an existing index section"""
    
    # Find the table's index section - pattern for tables with existing indexes
    # Match: (table) => ({ ... })
    pattern = rf'(export const {table_name} = mysqlTable\(.*?\n  \(table\) => \(\{{)(.*?)(\n  }}\)\n\);)'
    
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"  ⚠️  Could not find index section for {table_name}")
        return content
    
    prefix = match.group(1)
    index_block = match.group(2)
    suffix = match.group(3)
    
    # Check which indexes already exist
    new_indexes = []
    for field_name, index_name in indexes:
        if f'{field_name}Idx' in index_block or field_name in index_block:
            print(f"  ℹ️  Index for {field_name} already exists")
            continue
        new_indexes.append((field_name, index_name))
    
    if not new_indexes:
        return content
    
    # Generate new index lines
    index_lines = []
    for field_name, index_name in new_indexes:
        index_line = f'    {field_name}Idx: index("{index_name}").on(table.{field_name}),'
        index_lines.append(index_line)
    
    # Add to the end of the index block (before the closing brace)
    new_index_block = index_block.rstrip() + '\n' + '\n'.join(index_lines)
    
    # Reconstruct the table definition
    new_content = content.replace(
        prefix + index_block + suffix,
        prefix + new_index_block + suffix
    )
    
    print(f"  ✅ Added {len(new_indexes)} index(es) to {table_name}")
    return new_content

def main():
    global content
    
    print("=" * 80)
    print("ADDING REMAINING INDEXES TO SCHEMA")
    print("=" * 80)
    print()
    
    original_content = content
    total_added = 0
    
    for table_info in INDEXES_TO_ADD:
        table_name = table_info['table']
        indexes = table_info['indexes']
        
        print(f"Processing {table_name}...")
        old_content = content
        content = add_indexes_to_existing_section(content, table_name, indexes)
        if content != old_content:
            total_added += len([idx for idx in indexes if f'{idx[0]}Idx' not in old_content])
        print()
    
    # Write back
    if content != original_content:
        with open('drizzle/schema.ts', 'w') as f:
            f.write(content)
        print("=" * 80)
        print(f"✅ Added {total_added} indexes successfully!")
        print("=" * 80)
    else:
        print("=" * 80)
        print("ℹ️  No changes needed")
        print("=" * 80)

if __name__ == '__main__':
    main()

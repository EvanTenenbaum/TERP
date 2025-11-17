#!/usr/bin/env python3.11
"""Bulk add remaining indexes"""
import re

with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

# Define all remaining edits
edits = [
    # inventoryAlerts
    {
        'find': r'(export const inventoryAlerts = mysqlTable\(.*?table => \(\{.*?severityIdx: index\("idx_inventory_alerts_severity"\)\.on\(table\.severity\),)',
        'replace': r'\1\n    acknowledgedByIdx: index("idx_inventory_alerts_acknowledged_by").on(table.acknowledgedBy),'
    },
    # clientNeeds
    {
        'find': r'(export const clientNeeds = mysqlTable\(.*?table => \(\{.*?priorityIdx: index\("idx_priority"\)\.on\(table\.priority\),)',
        'replace': r'\1\n    strainIdIdx: index("idx_client_needs_strain_id").on(table.strainId),'
    },
    # strainMatches
    {
        'find': r'(export const strainMatches = mysqlTable\(.*?table => \(\{.*?userActionIdx: index\("idx_user_action"\)\.on\(table\.userAction\),)',
        'replace': r'\1\n    inventoryBatchIdIdx: index("idx_strain_matches_inventory_batch_id").on(table.inventoryBatchId),\n    vendorSupplyIdIdx: index("idx_strain_matches_vendor_supply_id").on(table.vendorSupplyId),\n    historicalOrderIdIdx: index("idx_strain_matches_historical_order_id").on(table.historicalOrderId),\n    actionedByIdx: index("idx_strain_matches_actioned_by").on(table.actionedBy),\n    saleOrderIdIdx: index("idx_strain_matches_sale_order_id").on(table.saleOrderId),'
    },
    # todoTasks
    {
        'find': r'(export const todoTasks = mysqlTable\(.*?table => \(\{.*?createdByIdx: index\("idx_created_by"\)\.on\(table\.createdBy\),)',
        'replace': r'\1\n    completedByIdx: index("idx_todo_tasks_completed_by").on(table.completedBy),'
    },
    # comments
    {
        'find': r'(export const comments = mysqlTable\(.*?table => \(\{.*?createdAtIdx: index\("idx_created_at"\)\.on\(table\.createdAt\),)',
        'replace': r'\1\n    resolvedByIdx: index("idx_comments_resolved_by").on(table.resolvedBy),'
    },
    # calendarEventInstances
    {
        'find': r'(export const calendarEventInstances = mysqlTable\(.*?table => \(\{.*?statusIdx: index\("idx_instance_status"\)\.on\(table\.status\),)',
        'replace': r'\1\n    modifiedAssignedToIdx: index("idx_calendar_event_instances_modified_assigned_to").on(table.modifiedAssignedTo),\n    modifiedByIdx: index("idx_calendar_event_instances_modified_by").on(table.modifiedBy),'
    },
    # calendarEventInvitations
    {
        'find': r'(export const calendarEventInvitations = mysqlTable\(.*?table => \(\{.*?createdByIdx: index\("idx_invitation_created_by"\)\.on\(table\.createdBy\),)',
        'replace': r'\1\n    overriddenByIdx: index("idx_calendar_event_invitations_overridden_by").on(table.overriddenBy),'
    },
    # batchStatusHistory
    {
        'find': r'(export const batchStatusHistory = mysqlTable\(.*?table => \(\{.*?createdAtIdx: index\("idx_batch_status_history_createdAt"\)\.on\(\s*table\.createdAt\s*\),)',
        'replace': r'\1\n    fromStatusIdIdx: index("idx_batch_status_history_from_status_id").on(table.fromStatusId),'
    },
]

original = content
for edit in edits:
    content = re.sub(edit['find'], edit['replace'], content, flags=re.DOTALL)

if content != original:
    with open('drizzle/schema.ts', 'w') as f:
        f.write(content)
    print("✅ Added remaining indexes successfully!")
else:
    print("⚠️  No changes made")

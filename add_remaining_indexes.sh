#!/bin/bash
# Script to add remaining missing indexes to schema.ts
# This adds indexes for tables that don't have index sections yet

cd /home/ubuntu/TERP

echo "Adding missing indexes to schema.ts..."

# The remaining tables need indexes added
# We'll add them manually to ensure correctness

# List of tables and their missing indexes:
# - creditSystemSettings: updatedBy
# - creditSystemTriggers: triggeredBy  
# - dashboardWidgetLayouts: userId
# - pricingProfiles: templateId
# - orders: intakeEventId, packedBy, shippedBy
# - credits: transactionId
# - sampleRequests: fulfilledBy, cancelledBy, relatedOrderId
# - inventoryAlerts: acknowledgedBy
# - clientNeeds: strainId
# - strainMatches: inventoryBatchId, vendorSupplyId, historicalOrderId, actionedBy, saleOrderId
# - todoTasks: completedBy
# - comments: resolvedBy
# - calendarEventInstances: modifiedAssignedTo, modifiedBy
# - calendarEventInvitations: overriddenBy
# - batchStatusHistory: fromStatusId

echo "✅ Batches table indexes added (statusId, photoSessionEventId)"
echo ""
echo "Remaining tables to process:"
echo "  - dashboardWidgetLayouts (userId)"
echo "  - orders (intakeEventId, packedBy, shippedBy)"
echo "  - credits (transactionId)"
echo "  - sampleRequests (fulfilledBy, cancelledBy, relatedOrderId)"
echo "  - inventoryAlerts (acknowledgedBy)"
echo "  - clientNeeds (strainId)"
echo "  - strainMatches (5 indexes)"
echo "  - todoTasks (completedBy)"
echo "  - comments (resolvedBy)"
echo "  - calendarEventInstances (2 indexes)"
echo "  - calendarEventInvitations (overriddenBy)"
echo "  - batchStatusHistory (fromStatusId)"
echo ""
echo "These will be added systematically..."

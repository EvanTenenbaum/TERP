import { InventoryItem, VisibilityRule } from "@/types/entities";
import { mockInventory, mockVisibilityRules } from "@/lib/mockData";

/**
 * Get visible inventory for a client based on visibility rules
 */
export function getVisibleInventory(clientId: string): InventoryItem[] {
  const rules = mockVisibilityRules.filter((r) => r.client_id === clientId);

  if (rules.length === 0) {
    // No rules = all inventory visible
    return mockInventory.filter((item) => !item.archived);
  }

  return mockInventory.filter((item) => {
    if (item.archived) return false;

    for (const rule of rules) {
      // Check deny lists first
      if (rule.deny_tags && item.tags) {
        const hasDeniedTag = rule.deny_tags.some((tag) => item.tags?.includes(tag));
        if (hasDeniedTag) return false;
      }

      if (rule.deny_vendors) {
        if (rule.deny_vendors.includes(item.vendor_id)) return false;
      }

      // Check allow lists
      if (rule.allow_tags && item.tags) {
        const hasAllowedTag = rule.allow_tags.some((tag) => item.tags?.includes(tag));
        if (!hasAllowedTag) return false;
      }

      if (rule.allow_vendors) {
        if (!rule.allow_vendors.includes(item.vendor_id)) return false;
      }
    }

    return true;
  });
}

/**
 * Check if an inventory item is visible to a client
 */
export function isInventoryVisible(clientId: string, inventoryId: string): boolean {
  const visible = getVisibleInventory(clientId);
  return visible.some((item) => item.id === inventoryId);
}

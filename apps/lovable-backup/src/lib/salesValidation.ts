import { getVisibleInventory } from "./visibility";
import { applyConstraints, validateConstraints } from "./constraints";
import { mockSalesConstraints } from "./mockData";

export interface ValidationError {
  lineId: string;
  field: string;
  message: string;
}

export interface SalesValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate an entire order/quote before submission
 */
export function validateSalesDocument(
  clientId: string,
  lines: Array<{ id: string; inventory_id: string; qty: number }>
): SalesValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!clientId) {
    errors.push({
      lineId: "header",
      field: "client_id",
      message: "Client must be selected",
    });
  }

  if (lines.length === 0) {
    errors.push({
      lineId: "header",
      field: "lines",
      message: "At least one line item is required",
    });
  }

  // Get visible inventory for client
  const visibleInventory = getVisibleInventory(clientId);
  const visibleIds = new Set(visibleInventory.map((item) => item.id));

  // Validate each line
  lines.forEach((line) => {
    // Check visibility
    if (!visibleIds.has(line.inventory_id)) {
      errors.push({
        lineId: line.id,
        field: "inventory_id",
        message: "This inventory item is not available for the selected client",
      });
    }

    // Check quantity is positive
    if (line.qty <= 0) {
      errors.push({
        lineId: line.id,
        field: "qty",
        message: "Quantity must be greater than 0",
      });
    }

    // Check constraints
    const constraint = mockSalesConstraints.find((c) => c.inventory_id === line.inventory_id);
    if (constraint) {
      const validation = validateConstraints(constraint, line.qty);
      if (!validation.valid) {
        errors.push({
          lineId: line.id,
          field: "qty",
          message: validation.message,
        });
      }

      // Check for auto-adjustment warnings
      const adjustmentResult = applyConstraints(line.inventory_id, line.qty);
      if (adjustmentResult.was_rounded) {
        warnings.push(adjustmentResult.message || "Quantity was adjusted");
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * TER-228: Centralized intake defaults
 * All intake surfaces (DirectIntakeWorkSurface, PurchaseModal)
 * must share the same default values for payment terms and location.
 *
 * Business rule: Default to Consignment + Main Warehouse unless explicitly overridden.
 */

export const INTAKE_DEFAULTS = {
  /** Default payment terms for all intake surfaces */
  paymentTerms: "CONSIGNMENT" as const,
  /** Default category for new batches */
  category: "Flower" as const,
  /** Default warehouse site name (matched by substring in location list) */
  defaultWarehouseMatch: "main",
} as const;

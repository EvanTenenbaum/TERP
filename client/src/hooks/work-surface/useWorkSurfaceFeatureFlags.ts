/**
 * useWorkSurfaceFeatureFlags - Feature flag hook for Work Surface features
 * UXS-701: Feature Flags for Safe Rollout
 *
 * This hook provides:
 * - Centralized feature flag access for Work Surface features
 * - Named flags for each Work Surface component
 * - Progressive rollout support
 * - Safe defaults (disabled when loading or error)
 *
 * Works with the FeatureFlagContext from @/contexts/FeatureFlagContext
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useMemo } from "react";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Work Surface feature flag keys
 * These correspond to flags that should be configured in the feature flags admin
 */
export const WORK_SURFACE_FLAGS = {
  // Global Work Surface toggle
  WORK_SURFACE_ENABLED: "work-surface-enabled",

  // UXS-101: Keyboard Contract
  KEYBOARD_CONTRACT: "work-surface-keyboard-contract",

  // UXS-102: Save State Indicator
  SAVE_STATE_INDICATOR: "work-surface-save-state",

  // UXS-103: Inspector Panel
  INSPECTOR_PANEL: "work-surface-inspector-panel",

  // UXS-104: Validation Timing
  VALIDATION_TIMING: "work-surface-validation-timing",

  // UXS-201: Direct Intake Work Surface
  DIRECT_INTAKE: "work-surface-direct-intake",

  // UXS-202: Purchase Orders Work Surface
  PURCHASE_ORDERS: "work-surface-purchase-orders",

  // UXS-203: Clients Work Surface
  CLIENTS: "work-surface-clients",

  // UXS-301: Orders Work Surface
  ORDERS: "work-surface-orders",

  // UXS-401: Inventory Work Surface
  INVENTORY: "work-surface-inventory",

  // UXS-501: Invoices Work Surface
  INVOICES: "work-surface-invoices",

  // UXS-705: Concurrent Edit Detection
  CONCURRENT_EDIT: "work-surface-concurrent-edit",

  // Golden Flows
  GOLDEN_FLOW_INTAKE: "work-surface-golden-flow-intake",
  GOLDEN_FLOW_ORDER: "work-surface-golden-flow-order",
  GOLDEN_FLOW_INVOICE: "work-surface-golden-flow-invoice",

  // Deployment Rollout Flags (group-level toggles for staged rollout)
  WORK_SURFACE_INTAKE: "WORK_SURFACE_INTAKE", // Controls: DirectIntake, PurchaseOrders
  WORK_SURFACE_ORDERS: "WORK_SURFACE_ORDERS", // Controls: Orders, Quotes, Clients
  WORK_SURFACE_INVENTORY: "WORK_SURFACE_INVENTORY", // Controls: Inventory, PickPack
  WORK_SURFACE_ACCOUNTING: "WORK_SURFACE_ACCOUNTING", // Controls: Invoices, ClientLedger
} as const;

/**
 * Work Surface feature flags object
 */
export interface WorkSurfaceFeatureFlags {
  /** Whether Work Surface UI is enabled globally */
  workSurfaceEnabled: boolean;

  /** Foundation features */
  keyboardContractEnabled: boolean;
  saveStateIndicatorEnabled: boolean;
  inspectorPanelEnabled: boolean;
  validationTimingEnabled: boolean;

  /** Individual Work Surfaces */
  directIntakeEnabled: boolean;
  purchaseOrdersEnabled: boolean;
  clientsEnabled: boolean;
  ordersEnabled: boolean;
  inventoryEnabled: boolean;
  invoicesEnabled: boolean;

  /** Advanced features */
  concurrentEditEnabled: boolean;

  /** Golden flows */
  goldenFlowIntakeEnabled: boolean;
  goldenFlowOrderEnabled: boolean;
  goldenFlowInvoiceEnabled: boolean;
}

/**
 * Return type of useWorkSurfaceFeatureFlags
 */
export interface UseWorkSurfaceFeatureFlagsReturn {
  /** All Work Surface feature flags */
  flags: WorkSurfaceFeatureFlags;

  /** Whether flags are still loading */
  isLoading: boolean;

  /** Error if flags failed to load */
  error: Error | null;

  /** Check if a specific Work Surface is enabled */
  isWorkSurfaceEnabled: (surface: keyof typeof WORK_SURFACE_FLAGS) => boolean;

  /** Check if any Work Surface features are enabled */
  hasAnyWorkSurfaceFeature: boolean;

  /** Check if all foundation features are enabled */
  hasAllFoundationFeatures: boolean;

  /** Refetch flags */
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing Work Surface feature flags
 *
 * @example
 * ```tsx
 * function OrdersPage() {
 *   const { flags, isLoading } = useWorkSurfaceFeatureFlags();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   // Use new Work Surface if enabled, otherwise use legacy page
 *   if (flags.ordersEnabled && flags.workSurfaceEnabled) {
 *     return <OrdersWorkSurface />;
 *   }
 *
 *   return <LegacyOrdersPage />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Check specific surface
 * function IntakePage() {
 *   const { isWorkSurfaceEnabled } = useWorkSurfaceFeatureFlags();
 *
 *   if (isWorkSurfaceEnabled("DIRECT_INTAKE")) {
 *     return <DirectIntakeWorkSurface />;
 *   }
 *
 *   return <LegacyIntakePage />;
 * }
 * ```
 */
export function useWorkSurfaceFeatureFlags(): UseWorkSurfaceFeatureFlagsReturn {
  const {
    flags: _rawFlags,
    isLoading,
    error,
    refetch,
    isEnabled,
  } = useFeatureFlags();

  // Memoize the computed flags
  const flags = useMemo<WorkSurfaceFeatureFlags>(() => {
    // When loading or error, default to disabled for safety
    if (isLoading || error) {
      return {
        workSurfaceEnabled: false,
        keyboardContractEnabled: false,
        saveStateIndicatorEnabled: false,
        inspectorPanelEnabled: false,
        validationTimingEnabled: false,
        directIntakeEnabled: false,
        purchaseOrdersEnabled: false,
        clientsEnabled: false,
        ordersEnabled: false,
        inventoryEnabled: false,
        invoicesEnabled: false,
        concurrentEditEnabled: false,
        goldenFlowIntakeEnabled: false,
        goldenFlowOrderEnabled: false,
        goldenFlowInvoiceEnabled: false,
      };
    }

    // Check if global Work Surface is enabled - default to TRUE for progressive rollout
    const globalEnabled =
      isEnabled(WORK_SURFACE_FLAGS.WORK_SURFACE_ENABLED) ?? true;

    return {
      // Global toggle
      workSurfaceEnabled: globalEnabled,

      // Foundation features - default to enabled when global is enabled
      keyboardContractEnabled:
        globalEnabled &&
        (isEnabled(WORK_SURFACE_FLAGS.KEYBOARD_CONTRACT) ?? true),
      saveStateIndicatorEnabled:
        globalEnabled &&
        (isEnabled(WORK_SURFACE_FLAGS.SAVE_STATE_INDICATOR) ?? true),
      inspectorPanelEnabled:
        globalEnabled &&
        (isEnabled(WORK_SURFACE_FLAGS.INSPECTOR_PANEL) ?? true),
      validationTimingEnabled:
        globalEnabled &&
        (isEnabled(WORK_SURFACE_FLAGS.VALIDATION_TIMING) ?? true),

      // Individual Work Surfaces - must be explicitly enabled
      directIntakeEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.DIRECT_INTAKE),
      purchaseOrdersEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.PURCHASE_ORDERS),
      clientsEnabled: globalEnabled && isEnabled(WORK_SURFACE_FLAGS.CLIENTS),
      ordersEnabled: globalEnabled && isEnabled(WORK_SURFACE_FLAGS.ORDERS),
      inventoryEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.INVENTORY),
      invoicesEnabled: globalEnabled && isEnabled(WORK_SURFACE_FLAGS.INVOICES),

      // Advanced features
      concurrentEditEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.CONCURRENT_EDIT),

      // Golden flows
      goldenFlowIntakeEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.GOLDEN_FLOW_INTAKE),
      goldenFlowOrderEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.GOLDEN_FLOW_ORDER),
      goldenFlowInvoiceEnabled:
        globalEnabled && isEnabled(WORK_SURFACE_FLAGS.GOLDEN_FLOW_INVOICE),
    };
  }, [isLoading, error, isEnabled]);

  // Check if a specific surface is enabled
  const isWorkSurfaceEnabled = useMemo(
    () =>
      (surface: keyof typeof WORK_SURFACE_FLAGS): boolean => {
        if (isLoading || error) return false;
        return isEnabled(WORK_SURFACE_FLAGS[surface]);
      },
    [isLoading, error, isEnabled]
  );

  // Check if any Work Surface feature is enabled
  const hasAnyWorkSurfaceFeature = useMemo(() => {
    return (
      flags.directIntakeEnabled ||
      flags.purchaseOrdersEnabled ||
      flags.clientsEnabled ||
      flags.ordersEnabled ||
      flags.inventoryEnabled ||
      flags.invoicesEnabled
    );
  }, [flags]);

  // Check if all foundation features are enabled
  const hasAllFoundationFeatures = useMemo(() => {
    return (
      flags.keyboardContractEnabled &&
      flags.saveStateIndicatorEnabled &&
      flags.inspectorPanelEnabled &&
      flags.validationTimingEnabled
    );
  }, [flags]);

  return {
    flags,
    isLoading,
    error,
    isWorkSurfaceEnabled,
    hasAnyWorkSurfaceFeature,
    hasAllFoundationFeatures,
    refetch,
  };
}

// NOTE: WorkSurfaceGate component removed in DEPRECATE-UI-010
// All WorkSurface components are now wired directly without feature flag gates

export default useWorkSurfaceFeatureFlags;

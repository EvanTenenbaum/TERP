/**
 * Work Surface Components
 *
 * Re-exports all Work Surface UI components and patterns.
 *
 * @see ATOMIC_UX_STRATEGY.md - UX doctrine
 * @see ATOMIC_ROADMAP.md - Implementation tasks
 */

// Inspector Panel - UXS-103
export {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
  type InspectorPanelProps,
} from "./InspectorPanel";

// Direct Intake Work Surface - UXS-201
export { DirectIntakeWorkSurface } from "./DirectIntakeWorkSurface";

// Purchase Orders Work Surface - UXS-202
export { PurchaseOrdersWorkSurface } from "./PurchaseOrdersWorkSurface";

// Clients Work Surface - UXS-203
export { ClientsWorkSurface } from "./ClientsWorkSurface";

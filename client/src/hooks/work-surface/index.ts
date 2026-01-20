/**
 * Work Surface Hooks - UXS-101, UXS-102, UXS-104
 *
 * This module provides the foundational hooks for implementing
 * Work Surface patterns across TERP modules.
 *
 * @see docs/specs/ui-ux-strategy/ATOMIC_UX_STRATEGY.md
 * @see docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md
 */

export { useWorkSurfaceKeyboard } from "./useWorkSurfaceKeyboard";
export type {
  WorkSurfaceKeyboardOptions,
  FocusState,
  UseWorkSurfaceKeyboardReturn,
} from "./useWorkSurfaceKeyboard";

export { useSaveState } from "./useSaveState";
export type {
  SaveStateStatus,
  SaveState,
  UseSaveStateOptions,
  UseSaveStateReturn,
} from "./useSaveState";

export { useValidationTiming } from "./useValidationTiming";
export type {
  FieldStatus,
  FieldState,
  ValidationState,
  UseValidationTimingOptions,
  UseValidationTimingReturn,
} from "./useValidationTiming";

// UXS-705: Concurrent Edit Detection
export {
  useConcurrentEditDetection,
  useConflictDetection,
  isConflictError,
} from "./useConcurrentEditDetection";
export type {
  ConflictInfo,
  ConflictResolution,
  UseConcurrentEditDetectionOptions,
  UseConcurrentEditDetectionReturn,
  VersionedEntity,
} from "./useConcurrentEditDetection";

// UXS-701: Work Surface Feature Flags
export { useWorkSurfaceFeatureFlags } from "./useWorkSurfaceFeatureFlags";
export type {
  WorkSurfaceFeatureFlags,
  UseWorkSurfaceFeatureFlagsReturn,
} from "./useWorkSurfaceFeatureFlags";

// UXS-701: Responsive Breakpoints
export {
  useBreakpoint,
  useMediaQuery,
  useResponsiveValue,
  useContainerQuery,
  responsiveClass,
  BREAKPOINTS,
  BREAKPOINT_QUERIES,
} from "./useBreakpoint";
export type {
  Breakpoint,
  BreakpointConfig,
  BreakpointState,
} from "./useBreakpoint";

// UXS-707: Undo Infrastructure
export {
  useUndo,
  useUndoContext,
  UndoProvider,
  UndoToast,
} from "./useUndo";
export type {
  UndoAction,
  UndoState,
  UseUndoOptions,
  UseUndoReturn,
  UndoProviderProps,
  UndoToastProps,
} from "./useUndo";

// UXS-802: Performance Monitoring
export {
  usePerformanceMonitor,
  usePerformanceObserver,
  useWebVitals,
} from "./usePerformanceMonitor";
export type {
  PerformanceMark,
  PerformanceBudget,
  PerformanceViolation,
  UsePerformanceMonitorOptions,
  UsePerformanceMonitorReturn,
  WebVitals,
} from "./usePerformanceMonitor";

// UXS-803: Bulk Operation Limits
export {
  useBulkOperationLimits,
  BulkProgress,
} from "./useBulkOperationLimits";
export type {
  BulkOperationLimits,
  BulkOperationState,
  UseBulkOperationLimitsOptions,
  UseBulkOperationLimitsReturn,
  BulkProgressProps,
} from "./useBulkOperationLimits";

// UXS-902: Toast Standardization
export {
  useToastConfig,
  quickToast,
  formToast,
  crudToast,
  bulkToast,
  DEFAULT_TOAST_CONFIG,
  TOAST_POSITION_DESCRIPTIONS,
  TOAST_TYPE_GUIDELINES,
} from "./useToastConfig";
export type {
  ToastDurations,
  ToastConfig,
  UseToastConfigReturn,
} from "./useToastConfig";

// UXS-903: Print Stylesheet
export { usePrint } from "./usePrint";
export type {
  PrintOptions,
  UsePrintReturn,
  PrintButtonProps,
} from "./usePrint";

// UXS-904: Export Functionality
export {
  useExport,
  DEFAULT_EXPORT_LIMITS,
} from "./useExport";
export type {
  ExportColumn,
  ExportLimits,
  ExportOptions,
  ExportState,
  UseExportReturn,
  ExportProgressProps,
} from "./useExport";

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

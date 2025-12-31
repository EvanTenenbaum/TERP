/**
 * Feature Flag Hooks
 * 
 * Re-exports feature flag hooks from the context for convenience.
 * 
 * Usage:
 * ```tsx
 * import { useFeatureFlag, useModuleEnabled } from "@/hooks/useFeatureFlag";
 * 
 * function MyComponent() {
 *   const { enabled, isLoading } = useFeatureFlag("credit-management");
 *   const { enabled: accountingEnabled } = useModuleEnabled("module-accounting");
 *   
 *   if (isLoading) return <Spinner />;
 *   if (!enabled) return <FeatureDisabled feature="Credit Management" />;
 *   
 *   return <CreditUI />;
 * }
 * ```
 */

export {
  useFeatureFlags,
  useFeatureFlag,
  useModuleEnabled,
} from "../contexts/FeatureFlagContext";

/**
 * Feature Flag Component
 * 
 * Conditionally renders children based on feature flag status.
 * Provides a declarative way to gate features in the UI.
 */

import React from "react";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import { Loader2 } from "lucide-react";

interface FeatureFlagProps {
  /** The feature flag key to check */
  flag: string;
  /** Content to render when the flag is enabled */
  children: React.ReactNode;
  /** Content to render when the flag is disabled (optional) */
  fallback?: React.ReactNode;
  /** Content to render while loading (optional) */
  loading?: React.ReactNode;
  /** Whether to show loading state (default: true) */
  showLoading?: boolean;
}

/**
 * Conditionally render content based on a feature flag
 * 
 * @example
 * ```tsx
 * <FeatureFlag flag="credit-management">
 *   <CreditManagementUI />
 * </FeatureFlag>
 * 
 * <FeatureFlag 
 *   flag="beta-feature" 
 *   fallback={<ComingSoon />}
 * >
 *   <BetaFeatureUI />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
  loading,
  showLoading = true,
}: FeatureFlagProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading && showLoading) {
    return loading ?? (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ModuleGateProps {
  /** The module flag key (e.g., "module-accounting") */
  module: string;
  /** Content to render when the module is enabled */
  children: React.ReactNode;
  /** Content to render when the module is disabled (optional) */
  fallback?: React.ReactNode;
}

/**
 * Gate content behind a module flag
 * 
 * @example
 * ```tsx
 * <ModuleGate module="module-accounting">
 *   <AccountingDashboard />
 * </ModuleGate>
 * ```
 */
export function ModuleGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <FeatureFlag flag={module} fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}

interface RequireFeatureProps {
  /** The feature flag key to check */
  flag: string;
  /** Content to render when the flag is enabled */
  children: React.ReactNode;
  /** Feature name for the error message */
  featureName?: string;
}

/**
 * Require a feature flag, showing an error message if disabled
 * 
 * @example
 * ```tsx
 * <RequireFeature flag="credit-management" featureName="Credit Management">
 *   <CreditManagementUI />
 * </RequireFeature>
 * ```
 */
export function RequireFeature({
  flag,
  children,
  featureName,
}: RequireFeatureProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Feature Not Available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground/80">
            {featureName || flag} is not enabled for your account.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Contact your administrator to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

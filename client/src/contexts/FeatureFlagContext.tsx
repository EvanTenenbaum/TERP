/**
 * Feature Flag Context
 * 
 * Provides feature flag state to the entire application.
 * Loads all effective flags for the current user on mount and caches them.
 * 
 * Usage:
 * ```tsx
 * // In a component
 * const { isEnabled, isLoading } = useFeatureFlags();
 * 
 * if (isLoading) return <Spinner />;
 * if (!isEnabled("credit-management")) return <FeatureDisabled />;
 * 
 * return <CreditManagementUI />;
 * ```
 */

import React, { createContext, useContext, useMemo } from "react";
import { trpc } from "../lib/trpc";

/**
 * Feature flag context value
 */
interface FeatureFlagContextValue {
  /** Map of flag keys to enabled status */
  flags: Record<string, boolean>;
  /** Whether flags are still loading */
  isLoading: boolean;
  /** Error if flags failed to load */
  error: Error | null;
  /** Check if a specific flag is enabled */
  isEnabled: (key: string) => boolean;
  /** Check if a module is enabled */
  isModuleEnabled: (module: string) => boolean;
  /** Refetch flags (useful after admin changes) */
  refetch: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

/**
 * Feature Flag Provider
 * 
 * Wrap your app with this provider to enable feature flag access.
 * Should be placed inside QueryClientProvider and trpc.Provider.
 */
export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  // Fetch all effective flags for the current user
  const {
    data: flags = {},
    isLoading,
    error,
    refetch,
  } = trpc.featureFlags.getEffectiveFlags.useQuery(undefined, {
    // Cache for 1 minute, refetch on window focus
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    // Don't retry on error (user might not be authenticated)
    retry: false,
  });

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<FeatureFlagContextValue>(() => ({
    flags,
    isLoading,
    error: error as Error | null,
    isEnabled: (key: string) => flags[key] ?? false,
    isModuleEnabled: (module: string) => flags[module] ?? false,
    refetch: () => refetch(),
  }), [flags, isLoading, error, refetch]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to access feature flags
 * 
 * @returns Feature flag context value
 * @throws Error if used outside FeatureFlagProvider
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagProvider");
  }
  return context;
}

/**
 * Hook to check if a specific flag is enabled
 * 
 * @param key - The flag key to check
 * @returns Object with enabled status and loading state
 * 
 * @example
 * ```tsx
 * const { enabled, isLoading } = useFeatureFlag("credit-management");
 * ```
 */
export function useFeatureFlag(key: string): {
  enabled: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { flags, isLoading, error } = useFeatureFlags();
  return {
    enabled: flags[key] ?? false,
    isLoading,
    error,
  };
}

/**
 * Hook to check if a module is enabled
 * 
 * @param module - The module flag key (e.g., "module-accounting")
 * @returns Object with enabled status and loading state
 */
export function useModuleEnabled(module: string): {
  enabled: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  return useFeatureFlag(module);
}

/**
 * Safely check if a feature flag is enabled without requiring
 * {@link FeatureFlagProvider} to be present in the React tree.
 *
 * Unlike {@link useFeatureFlag}, this hook returns `false` (disabled) when
 * there is no {@link FeatureFlagContext} above the caller. This is useful
 * for low-level/shared components that can be rendered both inside the
 * authenticated app shell (where the provider is mounted) and inside
 * isolated unit-test harnesses (where it typically is not).
 *
 * @param key - The feature flag key to check
 * @returns `true` when the flag is enabled, `false` otherwise
 */
export function useOptionalFeatureFlag(key: string): boolean {
  const context = useContext(FeatureFlagContext);
  return context?.flags[key] ?? false;
}

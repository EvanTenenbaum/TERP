import { trpc } from "@/lib/trpc";

interface CreditVisibilitySettings {
  showCreditInClientList: boolean;
  showCreditBannerInOrders: boolean;
  showCreditWidgetInProfile: boolean;
  showSignalBreakdown: boolean;
  showAuditLog: boolean;
  creditEnforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
  warningThresholdPercent: number;
  alertThresholdPercent: number;
}

const DEFAULT_SETTINGS: CreditVisibilitySettings = {
  showCreditInClientList: true,
  showCreditBannerInOrders: true,
  showCreditWidgetInProfile: true,
  showSignalBreakdown: true,
  showAuditLog: true,
  creditEnforcementMode: "WARNING",
  warningThresholdPercent: 75,
  alertThresholdPercent: 90,
};

interface UseCreditVisibilityOptions {
  locationId?: number;
  enabled?: boolean;
}

interface UseCreditVisibilityReturn {
  settings: CreditVisibilitySettings;
  isLoading: boolean;
  error: Error | null;
  // Convenience methods
  shouldShowCreditInClientList: boolean;
  shouldShowCreditBannerInOrders: boolean;
  shouldShowCreditWidgetInProfile: boolean;
  shouldShowSignalBreakdown: boolean;
  shouldShowAuditLog: boolean;
  enforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
  warningThreshold: number;
  alertThreshold: number;
  // Utility functions
  isOverWarningThreshold: (utilizationPercent: number) => boolean;
  isOverAlertThreshold: (utilizationPercent: number) => boolean;
  getUtilizationStatus: (utilizationPercent: number) => "normal" | "warning" | "alert" | "over";
}

/**
 * Hook to access credit visibility settings.
 * 
 * Usage:
 * ```tsx
 * const { shouldShowCreditInClientList, enforcementMode } = useCreditVisibility();
 * 
 * // With location override
 * const { settings } = useCreditVisibility({ locationId: 123 });
 * ```
 */
export function useCreditVisibility(
  options: UseCreditVisibilityOptions = {}
): UseCreditVisibilityReturn {
  const { locationId, enabled = true } = options;

  const { data, isLoading, error } = trpc.credit.getVisibilitySettings.useQuery(
    { locationId },
    { enabled }
  );

  // Merge with defaults
  const settings: CreditVisibilitySettings = {
    ...DEFAULT_SETTINGS,
    ...(data || {}),
  };

  // Utility functions
  const isOverWarningThreshold = (utilizationPercent: number): boolean => {
    return utilizationPercent >= settings.warningThresholdPercent;
  };

  const isOverAlertThreshold = (utilizationPercent: number): boolean => {
    return utilizationPercent >= settings.alertThresholdPercent;
  };

  const getUtilizationStatus = (utilizationPercent: number): "normal" | "warning" | "alert" | "over" => {
    if (utilizationPercent >= 100) return "over";
    if (utilizationPercent >= settings.alertThresholdPercent) return "alert";
    if (utilizationPercent >= settings.warningThresholdPercent) return "warning";
    return "normal";
  };

  return {
    settings,
    isLoading,
    error: error as Error | null,
    // Convenience accessors
    shouldShowCreditInClientList: settings.showCreditInClientList,
    shouldShowCreditBannerInOrders: settings.showCreditBannerInOrders,
    shouldShowCreditWidgetInProfile: settings.showCreditWidgetInProfile,
    shouldShowSignalBreakdown: settings.showSignalBreakdown,
    shouldShowAuditLog: settings.showAuditLog,
    enforcementMode: settings.creditEnforcementMode,
    warningThreshold: settings.warningThresholdPercent,
    alertThreshold: settings.alertThresholdPercent,
    // Utility functions
    isOverWarningThreshold,
    isOverAlertThreshold,
    getUtilizationStatus,
  };
}

/**
 * Hook to check if a specific credit UI element should be visible.
 * Simpler alternative when you only need one visibility check.
 * 
 * Usage:
 * ```tsx
 * const showCredit = useCreditVisibilityCheck("clientList");
 * if (!showCredit) return null;
 * ```
 */
export function useCreditVisibilityCheck(
  element: "clientList" | "orderBanner" | "profileWidget" | "signalBreakdown" | "auditLog",
  options: UseCreditVisibilityOptions = {}
): boolean {
  const { settings, isLoading } = useCreditVisibility(options);
  
  // Default to showing while loading to prevent flash
  if (isLoading) return true;

  switch (element) {
    case "clientList":
      return settings.showCreditInClientList;
    case "orderBanner":
      return settings.showCreditBannerInOrders;
    case "profileWidget":
      return settings.showCreditWidgetInProfile;
    case "signalBreakdown":
      return settings.showSignalBreakdown;
    case "auditLog":
      return settings.showAuditLog;
    default:
      return true;
  }
}

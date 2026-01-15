import { useState } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandling";

export default function VIPPortalConfigPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [, _setLocation] = useLocation();
  const [expandedModules, setExpandedModules] = useState<string[]>([
    "dashboard",
  ]);

  const { data: client } = trpc.clients.getById.useQuery(
    { clientId: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  const { data: config, refetch } = trpc.vipPortalAdmin.config.get.useQuery(
    { clientId: parseInt(clientId || "0") },
    { enabled: !!clientId }
  );

  // BUG-097 FIX: Use standardized error handling
  const updateConfigMutation = trpc.vipPortalAdmin.config.update.useMutation({
    onSuccess: () => {
      toast.success("Configuration updated successfully");
      refetch();
    },
    onError: (error) => {
      showErrorToast(error, { action: "update", resource: "configuration" });
    },
  });

  const applyTemplateMutation =
    trpc.vipPortalAdmin.config.applyTemplate.useMutation({
      onSuccess: () => {
        toast.success("Template applied successfully");
        refetch();
      },
      onError: (error) => {
        showErrorToast(error, { action: "apply", resource: "template" });
      },
    });

  const toggleModule = (module: string) => {
    if (expandedModules.includes(module)) {
      setExpandedModules(expandedModules.filter(m => m !== module));
    } else {
      setExpandedModules([...expandedModules, module]);
    }
  };

  const handleModuleToggle = (field: string, value: boolean) => {
    updateConfigMutation.mutate({
      clientId: parseInt(clientId || "0"),
      [field]: value,
    });
  };

  const handleFeatureToggle = (
    module: string,
    feature: string,
    value: boolean
  ) => {
    const currentFeatures = config?.featuresConfig || {};
    const moduleFeatures =
      ((currentFeatures as Record<string, unknown>)[module] as Record<
        string,
        unknown
      >) || {};

    updateConfigMutation.mutate({
      clientId: parseInt(clientId || "0"),
      featuresConfig: {
        ...currentFeatures,
        [module]: {
          ...moduleFeatures,
          [feature]: value,
        },
      },
    });
  };

  const handleApplyTemplate = (template: string) => {
    applyTemplateMutation.mutate({
      clientId: parseInt(clientId || "0"),
      template: template as "FULL_ACCESS" | "FINANCIAL_ONLY" | "MARKETPLACE_ONLY" | "BASIC",
    });
  };

  const handleLeaderboardTypeChange = (value: string) => {
    updateConfigMutation.mutate({
      clientId: parseInt(clientId || "0"),
      leaderboardType: value,
    } as { clientId: number; leaderboardType: string });
  };

  const handleLeaderboardDisplayModeChange = (value: string) => {
    updateConfigMutation.mutate({
      clientId: parseInt(clientId || "0"),
      leaderboardDisplayMode: value,
    } as { clientId: number; leaderboardDisplayMode: string });
  };

  if (!config || !client) {
    return <div className="p-6">Loading...</div>;
  }

  const modules = [
    {
      id: "dashboard",
      title: "Dashboard",
      field: "moduleDashboardEnabled",
      enabled: config.moduleDashboardEnabled,
      features: [
        { id: "showGreeting", label: "Show Personalized Greeting" },
        { id: "showCurrentBalance", label: "Show Current Balance KPI" },
        { id: "showYtdSpend", label: "Show YTD Spend KPI" },
        { id: "showQuickLinks", label: "Show Quick Access Links" },
      ],
    },
    {
      id: "ar",
      title: "Accounts Receivable",
      field: "moduleArEnabled",
      enabled: config.moduleArEnabled,
      features: [
        { id: "showSummaryTotals", label: "Show AR Summary Totals" },
        { id: "showInvoiceDetails", label: "Show Invoice Details Table" },
        { id: "allowPdfDownloads", label: "Allow PDF Downloads" },
        { id: "highlightOverdue", label: "Highlight Overdue Items" },
      ],
    },
    {
      id: "ap",
      title: "Accounts Payable",
      field: "moduleApEnabled",
      enabled: config.moduleApEnabled,
      features: [
        { id: "showSummaryTotals", label: "Show AP Summary Totals" },
        { id: "showBillDetails", label: "Show Bill Details Table" },
        { id: "allowPdfDownloads", label: "Allow PDF Downloads" },
        { id: "highlightOverdue", label: "Highlight Overdue Items" },
      ],
    },
    {
      id: "transactionHistory",
      title: "Transaction History",
      field: "moduleTransactionHistoryEnabled",
      enabled: config.moduleTransactionHistoryEnabled,
      features: [
        { id: "showAllTypes", label: "Show All Transaction Types" },
        { id: "allowDateFilter", label: "Allow Date Range Filtering" },
        { id: "allowTypeFilter", label: "Allow Transaction Type Filtering" },
        { id: "allowStatusFilter", label: "Allow Status Filtering" },
        { id: "showDetails", label: "Show Transaction Details View" },
        { id: "allowPdfDownloads", label: "Allow PDF Downloads" },
      ],
    },
    {
      id: "vipTier",
      title: "VIP Tier System",
      field: "moduleVipTierEnabled",
      enabled: config.moduleVipTierEnabled,
      features: [
        { id: "showBadge", label: "Show Current Tier Badge" },
        { id: "showRequirements", label: "Show Tier Requirements" },
        { id: "showRewards", label: "Show Tier Rewards" },
        { id: "showProgress", label: "Show Progress to Next Tier" },
        { id: "showRecommendations", label: "Show Tier Recommendations" },
      ],
    },
    {
      id: "creditCenter",
      title: "Credit Center",
      field: "moduleCreditCenterEnabled",
      enabled: config.moduleCreditCenterEnabled,
      features: [
        { id: "showCreditLimit", label: "Show Credit Limit" },
        { id: "showCreditUsage", label: "Show Credit Usage" },
        { id: "showAvailableCredit", label: "Show Available Credit" },
        {
          id: "showUtilizationVisual",
          label: "Show Credit Utilization Visual",
        },
        { id: "showHistory", label: "Show Credit History Timeline" },
        {
          id: "showRecommendations",
          label: "Show Credit Improvement Recommendations",
        },
      ],
    },
    {
      id: "marketplaceSupply",
      title: "Marketplace - Supply",
      field: "moduleMarketplaceSupplyEnabled",
      enabled: config.moduleMarketplaceSupplyEnabled,
      features: [
        { id: "allowCreate", label: "Allow Creating Supply Listings" },
        { id: "allowEdit", label: "Allow Editing Supply" },
        { id: "allowCancel", label: "Allow Canceling Supply" },
        { id: "showTemplates", label: "Show Saved Templates" },
        { id: "allowNewStrain", label: "Allow New Strain Entry" },
        { id: "showTags", label: "Show Tag Selection" },
      ],
    },
    {
      id: "liveCatalog",
      title: "Live Catalog",
      field: "moduleLiveCatalogEnabled",
      enabled: config.moduleLiveCatalogEnabled || false,
      features: [
        { id: "showQuantity", label: "Show Quantity Available" },
        { id: "showBrand", label: "Show Brand Information" },
        { id: "showGrade", label: "Show Grade" },
        { id: "showDate", label: "Show Package Date" },
        { id: "showBasePrice", label: "Show Base Price" },
        { id: "showMarkup", label: "Show Markup Percentage" },
        { id: "enablePriceAlerts", label: "Enable Price Alerts" },
      ],
    },
    {
      id: "leaderboard",
      title: "Leaderboard",
      field: "moduleLeaderboardEnabled",
      enabled: (config.featuresConfig as { leaderboard?: { enabled?: boolean } } | null)?.leaderboard?.enabled || false,
      features: [
        { id: "showSuggestions", label: "Show Improvement Suggestions" },
        { id: "showRankings", label: "Show Full Rankings List" },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton size="icon" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              VIP Portal Configuration
            </h1>
            <p className="text-muted-foreground mt-1">
              {client.name} ({client.teriCode})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview Portal
          </Button>
          <Select onValueChange={handleApplyTemplate}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Apply Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_ACCESS">Full Access</SelectItem>
              <SelectItem value="FINANCIAL_ONLY">Financial Only</SelectItem>
              <SelectItem value="MARKETPLACE_ONLY">Marketplace Only</SelectItem>
              <SelectItem value="BASIC">Basic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Configuration</CardTitle>
          <CardDescription>
            Enable or disable modules and features for this client's VIP portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modules.map(module => (
            <div key={module.id} className="border rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModule(module.id)}
                    className="h-8 w-8 p-0"
                  >
                    {expandedModules.includes(module.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <Label
                    className="text-base font-medium cursor-pointer"
                    onClick={() => toggleModule(module.id)}
                  >
                    {module.title}
                  </Label>
                </div>
                <Switch
                  checked={module.enabled}
                  onCheckedChange={checked =>
                    handleModuleToggle(module.field, checked)
                  }
                />
              </div>

              {expandedModules.includes(module.id) && module.enabled && (
                <div className="border-t p-4 space-y-3 bg-muted/30">
                  {/* Leaderboard-specific controls */}
                  {module.id === "leaderboard" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Leaderboard Type
                        </Label>
                        <Select
                          value={(config.featuresConfig as { leaderboard?: { type?: string } } | null)?.leaderboard?.type || "ytd_spend"}
                          onValueChange={value =>
                            handleLeaderboardTypeChange(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ytd_spend">YTD Spend</SelectItem>
                            <SelectItem value="payment_speed">
                              Payment Speed
                            </SelectItem>
                            <SelectItem value="order_frequency">
                              Order Frequency
                            </SelectItem>
                            <SelectItem value="credit_utilization">
                              Credit Utilization
                            </SelectItem>
                            <SelectItem value="ontime_payment_rate">
                              On-Time Payment Rate
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Display Mode
                        </Label>
                        <Select
                          value={(config.featuresConfig as { leaderboard?: { displayMode?: string } } | null)?.leaderboard?.displayMode || "blackbox"}
                          onValueChange={value =>
                            handleLeaderboardDisplayModeChange(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blackbox">
                              Black Box (Ranks Only)
                            </SelectItem>
                            <SelectItem value="transparent">
                              Transparent (Ranks + Values)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="border-t pt-3 mt-3" />
                    </>
                  )}

                  {/* Feature toggles */}
                  {module.features.map(feature => {
                    const featureValue =
                      (
                        config.featuresConfig as Record<
                          string,
                          Record<string, boolean>
                        >
                      )?.[module.id]?.[feature.id] ?? true;
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between"
                      >
                        <Label className="text-sm font-normal cursor-pointer">
                          {feature.label}
                        </Label>
                        <Switch
                          checked={featureValue}
                          onCheckedChange={checked =>
                            handleFeatureToggle(module.id, feature.id, checked)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={() => toast.success("Changes are auto-saved")}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}

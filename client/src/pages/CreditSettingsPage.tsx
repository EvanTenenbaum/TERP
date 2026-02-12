/**
 * CreditSettingsPage - Unified credit settings with tabs for:
 * 1. Signal Weights - Configure how credit limits are calculated
 * 2. Visibility & Enforcement - Control UI visibility and enforcement behavior
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AlertCircle, Check, Info, RotateCcw, Save, Eye, Shield, Sliders } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { FormSkeleton } from "@/components/ui/skeleton-loaders";
import { toast } from "sonner";
import { useBeforeUnloadWarning } from "@/hooks/useUnsavedChangesWarning";

type EnforcementMode = "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";

interface VisibilitySettings {
  showCreditInClientList: boolean;
  showCreditBannerInOrders: boolean;
  showCreditWidgetInProfile: boolean;
  showSignalBreakdown: boolean;
  showAuditLog: boolean;
  creditEnforcementMode: EnforcementMode;
  warningThresholdPercent: number;
  alertThresholdPercent: number;
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  showCreditInClientList: true,
  showCreditBannerInOrders: true,
  showCreditWidgetInProfile: true,
  showSignalBreakdown: true,
  showAuditLog: true,
  creditEnforcementMode: "WARNING",
  warningThresholdPercent: 75,
  alertThresholdPercent: 90,
};

export default function CreditSettingsPage() {
  // Signal weights state
  const [weights, setWeights] = useState({
    revenueMomentumWeight: 20,
    cashCollectionWeight: 25,
    profitabilityWeight: 20,
    debtAgingWeight: 15,
    repaymentVelocityWeight: 10,
    tenureWeight: 10,
  });
  const [hasWeightChanges, setHasWeightChanges] = useState(false);

  // Visibility settings state
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [hasVisibilityChanges, setHasVisibilityChanges] = useState(false);

  // UX-001: Warn before leaving with unsaved changes
  useBeforeUnloadWarning(hasWeightChanges || hasVisibilityChanges);

  // Fetch current weight settings
  const { data: settings, isLoading: weightsLoading, refetch: refetchWeights } = trpc.credit.getSettings.useQuery();

  // Fetch visibility settings
  const { data: visibilityData, isLoading: visibilityLoading, refetch: refetchVisibility } = 
    trpc.credit.getVisibilitySettings.useQuery({});

  // Update weight settings mutation
  const updateWeightsMutation = trpc.credit.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Signal weights saved successfully!");
      setHasWeightChanges(false);
      refetchWeights();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message || "Failed to save settings"}`);
    },
  });

  // Update visibility settings mutation
  const updateVisibilityMutation = trpc.credit.updateVisibilitySettings.useMutation({
    onSuccess: () => {
      toast.success("Visibility settings saved successfully!");
      setHasVisibilityChanges(false);
      refetchVisibility();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message || "Failed to save settings"}`);
    },
  });

  // Initialize weights from settings
  useEffect(() => {
    if (settings) {
      setWeights({
        revenueMomentumWeight: settings.revenueMomentumWeight,
        cashCollectionWeight: settings.cashCollectionWeight,
        profitabilityWeight: settings.profitabilityWeight,
        debtAgingWeight: settings.debtAgingWeight,
        repaymentVelocityWeight: settings.repaymentVelocityWeight,
        tenureWeight: settings.tenureWeight,
      });
    }
  }, [settings]);

  // Initialize visibility from settings
  useEffect(() => {
    if (visibilityData) {
      setVisibility({
        showCreditInClientList: visibilityData.showCreditInClientList ?? true,
        showCreditBannerInOrders: visibilityData.showCreditBannerInOrders ?? true,
        showCreditWidgetInProfile: visibilityData.showCreditWidgetInProfile ?? true,
        showSignalBreakdown: visibilityData.showSignalBreakdown ?? true,
        showAuditLog: visibilityData.showAuditLog ?? true,
        creditEnforcementMode: (visibilityData.creditEnforcementMode as EnforcementMode) ?? "WARNING",
        warningThresholdPercent: visibilityData.warningThresholdPercent ?? 75,
        alertThresholdPercent: visibilityData.alertThresholdPercent ?? 90,
      });
    }
  }, [visibilityData]);

  // Weight handlers
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setHasWeightChanges(true);
  };

  const handleSaveWeights = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      toast.error("Signal weights must sum to exactly 100%");
      return;
    }
    await updateWeightsMutation.mutateAsync(weights);
  };

  const handleResetWeights = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (settings) {
      setWeights({
        revenueMomentumWeight: settings.revenueMomentumWeight,
        cashCollectionWeight: settings.cashCollectionWeight,
        profitabilityWeight: settings.profitabilityWeight,
        debtAgingWeight: settings.debtAgingWeight,
        repaymentVelocityWeight: settings.repaymentVelocityWeight,
        tenureWeight: settings.tenureWeight,
      });
      setHasWeightChanges(false);
    }
  };

  const handleResetWeightsToDefaults = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWeights({
      revenueMomentumWeight: 20,
      cashCollectionWeight: 25,
      profitabilityWeight: 20,
      debtAgingWeight: 15,
      repaymentVelocityWeight: 10,
      tenureWeight: 10,
    });
    setHasWeightChanges(true);
  };

  // Visibility handlers
  const updateVisibilitySetting = <K extends keyof VisibilitySettings>(
    key: K,
    value: VisibilitySettings[K]
  ) => {
    setVisibility((prev) => ({ ...prev, [key]: value }));
    setHasVisibilityChanges(true);
  };

  const handleSaveVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (visibility.warningThresholdPercent >= visibility.alertThresholdPercent) {
      toast.error("Warning threshold must be less than alert threshold");
      return;
    }
    updateVisibilityMutation.mutate({ settings: visibility });
  };

  const handleResetVisibilityToDefaults = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVisibility(DEFAULT_VISIBILITY);
    setHasVisibilityChanges(true);
    toast.info("Settings reset to defaults. Click Save to apply.");
  };

  if (weightsLoading || visibilityLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <BackButton label="Back to Dashboard" to="/" className="mb-4" />
        <FormSkeleton fields={6} />
      </div>
    );
  }

  const weightsSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsSum - 100) < 0.01;

  const signals = [
    { name: "Revenue Momentum", key: "revenueMomentumWeight" as const, value: weights.revenueMomentumWeight, description: "Growth rate of recent vs historical revenue.", impact: "Rewards clients with increasing order volumes." },
    { name: "Cash Collection Strength", key: "cashCollectionWeight" as const, value: weights.cashCollectionWeight, description: "Speed and reliability of payment collection.", impact: "Rewards clients who pay invoices quickly." },
    { name: "Profitability Quality", key: "profitabilityWeight" as const, value: weights.profitabilityWeight, description: "Profit margin quality and stability.", impact: "Rewards clients with strong margins." },
    { name: "Debt Aging Risk", key: "debtAgingWeight" as const, value: weights.debtAgingWeight, description: "Age and management of outstanding debt.", impact: "Penalizes clients with old, unpaid invoices." },
    { name: "Repayment Velocity", key: "repaymentVelocityWeight" as const, value: weights.repaymentVelocityWeight, description: "Rate of debt repayment vs new charges.", impact: "Rewards clients actively paying down balance." },
    { name: "Tenure & Relationship", key: "tenureWeight" as const, value: weights.tenureWeight, description: "Length and depth of business relationship.", impact: "Rewards long-term clients." },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-4xl">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Credit Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure credit calculation weights and visibility settings
        </p>
      </div>

      <Tabs defaultValue="weights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weights" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Signal Weights
          </TabsTrigger>
          <TabsTrigger value="visibility" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visibility & Enforcement
          </TabsTrigger>
        </TabsList>

        {/* Signal Weights Tab */}
        <TabsContent value="weights" className="space-y-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">How Credit Weights Work</p>
                  <p className="text-blue-800 dark:text-blue-200 mt-1">
                    Each signal is scored 0-100. The score is multiplied by its weight to calculate contribution to the credit health score. All weights must sum to 100%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signal Weights</CardTitle>
              <CardDescription>Adjust the importance of each financial signal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {signals.map((signal) => (
                <div key={signal.key} className="space-y-3 pb-6 border-b last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base">{signal.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{signal.description}</div>
                    </div>
                    <div className="text-2xl font-bold shrink-0">{signal.value}%</div>
                  </div>
                  <Slider value={[signal.value]} onValueChange={(v) => handleWeightChange(signal.key, v[0])} max={100} step={1} />
                  <div className="text-xs text-muted-foreground"><span className="font-medium">Impact:</span> {signal.impact}</div>
                </div>
              ))}

              <div className={`flex items-center justify-between p-4 rounded-lg ${weightsValid ? "bg-green-50 dark:bg-green-950 border border-green-200" : "bg-red-50 dark:bg-red-950 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {weightsValid ? <Check className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
                  <span className="font-medium">Total Weight</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${weightsValid ? "text-green-600" : "text-red-600"}`}>{weightsSum.toFixed(0)}%</span>
                  {weightsValid ? <Badge className="bg-green-600">Valid</Badge> : <Badge variant="destructive">Must equal 100%</Badge>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button onClick={handleSaveWeights} disabled={!weightsValid || !hasWeightChanges || updateWeightsMutation.isPending} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />{updateWeightsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button onClick={handleResetWeights} disabled={!hasWeightChanges} variant="outline"><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
                <Button onClick={handleResetWeightsToDefaults} variant="outline">Reset to Defaults</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visibility & Enforcement Tab */}
        <TabsContent value="visibility" className="space-y-6">
          {hasVisibilityChanges && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">You have unsaved changes</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Visibility Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <CardTitle>Visibility Settings</CardTitle>
                </div>
                <CardDescription>Control which credit information is displayed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label>Credit in Client List</Label><p className="text-xs text-muted-foreground">Show credit indicator in clients table</p></div>
                  <Switch checked={visibility.showCreditInClientList} onCheckedChange={(c) => updateVisibilitySetting("showCreditInClientList", c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label>Credit Banner in Orders</Label><p className="text-xs text-muted-foreground">Show credit status when creating orders</p></div>
                  <Switch checked={visibility.showCreditBannerInOrders} onCheckedChange={(c) => updateVisibilitySetting("showCreditBannerInOrders", c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label>Credit Widget in Profile</Label><p className="text-xs text-muted-foreground">Show credit card on client profiles</p></div>
                  <Switch checked={visibility.showCreditWidgetInProfile} onCheckedChange={(c) => updateVisibilitySetting("showCreditWidgetInProfile", c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label>Signal Breakdown</Label><p className="text-xs text-muted-foreground">Show calculation details</p></div>
                  <Switch checked={visibility.showSignalBreakdown} onCheckedChange={(c) => updateVisibilitySetting("showSignalBreakdown", c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label>Audit Log</Label><p className="text-xs text-muted-foreground">Show credit change history</p></div>
                  <Switch checked={visibility.showAuditLog} onCheckedChange={(c) => updateVisibilitySetting("showAuditLog", c)} />
                </div>
              </CardContent>
            </Card>

            {/* Enforcement Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Enforcement Settings</CardTitle>
                </div>
                <CardDescription>Configure credit limit enforcement during orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Enforcement Mode</Label>
                  <Select value={visibility.creditEnforcementMode} onValueChange={(v: EnforcementMode) => updateVisibilitySetting("creditEnforcementMode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WARNING"><div className="flex items-center gap-2"><Badge variant="outline" className="bg-yellow-50 text-yellow-700">Warning</Badge>Show warning, allow order</div></SelectItem>
                      <SelectItem value="SOFT_BLOCK"><div className="flex items-center gap-2"><Badge variant="outline" className="bg-orange-50 text-orange-700">Soft Block</Badge>Require override reason</div></SelectItem>
                      <SelectItem value="HARD_BLOCK"><div className="flex items-center gap-2"><Badge variant="outline" className="bg-red-50 text-red-700">Hard Block</Badge>Block order completely</div></SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {visibility.creditEnforcementMode === "WARNING" && "Orders exceeding credit show warning but can proceed."}
                    {visibility.creditEnforcementMode === "SOFT_BLOCK" && "Orders exceeding credit require a reason to proceed."}
                    {visibility.creditEnforcementMode === "HARD_BLOCK" && "Orders exceeding credit are blocked completely."}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Utilization Thresholds</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" />Warning</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={99} value={visibility.warningThresholdPercent} onChange={(e) => updateVisibilitySetting("warningThresholdPercent", parseInt(e.target.value) || 0)} className="w-20 text-right" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" />Alert</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} max={100} value={visibility.alertThresholdPercent} onChange={(e) => updateVisibilitySetting("alertThresholdPercent", parseInt(e.target.value) || 0)} className="w-20 text-right" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threshold Preview */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Threshold Preview</p>
                  <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-green-500" style={{ width: `${visibility.warningThresholdPercent}%` }} />
                    <div className="absolute top-0 h-full bg-yellow-500" style={{ left: `${visibility.warningThresholdPercent}%`, width: `${visibility.alertThresholdPercent - visibility.warningThresholdPercent}%` }} />
                    <div className="absolute top-0 h-full bg-red-500" style={{ left: `${visibility.alertThresholdPercent}%`, width: `${100 - visibility.alertThresholdPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span><span>{visibility.warningThresholdPercent}%</span><span>{visibility.alertThresholdPercent}%</span><span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleResetVisibilityToDefaults} disabled={updateVisibilityMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />Reset to Defaults
            </Button>
            <Button onClick={handleSaveVisibility} disabled={!hasVisibilityChanges || updateVisibilityMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />{updateVisibilityMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

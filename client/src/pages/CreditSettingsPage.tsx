import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Info, RotateCcw, Save } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";


export default function CreditSettingsPage() {

  const [weights, setWeights] = useState({
    revenueMomentumWeight: 20,
    cashCollectionWeight: 25,
    profitabilityWeight: 20,
    debtAgingWeight: 15,
    repaymentVelocityWeight: 10,
    tenureWeight: 10,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading, refetch } = trpc.credit.getSettings.useQuery();

  // Update settings mutation
  const updateSettingsMutation = trpc.credit.updateSettings.useMutation({
    onSuccess: () => {
      alert("Settings saved successfully!");
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message || "Failed to save settings"}`);
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

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Validate weights sum to 100
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      alert("Invalid Weights: Signal weights must sum to exactly 100%");
      return;
    }

    await updateSettingsMutation.mutateAsync(weights);
  };

  const handleReset = (e: React.MouseEvent) => {
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
      setHasChanges(false);
    }
  };

  const handleResetToDefaults = (e: React.MouseEvent) => {
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
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
        <div className="text-center">Loading credit settings...</div>
      </div>
    );
  }

  const weightsSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsSum - 100) < 0.01;

  const signals = [
    {
      name: "Revenue Momentum",
      key: "revenueMomentumWeight" as keyof typeof weights,
      value: weights.revenueMomentumWeight,
      description: "Growth rate of recent vs historical revenue. Higher weight prioritizes growing clients.",
      impact: "Rewards clients with increasing order volumes and revenue trends.",
    },
    {
      name: "Cash Collection Strength",
      key: "cashCollectionWeight" as keyof typeof weights,
      value: weights.cashCollectionWeight,
      description: "Speed and reliability of payment collection. Higher weight favors fast payers.",
      impact: "Rewards clients who pay invoices quickly and consistently.",
    },
    {
      name: "Profitability Quality",
      key: "profitabilityWeight" as keyof typeof weights,
      value: weights.profitabilityWeight,
      description: "Profit margin quality and stability. Higher weight favors high-margin clients.",
      impact: "Rewards clients with strong, stable profit margins.",
    },
    {
      name: "Debt Aging Risk",
      key: "debtAgingWeight" as keyof typeof weights,
      value: weights.debtAgingWeight,
      description: "Age and management of outstanding debt. Higher weight penalizes overdue balances.",
      impact: "Penalizes clients with old, unpaid invoices.",
    },
    {
      name: "Repayment Velocity",
      key: "repaymentVelocityWeight" as keyof typeof weights,
      value: weights.repaymentVelocityWeight,
      description: "Rate of debt repayment vs new charges. Higher weight favors debt reducers.",
      impact: "Rewards clients actively paying down their balance.",
    },
    {
      name: "Tenure & Relationship Depth",
      key: "tenureWeight" as keyof typeof weights,
      value: weights.tenureWeight,
      description: "Length and depth of business relationship. Higher weight favors long-term clients.",
      impact: "Rewards clients with long history and many transactions.",
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Credit Intelligence Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure how credit limits are calculated across all clients. These weights determine the importance of each financial signal.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                How Credit Weights Work
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                Each signal is scored 0-100 based on client financial data. The signal score is multiplied by its weight 
                to calculate its contribution to the overall credit health score. All weights must sum to 100%.
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Example:</strong> If "Cash Collection" has a weight of 25% and a client scores 80/100, 
                it contributes 20 points (80 × 0.25) to their credit health score.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Signal Weights</CardTitle>
          <CardDescription>
            Adjust the importance of each financial signal. Changes apply to all future credit calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {signals.map((signal) => (
            <div key={signal.key} className="space-y-3 pb-6 border-b last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base">{signal.name}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {signal.description}
                  </div>
                </div>
                <div className="text-2xl font-bold shrink-0">{signal.value}%</div>
              </div>
              
              <Slider
                value={[signal.value]}
                onValueChange={(value) => handleWeightChange(signal.key, value[0])}
                max={100}
                step={1}
                className="w-full"
              />
              
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="font-medium">Impact:</span>
                <span>{signal.impact}</span>
              </div>
            </div>
          ))}

          {/* Total Weight Indicator */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${
            weightsValid 
              ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {weightsValid ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">Total Weight</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${weightsValid ? "text-green-600" : "text-red-600"}`}>
                {weightsSum.toFixed(0)}%
              </span>
              {weightsValid ? (
                <Badge variant="default" className="bg-green-600">Valid</Badge>
              ) : (
                <Badge variant="destructive">Must equal 100%</Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={!weightsValid || !hasChanges || updateSettingsMutation.isPending}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={handleReset}
              disabled={!hasChanges}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleResetToDefaults}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Impact Preview */}
      <Card>
        <CardHeader>
          <CardTitle>System Impact</CardTitle>
          <CardDescription>
            How these weights affect credit limit calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Conservative Profile</div>
              <div className="text-xs text-muted-foreground">
                High weights on Cash Collection, Debt Aging, and Repayment Velocity favor low-risk clients with proven payment history.
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Growth-Oriented Profile</div>
              <div className="text-xs text-muted-foreground">
                High weights on Revenue Momentum and Profitability favor growing clients with strong margins, even if payment history is shorter.
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Relationship-Focused Profile</div>
              <div className="text-xs text-muted-foreground">
                High weight on Tenure favors long-term clients, rewarding loyalty and established relationships.
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Balanced Profile (Default)</div>
              <div className="text-xs text-muted-foreground">
                Equal consideration of all signals provides a well-rounded assessment suitable for most businesses.
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-yellow-900 dark:text-yellow-100">Important</div>
              <div className="text-yellow-800 dark:text-yellow-200 mt-1">
                Weight changes apply to all future credit calculations. Existing credit limits are not automatically recalculated. 
                Visit each client profile and click "Recalculate" to apply new weights.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Info,
  Settings,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface CreditLimitWidgetProps {
  clientId: number;
  showAdjustControls?: boolean; // Whether to show weight adjustment controls
  defaultExpanded?: boolean; // Whether to start expanded
}

export function CreditLimitWidget({ 
  clientId, 
  showAdjustControls = true,
  defaultExpanded = false 
}: CreditLimitWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [customWeights, setCustomWeights] = useState<{
    revenueMomentumWeight: number;
    cashCollectionWeight: number;
    profitabilityWeight: number;
    debtAgingWeight: number;
    repaymentVelocityWeight: number;
    tenureWeight: number;
  } | null>(null);

  // Fetch system settings for default weights
  const { data: settings } = trpc.credit.getSettings.useQuery();

  // Fetch current credit limit
  const { data: creditData, refetch: refetchCredit } = trpc.credit.getByClientId.useQuery({ clientId });

  // Calculate credit limit (with optional custom weights)
  const calculateMutation = trpc.credit.calculate.useMutation({
    onSuccess: () => {
      refetchCredit();
    },
  });

  // Initialize custom weights from settings
  useEffect(() => {
    if (settings && !customWeights) {
      setCustomWeights({
        revenueMomentumWeight: settings.revenueMomentumWeight,
        cashCollectionWeight: settings.cashCollectionWeight,
        profitabilityWeight: settings.profitabilityWeight,
        debtAgingWeight: settings.debtAgingWeight,
        repaymentVelocityWeight: settings.repaymentVelocityWeight,
        tenureWeight: settings.tenureWeight,
      });
    }
  }, [settings, customWeights]);

  const handleWeightChange = (signal: string, value: number) => {
    if (!customWeights) return;
    
    setCustomWeights({
      ...customWeights,
      [signal]: value,
    });
  };

  const handleCalculate = async () => {
    await calculateMutation.mutateAsync({ clientId });
  };

  const handlePreview = async () => {
    if (!customWeights) return;

    // Validate weights sum to 100
    const sum = Object.values(customWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      toast.error("Weights must sum to 100%");
      return;
    }

    await calculateMutation.mutateAsync({
      clientId,
      customWeights
    });
  };

  const handleReset = () => {
    if (settings) {
      setCustomWeights({
        revenueMomentumWeight: settings.revenueMomentumWeight,
        cashCollectionWeight: settings.cashCollectionWeight,
        profitabilityWeight: settings.profitabilityWeight,
        debtAgingWeight: settings.debtAgingWeight,
        repaymentVelocityWeight: settings.repaymentVelocityWeight,
        tenureWeight: settings.tenureWeight,
      });
    }
  };

  if (!creditData && !calculateMutation.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Limit</CardTitle>
          <CardDescription>Calculate credit limit based on financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCalculate} disabled={calculateMutation.isPending} className="w-full">
            {calculateMutation.isPending ? "Calculating..." : "Calculate Credit Limit"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = calculateMutation.data || creditData;
  if (!data) return null;

  const signals = [
    { 
      name: "Revenue Momentum", 
      key: "revenueMomentum", 
      score: ('signals' in data && data.signals?.revenueMomentum) || 0,
      trend: ('signalTrends' in data && data.signalTrends?.revenueMomentumTrend) || 0,
      weight: customWeights?.revenueMomentumWeight || settings?.revenueMomentumWeight || 20,
      description: "Growth rate of recent vs historical revenue"
    },
    { 
      name: "Cash Collections", 
      key: "cashCollectionStrength", 
      score: ('signals' in data && data.signals?.cashCollectionStrength) || 0,
      trend: ('signalTrends' in data && data.signalTrends?.cashCollectionTrend) || 0,
      weight: customWeights?.cashCollectionWeight || settings?.cashCollectionWeight || 25,
      description: "Speed and reliability of payment collection"
    },
    { 
      name: "Profitability", 
      key: "profitabilityQuality", 
      score: ('signals' in data && data.signals?.profitabilityQuality) || 0,
      trend: ('signalTrends' in data && data.signalTrends?.profitabilityTrend) || 0,
      weight: customWeights?.profitabilityWeight || settings?.profitabilityWeight || 20,
      description: "Profit margin quality and stability"
    },
    { 
      name: "Debt Management", 
      key: "debtAgingRisk", 
      score: ('signals' in data && data.signals?.debtAgingRisk) || 0,
      trend: ('signalTrends' in data && data.signalTrends?.debtAgingTrend) || 0,
      weight: customWeights?.debtAgingWeight || settings?.debtAgingWeight || 15,
      description: "Age and management of outstanding debt"
    },
    { 
      name: "Repayment Rate", 
      key: "repaymentVelocity", 
      score: ('signals' in data && data.signals?.repaymentVelocity) || 0,
      trend: ('signalTrends' in data && data.signalTrends?.repaymentVelocityTrend) || 0,
      weight: customWeights?.repaymentVelocityWeight || settings?.repaymentVelocityWeight || 10,
      description: "Rate of debt repayment vs new charges"
    },
    { 
      name: "Relationship History", 
      key: "tenureDepth", 
      score: ('signals' in data && data.signals?.tenureDepth) || 0,
      trend: 0, // Tenure doesn't have trend
      weight: customWeights?.tenureWeight || settings?.tenureWeight || 10,
      description: "Length and depth of business relationship"
    },
  ];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />;
    return <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendBadge = (trend: string) => {
    if (trend === "IMPROVING") return <Badge variant="default" className="bg-green-600 text-xs">↑</Badge>;
    if (trend === "WORSENING") return <Badge variant="destructive" className="text-xs">↓</Badge>;
    return <Badge variant="secondary" className="text-xs">→</Badge>;
  };

  const getModeBadge = (mode: string) => {
    if (mode === "LEARNING") {
      return <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs">Learning</Badge>;
    }
    return <Badge variant="default" className="bg-blue-600 text-xs">Active</Badge>;
  };

  const creditHealthScore = Number(data.creditHealthScore || 0);
  const creditLimit = Number(data.creditLimit || 0);
  const currentExposure = Number(data.currentExposure || 0);
  const utilizationPercent = Number(data.utilizationPercent || 0);

  const weightsSum = customWeights ? Object.values(customWeights).reduce((a, b) => a + b, 0) : 100;
  const weightsValid = Math.abs(weightsSum - 100) < 0.01;

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">Credit Limit</CardTitle>
                {getModeBadge(data.mode || "LEARNING")}
                {getTrendBadge(data.trend || "STABLE")}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4">
          {/* Compact Summary (Always Visible) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Limit</div>
              <div className="text-lg sm:text-xl font-bold">${(creditLimit / 1000).toFixed(0)}k</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Health</div>
              <div className={`text-lg sm:text-xl font-bold ${getHealthColor(creditHealthScore)}`}>
                {creditHealthScore.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="space-y-1">
                <Progress value={Math.min(utilizationPercent, 100)} className="h-2" />
                <div className="text-xs text-muted-foreground">{utilizationPercent.toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent className="space-y-3 sm:space-y-4">
            {/* Full Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Credit Limit</div>
                <div className="font-semibold">${creditLimit.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Exposure</div>
                <div className="font-semibold">${currentExposure.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="font-semibold text-green-600">${(creditLimit - currentExposure).toLocaleString()}</div>
              </div>
            </div>

            {/* Plain English Explanation */}
            {'explanation' in data && data.explanation && (
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">{'explanation' in data ? data.explanation : ''}</div>
              </div>
            )}

            {/* Signal Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Signal Breakdown</div>
                {showAdjustControls && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Adjust
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Adjust Credit Signal Weights</DialogTitle>
                        <DialogDescription>
                          Customize how each signal contributes to the credit limit. Weights must sum to 100%.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        {signals.map((signal) => (
                          <div key={signal.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{signal.name}</div>
                                <div className="text-xs text-muted-foreground">{signal.description}</div>
                              </div>
                              <div className="text-lg font-bold">{signal.weight}%</div>
                            </div>
                            <Slider
                              value={[signal.weight]}
                              onValueChange={(value) => handleWeightChange(`${signal.key.replace("Quality", "").replace("Strength", "").replace("Risk", "").replace("Velocity", "").replace("Depth", "")}Weight`, value[0])}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        ))}

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                          <div className="font-medium">Total Weight</div>
                          <div className={`text-lg font-bold ${weightsValid ? "text-green-600" : "text-red-600"}`}>
                            {weightsSum.toFixed(0)}%
                            {weightsValid ? <Check className="inline h-4 w-4 ml-2" /> : <AlertCircle className="inline h-4 w-4 ml-2" />}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handlePreview} disabled={!weightsValid || calculateMutation.isPending} className="flex-1">
                            {calculateMutation.isPending ? "Calculating..." : "Preview Changes"}
                          </Button>
                          <Button onClick={handleReset} variant="outline">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              {signals.map((signal) => {
                const contribution = (signal.score * signal.weight) / 100;
                return (
                  <div key={signal.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="font-medium truncate">{signal.name}</span>
                        {getTrendIcon(signal.trend)}
                        <span className="text-muted-foreground text-xs">{signal.weight}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`${getHealthColor(signal.score)} text-xs`}>{signal.score.toFixed(0)}</span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="font-medium text-xs">{contribution.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full transition-all ${
                          signal.score >= 80 ? "bg-green-600" : 
                          signal.score >= 60 ? "bg-yellow-600" : 
                          "bg-red-600"
                        }`}
                        style={{ width: `${signal.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Learning Mode Warning */}
            {data.mode === "LEARNING" && (
              <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-yellow-900 dark:text-yellow-100">Learning Mode</div>
                  <div className="text-yellow-800 dark:text-yellow-200 mt-0.5">
                    Limited history. Limit is conservative. Readiness: {Number(data.dataReadiness || 0).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* Recalculate Button */}
            <Button 
              onClick={handleCalculate} 
              disabled={calculateMutation.isPending} 
              className="w-full"
              size="sm"
            >
              {calculateMutation.isPending ? "Recalculating..." : "Recalculate"}
            </Button>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}


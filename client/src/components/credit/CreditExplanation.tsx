import React from "react";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CreditData {
  creditLimit?: string | number | null;
  creditHealthScore?: string | number | null;
  baseCapacity?: string | number | null;
  riskModifier?: string | number | null;
  signals?: {
    revenueMomentum?: number;
    cashCollectionStrength?: number;
    profitabilityQuality?: number;
    debtAgingRisk?: number;
    repaymentVelocity?: number;
    tenureDepth?: number;
  } | null;
  signalTrends?: {
    revenueMomentumTrend?: number;
    cashCollectionTrend?: number;
    profitabilityTrend?: number;
    debtAgingTrend?: number;
    repaymentVelocityTrend?: number;
  } | null;
  explanation?: string | null;
  mode?: string | null;
  dataReadiness?: string | number | null;
}

interface CreditExplanationProps {
  creditData: CreditData;
  showFormula?: boolean;
}

export const CreditExplanation = React.memo(function CreditExplanation({
  creditData,
  showFormula = true,
}: CreditExplanationProps) {
  const baseCapacity = Number(creditData.baseCapacity || 0);
  const riskModifier = Number(creditData.riskModifier || 1);
  const creditLimit = Number(creditData.creditLimit || 0);
  const creditHealthScore = Number(creditData.creditHealthScore || 0);

  const signals = [
    {
      name: "Revenue Growth",
      key: "revenueMomentum",
      score: creditData.signals?.revenueMomentum || 0,
      trend: creditData.signalTrends?.revenueMomentumTrend || 0,
      description: "Growth rate of recent vs historical revenue",
      weight: 20,
    },
    {
      name: "Payment Speed",
      key: "cashCollectionStrength",
      score: creditData.signals?.cashCollectionStrength || 0,
      trend: creditData.signalTrends?.cashCollectionTrend || 0,
      description: "How quickly payments are collected",
      weight: 25,
    },
    {
      name: "Profit Margins",
      key: "profitabilityQuality",
      score: creditData.signals?.profitabilityQuality || 0,
      trend: creditData.signalTrends?.profitabilityTrend || 0,
      description: "Quality and stability of profit margins",
      weight: 20,
    },
    {
      name: "Debt Management",
      key: "debtAgingRisk",
      score: creditData.signals?.debtAgingRisk || 0,
      trend: creditData.signalTrends?.debtAgingTrend || 0,
      description: "Age and management of outstanding debt",
      weight: 15,
    },
    {
      name: "Repayment Rate",
      key: "repaymentVelocity",
      score: creditData.signals?.repaymentVelocity || 0,
      trend: creditData.signalTrends?.repaymentVelocityTrend || 0,
      description: "Rate of debt repayment vs new charges",
      weight: 10,
    },
    {
      name: "Relationship",
      key: "tenureDepth",
      score: creditData.signals?.tenureDepth || 0,
      trend: 0, // Tenure doesn't have trend
      description: "Length and depth of business relationship",
      weight: 10,
    },
  ];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "moderate";
    return "needs attention";
  };

  const getBarColor = (score: number): string => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">How this was calculated</span>
      </div>

      {/* Plain English Explanation */}
      {creditData.explanation && (
        <p className="text-sm text-muted-foreground">
          {creditData.explanation}
        </p>
      )}

      {/* Formula Breakdown */}
      {showFormula && (
        <div className="space-y-3">
          {/* Base Capacity */}
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="font-medium">Base Capacity</span>
              <p className="text-xs text-muted-foreground">
                2× average monthly revenue
              </p>
            </div>
            <span className="font-mono font-medium">
              $
              {baseCapacity.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>

          {/* Risk Modifier */}
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="font-medium">Risk Modifier</span>
              <p className="text-xs text-muted-foreground">
                Based on credit health score ({creditHealthScore.toFixed(0)}
                /100)
              </p>
            </div>
            <span className="font-mono font-medium">
              × {riskModifier.toFixed(2)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed" />

          {/* Final Calculation */}
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Final Credit Limit</span>
            <span className="font-mono font-bold text-base">
              $
              {creditLimit.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Signal Breakdown */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Signal Breakdown
        </p>

        {signals.map(signal => {
          return (
            <div key={signal.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{signal.name}</span>
                  {getTrendIcon(signal.trend)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${getScoreColor(signal.score)}`}>
                    {signal.score.toFixed(0)} ({getScoreLabel(signal.score)})
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full transition-all ${getBarColor(signal.score)}`}
                  style={{ width: `${signal.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Weighted Score Summary */}
      <div className="pt-2 border-t">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Credit Health Score</span>
          <span className={`font-bold ${getScoreColor(creditHealthScore)}`}>
            {creditHealthScore.toFixed(0)}/100
          </span>
        </div>
      </div>
    </div>
  );
});

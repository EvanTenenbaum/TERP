import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Clock } from "lucide-react";

/**
 * Match Badge Component
 * Displays match type and confidence score with appropriate styling
 */

interface MatchBadgeProps {
  matchType: "EXACT" | "CLOSE" | "HISTORICAL";
  confidence: number;
  showIcon?: boolean;
  showConfidence?: boolean;
  size?: "sm" | "md" | "lg";
}

export function MatchBadge({
  matchType,
  confidence,
  showIcon = true,
  showConfidence = true,
  size = "md",
}: MatchBadgeProps) {
  const getVariant = () => {
    if (matchType === "EXACT") return "default";
    if (matchType === "CLOSE") return "secondary";
    return "outline";
  };

  const getIcon = () => {
    if (matchType === "EXACT") return <Target className="h-3 w-3" />;
    if (matchType === "CLOSE") return <TrendingUp className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getLabel = () => {
    if (matchType === "EXACT") return "Exact Match";
    if (matchType === "CLOSE") return "Close Match";
    return "Historical";
  };

  const getConfidenceColor = () => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge variant={getVariant()} className={`${sizeClasses[size]} flex items-center gap-1.5`}>
      {showIcon && getIcon()}
      <span>{getLabel()}</span>
      {showConfidence && (
        <span className={`font-semibold ${getConfidenceColor()}`}>
          {confidence}%
        </span>
      )}
    </Badge>
  );
}

/**
 * Compact Match Indicator
 * Minimal version for tables and lists
 */
export function MatchIndicator({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getColor()}`} />
      <span className="text-sm text-muted-foreground">{confidence}%</span>
    </div>
  );
}


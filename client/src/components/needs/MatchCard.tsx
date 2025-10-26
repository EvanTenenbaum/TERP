import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "./MatchBadge";
import { Package, DollarSign, Boxes, FileText, ExternalLink } from "lucide-react";
import { useState } from "react";

/**
 * Match Card Component
 * Displays a single match with all relevant details and actions
 */

interface MatchCardProps {
  match: {
    type: "EXACT" | "CLOSE" | "HISTORICAL";
    confidence: number;
    reasons: string[];
    source: "INVENTORY" | "VENDOR" | "HISTORICAL";
    sourceId: number;
    sourceData: any;
    calculatedPrice?: number;
    availableQuantity?: number;
  };
  onCreateQuote?: () => void;
  onDismiss?: () => void;
  onViewDetails?: () => void;
}

export function MatchCard({ match, onCreateQuote, onDismiss, onViewDetails }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSourceIcon = () => {
    if (match.source === "INVENTORY") return <Package className="h-4 w-4" />;
    if (match.source === "VENDOR") return <Boxes className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getSourceLabel = () => {
    if (match.source === "INVENTORY") return "In Stock";
    if (match.source === "VENDOR") return "Vendor Supply";
    return "Historical Pattern";
  };

  const getProductName = () => {
    if (match.source === "INVENTORY") {
      const product = match.sourceData?.product;
      return product?.nameCanonical || "Unknown Product";
    }
    if (match.source === "VENDOR") {
      const supply = match.sourceData;
      return `${supply?.strain || ""} ${supply?.category || ""}`.trim() || "Unknown Product";
    }
    return "Historical Purchase Pattern";
  };

  const getProductDetails = () => {
    if (match.source === "INVENTORY") {
      const batch = match.sourceData?.batch;
      const product = match.sourceData?.product;
      return {
        category: product?.category,
        subcategory: product?.subcategory,
        grade: batch?.grade,
        sku: batch?.sku,
      };
    }
    if (match.source === "VENDOR") {
      const supply = match.sourceData;
      return {
        category: supply?.category,
        subcategory: supply?.subcategory,
        grade: supply?.grade,
      };
    }
    return {};
  };

  const details = getProductDetails();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {getSourceIcon()}
              <CardTitle className="text-lg">{getProductName()}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getSourceLabel()}
              </Badge>
              {details.category && (
                <span className="text-xs text-muted-foreground">
                  {details.category}
                  {details.subcategory && ` • ${details.subcategory}`}
                  {details.grade && ` • Grade ${details.grade}`}
                </span>
              )}
            </CardDescription>
          </div>
          <MatchBadge matchType={match.type} confidence={match.confidence} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price and Quantity */}
        <div className="flex items-center gap-6">
          {match.calculatedPrice !== undefined && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">${match.calculatedPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">per unit</p>
              </div>
            </div>
          )}
          {match.availableQuantity !== undefined && (
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{match.availableQuantity} units</p>
                <p className="text-xs text-muted-foreground">available</p>
              </div>
            </div>
          )}
        </div>

        {/* Match Reasons */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? "Hide" : "Show"} match reasons ({match.reasons.length})
          </button>
          {isExpanded && (
            <ul className="mt-2 space-y-1">
              {match.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {onCreateQuote && (
            <Button onClick={onCreateQuote} size="sm" className="flex-1">
              Create Quote
            </Button>
          )}
          {onViewDetails && (
            <Button onClick={onViewDetails} size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          {onDismiss && (
            <Button onClick={onDismiss} size="sm" variant="ghost">
              Dismiss
            </Button>
          )}
        </div>

        {/* Additional Info for Inventory */}
        {match.source === "INVENTORY" && details.sku && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            SKU: {details.sku}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Match List Item
 * For use in tables or condensed lists
 */
export function MatchListItem({ match, onSelect }: { match: any; onSelect?: () => void }) {
  return (
    <div
      className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {match.source === "INVENTORY" 
              ? match.sourceData?.product?.nameCanonical 
              : match.sourceData?.strain || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground">
            {match.source} • {match.reasons.length} reasons
          </p>
        </div>
        {match.calculatedPrice && (
          <p className="text-sm font-medium">${match.calculatedPrice.toFixed(2)}</p>
        )}
      </div>
      <MatchBadge matchType={match.type} confidence={match.confidence} size="sm" showIcon={false} />
    </div>
  );
}


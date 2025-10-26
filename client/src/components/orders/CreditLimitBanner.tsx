import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface CreditLimitBannerProps {
  client: any;
  orderTotal: number;
}

export function CreditLimitBanner({ client, orderTotal }: CreditLimitBannerProps) {
  // Get credit limit data (placeholder - will be integrated with credit engine)
  const creditLimit = parseFloat(client.creditLimit || "0");
  const currentExposure = parseFloat(client.totalOwed || "0");
  const newExposure = currentExposure + orderTotal;
  const utilizationPercent = creditLimit > 0 ? (newExposure / creditLimit) * 100 : 0;

  // Determine alert state
  const getAlertState = () => {
    if (utilizationPercent >= 100) {
      return {
        variant: "destructive" as const,
        icon: XCircle,
        title: "Credit Limit Exceeded",
        description: `This order will exceed the credit limit by $${(newExposure - creditLimit).toFixed(2)}`,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      };
    } else if (utilizationPercent >= 90) {
      return {
        variant: "destructive" as const,
        icon: AlertCircle,
        title: "Credit Limit Warning",
        description: "This order will push credit utilization above 90%",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
      };
    } else if (utilizationPercent >= 75) {
      return {
        variant: "default" as const,
        icon: AlertTriangle,
        title: "Credit Utilization High",
        description: "This order will result in high credit utilization",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
      };
    } else {
      return {
        variant: "default" as const,
        icon: CheckCircle,
        title: "Credit Available",
        description: "Sufficient credit limit for this order",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      };
    }
  };

  const alertState = getAlertState();
  const Icon = alertState.icon;

  // Don't show banner if no credit limit set
  if (creditLimit === 0) return null;

  return (
    <Alert className={`${alertState.bgColor} ${alertState.borderColor}`}>
      <Icon className={`h-4 w-4 ${alertState.color}`} />
      <AlertTitle className="flex items-center justify-between">
        <span>{alertState.title}</span>
        <Badge variant="outline" className={alertState.color}>
          {utilizationPercent.toFixed(0)}% Utilized
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-sm">{alertState.description}</p>
        
        <div className="space-y-2">
          <Progress value={Math.min(utilizationPercent, 100)} className="h-2" />
          
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Credit Limit</p>
              <p className="font-semibold">${creditLimit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Exposure</p>
              <p className="font-semibold">${currentExposure.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">After This Order</p>
              <p className={`font-semibold ${alertState.color}`}>
                ${newExposure.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {utilizationPercent >= 100 && (
          <p className="text-xs font-medium">
            ⚠️ This sale will be blocked unless credit limit is increased or payment is received.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}


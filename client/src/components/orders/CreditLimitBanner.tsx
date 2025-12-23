import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useCreditVisibility } from "@/hooks/useCreditVisibility";

interface CreditLimitBannerProps {
  client: {
    id: number;
    name: string;
    creditLimit?: string | null;
    totalOwed?: string | null;
  };
  orderTotal: number;
}

export function CreditLimitBanner({ client, orderTotal }: CreditLimitBannerProps) {
  // Check visibility settings
  const { shouldShowCreditBannerInOrders } = useCreditVisibility();
  
  // Get credit limit data from client (now synced from client_credit_limits)
  const creditLimit = parseFloat(client.creditLimit || "0");
  const currentExposure = parseFloat(client.totalOwed || "0");
  const newExposure = currentExposure + orderTotal;
  const utilizationPercent = creditLimit > 0 ? (newExposure / creditLimit) * 100 : 0;
  const availableCredit = creditLimit - currentExposure;

  // Don't render if visibility is disabled
  if (!shouldShowCreditBannerInOrders) {
    return null;
  }

  // Determine alert state
  const getAlertState = () => {
    if (creditLimit === 0) {
      return {
        variant: "default" as const,
        icon: Info,
        title: "No Credit Limit Set",
        description: "This client doesn't have a credit limit configured. Calculate one from their profile.",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        showDetails: false,
      };
    }
    if (utilizationPercent >= 100) {
      return {
        variant: "destructive" as const,
        icon: XCircle,
        title: "Credit Limit Exceeded",
        description: `This order will exceed the credit limit by $${(newExposure - creditLimit).toFixed(2)}`,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        showDetails: true,
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
        showDetails: true,
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
        showDetails: true,
      };
    } else {
      return {
        variant: "default" as const,
        icon: CheckCircle,
        title: "Credit Available",
        description: `$${availableCredit.toFixed(2)} available after this order`,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        showDetails: true,
      };
    }
  };

  const alertState = getAlertState();
  const Icon = alertState.icon;

  return (
    <Alert className={`${alertState.bgColor} ${alertState.borderColor}`}>
      <Icon className={`h-4 w-4 ${alertState.color}`} />
      <AlertTitle className="flex items-center justify-between">
        <span>{alertState.title}</span>
        {creditLimit > 0 && (
          <Badge variant="outline" className={alertState.color}>
            {utilizationPercent.toFixed(0)}% Utilized
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="text-sm">{alertState.description}</p>
        
        {alertState.showDetails && (
          <div className="space-y-2">
            <Progress value={Math.min(utilizationPercent, 100)} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Credit Limit</p>
                <p className="font-semibold">${creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Exposure</p>
                <p className="font-semibold">${currentExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">After This Order</p>
                <p className={`font-semibold ${alertState.color}`}>
                  ${newExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {utilizationPercent >= 100 && (
          <p className="text-xs font-medium text-muted-foreground">
            💡 You can still proceed with this order. An override reason may be required depending on your settings.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

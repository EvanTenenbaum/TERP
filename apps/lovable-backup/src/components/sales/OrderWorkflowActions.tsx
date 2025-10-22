import { Button } from "@/components/ui/button";
import { Order } from "@/types/entities";
import { executeOrderAction, getAvailableActions, OrderAction } from "@/lib/orderWorkflow";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Package, Truck, Home } from "lucide-react";

interface OrderWorkflowActionsProps {
  order: Order;
  lines?: Array<{ inventory_id: string; qty: number }>;
  onStatusChange: (newStatus: string) => void;
}

export function OrderWorkflowActions({ order, lines, onStatusChange }: OrderWorkflowActionsProps) {
  const { toast } = useToast();
  const availableActions = getAvailableActions(order.status);

  const handleAction = (action: OrderAction) => {
    const result = executeOrderAction(order, action, lines);

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      onStatusChange(result.newStatus);
    } else {
      toast({
        title: "Action Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const actionConfig: Record<OrderAction, { label: string; icon: any; variant: any }> = {
    submit: { label: "Submit Order", icon: CheckCircle, variant: "default" },
    confirm: { label: "Confirm Order", icon: CheckCircle, variant: "default" },
    pick: { label: "Start Picking", icon: Package, variant: "default" },
    pack: { label: "Pack Order", icon: Package, variant: "default" },
    ship: { label: "Ship Order", icon: Truck, variant: "default" },
    deliver: { label: "Mark Delivered", icon: Home, variant: "default" },
    cancel: { label: "Cancel Order", icon: XCircle, variant: "destructive" },
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {availableActions.map((action) => {
        const config = actionConfig[action];
        const Icon = config.icon;
        
        return (
          <Button
            key={action}
            variant={config.variant}
            onClick={() => handleAction(action)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}

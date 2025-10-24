import { WidgetContainer } from "../WidgetContainer";
import { Button } from "@/components/ui/button";
import { FilePlus, ShoppingCart, Package } from "lucide-react";


export function QuickActionsWidget() {

  const actions = [
    {
      label: "Create New Quote",
      description: "Start a new sales quote",
      icon: FilePlus,
      onClick: () => window.location.href = "/sales",
    },
    {
      label: "View Orders",
      description: "Check active orders",
      icon: ShoppingCart,
      onClick: () => window.location.href = "/orders",
    },
    {
      label: "Manage Inventory",
      description: "Update stock levels",
      icon: Package,
      onClick: () => window.location.href = "/inventory",
    },
  ];

  return (
    <WidgetContainer title="Quick Actions">
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </WidgetContainer>
  );
}


import { Plus, FileText, Package, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { 
      label: "New Order", 
      icon: Plus, 
      onClick: () => navigate("/sales/new-order"),
      variant: "default" as const
    },
    { 
      label: "New Quote", 
      icon: FileText, 
      onClick: () => navigate("/quotes/new"),
      variant: "outline" as const
    },
    { 
      label: "New PO", 
      icon: Package, 
      onClick: () => navigate("/vendors/new-po"),
      variant: "outline" as const
    },
    { 
      label: "Add Client", 
      icon: Users, 
      onClick: () => navigate("/clients"),
      variant: "outline" as const
    },
    { 
      label: "View Reports", 
      icon: TrendingUp, 
      onClick: () => navigate("/reports"),
      variant: "outline" as const
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            onClick={action.onClick}
            className="h-20 flex flex-col gap-2"
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}

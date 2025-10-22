import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createAuditEntry } from "@/lib/audit";
import { CheckCircle, XCircle, Truck, FileText } from "lucide-react";

interface PO {
  id: string;
  status: string;
}

interface POWorkflowActionsProps {
  po: PO;
  onStatusChange: (newStatus: string) => void;
}

export function POWorkflowActions({ po, onStatusChange }: POWorkflowActionsProps) {
  const { toast } = useToast();

  const handleAction = (action: string, newStatus: string) => {
    createAuditEntry({
      action: `po_${action}`,
      entity_type: "purchase_order",
      entity_id: po.id,
      before: { status: po.status },
      after: { status: newStatus },
      ui_context: "po_workflow",
      module: "vendors",
    });

    toast({
      title: "Success",
      description: `Purchase order ${action}ed successfully`,
    });

    onStatusChange(newStatus);
  };

  const getActions = () => {
    switch (po.status) {
      case "Draft":
        return [
          { label: "Submit PO", icon: FileText, action: "submit", newStatus: "Pending" },
          { label: "Cancel", icon: XCircle, action: "cancel", newStatus: "Cancelled", variant: "destructive" as const },
        ];
      case "Pending":
        return [
          { label: "Approve PO", icon: CheckCircle, action: "approve", newStatus: "Approved" },
          { label: "Cancel", icon: XCircle, action: "cancel", newStatus: "Cancelled", variant: "destructive" as const },
        ];
      case "Approved":
        return [
          { label: "Mark Received", icon: Truck, action: "receive", newStatus: "Received" },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.action}
            variant={action.variant || "default"}
            onClick={() => handleAction(action.action, action.newStatus)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

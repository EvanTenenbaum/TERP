import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  success: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  warning: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
  info: "bg-brand/10 text-brand border-brand/20 hover:bg-brand/20",
  neutral: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-fast",
        statusStyles[status],
        className
      )}
    >
      {label}
    </Badge>
  );
}

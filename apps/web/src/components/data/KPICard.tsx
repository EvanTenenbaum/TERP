import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "",
  success: "border-success/20",
  warning: "border-warning/20",
  error: "border-destructive/20",
};

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = "default",
  className,
  onClick
}: KPICardProps) {
  return (
    <Card 
      className={cn(
        "p-6 transition-fast hover:shadow-card",
        variantStyles[variant],
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
        {trend && (
          <p className={cn(
            "text-xs font-medium",
            trend.direction === "up" ? "text-success" : "text-destructive"
          )}>
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}

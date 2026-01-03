import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface MetricCardProps {
  onClick?: () => void;
  href?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  trend?: {
    value: number;
    label: string;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading,
  trend,
  onClick,
  href,
}: MetricCardProps) {
  const [, setLocation] = useLocation();
  
  const handleClick = () => {
    if (href) setLocation(href);
    if (onClick) onClick();
  };

  return (
    <Card 
      className={onClick || href ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""} 
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}
        </div>
        {trend && !isLoading && (
          <div className="flex items-center text-xs">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend.value >= 0 ? "text-green-500" : "text-red-500"}>
              {trend.value >= 0 ? "+" : ""}
              {trend.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
        {subtitle && !trend && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

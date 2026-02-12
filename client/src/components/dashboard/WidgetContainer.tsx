import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";

interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  onRemove?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export function WidgetContainer({
  title,
  children,
  onRemove,
  onRefresh,
  loading,
  className,
}: WidgetContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                Refresh
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <X className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ComponentErrorBoundary name={title}>
            {children}
          </ComponentErrorBoundary>
        )}
      </CardContent>
    </Card>
  );
}


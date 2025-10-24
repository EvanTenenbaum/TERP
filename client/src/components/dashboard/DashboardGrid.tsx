import { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function DashboardGrid({ children, columns = 2, className = "" }: DashboardGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}


import { ReactNode } from 'react';

interface DashboardLayoutManagerProps {
  children: ReactNode;
}

export function DashboardLayoutManager({ children }: DashboardLayoutManagerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-3 md:gap-4 lg:gap-6">
      {children}
    </div>
  );
}

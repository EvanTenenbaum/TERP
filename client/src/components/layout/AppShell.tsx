import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  // Authentication removed - app is now publicly accessible

  // DashboardV3 uses DashboardLayout which has its own sidebar navigation
  // Don't render AppSidebar for dashboard routes to avoid duplicate navigation
  const isDashboardRoute = location === "/" || location === "/dashboard";
  const shouldShowAppSidebar = !isDashboardRoute;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {shouldShowAppSidebar && (
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        {shouldShowAppSidebar && (
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}


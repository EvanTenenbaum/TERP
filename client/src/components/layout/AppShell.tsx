import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Layout } from "./Layout";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();

  // Authentication removed - app is now publicly accessible

  // DashboardV3 uses DashboardLayout which has its own sidebar navigation
  // Don't render AppSidebar for dashboard routes to avoid duplicate navigation
  // BUG-002: Fix duplicate navigation bar on dashboard
  // QA-028: Fix old sidebar appearing on dashboard (especially mobile) - FIXED
  // The DashboardLayout component handles its own sidebar with proper mobile support
  const isDashboardRoute =
    location === "/" ||
    location === "/dashboard" ||
    location.startsWith("/dashboard/");

  return <Layout showSidebar={!isDashboardRoute}>{children}</Layout>;
}

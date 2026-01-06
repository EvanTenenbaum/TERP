import { ReactNode } from "react";
import { Layout } from "./Layout";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Use the same Layout with sidebar for all routes including dashboard
  return <Layout showSidebar={true}>{children}</Layout>;
}

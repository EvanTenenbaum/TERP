import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";

export interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout = React.memo(function Layout({
  children,
  showSidebar = true,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleOpenSidebar = () => setSidebarOpen(true);
  const handleCloseSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <Sidebar open={sidebarOpen} onClose={handleCloseSidebar} />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        {showSidebar && (
          <>
            <MobileNav onMenuClick={handleOpenSidebar} />
            <div className="hidden md:block">
              <AppHeader onMenuClick={handleOpenSidebar} />
            </div>
          </>
        )}
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6")}>
          {children}
        </main>
      </div>
    </div>
  );
});

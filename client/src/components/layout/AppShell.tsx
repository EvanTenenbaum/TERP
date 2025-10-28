import { useAuth } from '@clerk/clerk-react';
import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

// QA MODE: Bypass authentication for testing
const QA_MODE = import.meta.env.VITE_QA_MODE === 'true';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Skip auth check in QA mode
    if (QA_MODE) return;
    
    // Only redirect if Clerk has loaded and user is not signed in
    if (isLoaded && !isSignedIn) {
      setLocation('/sign-in');
    }
  }, [isLoaded, isSignedIn, setLocation]);

  // Skip loading check in QA mode
  if (!QA_MODE) {
    // Show loading state while Clerk is loading
    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    // Don't render anything if not signed in (will redirect)
    if (!isSignedIn) {
      return null;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}


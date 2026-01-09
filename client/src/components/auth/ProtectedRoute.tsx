/**
 * ProtectedRoute Component
 *
 * SEC-001: Wraps protected routes to ensure authentication.
 * Redirects unauthenticated users to the login page.
 *
 * Security considerations:
 * - Uses httpOnly session cookies (validated server-side)
 * - Shows loading state while checking auth to prevent flash of protected content
 * - Redirects happen before rendering any protected content
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Optional required permission for this route.
   * If specified, user must have this permission in addition to being authenticated.
   */
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated (after loading is complete)
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      // SEC-FIX: Validate returnUrl to prevent open redirect attacks
      // Only allow relative paths starting with / and not //
      const isValidReturnUrl = (url: string) => {
        return (
          url.startsWith("/") && !url.startsWith("//") && !url.includes(":")
        );
      };

      const returnUrl = isValidReturnUrl(location)
        ? encodeURIComponent(location)
        : encodeURIComponent("/");
      setLocation(`/login?returnUrl=${returnUrl}`);
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Don't render children while redirecting
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // Check for required permission if specified
  if (requiredPermission) {
    const userPermissions =
      (user as { permissions?: string[] }).permissions || [];
    const hasPermission =
      userPermissions.includes(requiredPermission) ||
      userPermissions.includes("*"); // Admin wildcard

    if (!hasPermission) {
      // User is authenticated but lacks permission
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required permission: {requiredPermission}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;

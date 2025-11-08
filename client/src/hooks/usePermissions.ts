/**
 * usePermissions Hook
 * 
 * Provides permission checking functionality for frontend components.
 * Allows conditional rendering based on user permissions.
 * 
 * Usage:
 * ```tsx
 * const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();
 * 
 * if (hasPermission('orders:create')) {
 *   return <CreateOrderButton />;
 * }
 * ```
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface UsePermissionsReturn {
  /**
   * Check if the current user has a specific permission
   */
  hasPermission: (permission: string) => boolean;

  /**
   * Check if the current user has at least one of the specified permissions
   */
  hasAnyPermission: (permissions: string[]) => boolean;

  /**
   * Check if the current user has all of the specified permissions
   */
  hasAllPermissions: (permissions: string[]) => boolean;

  /**
   * Check if the current user is a Super Admin (has all permissions)
   */
  isSuperAdmin: boolean;

  /**
   * Get all permissions for the current user
   */
  permissions: string[];

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;
}

/**
 * Hook to check user permissions for conditional rendering
 */
export function usePermissions(): UsePermissionsReturn {
  // Fetch current user's permissions from the backend
  const { data: permissionsData, isLoading, error } = trpc.rbacUsers.getMyPermissions.useQuery();

  // Memoize the permissions array
  const permissions = useMemo(() => {
    return permissionsData?.permissions || [];
  }, [permissionsData]);

  // Memoize the Super Admin status
  const isSuperAdmin = useMemo(() => {
    return permissionsData?.isSuperAdmin || false;
  }, [permissionsData]);

  // Check if user has a specific permission
  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      // Super Admin has all permissions
      if (isSuperAdmin) return true;
      
      // Check if permission exists in user's permissions
      return permissions.includes(permission);
    };
  }, [permissions, isSuperAdmin]);

  // Check if user has at least one of the specified permissions
  const hasAnyPermission = useMemo(() => {
    return (requiredPermissions: string[]): boolean => {
      // Super Admin has all permissions
      if (isSuperAdmin) return true;
      
      // Check if any of the required permissions exist
      return requiredPermissions.some(permission => permissions.includes(permission));
    };
  }, [permissions, isSuperAdmin]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useMemo(() => {
    return (requiredPermissions: string[]): boolean => {
      // Super Admin has all permissions
      if (isSuperAdmin) return true;
      
      // Check if all required permissions exist
      return requiredPermissions.every(permission => permissions.includes(permission));
    };
  }, [permissions, isSuperAdmin]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    permissions,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Higher-order component for permission-based rendering
 * 
 * Usage:
 * ```tsx
 * <PermissionGate permission="orders:create">
 *   <CreateOrderButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Don't render anything while loading
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Single permission check
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // No permission specified, render children
  return <>{children}</>;
}

/**
 * Hook to check if user can perform a specific action on a module
 * 
 * Usage:
 * ```tsx
 * const { canRead, canCreate, canUpdate, canDelete } = useModulePermissions('orders');
 * ```
 */
export function useModulePermissions(module: string) {
  const { hasPermission } = usePermissions();

  return useMemo(() => ({
    canRead: hasPermission(`${module}:read`),
    canCreate: hasPermission(`${module}:create`),
    canUpdate: hasPermission(`${module}:update`),
    canDelete: hasPermission(`${module}:delete`),
    canManage: hasPermission(`${module}:manage`),
  }), [module, hasPermission]);
}

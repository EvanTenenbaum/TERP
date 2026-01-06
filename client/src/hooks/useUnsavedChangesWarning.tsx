/**
 * useUnsavedChangesWarning hook (CHAOS-007)
 *
 * Prevents accidental data loss by warning users before navigating away
 * from forms with unsaved changes.
 *
 * Features:
 * - Browser beforeunload event for tab close/refresh
 * - Navigation confirmation dialog for in-app navigation
 *
 * Usage:
 * ```tsx
 * const { setHasUnsavedChanges, ConfirmNavigationDialog } = useUnsavedChangesWarning();
 *
 * // In your form
 * useEffect(() => {
 *   setHasUnsavedChanges(formState.isDirty);
 * }, [formState.isDirty]);
 *
 * // In your JSX
 * return (
 *   <>
 *     <form>...</form>
 *     <ConfirmNavigationDialog />
 *   </>
 * );
 * ```
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UseUnsavedChangesWarningOptions {
  message?: string;
  enabled?: boolean;
}

interface UseUnsavedChangesWarningReturn {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  ConfirmNavigationDialog: React.FC;
}

export function useUnsavedChangesWarning(
  options: UseUnsavedChangesWarningOptions = {}
): UseUnsavedChangesWarningReturn {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
    enabled = true,
  } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const isNavigating = useRef(false);

  // Handle browser beforeunload event
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message, enabled]);

  // Intercept link clicks for in-app navigation
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && !isNavigating.current) {
        const url = new URL(link.href, window.location.origin);

        // Only intercept internal navigation
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingLocation(url.pathname + url.search);
          setShowDialog(true);
        }
      }
    };

    // Use capture phase to intercept before wouter handles it
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges, enabled]);

  const confirmNavigation = useCallback(() => {
    isNavigating.current = true;
    setShowDialog(false);
    setHasUnsavedChanges(false);

    if (pendingLocation) {
      setLocation(pendingLocation);
      setPendingLocation(null);
    }

    // Reset flag after navigation
    setTimeout(() => {
      isNavigating.current = false;
    }, 100);
  }, [pendingLocation, setLocation]);

  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingLocation(null);
  }, []);

  // Dialog component to be rendered in the form
  const ConfirmNavigationDialog: React.FC = useCallback(() => {
    return (
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>
              Leave Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [showDialog, message, confirmNavigation, cancelNavigation]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    confirmNavigation,
    cancelNavigation,
    ConfirmNavigationDialog,
  };
}

/**
 * Simple hook that only handles beforeunload event
 * Use when you don't need the navigation dialog
 */
export function useBeforeUnloadWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);
}

export default useUnsavedChangesWarning;

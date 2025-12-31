/**
 * VIP Portal Authentication Hook (Updated for FEATURE-012)
 * 
 * Manages VIP portal authentication state.
 * 
 * Key changes for FEATURE-012:
 * - Impersonation sessions use sessionStorage (tab-specific) instead of localStorage
 * - Regular client sessions continue to use localStorage (persistent)
 * - This prevents cross-tab conflicts when admin has multiple impersonation sessions
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// Storage keys
const STORAGE_KEYS = {
  SESSION_TOKEN: "vip_session_token",
  CLIENT_ID: "vip_client_id",
  CLIENT_NAME: "vip_client_name",
  IMPERSONATION: "vip_impersonation",
  SESSION_GUID: "vip_session_guid",
} as const;

/**
 * Gets the appropriate storage based on whether this is an impersonation session.
 * - Impersonation: sessionStorage (tab-specific, prevents conflicts)
 * - Regular: localStorage (persistent across tabs)
 */
function getStorage(isImpersonation: boolean): globalThis.Storage {
  return isImpersonation ? sessionStorage : localStorage;
}

/**
 * Checks if there's an impersonation session in sessionStorage.
 * This takes precedence over localStorage for the current tab.
 */
function checkForImpersonationSession(): {
  hasImpersonation: boolean;
  token: string | null;
  clientId: string | null;
  clientName: string | null;
  sessionGuid: string | null;
} {
  const token = sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  const isImpersonation = sessionStorage.getItem(STORAGE_KEYS.IMPERSONATION) === "true";
  
  if (token && isImpersonation) {
    return {
      hasImpersonation: true,
      token,
      clientId: sessionStorage.getItem(STORAGE_KEYS.CLIENT_ID),
      clientName: sessionStorage.getItem(STORAGE_KEYS.CLIENT_NAME),
      sessionGuid: sessionStorage.getItem(STORAGE_KEYS.SESSION_GUID),
    };
  }
  
  return {
    hasImpersonation: false,
    token: null,
    clientId: null,
    clientName: null,
    sessionGuid: null,
  };
}

/**
 * Checks for a regular session in localStorage.
 */
function checkForRegularSession(): {
  hasSession: boolean;
  token: string | null;
  clientId: string | null;
  clientName: string | null;
} {
  const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  const isImpersonation = localStorage.getItem(STORAGE_KEYS.IMPERSONATION) === "true";
  
  // Only return if it's NOT an impersonation session
  if (token && !isImpersonation) {
    return {
      hasSession: true,
      token,
      clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID),
      clientName: localStorage.getItem(STORAGE_KEYS.CLIENT_NAME),
    };
  }
  
  return {
    hasSession: false,
    token: null,
    clientId: null,
    clientName: null,
  };
}

export function useVIPPortalAuth() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [isImpersonation, setIsImpersonation] = useState(false);
  const [sessionGuid, setSessionGuid] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    // First, check for impersonation session in sessionStorage (takes precedence)
    const impersonationCheck = checkForImpersonationSession();
    
    if (impersonationCheck.hasImpersonation) {
      setSessionToken(impersonationCheck.token);
      setClientId(impersonationCheck.clientId ? parseInt(impersonationCheck.clientId) : null);
      setClientName(impersonationCheck.clientName);
      setIsImpersonation(true);
      setSessionGuid(impersonationCheck.sessionGuid);
      setIsInitialized(true);
      return;
    }
    
    // Otherwise, check for regular session in localStorage
    const regularCheck = checkForRegularSession();
    
    if (regularCheck.hasSession) {
      setSessionToken(regularCheck.token);
      setClientId(regularCheck.clientId ? parseInt(regularCheck.clientId) : null);
      setClientName(regularCheck.clientName);
      setIsImpersonation(false);
      setSessionGuid(null);
      setIsInitialized(true);
      return;
    }
    
    // No session found
    setIsInitialized(true);
  }, []);

  // Redirect to login if not authenticated (after initialization)
  useEffect(() => {
    if (isInitialized && !sessionToken) {
      // Don't redirect if we're on the impersonate page (token exchange)
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/auth/impersonate")) {
        setLocation("/vip-portal/login");
      }
    }
  }, [isInitialized, sessionToken, setLocation]);

  // Verify session with server
  const { data: session, isError } = trpc.vipPortal.auth.verifySession.useQuery(
    { sessionToken: sessionToken || "" },
    { enabled: !!sessionToken && isInitialized }
  );

  // Handle session verification error
  useEffect(() => {
    if (isError && isInitialized) {
      // Session invalid, logout
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, isInitialized]);

  /**
   * Logs out the current session.
   * For impersonation sessions, also notifies the server to end the session.
   */
  const logout = useCallback(async () => {
    const storage = getStorage(isImpersonation);
    
    // Clear storage
    storage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    storage.removeItem(STORAGE_KEYS.CLIENT_ID);
    storage.removeItem(STORAGE_KEYS.CLIENT_NAME);
    storage.removeItem(STORAGE_KEYS.IMPERSONATION);
    storage.removeItem(STORAGE_KEYS.SESSION_GUID);
    
    // If this was an impersonation session, close the tab
    if (isImpersonation) {
      // Try to close the tab (may not work if not opened by script)
      window.close();
      // If window.close() didn't work, redirect to a "session ended" page
      setTimeout(() => {
        window.location.href = "/vip-portal/session-ended";
      }, 100);
      return;
    }
    
    // Regular logout - redirect to login
    setSessionToken(null);
    setClientId(null);
    setClientName(null);
    setIsImpersonation(false);
    setSessionGuid(null);
    setLocation("/vip-portal/login");
  }, [isImpersonation, setLocation]);

  /**
   * Sets up an impersonation session (called from token exchange page).
   */
  const setupImpersonationSession = useCallback((data: {
    sessionToken: string;
    clientId: number;
    clientName: string;
    sessionGuid: string;
  }) => {
    // Store in sessionStorage for tab-specific isolation
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.sessionToken);
    sessionStorage.setItem(STORAGE_KEYS.CLIENT_ID, data.clientId.toString());
    sessionStorage.setItem(STORAGE_KEYS.CLIENT_NAME, data.clientName);
    sessionStorage.setItem(STORAGE_KEYS.IMPERSONATION, "true");
    sessionStorage.setItem(STORAGE_KEYS.SESSION_GUID, data.sessionGuid);
    
    // Update state
    setSessionToken(data.sessionToken);
    setClientId(data.clientId);
    setClientName(data.clientName);
    setIsImpersonation(true);
    setSessionGuid(data.sessionGuid);
  }, []);

  /**
   * Sets up a regular client session (called from login page).
   */
  const setupRegularSession = useCallback((data: {
    sessionToken: string;
    clientId: number;
    clientName: string;
  }) => {
    // Store in localStorage for persistence
    localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.sessionToken);
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, data.clientId.toString());
    localStorage.setItem(STORAGE_KEYS.CLIENT_NAME, data.clientName);
    localStorage.setItem(STORAGE_KEYS.IMPERSONATION, "false");
    
    // Update state
    setSessionToken(data.sessionToken);
    setClientId(data.clientId);
    setClientName(data.clientName);
    setIsImpersonation(false);
    setSessionGuid(null);
  }, []);

  return {
    sessionToken,
    clientId: clientId || 0,
    clientName: clientName || "",
    isAuthenticated: !!sessionToken && !!session,
    isImpersonation,
    sessionGuid,
    isInitialized,
    logout,
    setupImpersonationSession,
    setupRegularSession,
  };
}

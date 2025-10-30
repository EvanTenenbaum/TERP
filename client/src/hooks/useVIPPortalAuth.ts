import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function useVIPPortalAuth() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage
    const token = localStorage.getItem("vip_session_token");
    const id = localStorage.getItem("vip_client_id");
    const name = localStorage.getItem("vip_client_name");

    if (token && id) {
      setSessionToken(token);
      setClientId(parseInt(id));
      setClientName(name);
    } else {
      // Redirect to login if not authenticated
      setLocation("/vip-portal/login");
    }
  }, [setLocation]);

  const { data: session, isError } = trpc.vipPortal.auth.verifySession.useQuery(
    { sessionToken: sessionToken || "" },
    { enabled: !!sessionToken }
  );

  useEffect(() => {
    if (isError) {
      // Session invalid, redirect to login
      logout();
    }
  }, [isError]);

  const logout = () => {
    localStorage.removeItem("vip_session_token");
    localStorage.removeItem("vip_client_id");
    localStorage.removeItem("vip_client_name");
    setLocation("/vip-portal/login");
  };

  return {
    sessionToken,
    clientId: clientId || 0,
    clientName: clientName || "",
    isAuthenticated: !!sessionToken && !!session,
    logout,
  };
}

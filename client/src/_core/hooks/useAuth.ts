import { getLoginUrl } from "@/const";
import { clearAuthStorage } from "@/lib/logout";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const localBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_LOGIN_LOCAL === "true";

const localBypassUser = {
  id: -1,
  username: "local-dev",
  role: "super_admin",
  permissions: ["*"],
  email: "local-dev@terp.local",
  firstName: "Local",
  lastName: "Developer",
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !localBypassEnabled,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    if (localBypassEnabled) {
      return;
    }

    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      // TER-1149: Swallow UNAUTHORIZED (already logged out). For any other
      // error we still force the client into the unauthenticated state so
      // the user isn't stranded holding a cached admin session locally.
      if (
        !(
          error instanceof TRPCClientError &&
          error.data?.code === "UNAUTHORIZED"
        )
      ) {
        console.error("auth.logout failed", error);
      }
    } finally {
      // TER-1149: Nuke the entire tRPC cache, then force a full page reload.
      // `utils.auth.me.setData(undefined)` alone leaves every other query
      // (orders, inventory, clients, …) populated with the prior user's
      // data, and wouter SPA navigation keeps React/Zustand state alive.
      utils.auth.me.setData(undefined, undefined);
      await utils.invalidate();
      // TER-1197: centralized clear for every auth-bearing storage key so
      // stale user info / VIP portal session cannot leak across logins.
      clearAuthStorage();
      if (typeof window !== "undefined") {
        window.location.assign(getLoginUrl());
      }
    }
  }, [logoutMutation, utils]);

  // FIXED: Moved side effect (localStorage) to useEffect instead of useMemo
  const state = useMemo(() => {
    if (localBypassEnabled) {
      return {
        user: localBypassUser,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Side effect for localStorage should be in useEffect, not useMemo
  useEffect(() => {
    if (localBypassEnabled) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(localBypassUser)
      );
      return;
    }

    if (meQuery.data !== undefined) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

import { getLoginUrl } from "@/const";
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

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, undefined);
    },
  });

  const logout = useCallback(async () => {
    if (localBypassEnabled) {
      return;
    }

    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, undefined);
      await utils.auth.me.invalidate();
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

    window.location.href = redirectPath
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

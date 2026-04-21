/**
 * Centralized client-side logout helper (TER-1197).
 *
 * Every auth- or identity-bearing browser-storage key the client writes
 * must be listed here so that `clearAuthStorage()` wipes all of them
 * during logout. Previously each caller only cleared its own key, so
 * stale state (cached user info, VIP portal session data, impersonation
 * flag) leaked across logins and produced confused admin/VIP mixing.
 *
 * When adding a new auth-related storage key anywhere in the client,
 * add it to AUTH_STORAGE_KEYS below.
 */
export const AUTH_STORAGE_KEYS = [
  // Staff/admin runtime cache (client/src/_core/hooks/useAuth.ts)
  "manus-runtime-user-info",
  // VIP portal session (client/src/hooks/useVIPPortalAuth.ts)
  "vip_session_token",
  "vip_client_id",
  "vip_client_name",
  "vip_impersonation",
  "vip_session_guid",
] as const;

export type AuthStorageKey = (typeof AUTH_STORAGE_KEYS)[number];

/**
 * Remove every auth/identity key from both localStorage and sessionStorage.
 *
 * Safe to call from SSR contexts — no-ops when `window` is undefined.
 * Individual storage errors (e.g. Safari private mode) are swallowed so
 * the logout flow is never blocked.
 */
export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;

  for (const key of AUTH_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

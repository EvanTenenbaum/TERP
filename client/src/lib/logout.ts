/**
 * Centralized logout utility (H-8).
 *
 * Calls the server logout endpoint, removes all known auth-related
 * localStorage keys, then redirects the user to the root path.
 */

/** All localStorage keys that hold authentication / session data. */
export const AUTH_STORAGE_KEYS = [
  "manus-runtime-user-info",
  "vip_session_token",
  "vip_impersonation",
] as const;

/**
 * Perform a full client-side logout:
 * 1. POST /api/auth/logout  (best-effort — errors are swallowed)
 * 2. Remove all known auth localStorage keys
 * 3. Redirect to /
 */
export async function performLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout request failed:", error);
  }

  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }

  window.location.href = "/";
}

/**
 * Remove all known auth localStorage keys without making a network request.
 * Useful for cleanup inside hooks / effects.
 */
export function clearAuthStorage(): void {
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

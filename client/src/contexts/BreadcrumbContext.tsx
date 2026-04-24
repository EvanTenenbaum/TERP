/**
 * BreadcrumbContext — TER-1362
 *
 * Lets page-level components supply human-friendly labels that the globally
 * rendered `AppBreadcrumb` should use when it encounters a matching raw
 * segment (e.g. `/clients/105` → `"Sierra Nevada Farms"`, or
 * `/sales?tab=create-order` → `"New Order"`).
 *
 * `AppBreadcrumb` lives in the shared `AppHeader`, so individual pages do
 * not render it directly. Pages register their resolved names via the
 * `useBreadcrumbResolvedNames` hook; the breadcrumb reads from context and
 * falls back to its built-in tRPC entity resolver / raw `#<id>` for any key
 * that is not in the map.
 *
 * Keys are matched against:
 *  - Raw URL segments (`"105"`) — the typical shape for `/clients/:id` et al.
 *  - Tab values (`"create-order"`) — for workspace routes whose active
 *    sub-view lives in a `?tab=` query param.
 *
 * A `null` value explicitly declares "no resolved name yet" (e.g. while the
 * client query is in flight) and is treated the same as "not provided".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type BreadcrumbResolvedNames = Record<string, string | null | undefined>;

interface BreadcrumbContextValue {
  resolvedNames: BreadcrumbResolvedNames;
  registerResolvedNames: (id: symbol, names: BreadcrumbResolvedNames) => void;
  unregisterResolvedNames: (id: symbol) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

/**
 * Merge all currently registered name maps into a single flat lookup, with
 * later registrations winning on key collisions. Undefined/null values are
 * dropped so the breadcrumb always treats them as "not provided".
 */
function mergeResolvedNames(
  registrations: ReadonlyMap<symbol, BreadcrumbResolvedNames>
): BreadcrumbResolvedNames {
  const merged: Record<string, string> = {};
  for (const entry of registrations.values()) {
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === "string" && value.length > 0) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const registrationsRef = useRef<Map<symbol, BreadcrumbResolvedNames>>(
    new Map()
  );
  const [resolvedNames, setResolvedNames] = useState<BreadcrumbResolvedNames>(
    () => ({})
  );

  const recomputeResolvedNames = useCallback(() => {
    setResolvedNames(mergeResolvedNames(registrationsRef.current));
  }, []);

  const registerResolvedNames = useCallback(
    (id: symbol, names: BreadcrumbResolvedNames) => {
      registrationsRef.current.set(id, names);
      recomputeResolvedNames();
    },
    [recomputeResolvedNames]
  );

  const unregisterResolvedNames = useCallback(
    (id: symbol) => {
      if (registrationsRef.current.delete(id)) {
        recomputeResolvedNames();
      }
    },
    [recomputeResolvedNames]
  );

  const value = useMemo<BreadcrumbContextValue>(
    () => ({
      resolvedNames,
      registerResolvedNames,
      unregisterResolvedNames,
    }),
    [resolvedNames, registerResolvedNames, unregisterResolvedNames]
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Internal accessor used by `AppBreadcrumb` to read the current merged
 * resolved-names map. Safe to call outside a provider — defaults to `{}`.
 */
export function useBreadcrumbResolvedNamesMap(): BreadcrumbResolvedNames {
  return useContext(BreadcrumbContext)?.resolvedNames ?? {};
}

/**
 * Register a `resolvedNames` map for the breadcrumb while the calling
 * component is mounted. Safe to call without a provider (in which case it
 * becomes a no-op, e.g. for tests that do not mount the header).
 *
 * @example
 *   const params = useParams<{ id: string }>();
 *   const { data: client } = trpc.clients.getById.useQuery({ clientId: +params.id });
 *   useBreadcrumbResolvedNames({ [params.id]: client?.name ?? null });
 */
export function useBreadcrumbResolvedNames(names: BreadcrumbResolvedNames) {
  const ctx = useContext(BreadcrumbContext);
  const idRef = useRef<symbol | null>(null);

  // Stable identity for the map contents so we only re-register on real
  // changes. JSON works here because keys/values are primitives.
  const serialised = JSON.stringify(names);

  useEffect(() => {
    if (!ctx) return;
    if (!idRef.current) idRef.current = Symbol("breadcrumb-resolved-names");
    const id = idRef.current;
    ctx.registerResolvedNames(id, names);
    return () => {
      ctx.unregisterResolvedNames(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, serialised]);
}

export default BreadcrumbContext;

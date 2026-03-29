import { lazy, Suspense, useEffect } from "react";
import { useSearch } from "wouter";

const STAGING_APP_ID = "terp-staging";
const SEARCH_PARAM = "agentation";
const STORAGE_KEY = "terp:agentation-enabled";
const AGENTATION_ENDPOINT = "http://localhost:4747";

const AgentationToolbar = lazy(async () => {
  const { Agentation } = await import("agentation");
  return { default: Agentation };
});

function parseAgentationToggle(value: string | null): boolean | null {
  switch (value?.trim().toLowerCase()) {
    case "1":
    case "true":
    case "on":
    case "yes":
      return true;
    case "0":
    case "false":
    case "off":
    case "no":
      return false;
    default:
      return null;
  }
}

export function StagingAgentation() {
  const search = useSearch();
  const isStagingBuild = import.meta.env.VITE_APP_ID === STAGING_APP_ID;

  const enabled =
    isStagingBuild && typeof window !== "undefined"
      ? (() => {
          const params = new URLSearchParams(search);
          const queryToggle = parseAgentationToggle(params.get(SEARCH_PARAM));

          if (queryToggle !== null) {
            return queryToggle;
          }

          return window.localStorage.getItem(STORAGE_KEY) === "true";
        })()
      : false;

  useEffect(() => {
    if (!isStagingBuild || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  }, [enabled, isStagingBuild]);

  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AgentationToolbar endpoint={AGENTATION_ENDPOINT} />
    </Suspense>
  );
}

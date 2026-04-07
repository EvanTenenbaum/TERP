import { lazy, Suspense } from "react";
import { useSearch } from "wouter";

const STAGING_APP_ID = "terp-staging";
const SEARCH_PARAM = "agentation";
const DEFAULT_AGENTATION_ENDPOINT = "http://localhost:4747";

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
  const params = new URLSearchParams(search);
  const queryToggle = parseAgentationToggle(params.get(SEARCH_PARAM));
  const endpoint = (
    import.meta.env.VITE_AGENTATION_ENDPOINT || DEFAULT_AGENTATION_ENDPOINT
  ).trim();

  // Staging should surface Agentation by default. Keep a query-param kill switch
  // for temporary debugging or clean-browser verification.
  const enabled = isStagingBuild && queryToggle !== false;

  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AgentationToolbar endpoint={endpoint} />
    </Suspense>
  );
}

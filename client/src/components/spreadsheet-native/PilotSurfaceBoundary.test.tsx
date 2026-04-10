/**
 * @vitest-environment jsdom
 */

import { lazy } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PilotSurfaceBoundary } from "./PilotSurfaceBoundary";

const NeverResolves = lazy(
  () => new Promise<never>(() => {
    // Intentionally unresolved so Suspense stays in the loading path.
  })
);

describe("PilotSurfaceBoundary", () => {
  it("renders the provided fallback while the lazy surface is still loading", () => {
    render(
      <PilotSurfaceBoundary
        fallback={<div data-testid="pilot-surface-fallback">Loading workspace</div>}
      >
        <NeverResolves />
      </PilotSurfaceBoundary>
    );

    expect(screen.getByTestId("pilot-surface-fallback")).toBeInTheDocument();
  });
});

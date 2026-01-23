import { afterEach, beforeEach, vi } from "vitest";

// Setup DOM container for React Testing Library
beforeEach(() => {
  // Ensure document.body has a root element for React to render into
  if (typeof document !== "undefined") {
    // Clear any existing content first
    document.body.innerHTML = "";

    // Create the root container
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    // Also create a portal container for modals/dialogs
    const portal = document.createElement("div");
    portal.id = "portal-root";
    document.body.appendChild(portal);
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  // Clean up DOM container - but don't clear innerHTML here
  // The cleanup from @testing-library/react handles React unmounting
  // Clearing innerHTML here can cause race conditions with React's cleanup
  if (typeof document !== "undefined") {
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = ""; // Only clear the root contents, not remove it
    }
    const portal = document.getElementById("portal-root");
    if (portal) {
      portal.innerHTML = "";
    }
  }
});

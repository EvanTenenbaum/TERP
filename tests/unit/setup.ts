import { afterEach, beforeEach, vi } from "vitest";

// Setup DOM container for React Testing Library
beforeEach(() => {
  // Ensure document.body has a root element for React to render into
  if (typeof document !== "undefined") {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  // Clean up DOM container
  if (typeof document !== "undefined") {
    const root = document.getElementById("root");
    if (root) {
      document.body.removeChild(root);
    }
    // Clean up any other elements that tests might have created
    document.body.innerHTML = "";
  }
});

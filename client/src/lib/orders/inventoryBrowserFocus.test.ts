/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import {
  findInventoryBrowserSearchInput,
  queueInventoryBrowserSearchFocus,
} from "./inventoryBrowserFocus";

describe("inventoryBrowserFocus", () => {
  it("finds the inventory search input by explicit selectors first", () => {
    document.body.innerHTML = `
      <section id="inventory-browser-section">
        <input aria-label="Search inventory" />
        <input type="text" />
      </section>
    `;

    const root = document.getElementById("inventory-browser-section");
    const input = findInventoryBrowserSearchInput(root);
    expect(input?.getAttribute("aria-label")).toBe("Search inventory");
  });

  it("queues focus onto the search input", () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML = `
        <section id="inventory-browser-section">
          <input placeholder="Search inventory..." />
        </section>
      `;

      const root = document.getElementById(
        "inventory-browser-section"
      ) as HTMLElement;
      root.scrollIntoView = vi.fn();

      queueInventoryBrowserSearchFocus(root, 2);
      vi.runAllTimers();

      const input = root.querySelector(
        'input[placeholder="Search inventory..."]'
      ) as HTMLInputElement;
      expect(document.activeElement).toBe(input);
      expect(root.scrollIntoView).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

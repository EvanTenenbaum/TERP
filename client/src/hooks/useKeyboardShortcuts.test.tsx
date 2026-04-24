/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function ShortcutHarness({ onTrigger }: { onTrigger: () => void }) {
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      callback: onTrigger,
    },
  ]);

  return <div>Shortcut Harness</div>;
}

describe("useKeyboardShortcuts", () => {
  it("ignores keydown events that do not expose a keyboard key", () => {
    const onTrigger = vi.fn();
    render(<ShortcutHarness onTrigger={onTrigger} />);

    expect(() => window.dispatchEvent(new Event("keydown"))).not.toThrow();
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("still fires valid shortcuts", () => {
    const onTrigger = vi.fn();
    render(<ShortcutHarness onTrigger={onTrigger} />);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
    );

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});

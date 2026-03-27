import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (typeof event.key !== "string" || event.key.length === 0) {
        return;
      }

      for (const shortcut of shortcuts) {
        const shortcutKey =
          typeof shortcut.key === "string" ? shortcut.key.toLowerCase() : null;
        if (!shortcutKey) {
          continue;
        }

        const keyMatches = event.key.toLowerCase() === shortcutKey;
        const ctrlMatches = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Don't trigger if user is typing in an input/textarea
          const target = event.target;
          const isInput =
            target instanceof HTMLElement &&
            (target.tagName === "INPUT" ||
              target.tagName === "TEXTAREA" ||
              target.isContentEditable);

          // Allow Ctrl+Shift+T even in inputs (quick add task)
          const isQuickAddShortcut =
            shortcutKey === "t" && shortcut.ctrl && shortcut.shift;

          if (!isInput || isQuickAddShortcut) {
            event.preventDefault();
            shortcut.callback();
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown as never);

    return () => {
      window.removeEventListener("keydown", handleKeyDown as never);
    };
  }, [shortcuts]);
}

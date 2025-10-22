import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: "n",
      description: "New (contextual)",
      action: () => {
        const path = window.location.pathname;
        if (path.includes("/sales")) navigate("/sales/orders/new");
        else if (path.includes("/clients")) toast.info("Press to create new client");
        else if (path.includes("/vendors")) toast.info("Press to create new vendor");
        else if (path.includes("/inventory")) toast.info("Press to create new batch");
      },
    },
    {
      key: "Escape",
      description: "Close panel/modal",
      action: () => {
        // Handled by individual modals
      },
    },
  ]);
}

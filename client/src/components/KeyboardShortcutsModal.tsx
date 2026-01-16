/**
 * Keyboard Shortcuts Modal
 * ENH-001: Displays available keyboard shortcuts to users
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    keys: ["Ctrl", "K"],
    description: "Open command palette",
    category: "Navigation",
  },
  {
    keys: ["Ctrl", "N"],
    description: "Create new order",
    category: "Navigation",
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
    category: "Navigation",
  },
  {
    keys: ["Esc"],
    description: "Close dialogs and modals",
    category: "Navigation",
  },

  // Actions
  {
    keys: ["Ctrl", "Shift", "T"],
    description: "Quick add task",
    category: "Actions",
  },

  // In Command Palette
  { keys: ["D"], description: "Go to Dashboard", category: "Command Palette" },
  { keys: ["O"], description: "Go to Orders", category: "Command Palette" },
  { keys: ["I"], description: "Go to Inventory", category: "Command Palette" },
  { keys: ["C"], description: "Go to Clients", category: "Command Palette" },
  { keys: ["L"], description: "Go to Calendar", category: "Command Palette" },
  { keys: ["T"], description: "Go to Todo Lists", category: "Command Palette" },
  { keys: ["S"], description: "Go to Settings", category: "Command Palette" },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, idx) => (
                    <div
                      key={`${category}-${shortcut.description}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span
                            key={`${key}-${keyIdx}`}
                            className="flex items-center gap-1"
                          >
                            <Kbd>{key}</Kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">
                                +
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <Kbd>?</Kbd> anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

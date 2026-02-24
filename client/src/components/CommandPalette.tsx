import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { HelpCircle, LayoutDashboard, Plus, ReceiptText } from "lucide-react";
import { navigationItems } from "@/config/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  const navigationCommands = useMemo(() => {
    const commands: Array<{
      id: string;
      label: string;
      path: string;
      icon: typeof LayoutDashboard;
      shortcut?: string;
    }> = [
      {
        id: "dashboard",
        label: "Go to Dashboard",
        path: "/",
        icon: LayoutDashboard,
        shortcut: "D",
      },
    ];

    const seenPaths = new Set(commands.map(command => command.path));

    for (const item of navigationItems) {
      if (seenPaths.has(item.path)) {
        continue;
      }
      seenPaths.add(item.path);
      commands.push({
        id: `nav:${item.path}`,
        label: item.name,
        path: item.path,
        icon: item.icon,
      });
    }

    return commands;
  }, []);

  const actionCommands = [
    {
      id: "new-sale",
      label: "Create New Sale",
      icon: Plus,
      shortcut: "N",
      action: () => {
        setLocation("/orders/create");
        onOpenChange(false);
      },
    },
    {
      id: "record-receipt",
      label: "Record Receipt",
      icon: ReceiptText,
      shortcut: "R",
      action: () => {
        setLocation("/receiving");
        onOpenChange(false);
      },
    },
    {
      id: "help",
      label: "Help & Documentation",
      icon: HelpCircle,
      shortcut: "?",
      action: () => {
        setLocation("/help");
        onOpenChange(false);
      },
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput autoFocus placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map(item => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} navigation`}
                onSelect={() => {
                  setLocation(item.path);
                  onOpenChange(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Actions">
          {actionCommands.map(item => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} action`}
                onSelect={item.action}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

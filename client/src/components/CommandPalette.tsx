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
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Settings,
  ListTodo,
  HelpCircle,
  Plus,
  Heart,
  DollarSign,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  const commands = [
    {
      group: "Navigation",
      items: [
        {
          id: "dashboard",
          label: "Go to Dashboard",
          icon: LayoutDashboard,
          shortcut: "D",
          action: () => {
            setLocation("/");
            onOpenChange(false);
          },
        },
        {
          id: "orders",
          label: "Orders",
          icon: ShoppingCart,
          shortcut: "O",
          action: () => {
            setLocation("/orders");
            onOpenChange(false);
          },
        },
        {
          id: "inventory",
          label: "Inventory",
          icon: Package,
          shortcut: "I",
          action: () => {
            setLocation("/inventory");
            onOpenChange(false);
          },
        },
        {
          id: "clients",
          label: "Clients",
          icon: Users,
          shortcut: "C",
          action: () => {
            setLocation("/clients");
            onOpenChange(false);
          },
        },
        {
          id: "calendar",
          label: "Calendar",
          icon: Calendar,
          shortcut: "L",
          action: () => {
            setLocation("/calendar");
            onOpenChange(false);
          },
        },
        {
          id: "todo-lists",
          label: "Todo Lists",
          icon: ListTodo,
          shortcut: "T",
          action: () => {
            setLocation("/todos");
            onOpenChange(false);
          },
        },
        {
          id: "interest-list",
          label: "Interest List",
          icon: Heart,
          action: () => {
            setLocation("/interest-list");
            onOpenChange(false);
          },
        },
        {
          id: "invoices",
          label: "Invoices",
          icon: DollarSign,
          action: () => {
            setLocation("/accounting/invoices");
            onOpenChange(false);
          },
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          shortcut: "S",
          action: () => {
            setLocation("/settings");
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: "Actions",
      items: [
        {
          id: "new-order",
          label: "Create New Order",
          icon: Plus,
          shortcut: "N",
          action: () => {
            setLocation("/orders/create");
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
      ],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map(group => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${group.group}`}
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
        ))}
      </CommandList>
    </CommandDialog>
  );
}

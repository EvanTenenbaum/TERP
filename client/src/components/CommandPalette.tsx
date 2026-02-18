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
  DollarSign,
  Trophy, // NAV-014: Leaderboard
  GitMerge, // Consolidated demand/supply workspace
  Tag, // NAV-014: Pricing Rules
  Workflow, // NAV-014: Workflow Queue
  CreditCard, // NAV-017: Credits
  Clock, // MEET-048: Time Clock
} from "lucide-react";
import {
  CREDITS_WORKSPACE,
  DEMAND_SUPPLY_WORKSPACE,
  INVENTORY_WORKSPACE,
  RELATIONSHIPS_WORKSPACE,
  SALES_WORKSPACE,
} from "@/config/workspaces";

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
          id: "sales",
          label: `${SALES_WORKSPACE.title} Workspace`,
          icon: ShoppingCart,
          shortcut: "O",
          action: () => {
            setLocation("/sales");
            onOpenChange(false);
          },
        },
        {
          id: "inventory",
          label: `${INVENTORY_WORKSPACE.title} Workspace`,
          icon: Package,
          shortcut: "I",
          action: () => {
            setLocation("/inventory");
            onOpenChange(false);
          },
        },
        {
          id: "relationships",
          label: `${RELATIONSHIPS_WORKSPACE.title} Workspace`,
          icon: Users,
          shortcut: "C",
          action: () => {
            setLocation("/relationships");
            onOpenChange(false);
          },
        },
        {
          id: "demand-supply",
          label: `${DEMAND_SUPPLY_WORKSPACE.title} Workspace`,
          icon: GitMerge,
          action: () => {
            setLocation("/demand-supply");
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
          id: "invoices",
          label: "Invoices",
          icon: DollarSign,
          action: () => {
            setLocation("/accounting/invoices");
            onOpenChange(false);
          },
        },
        {
          // UX-010: Renamed to "System Settings" for clarity
          id: "settings",
          label: "System Settings",
          icon: Settings,
          shortcut: "S",
          action: () => {
            setLocation("/settings");
            onOpenChange(false);
          },
        },
        // NAV-014: Add new routes to Command Palette
        {
          id: "leaderboard",
          label: "Leaderboard",
          icon: Trophy,
          action: () => {
            setLocation("/leaderboard");
            onOpenChange(false);
          },
        },
        {
          // QA-003 FIX: Changed path from /pricing-rules to /pricing/rules
          id: "pricing-rules",
          label: "Pricing Rules",
          icon: Tag,
          action: () => {
            setLocation("/pricing/rules");
            onOpenChange(false);
          },
        },
        {
          id: "workflow-queue",
          label: "Workflow Queue",
          icon: Workflow,
          action: () => {
            setLocation("/workflow-queue");
            onOpenChange(false);
          },
        },
        {
          // NAV-017: Credits management page
          id: "credits",
          label: `${CREDITS_WORKSPACE.title} Workspace`,
          icon: CreditCard,
          action: () => {
            setLocation("/credits");
            onOpenChange(false);
          },
        },
        {
          // MEET-048: Time Clock for hour tracking
          id: "time-clock",
          label: "Time Clock",
          icon: Clock,
          action: () => {
            setLocation("/time-clock");
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
          label: "Create New Sale",
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
      <CommandInput autoFocus placeholder="Type a command or search..." />
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

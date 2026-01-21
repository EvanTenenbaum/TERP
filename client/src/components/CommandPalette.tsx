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
  Trophy, // NAV-014: Leaderboard
  Target, // NAV-014: Client Needs
  GitMerge, // NAV-014: Matchmaking
  ClipboardList, // NAV-014: Quotes
  RotateCcw, // NAV-014: Returns
  Store, // NAV-014: Vendor Supply
  Tag, // NAV-014: Pricing Rules
  Workflow, // NAV-014: Workflow Queue
  CreditCard, // NAV-017: Credits
  Clock, // MEET-048: Time Clock
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
            setLocation("/accounting?tab=invoices");
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
          // QA-002 FIX: Changed path from /client-needs to /needs
          id: "client-needs",
          label: "Client Needs",
          icon: Target,
          action: () => {
            setLocation("/needs");
            onOpenChange(false);
          },
        },
        {
          id: "matchmaking",
          label: "Matchmaking",
          icon: GitMerge,
          action: () => {
            setLocation("/matchmaking");
            onOpenChange(false);
          },
        },
        {
          id: "quotes",
          label: "Quotes",
          icon: ClipboardList,
          action: () => {
            setLocation("/quotes");
            onOpenChange(false);
          },
        },
        {
          id: "returns",
          label: "Returns",
          icon: RotateCcw,
          action: () => {
            setLocation("/returns");
            onOpenChange(false);
          },
        },
        {
          id: "vendor-supply",
          label: "Vendor Supply",
          icon: Store,
          action: () => {
            setLocation("/vendor-supply");
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
          label: "Credits",
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

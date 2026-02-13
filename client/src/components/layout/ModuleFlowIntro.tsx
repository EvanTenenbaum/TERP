import {
  Boxes,
  Calculator,
  FileText,
  LayoutDashboard,
  ShoppingCart,
  Target,
  Tag,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type FlowStep = {
  title: string;
  detail: string;
};

type ModuleFlowIntroConfig = {
  key: string;
  title: string;
  icon: LucideIcon;
  moduleLabel: string;
  summary: string;
  outcome: string;
  watchFor: string;
  trainerTip: string;
  themeClasses: {
    panel: string;
    iconWrap: string;
    badge: string;
    tipAccent: string;
  };
  steps: [FlowStep, FlowStep, FlowStep];
  routePrefixes?: string[];
  exactPaths?: string[];
};

const MODULE_FLOW_INTROS: ModuleFlowIntroConfig[] = [
  {
    key: "dashboard",
    title: "Dashboard Operating Rhythm",
    icon: LayoutDashboard,
    moduleLabel: "Dashboard",
    summary:
      "Use dashboard widgets as your operational snapshot, then jump into the module where action is needed.",
    outcome:
      "Teams make decisions from the same live metrics instead of separate spreadsheets or memory.",
    watchFor:
      "Treating widgets as static reports instead of triggers for immediate follow-up in linked modules.",
    trainerTip:
      "Review widgets, open the target module, complete action, then return to verify the metric changed.",
    themeClasses: {
      panel:
        "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/70",
      iconWrap: "bg-sky-100 text-sky-700 ring-sky-200",
      badge: "bg-sky-100 text-sky-800",
      tipAccent: "border-l-sky-500",
    },
    steps: [
      {
        title: "Review Visible Widgets",
        detail:
          "Check the active cards and widgets for inventory, cash, debt, workflow, and opportunities.",
      },
      {
        title: "Route To Action",
        detail:
          "Open the related module from navigation when a metric needs intervention.",
      },
      {
        title: "Customize View",
        detail:
          "Show or hide widgets so the dashboard reflects what your role needs to monitor daily.",
      },
    ],
    exactPaths: ["/", "/dashboard"],
  },
  {
    key: "inventory",
    title: "Inventory Control Flow",
    icon: Boxes,
    moduleLabel: "Inventory",
    summary:
      "Manage batches by status, quantity, and valuation so stock decisions are based on current data.",
    outcome:
      "Current inventory screens reflect real batch state and reduce stock mismatch during fulfillment.",
    watchFor:
      "Leaving batches in stale statuses after intake or quality changes.",
    trainerTip:
      "When a batch state changes operationally, update the status in the same session.",
    themeClasses: {
      panel:
        "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70",
      iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      badge: "bg-emerald-100 text-emerald-800",
      tipAccent: "border-l-emerald-500",
    },
    steps: [
      {
        title: "Find The Right Batch",
        detail:
          "Use search, category, and status filters to quickly isolate relevant inventory records.",
      },
      {
        title: "Inspect Key Metrics",
        detail:
          "Open the inspector to review quantities, valuation, product details, and current batch status.",
      },
      {
        title: "Update And Add",
        detail:
          "Use status updates for existing batches and Add Batch for new intake entries.",
      },
    ],
    routePrefixes: ["/inventory"],
  },
  {
    key: "accounting",
    title: "Accounting Close-Ready Flow",
    icon: Calculator,
    moduleLabel: "Accounting",
    summary:
      "Track receivables, payables, and accounting activity from one module with aging and status visibility.",
    outcome:
      "AR/AP teams can see who owes, who is owed, and what to action next without jumping systems.",
    watchFor:
      "Overdue invoices or bills left unworked while totals continue to age.",
    trainerTip:
      "Use dashboard aging plus invoice/bill detail views together to prioritize collection and payment actions.",
    themeClasses: {
      panel:
        "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70",
      iconWrap: "bg-amber-100 text-amber-700 ring-amber-200",
      badge: "bg-amber-100 text-amber-800",
      tipAccent: "border-l-amber-500",
    },
    steps: [
      {
        title: "Monitor AR/AP Dashboard",
        detail:
          "Review aging buckets, top debtors, and top vendors owed to set daily priorities.",
      },
      {
        title: "Work Transaction Queues",
        detail:
          "Open invoices, bills, and payments to update statuses and process open items.",
      },
      {
        title: "Execute Follow-Up Actions",
        detail:
          "Record payments, send reminders, and use supporting accounting pages for deeper review.",
      },
    ],
    routePrefixes: ["/accounting"],
  },
  {
    key: "clients",
    title: "Client Lifecycle Flow",
    icon: Users2,
    moduleLabel: "Clients",
    summary:
      "Keep client contact, type, and financial context in one place so sales and finance actions stay coordinated.",
    outcome:
      "Client records stay actionable for quoting, ordering, and ledger review.",
    watchFor:
      "Client updates handled informally instead of being saved in the client record.",
    trainerTip:
      "When a client call ends, update profile and notes before moving to the next account.",
    themeClasses: {
      panel:
        "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/60",
      iconWrap: "bg-rose-100 text-rose-700 ring-rose-200",
      badge: "bg-rose-100 text-rose-800",
      tipAccent: "border-l-rose-500",
    },
    steps: [
      {
        title: "Find And Segment Clients",
        detail:
          "Use search and type filters to work the right buyer, supplier, or partner records.",
      },
      {
        title: "Maintain Profile Data",
        detail:
          "Edit contact details and notes directly in the work-surface inspector.",
      },
      {
        title: "Use Financial Context",
        detail:
          "Review credit/debt summary and open full profile or ledger for deeper account actions.",
      },
    ],
    routePrefixes: ["/clients", "/client-ledger"],
  },
  {
    key: "pricing",
    title: "Pricing Governance Flow",
    icon: Tag,
    moduleLabel: "Pricing",
    summary:
      "Define rule-based price adjustments and package them into profiles so quoting and order entry stay consistent.",
    outcome:
      "Pricing behavior is transparent, reusable, and easier to maintain.",
    watchFor: "Rules with overlapping logic but unclear priority ordering.",
    trainerTip:
      "Set priorities intentionally and review rule stacks whenever pricing outcomes look unexpected.",
    themeClasses: {
      panel:
        "border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70",
      iconWrap: "bg-blue-100 text-blue-700 ring-blue-200",
      badge: "bg-blue-100 text-blue-800",
      tipAccent: "border-l-blue-500",
    },
    steps: [
      {
        title: "Build Pricing Rules",
        detail:
          "Create adjustments (percent/dollar, markup/markdown) with condition keys and values.",
      },
      {
        title: "Set Rule Priority",
        detail:
          "Use priority values so competing rules resolve in a predictable order.",
      },
      {
        title: "Assemble Profiles",
        detail:
          "Group selected rules into pricing profiles and control rule order within each profile.",
      },
    ],
    routePrefixes: ["/pricing"],
  },
  {
    key: "quotes",
    title: "Quote-To-Commit Flow",
    icon: FileText,
    moduleLabel: "Quotes",
    summary:
      "Manage quote lifecycle from draft through send and acceptance, then convert accepted quotes into sales orders.",
    outcome: "Quote status and next action are always visible to the team.",
    watchFor:
      "Accepted quotes left unconverted, creating duplication in later order work.",
    trainerTip:
      "Use status filters daily to clear Draft and Sent backlogs before they go stale.",
    themeClasses: {
      panel:
        "border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/60",
      iconWrap: "bg-orange-100 text-orange-700 ring-orange-200",
      badge: "bg-orange-100 text-orange-800",
      tipAccent: "border-l-orange-500",
    },
    steps: [
      {
        title: "Create Or Edit Quote",
        detail:
          "Start new quotes through order creation and edit draft quotes from the inspector.",
      },
      {
        title: "Manage Communication",
        detail:
          "Track quote status and send quote emails with optional custom messages.",
      },
      {
        title: "Convert Accepted Quotes",
        detail:
          "Use Convert to Sale to create a sales order from an accepted quote.",
      },
    ],
    routePrefixes: ["/quotes"],
  },
  {
    key: "orders",
    title: "Order Fulfillment Flow",
    icon: ShoppingCart,
    moduleLabel: "Orders",
    summary:
      "Work orders through draft and confirmed stages with fulfillment status tracking and return handling tools.",
    outcome:
      "Order teams can see what is draft, confirmed, pending, shipped, returned, or restocked.",
    watchFor:
      "Draft orders that never get confirmed, or confirmed orders with stale fulfillment statuses.",
    trainerTip:
      "Keep draft cleanup and fulfillment status updates in the same daily routine.",
    themeClasses: {
      panel:
        "border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/70",
      iconWrap: "bg-teal-100 text-teal-700 ring-teal-200",
      badge: "bg-teal-100 text-teal-800",
      tipAccent: "border-l-teal-500",
    },
    steps: [
      {
        title: "Create And Confirm",
        detail:
          "Create new orders, edit drafts, and confirm draft orders when ready.",
      },
      {
        title: "Track Fulfillment State",
        detail:
          "Use status filters and inspector actions to manage active order progression.",
      },
      {
        title: "Handle Returns Workflow",
        detail:
          "Use return, restock, and vendor-return actions when post-fulfillment issues occur.",
      },
    ],
    routePrefixes: ["/orders", "/returns", "/pick-pack"],
  },
  {
    key: "needs-matching",
    title: "Demand-To-Match Flow",
    icon: Target,
    moduleLabel: "Needs & Matching",
    summary:
      "Track client needs, review smart opportunities, and use matching tools to connect demand with available supply.",
    outcome:
      "Sales teams can quickly see which needs have viable matches and launch the next action.",
    watchFor: "High-confidence matches not acted on while needs remain open.",
    trainerTip:
      "Review opportunities and suggested matches together so outreach and quoting happen while supply is still available.",
    themeClasses: {
      panel:
        "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/70",
      iconWrap: "bg-cyan-100 text-cyan-700 ring-cyan-200",
      badge: "bg-cyan-100 text-cyan-800",
      tipAccent: "border-l-cyan-500",
    },
    steps: [
      {
        title: "Work Needs Queue",
        detail:
          "Filter by status/priority, open need details, and monitor need-level match counts.",
      },
      {
        title: "Evaluate Matches",
        detail:
          "Use Matchmaking to compare active needs, vendor supply, and confidence-ranked suggestions.",
      },
      {
        title: "Trigger Follow-Up",
        detail:
          "From needs and matches, launch quote/order follow-up, reserve supply, or open client need detail pages.",
      },
    ],
    routePrefixes: ["/needs", "/matchmaking", "/interest-list"],
  },
];

function isExactPathMatch(pathname: string, paths: string[]): boolean {
  return paths.includes(pathname);
}

function isRoutePrefixMatch(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getActiveModuleFlowIntro(
  pathname: string
): ModuleFlowIntroConfig | undefined {
  return MODULE_FLOW_INTROS.find(moduleConfig => {
    if (
      moduleConfig.exactPaths &&
      isExactPathMatch(pathname, moduleConfig.exactPaths)
    ) {
      return true;
    }

    if (
      moduleConfig.routePrefixes &&
      isRoutePrefixMatch(pathname, moduleConfig.routePrefixes)
    ) {
      return true;
    }

    return false;
  });
}

export function ModuleFlowIntro() {
  const [location] = useLocation();
  const activeIntro = getActiveModuleFlowIntro(location);

  if (!activeIntro) {
    return null;
  }

  const ModuleIcon = activeIntro.icon;

  return (
    <section
      className={cn(
        "mb-5 overflow-hidden rounded-xl border shadow-sm",
        activeIntro.themeClasses.panel
      )}
    >
      <div className="space-y-4 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-lg p-2 ring-1",
              activeIntro.themeClasses.iconWrap
            )}
          >
            <ModuleIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                activeIntro.themeClasses.badge
              )}
            >
              {`${activeIntro.moduleLabel} ERP Trainer Guide`}
            </span>
            <h2 className="mt-1 text-sm font-semibold text-foreground md:text-base">
              {activeIntro.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeIntro.summary}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Outcome To Aim For
            </p>
            <p className="mt-1 text-sm text-foreground">
              {activeIntro.outcome}
            </p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Watch For
            </p>
            <p className="mt-1 text-sm text-foreground">
              {activeIntro.watchFor}
            </p>
          </article>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {activeIntro.steps.map((step, index) => (
            <article
              key={`${activeIntro.key}-${step.title}`}
              className="rounded-lg border border-border/70 bg-background/80 p-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {step.detail}
              </p>
            </article>
          ))}
        </div>

        <article
          className={cn(
            "rounded-lg border border-border/70 border-l-4 bg-background/80 p-3",
            activeIntro.themeClasses.tipAccent
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trainer Tip
          </p>
          <p className="mt-1 text-sm text-foreground">
            {activeIntro.trainerTip}
          </p>
        </article>
      </div>
    </section>
  );
}

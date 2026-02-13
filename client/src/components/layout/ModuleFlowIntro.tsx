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
    title: "How The Dashboard Works",
    icon: LayoutDashboard,
    moduleLabel: "Dashboard",
    summary: "Start here to see what needs attention today.",
    outcome: "Everyone works from the same live numbers.",
    watchFor: "Looking at cards without opening the page to fix the issue.",
    trainerTip:
      "Open a card, do the work, then come back and confirm the number changed.",
    themeClasses: {
      panel:
        "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/70",
      iconWrap: "bg-sky-100 text-sky-700 ring-sky-200",
      badge: "bg-sky-100 text-sky-800",
      tipAccent: "border-l-sky-500",
    },
    steps: [
      {
        title: "Check Key Cards",
        detail:
          "Review the cards for sales, cash, debt, inventory, and workflow.",
      },
      {
        title: "Open The Right Page",
        detail: "When a card shows a problem, open that area and take action.",
      },
      {
        title: "Keep It Relevant",
        detail: "Show only the cards your role needs to check each day.",
      },
    ],
    exactPaths: ["/", "/dashboard"],
  },
  {
    key: "inventory",
    title: "How Inventory Works",
    icon: Boxes,
    moduleLabel: "Inventory",
    summary: "Use this page to keep stock accurate and up to date.",
    outcome: "Your on-hand quantities and values stay current.",
    watchFor: "Forgetting to update status after intake or other changes.",
    trainerTip: "Update batch status as soon as real-world status changes.",
    themeClasses: {
      panel:
        "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70",
      iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      badge: "bg-emerald-100 text-emerald-800",
      tipAccent: "border-l-emerald-500",
    },
    steps: [
      {
        title: "Find The Item",
        detail: "Use search and filters to find the exact batch you need.",
      },
      {
        title: "Review Details",
        detail: "Check quantity, value, product details, and current status.",
      },
      {
        title: "Update Or Add",
        detail:
          "Update existing batches or add a new batch when inventory arrives.",
      },
    ],
    routePrefixes: ["/inventory"],
  },
  {
    key: "accounting",
    title: "How Accounting Works",
    icon: Calculator,
    moduleLabel: "Accounting",
    summary: "Track money in and money out in one place.",
    outcome: "You can quickly see what needs to be collected or paid.",
    watchFor: "Overdue invoices or bills sitting too long.",
    trainerTip: "Start with aging views, then work the oldest items first.",
    themeClasses: {
      panel:
        "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70",
      iconWrap: "bg-amber-100 text-amber-700 ring-amber-200",
      badge: "bg-amber-100 text-amber-800",
      tipAccent: "border-l-amber-500",
    },
    steps: [
      {
        title: "Check Totals And Aging",
        detail: "Review who owes you and who you owe.",
      },
      {
        title: "Open The Queues",
        detail: "Open invoices, bills, and payments that need work.",
      },
      {
        title: "Finish The Action",
        detail: "Record payments, send reminders, and close open items.",
      },
    ],
    routePrefixes: ["/accounting"],
  },
  {
    key: "clients",
    title: "How Client Records Work",
    icon: Users2,
    moduleLabel: "Clients",
    summary:
      "Keep each client record complete so every team sees the same info.",
    outcome: "Quotes, orders, and billing start from clean client data.",
    watchFor: "Saving updates in chat/email but not in the client record.",
    trainerTip: "After each client call, update notes before moving on.",
    themeClasses: {
      panel:
        "border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/60",
      iconWrap: "bg-rose-100 text-rose-700 ring-rose-200",
      badge: "bg-rose-100 text-rose-800",
      tipAccent: "border-l-rose-500",
    },
    steps: [
      {
        title: "Find The Client",
        detail: "Use search and filters to open the right client record.",
      },
      {
        title: "Update Core Info",
        detail: "Update contact details, client type, and notes.",
      },
      {
        title: "Check Financial Context",
        detail: "Review credit/debt and open profile or ledger if needed.",
      },
    ],
    routePrefixes: ["/clients", "/client-ledger"],
  },
  {
    key: "pricing",
    title: "How Pricing Works",
    icon: Tag,
    moduleLabel: "Pricing",
    summary: "Set pricing rules so quotes and orders stay consistent.",
    outcome: "The same pricing logic is used every time.",
    watchFor: "Rules that overlap and give confusing results.",
    trainerTip: "Set clear priorities and test rule output after changes.",
    themeClasses: {
      panel:
        "border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70",
      iconWrap: "bg-blue-100 text-blue-700 ring-blue-200",
      badge: "bg-blue-100 text-blue-800",
      tipAccent: "border-l-blue-500",
    },
    steps: [
      {
        title: "Create Rules",
        detail: "Define adjustments and when each one should apply.",
      },
      {
        title: "Set Rule Order",
        detail: "Use priority so conflicting rules resolve the right way.",
      },
      {
        title: "Group Into Profiles",
        detail: "Put rules into profiles you can reuse across customers.",
      },
    ],
    routePrefixes: ["/pricing"],
  },
  {
    key: "quotes",
    title: "How Quotes Work",
    icon: FileText,
    moduleLabel: "Quotes",
    summary:
      "Create quotes, send them, and convert accepted quotes into sales orders.",
    outcome: "Your team can always see which quotes need follow-up.",
    watchFor: "Accepted quotes that never get converted to an order.",
    trainerTip: "Review Draft and Sent quotes daily so nothing gets stale.",
    themeClasses: {
      panel:
        "border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/60",
      iconWrap: "bg-orange-100 text-orange-700 ring-orange-200",
      badge: "bg-orange-100 text-orange-800",
      tipAccent: "border-l-orange-500",
    },
    steps: [
      {
        title: "Create Or Edit",
        detail: "Create a new quote or edit an existing draft quote.",
      },
      {
        title: "Send And Track",
        detail: "Send the quote and track status changes.",
      },
      {
        title: "Convert Accepted Quote",
        detail: "When accepted, convert the quote into a sales order.",
      },
    ],
    routePrefixes: ["/quotes"],
  },
  {
    key: "orders",
    title: "How Orders Work",
    icon: ShoppingCart,
    moduleLabel: "Orders",
    summary: "Move orders from draft to confirmed, then through fulfillment.",
    outcome: "Order status stays clear for the full team.",
    watchFor: "Drafts not confirmed or confirmed orders with stale status.",
    trainerTip: "Review draft and pending queues every day.",
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
        detail: "Create a new order, edit drafts, and confirm when ready.",
      },
      {
        title: "Update Fulfillment",
        detail: "Update each order as it moves from pending to shipped.",
      },
      {
        title: "Handle Returns",
        detail:
          "Use return and restock actions when issues happen after shipping.",
      },
    ],
    routePrefixes: ["/orders", "/returns", "/pick-pack"],
  },
  {
    key: "needs-matching",
    title: "How Needs & Matching Work",
    icon: Target,
    moduleLabel: "Needs & Matching",
    summary: "Track client needs and match them with available supply.",
    outcome: "You can quickly act when a good match appears.",
    watchFor: "Strong matches that sit too long without follow-up.",
    trainerTip: "Review needs and matches together, then follow up quickly.",
    themeClasses: {
      panel:
        "border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/70",
      iconWrap: "bg-cyan-100 text-cyan-700 ring-cyan-200",
      badge: "bg-cyan-100 text-cyan-800",
      tipAccent: "border-l-cyan-500",
    },
    steps: [
      {
        title: "Review Needs",
        detail: "Filter needs by status and priority, then open details.",
      },
      {
        title: "Check Matches",
        detail: "Compare needs with suggested supply matches.",
      },
      {
        title: "Take Next Step",
        detail: "From there, move to the next action in sales or follow-up.",
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
              {`${activeIntro.moduleLabel} Quick Guide`}
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
              Main Goal
            </p>
            <p className="mt-1 text-sm text-foreground">
              {activeIntro.outcome}
            </p>
          </article>
          <article className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Common Mistake
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
            Helpful Tip
          </p>
          <p className="mt-1 text-sm text-foreground">
            {activeIntro.trainerTip}
          </p>
        </article>
      </div>
    </section>
  );
}

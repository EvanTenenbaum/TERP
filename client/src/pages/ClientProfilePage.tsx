import { useEffect, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  ArrowRightLeft,
  CircleDollarSign,
  Edit,
  Info,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { AddCommunicationModal } from "@/components/clients/AddCommunicationModal";
import { ClientCalendarTab } from "@/components/clients/ClientCalendarTab";
import { CommunicationTimeline } from "@/components/clients/CommunicationTimeline";
import { SupplierProfileSection } from "@/components/clients/SupplierProfileSection";
import { VIPPortalSettings } from "@/components/clients/VIPPortalSettings";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { BackButton } from "@/components/common/BackButton";
import { CreditStatusCard } from "@/components/credit/CreditStatusCard";
import { FreeformNoteWidget } from "@/components/dashboard/widgets-v2";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import { ClientNeedsTab } from "@/components/needs/ClientNeedsTab";
import { PricingConfigTab } from "@/components/pricing/PricingConfigTab";
import { LiveCatalogConfig } from "@/components/vip-portal/LiveCatalogConfig";
import { InspectorPanel } from "@/components/work-surface/InspectorPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { useCreditVisibility } from "@/hooks/useCreditVisibility";
import {
  buildRelationshipProfilePath,
  resolveRelationshipProfileSection,
  type RelationshipProfileSection,
} from "@/lib/relationshipProfile";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import type { RelationshipProfileMoneyData } from "@/types/relationshipProfile";

const PROFILE_TABS: Array<{
  value: RelationshipProfileSection;
  label: string;
}> = [
  { value: "overview", label: "Overview" },
  { value: "sales-pricing", label: "Sales & Pricing" },
  { value: "money", label: "Money" },
  { value: "supply-inventory", label: "Supply & Inventory" },
  { value: "activity", label: "Activity" },
];

const formatMoney = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const sourcePathForLedgerEntry = (
  entry: RelationshipProfileMoneyData["ledgerTimeline"][number]
) => {
  switch (entry.sourceType) {
    case "ORDER":
      return buildSalesWorkspacePath("orders", { id: entry.sourceId });
    case "PAYMENT":
      return `/accounting/payments?id=${entry.sourceId}`;
    case "PURCHASE_ORDER":
      return `/purchase-orders?poId=${entry.sourceId}`;
    default:
      return null;
  }
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const clientId = Number(params.id);
  const [activeSection, setActiveSection] =
    useState<RelationshipProfileSection>(() =>
      resolveRelationshipProfileSection(search)
    );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<
    RelationshipProfileMoneyData["transactionHistory"][number] | null
  >(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<
    RelationshipProfileMoneyData["ledgerTimeline"][number] | null
  >(null);
  const [selectedPayment, setSelectedPayment] = useState<
    RelationshipProfileMoneyData["paymentHistory"][number] | null
  >(null);
  const [moneyAction, setMoneyAction] = useState<"receive" | "pay" | null>(
    null
  );
  const [transactionForm, setTransactionForm] = useState({
    transactionDate: "",
    amount: "",
    paymentStatus: "PENDING",
    paymentDate: "",
    paymentAmount: "",
    notes: "",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: "",
    description: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "",
    wishlist: "",
    tags: "",
    isBuyer: false,
    isSeller: false,
    isBrand: false,
    isReferee: false,
    isContractor: false,
  });

  const utils = trpc.useUtils();
  const { shouldShowCreditWidgetInProfile } = useCreditVisibility();

  useEffect(() => {
    const nextSection = resolveRelationshipProfileSection(search);
    setActiveSection(current =>
      current === nextSection ? current : nextSection
    );

    const paramsSearch = new URLSearchParams(search);
    if (
      clientId > 0 &&
      paramsSearch.get("tab") &&
      !paramsSearch.get("section")
    ) {
      setLocation(buildRelationshipProfilePath(clientId, nextSection));
    }
  }, [clientId, search, setLocation]);

  const shellQuery = trpc.relationshipProfile.getShell.useQuery(
    { clientId },
    { enabled: Number.isInteger(clientId) && clientId > 0 }
  );
  const salesQuery = trpc.relationshipProfile.getSalesPricing.useQuery(
    { clientId },
    {
      enabled:
        Number.isInteger(clientId) &&
        clientId > 0 &&
        activeSection === "sales-pricing",
    }
  );
  const moneyQuery = trpc.relationshipProfile.getMoney.useQuery(
    { clientId },
    {
      enabled:
        Number.isInteger(clientId) && clientId > 0 && activeSection === "money",
    }
  );
  const supplyQuery = trpc.relationshipProfile.getSupplyInventory.useQuery(
    { clientId },
    {
      enabled:
        Number.isInteger(clientId) &&
        clientId > 0 &&
        activeSection === "supply-inventory",
    }
  );
  const activityQuery = trpc.relationshipProfile.getActivity.useQuery(
    { clientId },
    {
      enabled:
        Number.isInteger(clientId) &&
        clientId > 0 &&
        activeSection === "activity",
    }
  );
  const noteIdQuery = trpc.clients.notes.getNoteId.useQuery(
    { clientId },
    { enabled: Number.isInteger(clientId) && clientId > 0 }
  );

  useEffect(() => {
    const shell = shellQuery.data;
    if (!shell) return;

    setEditForm({
      name: shell.name,
      email: shell.email ?? "",
      phone: shell.phone ?? "",
      address: shell.address ?? "",
      paymentTerms: shell.paymentTermsDays
        ? String(shell.paymentTermsDays)
        : "",
      wishlist: shell.wishlist ?? "",
      tags: shell.tags.join(", "),
      isBuyer: shell.roles.includes("Customer"),
      isSeller: shell.roles.includes("Supplier"),
      isBrand: shell.roles.includes("Brand"),
      isReferee: shell.roles.includes("Referee"),
      isContractor: shell.roles.includes("Contractor"),
    });
  }, [shellQuery.data]);

  useEffect(() => {
    if (!selectedTransaction) return;
    setTransactionForm({
      transactionDate: selectedTransaction.transactionDate
        ? new Date(selectedTransaction.transactionDate)
            .toISOString()
            .slice(0, 10)
        : "",
      amount: String(selectedTransaction.amount ?? ""),
      paymentStatus: selectedTransaction.paymentStatus ?? "PENDING",
      paymentDate: selectedTransaction.paymentDate
        ? new Date(selectedTransaction.paymentDate).toISOString().slice(0, 10)
        : "",
      paymentAmount: String(selectedTransaction.paymentAmount ?? ""),
      notes: selectedTransaction.notes ?? "",
    });
  }, [selectedTransaction]);

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.relationshipProfile.getShell.invalidate({ clientId }),
        utils.clients.getById.invalidate({ clientId }),
        utils.clients.list.invalidate(),
      ]);
      toast.success("Profile updated");
      setEditDialogOpen(false);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateTransactionMutation =
    trpc.clients.transactions.update.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.relationshipProfile.getMoney.invalidate({ clientId }),
          utils.relationshipProfile.getShell.invalidate({ clientId }),
        ]);
        toast.success("Transaction updated");
        setSelectedTransaction(null);
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const addLedgerAdjustmentMutation =
    trpc.clientLedger.addLedgerAdjustment.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.relationshipProfile.getMoney.invalidate({ clientId }),
          utils.relationshipProfile.getShell.invalidate({ clientId }),
        ]);
        toast.success(
          moneyAction === "receive"
            ? "Money received was added to the ledger"
            : "Money paid was added to the ledger"
        );
        setMoneyAction(null);
        setAdjustmentForm({
          amount: "",
          description: "",
          effectiveDate: new Date().toISOString().slice(0, 10),
        });
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const handleSectionChange = (section: RelationshipProfileSection) => {
    setActiveSection(section);
    setLocation(buildRelationshipProfilePath(clientId, section));
  };

  const shell = shellQuery.data;
  const money = moneyQuery.data;
  const moneySummary = money?.summary ?? shell?.financials.moneySummary;
  const supplierSettlementSummary =
    supplyQuery.data?.supplier?.context?.settlementSummary ?? null;
  const isCustomer = shell?.roles.includes("Customer") ?? false;
  const isSupplier = shell?.roles.includes("Supplier") ?? false;

  const commandStrip = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit Profile
      </Button>
      <Button variant="outline" onClick={() => setMoneyAction("receive")}>
        <CircleDollarSign className="mr-2 h-4 w-4" />
        Receive Money
      </Button>
      <Button variant="outline" onClick={() => setMoneyAction("pay")}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        Pay Money
      </Button>
      <Button
        variant="outline"
        onClick={() => setLocation(`/clients/${clientId}/ledger`)}
      >
        <Receipt className="mr-2 h-4 w-4" />
        Ledger
      </Button>
    </div>
  );

  const meta = shell
    ? [
        {
          label:
            moneySummary?.mode === "supplier"
              ? "Payable Due"
              : moneySummary?.mode === "hybrid"
                ? "Net Position"
                : "Receivable",
          value: formatMoney(
            moneySummary?.mode === "supplier"
              ? moneySummary.payable.amountDue
              : moneySummary?.mode === "hybrid"
                ? moneySummary.netPosition
                : shell.financials.balance.computedBalance
          ),
        },
        {
          label:
            moneySummary?.mode === "supplier" ? "Paid Out" : "Credit Limit",
          value: formatMoney(
            moneySummary?.mode === "supplier"
              ? moneySummary.payable.amountPaid
              : shell.financials.creditLimit
          ),
        },
        {
          label: "Open Work",
          value: `${shell.openArtifacts.orderDrafts + shell.openArtifacts.salesSheetDrafts} drafts`,
        },
        {
          label: "Last Touch",
          value: formatDate(shell.lastTouchAt),
        },
      ]
    : [];

  const inspectorOpen = Boolean(
    selectedTransaction || selectedLedgerEntry || selectedPayment || moneyAction
  );

  if (shellQuery.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (!shell) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <BackButton />
        <EmptyCard message="This relationship profile could not be loaded." />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4 md:px-6">
      <BackButton />

      <LinearWorkspaceShell
        title={shell.name}
        description="Unified customer and supplier workspace with money, pricing, inventory, and activity in one place."
        section="Relationships"
        activeTab={activeSection}
        tabs={PROFILE_TABS}
        onTabChange={handleSectionChange}
        meta={meta}
        commandStrip={commandStrip}
      >
        <LinearWorkspacePanel value="overview">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identity</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Core Handles</p>
                    <p>Code name: {shell.name}</p>
                    <p>
                      Relationship code: {shell.teriCode || "Not assigned yet"}
                    </p>
                    <p>
                      Email handle: {shell.email || "No email handle on file"}
                    </p>
                    <p>
                      Phone / messaging handle:{" "}
                      {shell.phone || "No phone or messaging handle on file"}
                    </p>
                    <p>Address: {shell.address || "No address on file"}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">Roles</p>
                        {shell.roles.includes("Customer") &&
                        shell.roles.includes("Supplier") ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              This account acts as both a Customer (you sell to
                              them) and a Supplier (you buy from them). Sales
                              data appears in Sales &amp; Pricing; purchase
                              history and payables appear in Supply &amp;
                              Inventory.
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {shell.roles.map(role => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Referrer</p>
                      <p className="mt-1 text-muted-foreground">
                        {shell.referrer?.name || "No referrer assigned"}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {shell.tags.length ? (
                          shell.tags.map(tag => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            No tags yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shell.alerts.length ? (
                    shell.alerts.map(alert => (
                      <div
                        key={alert.label}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                          <div>
                            <p className="text-sm font-medium text-amber-950">
                              {alert.label}
                            </p>
                            <p className="text-xs text-amber-900/75">
                              {alert.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active risk flags on this profile.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="VIP Portal"
                      value={shell.vipPortalEnabled ? "Enabled" : "Disabled"}
                    />
                    <MetricCard
                      label="Last Login"
                      value={
                        shell.vipPortalLastLogin
                          ? formatDate(shell.vipPortalLastLogin)
                          : "Never"
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Lifetime Value"
                value={formatMoney(shell.financials.lifetimeValue)}
                hint="Total invoiced across completed sales orders"
              />
              <MetricCard
                label="Profit"
                value={formatMoney(shell.financials.profitability)}
                hint="Revenue minus COGS on completed orders"
              />
              <MetricCard
                label="Average Margin"
                value={`${shell.financials.averageMarginPercent.toFixed(1)}%`}
                hint="Weighted average across completed orders"
              />
              <MetricCard
                label="Open Quotes"
                value={String(shell.openArtifacts.openQuotes)}
              />
            </div>

            {shell.wishlist ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Preferences & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {shell.wishlist}
                </CardContent>
              </Card>
            ) : null}

            {isCustomer ? (
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <VIPPortalSettings
                  clientId={clientId}
                  clientName={shell.name}
                  vipPortalEnabled={shell.vipPortalEnabled}
                  vipPortalLastLogin={shell.vipPortalLastLogin}
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Live Catalog & Interest Intake
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LiveCatalogConfig clientId={clientId} />
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {isSupplier ? (
              <SupplierProfileSection
                clientId={clientId}
                clientName={shell.name}
              />
            ) : null}
          </div>
        </LinearWorkspacePanel>

        <LinearWorkspacePanel value="sales-pricing">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commercial Feed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salesQuery.data?.mergedArtifacts?.length ? (
                      salesQuery.data.mergedArtifacts.map(item => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.sublabel}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground">
                            <p>{formatMoney(item.amount)}</p>
                            <p>{formatDate(item.updatedAt)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No sales catalogues or order drafts are attached to this
                        profile yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Preference Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salesQuery.data?.wishlist ? (
                      <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                        {salesQuery.data.wishlist}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No wishlist notes are recorded yet.
                      </p>
                    )}
                    {salesQuery.data?.needs?.length ? (
                      <div className="rounded-xl border border-border/70 p-3 text-sm">
                        <p className="font-medium">
                          {salesQuery.data.needs.length} active need
                          {salesQuery.data.needs.length === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Use the needs workspace below to create, match, and
                          convert demand without leaving the profile.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <PricingConfigTab
                  clientId={clientId}
                  onProfileApplied={() => {
                    void Promise.all([
                      utils.relationshipProfile.getSalesPricing.invalidate({
                        clientId,
                      }),
                      utils.relationshipProfile.getShell.invalidate({
                        clientId,
                      }),
                    ]);
                  }}
                />
                <Button
                  className="w-full"
                  onClick={() =>
                    setLocation(
                      buildSalesWorkspacePath("create-order", { clientId })
                    )
                  }
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Start Sales Order
                </Button>
              </div>
            </div>

            {isCustomer ? <ClientNeedsTab clientId={clientId} /> : null}
          </div>
        </LinearWorkspacePanel>

        <LinearWorkspacePanel value="money">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {moneySummary?.mode === "supplier" ? (
                <>
                  <MetricCard
                    label="Payable Due"
                    value={formatMoney(moneySummary.payable.amountDue)}
                  />
                  <MetricCard
                    label="Paid Out"
                    value={formatMoney(moneySummary.payable.amountPaid)}
                  />
                  <MetricCard
                    label="Open Payables"
                    value={String(moneySummary.payable.openPayableCount)}
                  />
                </>
              ) : moneySummary?.mode === "hybrid" ? (
                <>
                  <MetricCard
                    label="Receivable"
                    value={formatMoney(moneySummary.receivable.computedBalance)}
                  />
                  <MetricCard
                    label="Payable Due"
                    value={formatMoney(moneySummary.payable.amountDue)}
                  />
                  <MetricCard
                    label="Net Position"
                    value={formatMoney(moneySummary.netPosition)}
                  />
                </>
              ) : (
                <>
                  <MetricCard
                    label="Receivable"
                    value={formatMoney(
                      money?.balance.computedBalance ??
                        shell.financials.balance.computedBalance
                    )}
                  />
                  <MetricCard
                    label="Stored Balance"
                    value={formatMoney(
                      money?.balance.storedBalance ??
                        shell.financials.balance.storedBalance
                    )}
                    hint={`Variance ${formatMoney(
                      money?.balance.discrepancy ??
                        shell.financials.balance.discrepancy
                    )}`}
                  />
                  <MetricCard
                    label="Credit Limit"
                    value={formatMoney(
                      money?.credit?.creditLimit ?? shell.financials.creditLimit
                    )}
                  />
                </>
              )}
              <MetricCard
                label="Ledger Net"
                value={formatMoney(money?.ledgerTotals.netBalance)}
                hint="Running total across all ledger entries (sales, payments, adjustments)"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Receivable is derived from stored transaction balances. Ledger Net
              sums all sales, purchase, payment, and adjustment entries — they
              represent different accounting views and may differ.
            </p>

            {shouldShowCreditWidgetInProfile && isCustomer ? (
              <CreditStatusCard clientId={clientId} clientName={shell.name} />
            ) : null}

            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Transaction History
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click a row to edit supported transactions.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Legacy per-client records (TXN). The Ledger Timeline below
                  reflects the full accounting view across orders, payments, and
                  adjustments (ORD / PAY).
                </p>
              </CardHeader>
              <CardContent>
                {money?.transactionHistory.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {money.transactionHistory.map(transaction => (
                        <TableRow
                          key={transaction.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <TableCell>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-mono text-xs text-muted-foreground">
                                TXN
                              </span>
                              <span>{transaction.transactionType}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            {transaction.transactionNumber ||
                              `#${transaction.id}`}
                          </TableCell>
                          <TableCell>
                            {formatDate(transaction.transactionDate)}
                          </TableCell>
                          <TableCell>
                            {transaction.paymentStatus || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No editable transaction history is stored on this profile.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {money?.paymentHistory.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {money.paymentHistory.map(payment => (
                          <TableRow
                            key={payment.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <TableCell>{payment.paymentNumber}</TableCell>
                            <TableCell>
                              {formatDate(payment.paymentDate)}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(payment.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No payments are linked to this relationship yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ledger Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {money?.ledgerTimeline.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entry</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {money.ledgerTimeline.map(entry => (
                          <TableRow
                            key={entry.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedLedgerEntry(entry)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{entry.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.transactionType}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell className="text-right">
                              {entry.netEffect > 0 ? "+" : ""}
                              {formatMoney(entry.netEffect)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No ledger activity has been generated yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </LinearWorkspacePanel>

        <LinearWorkspacePanel value="supply-inventory">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplyQuery.data?.systemInventory.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplyQuery.data.systemInventory.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell className="text-right">
                              {item.onHandQty.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No inventory is visible right now.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer Needs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supplyQuery.data?.buyerNeeds.length ? (
                    supplyQuery.data.buyerNeeds.map(need => (
                      <div
                        key={need.id}
                        className="rounded-xl border border-border/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{need.label}</p>
                          <Badge variant="outline">{need.priority}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {need.status} · Updated {formatDate(need.updatedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active needs are attached to this customer.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {shell.roles.includes("Supplier") && supplyQuery.data?.supplier ? (
              <div className="space-y-4">
                {supplyQuery.data.supplier.contextError ? (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="py-4 text-sm text-amber-950">
                      Supplier context metrics could not be loaded:{" "}
                      {supplyQuery.data.supplier.contextError}
                    </CardContent>
                  </Card>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Lots Received"
                    value={String(
                      supplyQuery.data.supplier.context?.aggregateMetrics
                        .totalLotsReceived ?? 0
                    )}
                  />
                  <MetricCard
                    label="Units Supplied"
                    value={String(
                      supplyQuery.data.supplier.context?.aggregateMetrics
                        .totalUnitsSupplied ?? 0
                    )}
                  />
                  <MetricCard
                    label="Units Sold"
                    value={String(
                      supplyQuery.data.supplier.context?.aggregateMetrics
                        .totalUnitsSold ?? 0
                    )}
                  />
                  <MetricCard
                    label="Revenue"
                    value={formatMoney(
                      supplyQuery.data.supplier.context?.aggregateMetrics
                        .totalRevenue
                    )}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Settlement Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Payable Due"
                        value={formatMoney(
                          moneySummary?.payable.amountDue ?? 0
                        )}
                      />
                      <MetricCard
                        label="Paid Out"
                        value={formatMoney(
                          moneySummary?.payable.amountPaid ?? 0
                        )}
                      />
                      <MetricCard
                        label="Below-Range Sales"
                        value={String(
                          supplierSettlementSummary?.belowRangeSaleCount ?? 0
                        )}
                      />
                      <MetricCard
                        label="Below-Range Units"
                        value={Number(
                          supplierSettlementSummary?.belowRangeUnitsSold ?? 0
                        ).toFixed(2)}
                      />
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Latest settlement exception
                      </p>
                      <p className="mt-2 text-sm">
                        {supplierSettlementSummary?.latestBelowRangeReason ||
                          "No below-range sale exceptions recorded."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplierSettlementSummary?.latestBelowRangeAt
                          ? `Updated ${formatDate(
                              supplierSettlementSummary.latestBelowRangeAt
                            )}`
                          : "No follow-up needed right now."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Supplier Batches
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {supplyQuery.data.supplier.batches.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                On Hand
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplyQuery.data.supplier.batches.map(batch => (
                              <TableRow key={batch.id}>
                                <TableCell>{batch.sku}</TableCell>
                                <TableCell>{batch.productName}</TableCell>
                                <TableCell>{batch.status}</TableCell>
                                <TableCell className="text-right">
                                  {batch.onHandQty.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No active supplier batches were found.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Purchase Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {supplyQuery.data.supplier.purchaseOrders.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PO</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Expected</TableHead>
                              <TableHead className="text-right">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplyQuery.data.supplier.purchaseOrders.map(
                              po => (
                                <TableRow key={po.id}>
                                  <TableCell>{po.poNumber}</TableCell>
                                  <TableCell>{po.status}</TableCell>
                                  <TableCell>
                                    {formatDate(po.orderDate)}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(po.expectedDeliveryDate)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatMoney(po.total)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No purchase orders are linked to this supplier.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        </LinearWorkspacePanel>

        <LinearWorkspacePanel value="activity">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <CommunicationTimeline
                clientId={clientId}
                onAddClick={() => setCommunicationModalOpen(true)}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activityQuery.data?.activity.length ? (
                    activityQuery.data.activity.map(item => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/70 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {item.activityType.replace(/_/g, " ")}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.userName || "System"} ·{" "}
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No activity has been logged yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <ClientCalendarTab clientId={clientId} />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CommentWidget
                      commentableType="client"
                      commentableId={clientId}
                    />
                  </CardContent>
                </Card>
              </div>

              <FreeformNoteWidget noteId={noteIdQuery.data || undefined} />
            </div>
          </div>
        </LinearWorkspacePanel>
      </LinearWorkspaceShell>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Relationship Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="profile-name">Code Name</Label>
              <Input
                id="profile-name"
                value={editForm.name}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="profile-email">Email Handle</Label>
              <Input
                id="profile-email"
                type="email"
                value={editForm.email}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="profile-phone">Phone or Messaging Handle</Label>
              <Input
                id="profile-phone"
                value={editForm.phone}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="profile-payment-terms">
                Payment Terms (days)
              </Label>
              <Input
                id="profile-payment-terms"
                value={editForm.paymentTerms}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    paymentTerms: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label htmlFor="profile-address">Address / Shipping Notes</Label>
              <Textarea
                id="profile-address"
                value={editForm.address}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label htmlFor="profile-tags">Tags</Label>
              <Input
                id="profile-tags"
                value={editForm.tags}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
                placeholder="Comma-separated tags"
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label htmlFor="profile-wishlist">Preferences / Notes</Label>
              <Textarea
                id="profile-wishlist"
                value={editForm.wishlist}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    wishlist: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {[
                  ["isBuyer", "Customer"],
                  ["isSeller", "Supplier"],
                  ["isBrand", "Brand"],
                  ["isReferee", "Referee"],
                  ["isContractor", "Contractor"],
                ].map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={
                      editForm[key as keyof typeof editForm]
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setEditForm(current => ({
                        ...current,
                        [key]: !current[key as keyof typeof current],
                      }))
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateClientMutation.mutate({
                  clientId,
                  name: editForm.name.trim(),
                  email: editForm.email.trim() || undefined,
                  phone: editForm.phone.trim() || undefined,
                  address: editForm.address.trim() || undefined,
                  paymentTerms: editForm.paymentTerms
                    ? Number(editForm.paymentTerms)
                    : undefined,
                  wishlist: editForm.wishlist.trim() || undefined,
                  tags: editForm.tags
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(Boolean),
                  isBuyer: editForm.isBuyer,
                  isSeller: editForm.isSeller,
                  isBrand: editForm.isBrand,
                  isReferee: editForm.isReferee,
                  isContractor: editForm.isContractor,
                })
              }
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCommunicationModal
        clientId={clientId}
        open={communicationModalOpen}
        onOpenChange={setCommunicationModalOpen}
        onSuccess={() => {
          void Promise.all([
            activityQuery.refetch(),
            utils.relationshipProfile.getActivity.invalidate({ clientId }),
            utils.relationshipProfile.getShell.invalidate({ clientId }),
          ]);
        }}
      />

      <InspectorPanel
        isOpen={inspectorOpen}
        onClose={() => {
          setSelectedTransaction(null);
          setSelectedLedgerEntry(null);
          setSelectedPayment(null);
          setMoneyAction(null);
        }}
        title={
          moneyAction
            ? moneyAction === "receive"
              ? "Receive Money"
              : "Pay Money"
            : selectedTransaction
              ? `Edit ${selectedTransaction.transactionType}`
              : selectedPayment
                ? selectedPayment.paymentNumber ||
                  `Payment #${selectedPayment.id}`
                : selectedLedgerEntry?.label || "Ledger Entry"
        }
        subtitle={
          moneyAction
            ? "Quick ledger adjustment from the profile"
            : selectedTransaction
              ? "Editable client transaction"
              : selectedPayment
                ? "Payment detail with source link"
                : "Read-only source-linked ledger entry"
        }
        width={460}
      >
        {selectedTransaction ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Transaction Date</Label>
              <Input
                id="transaction-date"
                type="date"
                value={transactionForm.transactionDate}
                onChange={event =>
                  setTransactionForm(current => ({
                    ...current,
                    transactionDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-amount">Amount</Label>
              <Input
                id="transaction-amount"
                type="number"
                value={transactionForm.amount}
                onChange={event =>
                  setTransactionForm(current => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-status">Payment Status</Label>
              <Input
                id="transaction-status"
                value={transactionForm.paymentStatus}
                onChange={event =>
                  setTransactionForm(current => ({
                    ...current,
                    paymentStatus: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={transactionForm.paymentDate}
                  onChange={event =>
                    setTransactionForm(current => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={transactionForm.paymentAmount}
                  onChange={event =>
                    setTransactionForm(current => ({
                      ...current,
                      paymentAmount: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-notes">Notes</Label>
              <Textarea
                id="transaction-notes"
                value={transactionForm.notes}
                onChange={event =>
                  setTransactionForm(current => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                updateTransactionMutation.mutate({
                  transactionId: selectedTransaction.id,
                  transactionDate: transactionForm.transactionDate
                    ? new Date(transactionForm.transactionDate)
                    : undefined,
                  amount: transactionForm.amount
                    ? Number(transactionForm.amount)
                    : undefined,
                  paymentStatus: transactionForm.paymentStatus as
                    | "PAID"
                    | "PENDING"
                    | "OVERDUE"
                    | "PARTIAL",
                  paymentDate: transactionForm.paymentDate
                    ? new Date(transactionForm.paymentDate)
                    : undefined,
                  paymentAmount: transactionForm.paymentAmount
                    ? Number(transactionForm.paymentAmount)
                    : undefined,
                  notes: transactionForm.notes.trim() || undefined,
                })
              }
              disabled={updateTransactionMutation.isPending}
            >
              {updateTransactionMutation.isPending
                ? "Saving..."
                : "Save Transaction"}
            </Button>
          </div>
        ) : null}

        {selectedLedgerEntry ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-medium">{selectedLedgerEntry.label}</p>
                <p className="text-muted-foreground">
                  {selectedLedgerEntry.transactionType}
                </p>
                <p>Date: {formatDate(selectedLedgerEntry.date)}</p>
                <p>Created by: {selectedLedgerEntry.actorName || "System"}</p>
                <p>Net effect: {formatMoney(selectedLedgerEntry.netEffect)}</p>
                {selectedLedgerEntry.description ? (
                  <p className="text-muted-foreground">
                    {selectedLedgerEntry.description}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            {sourcePathForLedgerEntry(selectedLedgerEntry) ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const path = sourcePathForLedgerEntry(selectedLedgerEntry);
                  if (path) {
                    setLocation(path);
                  }
                }}
              >
                Open Source Record
              </Button>
            ) : null}
          </div>
        ) : null}

        {selectedPayment ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-medium">
                  {selectedPayment.paymentNumber ||
                    `Payment #${selectedPayment.id}`}
                </p>
                <p className="text-muted-foreground">
                  {selectedPayment.paymentType}
                </p>
                <p>Date: {formatDate(selectedPayment.paymentDate)}</p>
                <p>Method: {selectedPayment.paymentMethod || "-"}</p>
                <p>Reference: {selectedPayment.referenceNumber || "-"}</p>
                <p>Amount: {formatMoney(selectedPayment.amount)}</p>
                <p>Created by: {selectedPayment.createdByName || "System"}</p>
                {selectedPayment.notes ? (
                  <p className="text-muted-foreground">
                    {selectedPayment.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Button
              className="w-full"
              variant="outline"
              onClick={() =>
                setLocation(`/accounting/payments?id=${selectedPayment.id}`)
              }
            >
              Open Payment Record
            </Button>
          </div>
        ) : null}

        {moneyAction ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
                <p>
                  {moneyAction === "receive"
                    ? "Use a credit entry to reduce what this relationship owes."
                    : "Use a debit entry to reduce what you owe this relationship."}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Amount</Label>
              <Input
                id="adjustment-amount"
                type="number"
                value={adjustmentForm.amount}
                onChange={event =>
                  setAdjustmentForm(current => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-date">Effective Date</Label>
              <Input
                id="adjustment-date"
                type="date"
                value={adjustmentForm.effectiveDate}
                onChange={event =>
                  setAdjustmentForm(current => ({
                    ...current,
                    effectiveDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-description">Description</Label>
              <Textarea
                id="adjustment-description"
                value={adjustmentForm.description}
                onChange={event =>
                  setAdjustmentForm(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                addLedgerAdjustmentMutation.mutate({
                  clientId,
                  transactionType:
                    moneyAction === "receive" ? "CREDIT" : "DEBIT",
                  amount: Number(adjustmentForm.amount),
                  description: adjustmentForm.description.trim(),
                  effectiveDate: new Date(adjustmentForm.effectiveDate),
                })
              }
              disabled={addLedgerAdjustmentMutation.isPending}
            >
              {addLedgerAdjustmentMutation.isPending
                ? "Saving..."
                : moneyAction === "receive"
                  ? "Record Money Received"
                  : "Record Money Paid"}
            </Button>
          </div>
        ) : null}
      </InspectorPanel>
    </div>
  );
}

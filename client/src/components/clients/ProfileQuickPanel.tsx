import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRightLeft,
  CircleDollarSign,
  ExternalLink,
  FileStack,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import {
  buildProcurementWorkspacePath,
  buildSalesWorkspacePath,
} from "@/lib/workspaceRoutes";

type QuickPanelSection =
  | "overview"
  | "sales-pricing"
  | "money"
  | "supply-inventory";

interface ProfileQuickPanelProps {
  clientId: number;
  initialSection?: QuickPanelSection;
  onNavigate?: (path: string) => void;
  onClose?: () => void;
}

const formatMoney = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "No activity yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No activity yet";
  return parsed.toLocaleString();
};

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ProfileQuickPanel({
  clientId,
  initialSection = "overview",
  onNavigate,
  onClose,
}: ProfileQuickPanelProps) {
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<QuickPanelSection>(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const navigate = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      } else {
        setLocation(path);
      }
      onClose?.();
    },
    [onClose, onNavigate, setLocation]
  );

  const shellQuery = trpc.relationshipProfile.getShell.useQuery({ clientId });
  const salesQuery = trpc.relationshipProfile.getSalesPricing.useQuery(
    { clientId },
    { enabled: section === "sales-pricing" }
  );
  const moneyQuery = trpc.relationshipProfile.getMoney.useQuery(
    { clientId },
    { enabled: section === "money" }
  );
  const supplyQuery = trpc.relationshipProfile.getSupplyInventory.useQuery(
    { clientId },
    { enabled: section === "supply-inventory" }
  );

  const shell = shellQuery.data;
  const moneySummary =
    moneyQuery.data?.summary ?? shell?.financials.moneySummary;

  const primaryActions = useMemo(() => {
    if (!shell) return [];

    const isCustomer = shell.roles.includes("Customer");
    const isSupplier = shell.roles.includes("Supplier");

    const actions = [
      {
        label: "Open full profile",
        icon: ExternalLink,
        action: () => navigate(buildRelationshipProfilePath(clientId, section)),
      },
      {
        label: "Money",
        icon: CircleDollarSign,
        action: () => navigate(buildRelationshipProfilePath(clientId, "money")),
      },
      {
        label: "Open ledger",
        icon: FileStack,
        action: () => navigate(`/clients/${clientId}/ledger`),
      },
    ];

    if (isCustomer) {
      actions.push(
        {
          label: "Pricing",
          icon: FileStack,
          action: () =>
            navigate(buildRelationshipProfilePath(clientId, "sales-pricing")),
        },
        {
          label: "New order",
          icon: ArrowRightLeft,
          action: () =>
            navigate(buildSalesWorkspacePath("create-order", { clientId })),
        }
      );
    }

    if (isSupplier) {
      actions.push({
        label: "New PO",
        icon: Package,
        action: () =>
          navigate(
            buildProcurementWorkspacePath(undefined, {
              supplierClientId: clientId,
            })
          ),
      });
    }

    return actions;
  }, [clientId, navigate, section, shell]);

  if (shellQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!shell) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Profile data is unavailable.
      </div>
    );
  }

  const compactInventoryItems = shell.roles.includes("Supplier")
    ? (supplyQuery.data?.supplier?.batches ?? []).map(item => ({
        id: item.id,
        title: item.productName,
        sku: item.sku,
        status: item.status,
        onHandQty: item.onHandQty,
      }))
    : (supplyQuery.data?.systemInventory ?? []).map(item => ({
        id: item.id,
        title: item.productName,
        sku: item.sku,
        status: item.status,
        onHandQty: item.onHandQty,
      }));

  const primaryMoneyMetric =
    moneySummary?.mode === "supplier"
      ? {
          label: "Payable due",
          value: formatMoney(moneySummary.payable.amountDue),
        }
      : moneySummary?.mode === "hybrid"
        ? {
            label: "Net position",
            value: formatMoney(moneySummary.netPosition),
          }
        : {
            label: "Receivable",
            value: formatMoney(
              moneySummary?.receivable.computedBalance ??
                shell.financials.balance.computedBalance
            ),
          };

  const secondaryMoneyMetric =
    moneySummary?.mode === "supplier"
      ? {
          label: "Paid to supplier",
          value: formatMoney(moneySummary.payable.amountPaid),
        }
      : moneySummary?.mode === "hybrid"
        ? {
            label: "Payable due",
            value: formatMoney(moneySummary.payable.amountDue),
          }
        : {
            label: "Credit limit",
            value: formatMoney(shell.financials.creditLimit),
          };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Relationship Profile
            </p>
            <h2 className="truncate text-xl font-semibold">{shell.name}</h2>
            <p className="text-sm text-muted-foreground">
              {shell.teriCode ? `${shell.teriCode} · ` : ""}
              {formatDateTime(shell.lastTouchAt)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {shell.roles.map(role => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {shell.alerts.length > 0 ? (
          <div className="space-y-2">
            {shell.alerts.slice(0, 2).map(alert => (
              <div
                key={alert.label}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              >
                <p className="font-medium">{alert.label}</p>
                <p className="text-xs text-amber-900/80">{alert.detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickStat
          label={primaryMoneyMetric.label}
          value={primaryMoneyMetric.value}
        />
        <QuickStat
          label={secondaryMoneyMetric.label}
          value={secondaryMoneyMetric.value}
        />
        <QuickStat
          label="Drafts"
          value={
            shell.openArtifacts.salesSheetDrafts +
            shell.openArtifacts.orderDrafts
          }
        />
        <QuickStat label="Open quotes" value={shell.openArtifacts.openQuotes} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {primaryActions.map(action => (
          <Button
            key={action.label}
            variant="outline"
            className="justify-start"
            onClick={action.action}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <Tabs
        value={section}
        onValueChange={value => setSection(value as QuickPanelSection)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales-pricing">Sales</TabsTrigger>
          <TabsTrigger value="money">Money</TabsTrigger>
          <TabsTrigger value="supply-inventory">Supply</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "overview" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{shell.email || "No email on file"}</p>
              <p>{shell.phone || "No phone on file"}</p>
              <p>{shell.address || "No address on file"}</p>
              <p className="text-muted-foreground">
                Referrer: {shell.referrer?.name || "None"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Sales catalogue drafts</span>
                <span className="font-medium">
                  {shell.openArtifacts.salesSheetDrafts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sent sales catalogues</span>
                <span className="font-medium">
                  {shell.openArtifacts.sentSalesSheets}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Order drafts</span>
                <span className="font-medium">
                  {shell.openArtifacts.orderDrafts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active needs</span>
                <span className="font-medium">
                  {shell.openArtifacts.activeNeeds}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "sales-pricing" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {salesQuery.data?.pricingProfile?.name || "No pricing profile"}
              </p>
              <p className="text-muted-foreground">
                {salesQuery.data?.pricingProfile?.description ||
                  "Apply a pricing profile or manage rules from the full profile."}
              </p>
              <div className="pt-1 text-xs text-muted-foreground">
                {salesQuery.data?.rules.length || 0} active rule
                {(salesQuery.data?.rules.length || 0) === 1 ? "" : "s"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Artifacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(salesQuery.data?.mergedArtifacts || [])
                .slice(0, 5)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sublabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{formatMoney(item.amount)}</p>
                    </div>
                  </div>
                ))}
              {!salesQuery.data?.mergedArtifacts?.length ? (
                <p className="text-sm text-muted-foreground">
                  No pricing or sales artifacts yet.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "money" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Balance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <QuickStat
                label={
                  moneySummary?.mode === "supplier"
                    ? "Payable due"
                    : moneySummary?.mode === "hybrid"
                      ? "Net position"
                      : "Receivable"
                }
                value={formatMoney(
                  moneySummary?.mode === "supplier"
                    ? moneySummary?.payable.amountDue
                    : moneySummary?.mode === "hybrid"
                      ? moneySummary?.netPosition
                      : (moneyQuery.data?.balance.computedBalance ??
                        shell.financials.balance.computedBalance)
                )}
              />
              <QuickStat
                label={
                  moneySummary?.mode === "supplier"
                    ? "Paid to supplier"
                    : "Ledger net"
                }
                value={formatMoney(
                  moneySummary?.mode === "supplier"
                    ? moneySummary?.payable.amountPaid
                    : moneyQuery.data?.ledgerTotals.netBalance
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Money Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(moneyQuery.data?.ledgerTimeline || []).slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.date
                        ? new Date(item.date).toLocaleDateString()
                        : "No date"}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium">
                    {item.creditAmount > 0 ? "-" : "+"}
                    {formatMoney(item.creditAmount || item.debitAmount)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "supply-inventory" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {shell.roles.includes("Supplier")
                  ? "Supplier Inventory"
                  : "Current System Inventory"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {compactInventoryItems.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{item.status || "-"}</p>
                    <p>{Number(item.onHandQty).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {shell.roles.includes("Supplier") &&
              compactInventoryItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No supplier inventory is active right now.
                </p>
              ) : null}
              {!shell.roles.includes("Supplier") &&
              !supplyQuery.data?.systemInventory?.length ? (
                <p className="text-sm text-muted-foreground">
                  No inventory is currently visible.
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {shell.roles.includes("Supplier")
                  ? "Purchase Orders"
                  : "Client Needs"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(shell.roles.includes("Supplier")
                ? supplyQuery.data?.supplier?.purchaseOrders?.map(item => ({
                    id: item.id,
                    label: item.poNumber,
                    sublabel: item.status,
                    meta: formatMoney(item.total),
                  }))
                : supplyQuery.data?.buyerNeeds?.map(item => ({
                    id: item.id,
                    label: item.label,
                    sublabel: item.priority,
                    meta: item.status,
                  }))
              )
                ?.slice(0, 5)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sublabel}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {item.meta}
                    </p>
                  </div>
                ))}
              {shell.roles.includes("Supplier") &&
              !supplyQuery.data?.supplier?.purchaseOrders?.length ? (
                <p className="text-sm text-muted-foreground">
                  No purchase orders are linked to this supplier yet.
                </p>
              ) : null}
              {!shell.roles.includes("Supplier") &&
              !supplyQuery.data?.buyerNeeds?.length ? (
                <p className="text-sm text-muted-foreground">
                  No active customer needs are attached to this profile.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default ProfileQuickPanel;

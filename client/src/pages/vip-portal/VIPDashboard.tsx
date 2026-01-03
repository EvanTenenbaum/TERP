import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type JSX,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  ShoppingCart,
  FileText,
  LogOut,
  Menu,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useVIPPortalAuth } from "@/hooks/useVIPPortalAuth";
import { MarketplaceNeeds } from "@/components/vip-portal/MarketplaceNeeds";
import { AccountsReceivable } from "@/components/vip-portal/AccountsReceivable";
import { AccountsPayable } from "@/components/vip-portal/AccountsPayable";
import { TransactionHistory } from "@/components/vip-portal/TransactionHistory";
import { MarketplaceSupply } from "@/components/vip-portal/MarketplaceSupply";
import { Leaderboard } from "@/components/vip-portal/Leaderboard";
import { LiveCatalog } from "@/components/vip-portal/LiveCatalog";
import { ImpersonationBanner } from "@/components/vip-portal/ImpersonationBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// Type for VIP Portal configuration with all module flags as boolean
interface VipPortalConfig {
  id: number;
  clientId: number;
  moduleDashboardEnabled: boolean;
  moduleLiveCatalogEnabled: boolean;
  moduleArEnabled: boolean;
  moduleApEnabled: boolean;
  moduleTransactionHistoryEnabled: boolean;
  moduleVipTierEnabled: boolean;
  moduleCreditCenterEnabled: boolean;
  moduleMarketplaceNeedsEnabled: boolean;
  moduleMarketplaceSupplyEnabled: boolean;
  featuresConfig: {
    dashboard?: {
      showGreeting?: boolean;
      showCurrentBalance?: boolean;
      showYtdSpend?: boolean;
      showQuickLinks?: boolean;
    };
    leaderboard?: {
      enabled?: boolean;
    };
    ar?: {
      showSummaryTotals?: boolean;
    };
    ap?: {
      showSummaryTotals?: boolean;
    };
  } | null;
  advancedOptions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

type VipTab =
  | "dashboard"
  | "catalog"
  | "ar"
  | "ap"
  | "needs"
  | "supply"
  | "leaderboard"
  | "transactions";

interface VipDashboardKpis {
  currentBalance?: number;
  ytdSpend?: number;
  availableCredit?: number;
  creditUtilization?: number;
  recentOrders?: number;
  nextPaymentDue?: string | Date | null;
  activeNeedsCount?: number;
  activeSupplyCount?: number;
}

interface KpiCard {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  icon: JSX.Element;
  onClick?: () => void;
}

export default function VIPDashboard(): JSX.Element {
  const { clientId, clientName, logout, isImpersonation, sessionGuid } =
    useVIPPortalAuth();
  const [activeTab, setActiveTab] = useState<VipTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    data: rawConfig,
    isLoading: configLoading,
    error: configError,
  } = trpc.vipPortal.config.get.useQuery({ clientId });
  const {
    data: kpis,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis,
  } = trpc.vipPortal.dashboard.getKPIs.useQuery({ clientId });

  const config = rawConfig as VipPortalConfig | undefined;
  const isLoadingState = configLoading || kpiLoading || !config || !kpis;

  const tabs = useMemo(
    () =>
      [
        {
          id: "dashboard",
          label: "Dashboard",
          enabled: config?.moduleDashboardEnabled,
        },
        {
          id: "catalog",
          label: "Catalog",
          enabled: config?.moduleLiveCatalogEnabled,
        },
        { id: "ar", label: "Receivables", enabled: config?.moduleArEnabled },
        { id: "ap", label: "Payables", enabled: config?.moduleApEnabled },
        {
          id: "needs",
          label: "My Needs",
          enabled: config?.moduleMarketplaceNeedsEnabled,
        },
        {
          id: "supply",
          label: "My Supply",
          enabled: config?.moduleMarketplaceSupplyEnabled,
        },
        {
          id: "leaderboard",
          label: "Leaderboard",
          enabled: config?.featuresConfig?.leaderboard?.enabled ?? false,
        },
        {
          id: "transactions",
          label: "Activity",
          enabled: config?.moduleTransactionHistoryEnabled ?? false,
        },
      ].filter(tab => tab.enabled) as Array<{
        id: VipTab;
        label: string;
        enabled: boolean;
      }>,
    [config]
  );

  const handleTabChange = useCallback((tab: VipTab) => {
    setActiveTab(tab);
  }, []);

  const handleCardKeyDown = useCallback(
    (onClick?: () => void) => (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    },
    []
  );

  const kpiCards = useMemo<KpiCard[]>(() => {
    if (!kpis) return [];
    const safeKpis = kpis as VipDashboardKpis;
    return [
      {
        id: "balance",
        label: "Outstanding Balance",
        value: formatCurrency(safeKpis.currentBalance),
        subtext: "Amount owed",
        icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("ar"),
      },
      {
        id: "ytd-spend",
        label: "YTD Spend",
        value: formatCurrency(safeKpis.ytdSpend),
        subtext: "Year to date",
        icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("transactions"),
      },
      {
        id: "available-credit",
        label: "Available Credit",
        value: formatCurrency(safeKpis.availableCredit),
        subtext: "Credit remaining",
        icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("ar"),
      },
      {
        id: "credit-utilization",
        label: "Credit Utilization",
        value: `${safeKpis.creditUtilization ?? 0}%`,
        subtext: "Utilization",
        icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("ar"),
      },
      {
        id: "recent-orders",
        label: "Recent Orders",
        value: `${safeKpis.recentOrders ?? 0}`,
        subtext: "Last 30 days",
        icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("transactions"),
      },
      {
        id: "next-payment",
        label: "Next Payment Due",
        value: formatDate(safeKpis.nextPaymentDue),
        subtext: "Stay current",
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("ap"),
      },
      {
        id: "active-needs",
        label: "Active Needs",
        value: `${safeKpis.activeNeedsCount ?? 0}`,
        subtext: "Live requests",
        icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("needs"),
      },
      {
        id: "active-supply",
        label: "Active Supply",
        value: `${safeKpis.activeSupplyCount ?? 0}`,
        subtext: "Listings",
        icon: <Package className="h-4 w-4 text-muted-foreground" />,
        onClick: () => handleTabChange("supply"),
      },
    ];
  }, [handleTabChange, kpis]);

  const renderKpiGrid = () => {
    if (isLoadingState) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4" data-testid="kpi-skeleton">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-20 mt-4" />
            </Card>
          ))}
        </div>
      );
    }

    if (!kpiCards.length) {
      return (
        <div className="flex items-center gap-3 rounded-md border p-4 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium text-foreground">No KPI data available</p>
            <p className="text-sm">Try refreshing or check back later.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpiCards.map(card => (
          <Card
            key={card.id}
            role="button"
            tabIndex={0}
            data-testid={`kpi-card-${card.id}`}
            className={cn(
              "transition hover:shadow-md focus-within:ring-2 focus-within:ring-ring/50 cursor-pointer",
              "border-border hover:border-primary/60"
            )}
            onClick={card.onClick}
            onKeyDown={handleCardKeyDown(card.onClick)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.label}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{card.value}</div>
              {card.subtext && (
                <p className="text-xs text-muted-foreground">{card.subtext}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (configError || kpiError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-lg font-semibold text-destructive">
            Unable to load dashboard data
          </p>
          <p className="text-sm text-muted-foreground">
            Please try again in a moment.
          </p>
          <Button onClick={() => refetchKpis()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!config || !kpis) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          {renderKpiGrid()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isImpersonation && (
        <ImpersonationBanner
          clientName={clientName}
          sessionGuid={sessionGuid}
          onEndSession={logout}
        />
      )}

      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className="justify-start"
                      onClick={() => {
                        handleTabChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {tab.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="justify-start text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo/Title */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold">VIP Portal</h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                {clientName}
              </p>
            </div>

            {/* Desktop Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hidden md:flex"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Client Name */}
          <p className="text-xs text-muted-foreground text-center mt-2 md:hidden">
            {clientName}
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="hidden md:block mb-6">
          <Tabs
            value={activeTab}
            onValueChange={value => handleTabChange(value as VipTab)}
          >
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content Sections */}
        <div className="space-y-4 md:space-y-6">
          {/* Dashboard */}
          {activeTab === "dashboard" &&
            "moduleDashboardEnabled" in config &&
            config.moduleDashboardEnabled && (
              <div className="space-y-4 md:space-y-6">
                {"featuresConfig" in config &&
                  config.featuresConfig?.dashboard?.showGreeting && (
                    <div className="text-center md:text-left">
                      <h2 className="text-2xl md:text-3xl font-bold">
                        Welcome back!
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground mt-1">
                        Here's what's happening with your account
                      </p>
                    </div>
                  )}

                {/* KPI Cards - Mobile Optimized */}
                {renderKpiGrid()}

                {/* Quick Actions - Mobile Optimized */}
                {"featuresConfig" in config &&
                  config.featuresConfig?.dashboard?.showQuickLinks && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg md:text-xl">
                          Quick Actions
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Common tasks
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 md:gap-4">
                        {config.moduleMarketplaceNeedsEnabled && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 md:p-6"
                            onClick={() => handleTabChange("needs")}
                          >
                            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                            <span className="text-xs md:text-sm">
                              Post Need
                            </span>
                          </Button>
                        )}
                        {config.moduleMarketplaceSupplyEnabled && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 md:p-6"
                            onClick={() => handleTabChange("supply")}
                          >
                            <Package className="h-5 w-5 md:h-6 md:w-6" />
                            <span className="text-xs md:text-sm">
                              List Supply
                            </span>
                          </Button>
                        )}
                        {config.moduleArEnabled && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 md:p-6"
                            onClick={() => handleTabChange("ar")}
                          >
                            <FileText className="h-5 w-5 md:h-6 md:w-6" />
                            <span className="text-xs md:text-sm">Invoices</span>
                          </Button>
                        )}
                        {config.moduleCreditCenterEnabled && (
                          <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 p-4 md:p-6"
                          >
                            <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
                            <span className="text-xs md:text-sm">
                              Credit Info
                            </span>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
              </div>
            )}

          {/* AR Tab */}
          {activeTab === "ar" && config.moduleArEnabled && (
            <AccountsReceivable clientId={clientId} config={config} />
          )}

          {/* AP Tab */}
          {activeTab === "ap" && config.moduleApEnabled && (
            <AccountsPayable clientId={clientId} config={config} />
          )}

          {/* Needs Tab */}
          {activeTab === "needs" && config.moduleMarketplaceNeedsEnabled && (
            <MarketplaceNeeds clientId={clientId} config={config} />
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" &&
            config.moduleTransactionHistoryEnabled && (
              <TransactionHistory clientId={clientId} config={config} />
            )}

          {/* Supply Tab */}
          {activeTab === "supply" && config.moduleMarketplaceSupplyEnabled && (
            <MarketplaceSupply clientId={clientId} config={config} />
          )}

          {/* Live Catalog Tab */}
          {activeTab === "catalog" && config.moduleLiveCatalogEnabled && (
            <LiveCatalog clientId={clientId} />
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" &&
            config.featuresConfig?.leaderboard?.enabled && (
              <Leaderboard clientId={clientId} config={config} />
            )}
        </div>
      </div>
    </div>
  );
}

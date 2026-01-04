// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  ShoppingCart,
  FileText,
  Award,
  LogOut,
  Menu,
  CalendarIcon,
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
import AppointmentBooking from "./AppointmentBooking";
import VipNotificationsBell from "./VipNotificationsBell";
import DocumentDownloads from "./DocumentDownloads";

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
  } | null;
  advancedOptions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function VIPDashboard() {
  const { clientId, clientName, logout, isImpersonation, sessionGuid, sessionToken } = useVIPPortalAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: rawConfig } = trpc.vipPortal.config.get.useQuery({ clientId });
  const { data: kpis } = trpc.vipPortal.dashboard.getKPIs.useQuery({ clientId });
  
  // Cast config to properly typed interface to avoid unknown type issues
  const config = rawConfig as VipPortalConfig | undefined;

  useEffect(() => {
    if (!sessionToken) {
      return;
    }
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const headers = new Headers(init?.headers ?? {});
      headers.set("x-vip-session-token", sessionToken);
      return originalFetch(input, { ...(init ?? {}), headers });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [sessionToken]);

  if (!config || !kpis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", enabled: config.moduleDashboardEnabled },
    { id: "catalog", label: "Catalog", enabled: config.moduleLiveCatalogEnabled },
    { id: "ar", label: "Receivables", enabled: config.moduleArEnabled },
    { id: "ap", label: "Payables", enabled: config.moduleApEnabled },
    { id: "needs", label: "My Needs", enabled: config.moduleMarketplaceNeedsEnabled },
    { id: "supply", label: "My Supply", enabled: config.moduleMarketplaceSupplyEnabled },
    { id: "appointments", label: "Appointments", enabled: true },
    { id: "leaderboard", label: "Leaderboard", enabled: config.featuresConfig?.leaderboard?.enabled ?? false },
  ].filter(tab => tab.enabled);

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Impersonation Banner (FEATURE-012) */}
      {isImpersonation && (
        <ImpersonationBanner
          clientName={clientName}
          sessionGuid={sessionGuid}
          onEndSession={logout}
        />
      )}
      
      {/* Mobile-First Header */}
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
                  {tabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className="justify-start"
                      onClick={() => {
                        setActiveTab(tab.id);
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
              <p className="text-xs text-muted-foreground hidden md:block">{clientName}</p>
            </div>

            <div className="flex items-center gap-2">
              <VipNotificationsBell />
              <Button variant="outline" size="sm" onClick={logout} className="hidden md:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Mobile Client Name */}
          <p className="text-xs text-muted-foreground text-center mt-2 md:hidden">{clientName}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Desktop Tabs */}
        <div className="hidden md:block mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2">
              {tabs.map((tab) => (
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
          {activeTab === "dashboard" && 'moduleDashboardEnabled' in config && config.moduleDashboardEnabled && (
            <div className="space-y-4 md:space-y-6">
              {'featuresConfig' in config && config.featuresConfig?.dashboard?.showGreeting && (
                <div className="text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold">Welcome back!</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Here's what's happening with your account
                  </p>
                </div>
              )}

              {/* KPI Cards - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {'featuresConfig' in config && config.featuresConfig?.dashboard?.showCurrentBalance && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Balance</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold">
                        ${kpis.currentBalance.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Amount owed</p>
                    </CardContent>
                  </Card>
                )}

                {'featuresConfig' in config && config.featuresConfig?.dashboard?.showYtdSpend && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">YTD Spend</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold">
                        ${kpis.ytdSpend.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Year to date</p>
                    </CardContent>
                  </Card>
                )}

                {config.moduleCreditCenterEnabled && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Credit</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl md:text-2xl font-bold">
                        {kpis.creditUtilization}%
                      </div>
                      <p className="text-xs text-muted-foreground">Utilization</p>
                    </CardContent>
                  </Card>
                )}

                {config.moduleVipTierEnabled && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">VIP Status</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="text-base">Silver</Badge>
                      <p className="text-xs text-muted-foreground mt-2">Current tier</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Quick Actions - Mobile Optimized */}
              {'featuresConfig' in config && config.featuresConfig?.dashboard?.showQuickLinks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
                    <CardDescription className="text-sm">Common tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 md:gap-4">
                    {config.moduleMarketplaceNeedsEnabled && (
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 p-4 md:p-6"
                        onClick={() => setActiveTab("needs")}
                      >
                        <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-xs md:text-sm">Post Need</span>
                      </Button>
                    )}
                    {config.moduleMarketplaceSupplyEnabled && (
                      <Button
                        variant="outline"
                        className="h-auto flex-col gap-2 p-4 md:p-6"
                        onClick={() => setActiveTab("supply")}
                      >
                        <Package className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-xs md:text-sm">List Supply</span>
                      </Button>
                    )}
                    {config.moduleArEnabled && (
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 md:p-6"
                      onClick={() => setActiveTab("ar")}
                    >
                      <FileText className="h-5 w-5 md:h-6 md:w-6" />
                      <span className="text-xs md:text-sm">Invoices</span>
                    </Button>
                  )}
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 md:p-6"
                      onClick={() => setActiveTab("appointments")}
                    >
                      <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
                      <span className="text-xs md:text-sm">Book Appointment</span>
                    </Button>
                  {config.moduleCreditCenterEnabled && (
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-4 md:p-6"
                    >
                        <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="text-xs md:text-sm">Credit Info</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <DocumentDownloads clientId={clientId} />
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

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <AppointmentBooking clientId={clientId} />
          )}

          {/* Needs Tab */}
          {activeTab === "needs" && config.moduleMarketplaceNeedsEnabled && (
            <MarketplaceNeeds clientId={clientId} config={config} />
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && config.moduleTransactionHistoryEnabled && (
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
          {activeTab === "leaderboard" && config.featuresConfig?.leaderboard?.enabled && (
            <Leaderboard clientId={clientId} config={config} />
          )}
        </div>
      </div>
    </div>
  );
}

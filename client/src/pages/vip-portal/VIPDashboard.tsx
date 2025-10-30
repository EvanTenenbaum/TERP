import { useState } from "react";
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

export default function VIPDashboard() {
  const { clientId, clientName, logout } = useVIPPortalAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: config } = trpc.vipPortal.config.get.useQuery({ clientId });
  const { data: kpis } = trpc.vipPortal.dashboard.getKPIs.useQuery({ clientId });

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
    { id: "ar", label: "Receivables", enabled: config.moduleArEnabled },
    { id: "ap", label: "Payables", enabled: config.moduleApEnabled },
    { id: "needs", label: "My Needs", enabled: config.moduleMarketplaceNeedsEnabled },
    { id: "supply", label: "My Supply", enabled: config.moduleMarketplaceSupplyEnabled },
  ].filter(tab => tab.enabled);

  return (
    <div className="min-h-screen bg-background">
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

            {/* Desktop Logout */}
            <Button variant="outline" size="sm" onClick={logout} className="hidden md:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
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
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
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
          {activeTab === "dashboard" && config.moduleDashboardEnabled && (
            <div className="space-y-4 md:space-y-6">
              {config.featuresConfig?.dashboard?.showGreeting && (
                <div className="text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold">Welcome back!</h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Here's what's happening with your account
                  </p>
                </div>
              )}

              {/* KPI Cards - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {config.featuresConfig?.dashboard?.showCurrentBalance && (
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

                {config.featuresConfig?.dashboard?.showYtdSpend && (
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
              {config.featuresConfig?.dashboard?.showQuickLinks && (
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
            </div>
          )}

          {/* AR Tab */}
          {activeTab === "ar" && config.moduleArEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Accounts Receivable</CardTitle>
                <CardDescription className="text-sm">
                  Outstanding invoices and payments owed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  AR module coming soon...
                </p>
              </CardContent>
            </Card>
          )}

          {/* AP Tab */}
          {activeTab === "ap" && config.moduleApEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Accounts Payable</CardTitle>
                <CardDescription className="text-sm">Bills and payments you owe</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  AP module coming soon...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Needs Tab */}
          {activeTab === "needs" && config.moduleMarketplaceNeedsEnabled && (
            <MarketplaceNeeds clientId={clientId} config={config} />
          )}

          {/* Supply Tab */}
          {activeTab === "supply" && config.moduleMarketplaceSupplyEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">My Supply</CardTitle>
                <CardDescription className="text-sm">
                  Products you have available for sale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Supply marketplace coming soon...
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

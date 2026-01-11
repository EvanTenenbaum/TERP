import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchBadge } from "@/components/needs/MatchBadge";
import { Search, Filter, Plus, Loader2, Package, TrendingUp, Users } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { useLocation } from "wouter";
// UX-012: Import centralized date formatting utility
import { formatDate } from "@/lib/utils";

/**
 * Needs Management Page
 * Central page for managing all client needs across the system
 */

export default function NeedsManagementPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);

  // Fetch needs with matches
  const { data: needsData, isLoading } = trpc.clientNeeds.getAllWithMatches.useQuery({
    status: statusFilter as any,
  });

  // Fetch smart opportunities
  const { data: opportunitiesData } = trpc.clientNeeds.getSmartOpportunities.useQuery({
    limit: 10,
  });

  const needs = needsData?.data || [];
  const opportunities = opportunitiesData?.data || [];

  // Filter needs based on search and priority
  const filteredNeeds = needs.filter((need: any) => {
    const matchesSearch =
      !searchQuery ||
      need.strain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = !priorityFilter || need.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: "default",
      FULFILLED: "secondary",
      EXPIRED: "outline",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Needs Management</h1>
          <p className="text-muted-foreground">
            Manage client needs and discover matching opportunities
          </p>
        </div>
        <Button onClick={() => setLocation("/clients")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Need
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Needs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {needs.filter((n: any) => n.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Matches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {needs.filter((n: any) => n.matchCount > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {needs.filter((n: any) => n.priority === "URGENT").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by strain, category, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter || "all"} onValueChange={(v) => setPriorityFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Needs ({filteredNeeds.length})</TabsTrigger>
          <TabsTrigger value="opportunities">
            Smart Opportunities ({opportunities.length})
          </TabsTrigger>
        </TabsList>

        {/* All Needs Tab */}
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredNeeds.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No needs found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or create a new need
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredNeeds.map((need: any) => (
                <Card
                  key={need.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/clients/${need.clientId}?tab=needs`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {need.strain || need.category || "General Need"}
                          </CardTitle>
                          {getPriorityBadge(need.priority)}
                          {getStatusBadge(need.status)}
                        </div>
                        <CardDescription>
                          Client: {need.clientName || `#${need.clientId}`}
                          {need.category && ` • ${need.category}`}
                          {need.subcategory && ` • ${need.subcategory}`}
                          {need.grade && ` • Grade ${need.grade}`}
                        </CardDescription>
                      </div>
                      {need.matchCount > 0 && (
                        <Badge variant="secondary">
                          {need.matchCount} {need.matchCount === 1 ? "match" : "matches"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      {need.quantityMin && (
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">
                            {need.quantityMin}
                            {need.quantityMax && ` - ${need.quantityMax}`} units
                          </p>
                        </div>
                      )}
                      {need.priceMax && (
                        <div>
                          <p className="text-muted-foreground">Max Price</p>
                          <p className="font-medium">${need.priceMax}/unit</p>
                        </div>
                      )}
                      {/* UX-012: Use standardized date formatting */}
                      {need.neededBy && (
                        <div>
                          <p className="text-muted-foreground">Needed By</p>
                          <p className="font-medium">
                            {formatDate(need.neededBy)}
                          </p>
                        </div>
                      )}
                      {need.createdAt && (
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {formatDate(need.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No opportunities found</p>
                <p className="text-sm text-muted-foreground">
                  Opportunities will appear when needs have high-confidence matches
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opp: any, idx: number) => (
                <Card
                  key={idx}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/clients/${opp.clientId}?tab=needs`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {opp.clientName || `Client #${opp.clientId}`}
                          </CardTitle>
                          {opp.priority && getPriorityBadge(opp.priority)}
                        </div>
                        <CardDescription>{opp.needDescription}</CardDescription>
                      </div>
                      {opp.bestMatchType && opp.bestConfidence && (
                        <MatchBadge
                          matchType={opp.bestMatchType}
                          confidence={opp.bestConfidence}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Matches</p>
                          <p className="font-medium">{opp.matchCount}</p>
                        </div>
                        {opp.potentialRevenue && (
                          <div>
                            <p className="text-muted-foreground">Potential Revenue</p>
                            <p className="font-medium text-green-600">
                              ${parseFloat(opp.potentialRevenue).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button size="sm">View Matches</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


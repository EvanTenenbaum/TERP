import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FreeformNoteWidget } from "@/components/dashboard/widgets-v2";
import { CreditLimitWidget } from "@/components/credit/CreditLimitWidget";
import { PricingConfigTab } from "@/components/pricing/PricingConfigTab";
import { ClientNeedsTab } from "@/components/needs/ClientNeedsTab";
import { CommunicationTimeline } from "@/components/clients/CommunicationTimeline";
import { AddCommunicationModal } from "@/components/clients/AddCommunicationModal";
import { PurchasePatternsWidget } from "@/components/clients/PurchasePatternsWidget";
import { ClientCalendarTab } from "@/components/clients/ClientCalendarTab";
import { SupplierProfileSection } from "@/components/clients/SupplierProfileSection";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { LiveCatalogConfig } from "@/components/vip-portal/LiveCatalogConfig";
import { BackButton } from "@/components/common/BackButton";
import {
  Edit,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { ClientProfileSkeleton } from "@/components/ui/skeletons";
import { ClientTransactionsTab } from "@/components/clients/ClientTransactionsTab";
import { ClientPaymentsTab } from "@/components/clients/ClientPaymentsTab";
import { ClientOverviewTab } from "@/components/clients/ClientOverviewTab";

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0", 10);
  const [activeTab, setActiveTab] = useState("overview");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);

  // Fetch client data
  const { data: client, isLoading: clientLoading } =
    trpc.clients.getById.useQuery({
      clientId,
    });

  // Fetch activity log
  const { data: activities } = trpc.clients.activity.list.useQuery({
    clientId,
  });

  // Fetch client note ID
  const { data: noteId } = trpc.clients.notes.getNoteId.useQuery({
    clientId,
  });

  // Mutations
  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      setEditDialogOpen(false);
    },
  });

  if (clientLoading) {
    return (
      <div className="p-6">
        <ClientProfileSkeleton />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <div className="text-lg font-medium">Client not found</div>
        </div>
      </div>
    );
  }

  // Get client type badges
  const getClientTypeBadges = () => {
    const badges: {
      label: string;
      variant: "default" | "secondary" | "outline";
    }[] = [];
    if (client.isBuyer) badges.push({ label: "Buyer", variant: "default" });
    if (client.isSeller) badges.push({ label: "Seller", variant: "secondary" });
    if (client.isBrand) badges.push({ label: "Brand", variant: "outline" });
    if (client.isReferee)
      badges.push({ label: "Referee", variant: "secondary" });
    if (client.isContractor)
      badges.push({ label: "Contractor", variant: "outline" });
    return badges;
  };

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb and Header */}
      <BackButton label="Back to Clients" to="/clients" />

      {/* Client Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{client.teriCode}</CardTitle>
                <div className="flex gap-2">
                  {getClientTypeBadges().map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <CardDescription className="text-base">
                {client.name}
              </CardDescription>
              {client.email && (
                <p className="text-sm text-muted-foreground">{client.email}</p>
              )}
              {client.phone && (
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              )}
            </div>
            <div className="flex gap-2">
              {client.vipPortalEnabled && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setLocation(`/clients/${clientId}/vip-portal-config`)
                  }
                >
                  <Settings className="h-4 w-4 mr-2" />
                  VIP Portal Config
                </Button>
              )}
              <Button onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(client.totalSpent || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(client.totalProfit || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Profit Margin
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(client.avgProfitMargin || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${parseFloat(client.totalOwed as string) > 0 ? "text-destructive" : ""}`}
            >
              {formatCurrency(client.totalOwed || 0)}
            </div>
            {client.oldestDebtDays && client.oldestDebtDays > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Oldest: {client.oldestDebtDays} days
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${client.isSeller ? 'grid-cols-10' : 'grid-cols-9'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {client.isSeller && <TabsTrigger value="supplier">Supplier</TabsTrigger>}
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="needs">Needs & History</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="live-catalog">Live Catalog</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <ClientOverviewTab
            client={client}
            clientId={clientId}
            activities={activities || []}
          />
        </TabsContent>

        {/* Supplier Tab (only for sellers) */}
        {client.isSeller && (
          <TabsContent value="supplier" className="space-y-4">
            <SupplierProfileSection clientId={clientId} clientName={client.name} />
          </TabsContent>
        )}

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <ClientTransactionsTab
            clientId={clientId}
            clientTeriCode={client.teriCode}
          />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <ClientPaymentsTab clientId={clientId} />
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <PricingConfigTab clientId={clientId} />
        </TabsContent>

        {/* Needs & History Tab */}
        <TabsContent value="needs" className="space-y-4">
          <ClientNeedsTab clientId={clientId} />
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <CommunicationTimeline
            clientId={clientId}
            onAddClick={() => setCommunicationModalOpen(true)}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <ClientCalendarTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Notes</CardTitle>
              <CardDescription>Freeform notes for this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <FreeformNoteWidget noteId={noteId || undefined} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Catalog Tab */}
        <TabsContent value="live-catalog" className="space-y-4">
          <LiveCatalogConfig clientId={clientId} />
        </TabsContent>
      </Tabs>

      {/* Add Communication Modal */}
      <AddCommunicationModal
        clientId={clientId}
        open={communicationModalOpen}
        onOpenChange={setCommunicationModalOpen}
        onSuccess={() => {
          // Refetch communications will happen automatically via tRPC
        }}
      />

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information for {client.teriCode}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateClientMutation.mutate({
                clientId: client.id,
                name: formData.get("name") as string,
                email: (formData.get("email") as string) || undefined,
                phone: (formData.get("phone") as string) || undefined,
                address: (formData.get("address") as string) || undefined,
                isBuyer: formData.get("isBuyer") === "on",
                isSeller: formData.get("isSeller") === "on",
                isBrand: formData.get("isBrand") === "on",
                isReferee: formData.get("isReferee") === "on",
                isContractor: formData.get("isContractor") === "on",
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Client Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={client.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={client.email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  defaultValue={client.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  name="address"
                  defaultValue={client.address || ""}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Types</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isBuyer"
                      name="isBuyer"
                      defaultChecked={client.isBuyer || false}
                    />
                    <Label
                      htmlFor="edit-isBuyer"
                      className="font-normal cursor-pointer"
                    >
                      Buyer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isSeller"
                      name="isSeller"
                      defaultChecked={client.isSeller || false}
                    />
                    <Label
                      htmlFor="edit-isSeller"
                      className="font-normal cursor-pointer"
                    >
                      Seller
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isBrand"
                      name="isBrand"
                      defaultChecked={client.isBrand || false}
                    />
                    <Label
                      htmlFor="edit-isBrand"
                      className="font-normal cursor-pointer"
                    >
                      Brand
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isReferee"
                      name="isReferee"
                      defaultChecked={client.isReferee || false}
                    />
                    <Label
                      htmlFor="edit-isReferee"
                      className="font-normal cursor-pointer"
                    >
                      Referee
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isContractor"
                      name="isContractor"
                      defaultChecked={client.isContractor || false}
                    />
                    <Label
                      htmlFor="edit-isContractor"
                      className="font-normal cursor-pointer"
                    >
                      Contractor
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

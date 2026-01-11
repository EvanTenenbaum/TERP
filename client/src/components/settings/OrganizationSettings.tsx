/**
 * Organization Settings Component
 * FEAT-010: Default Warehouse Selection
 * FEAT-012: Grade Field Optional/Customizable
 * FEAT-013: Packaged Unit Type
 * FEAT-014: Expected Delivery Field Control
 * FEAT-015: Finance Status Customization
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Building,
  Package,
  Calculator,
  Tag,
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ============================================================================
// General Organization Settings
// ============================================================================
export function GeneralOrgSettings() {
  const { data: settings, refetch } = trpc.organizationSettings.settings.list.useQuery();
  const updateMutation = trpc.organizationSettings.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Setting updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleToggle = (key: string, currentValue: boolean) => {
    updateMutation.mutate({ key, value: !currentValue });
  };

  const settingsMap = settings?.settingsMap || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Configure organization-wide settings and field visibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FEAT-012: Grade Field Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Grade Field Settings
          </h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Grade Field</Label>
              <p className="text-sm text-muted-foreground">
                Show/hide the grade field in product and batch forms
              </p>
            </div>
            <Switch
              checked={settingsMap.grade_field_enabled !== false}
              onCheckedChange={() =>
                handleToggle("grade_field_enabled", settingsMap.grade_field_enabled !== false)
              }
              disabled={updateMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Make Grade Required</Label>
              <p className="text-sm text-muted-foreground">
                Require grade selection when creating products/batches
              </p>
            </div>
            <Switch
              checked={settingsMap.grade_field_required === true}
              onCheckedChange={() =>
                handleToggle("grade_field_required", settingsMap.grade_field_required === true)
              }
              disabled={updateMutation.isPending || settingsMap.grade_field_enabled === false}
            />
          </div>
        </div>

        <Separator />

        {/* FEAT-014: Expected Delivery Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Purchase Order Settings
          </h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Expected Delivery Date</Label>
              <p className="text-sm text-muted-foreground">
                Display expected delivery date field in purchase orders
              </p>
            </div>
            <Switch
              checked={settingsMap.expected_delivery_enabled !== false}
              onCheckedChange={() =>
                handleToggle("expected_delivery_enabled", settingsMap.expected_delivery_enabled !== false)
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </div>

        <Separator />

        {/* FEAT-013: Unit Type Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Unit Type Settings
          </h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Packaged Unit Type</Label>
              <p className="text-sm text-muted-foreground">
                Allow PACKAGED as a unit type option for products
              </p>
            </div>
            <Switch
              checked={settingsMap.packaged_unit_enabled !== false}
              onCheckedChange={() =>
                handleToggle("packaged_unit_enabled", settingsMap.packaged_unit_enabled !== false)
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </div>

        <Separator />

        {/* FEAT-011: COGS Display Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            COGS Display Settings
          </h3>
          <div className="space-y-2">
            <Label>COGS Display Mode</Label>
            <Select
              value={String(settingsMap.cogs_display_mode || "VISIBLE")}
              onValueChange={(value) =>
                updateMutation.mutate({ key: "cogs_display_mode", value })
              }
              disabled={updateMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VISIBLE">Visible to All Users</SelectItem>
                <SelectItem value="ADMIN_ONLY">Admin Only</SelectItem>
                <SelectItem value="HIDDEN">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Control who can see COGS and margin information in orders
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FEAT-010: User Preferences (Default Warehouse)
// ============================================================================
export function UserPreferencesSettings() {
  const { data: preferences, refetch } = trpc.organizationSettings.userPreferences.get.useQuery();
  const { data: locations } = trpc.settings.locations.list.useQuery();

  const updateMutation = trpc.organizationSettings.userPreferences.update.useMutation({
    onSuccess: () => {
      toast.success("Preferences saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const warehouses = locations?.filter((loc: { site: string }) => loc.site) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          User Preferences
        </CardTitle>
        <CardDescription>
          Configure your personal preferences and defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Warehouse Selection */}
        <div className="space-y-2">
          <Label>Default Warehouse</Label>
          <Select
            value={preferences?.defaultWarehouseId?.toString() || "none"}
            onValueChange={(value) =>
              updateMutation.mutate({
                defaultWarehouseId: value === "none" ? null : parseInt(value),
              })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Default</SelectItem>
              {warehouses.map((warehouse: { id: number; site: string; zone?: string }) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.site}
                  {warehouse.zone && ` - ${warehouse.zone}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Automatically selected in inventory and order forms
          </p>
        </div>

        <Separator />

        {/* Display Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Display Preferences</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show COGS in Orders</Label>
              <p className="text-sm text-muted-foreground">
                Display cost information when creating orders
              </p>
            </div>
            <Switch
              checked={preferences?.showCogsInOrders ?? true}
              onCheckedChange={(checked) =>
                updateMutation.mutate({ showCogsInOrders: checked })
              }
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Margin in Orders</Label>
              <p className="text-sm text-muted-foreground">
                Display margin calculations when creating orders
              </p>
            </div>
            <Switch
              checked={preferences?.showMarginInOrders ?? true}
              onCheckedChange={(checked) =>
                updateMutation.mutate({ showMarginInOrders: checked })
              }
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Grade Field</Label>
              <p className="text-sm text-muted-foreground">
                Display grade selection in forms (personal preference)
              </p>
            </div>
            <Switch
              checked={preferences?.showGradeField ?? true}
              onCheckedChange={(checked) =>
                updateMutation.mutate({ showGradeField: checked })
              }
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Hide Expected Delivery</Label>
              <p className="text-sm text-muted-foreground">
                Hide expected delivery field in purchase orders
              </p>
            </div>
            <Switch
              checked={preferences?.hideExpectedDelivery ?? false}
              onCheckedChange={(checked) =>
                updateMutation.mutate({ hideExpectedDelivery: checked })
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FEAT-013: Unit Types Management
// ============================================================================
export function UnitTypesManager() {
  const [newUnit, setNewUnit] = useState({
    code: "",
    name: "",
    category: "COUNT" as "WEIGHT" | "COUNT" | "VOLUME" | "PACKAGED",
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    category: "WEIGHT" | "COUNT" | "VOLUME" | "PACKAGED";
    description: string;
  } | null>(null);

  const { data: unitTypes, refetch } = trpc.organizationSettings.unitTypes.list.useQuery();

  const createMutation = trpc.organizationSettings.unitTypes.create.useMutation({
    onSuccess: () => {
      toast.success("Unit type created");
      setNewUnit({ code: "", name: "", category: "COUNT", description: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const updateMutation = trpc.organizationSettings.unitTypes.update.useMutation({
    onSuccess: () => {
      toast.success("Unit type updated");
      setEditingId(null);
      setEditData(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = trpc.organizationSettings.unitTypes.delete.useMutation({
    onSuccess: () => {
      toast.success("Unit type removed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const categoryColors: Record<string, string> = {
    WEIGHT: "bg-blue-100 text-blue-800",
    COUNT: "bg-green-100 text-green-800",
    VOLUME: "bg-purple-100 text-purple-800",
    PACKAGED: "bg-orange-100 text-orange-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Unit Types
        </CardTitle>
        <CardDescription>
          Manage available unit types including packaged products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Unit Type */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Add New Unit Type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={newUnit.code}
                onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value.toUpperCase() })}
                placeholder="e.g., PKG"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newUnit.name}
                onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                placeholder="e.g., Package"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newUnit.category}
                onValueChange={(v) => setNewUnit({ ...newUnit, category: v as typeof newUnit.category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUNT">Count</SelectItem>
                  <SelectItem value="WEIGHT">Weight</SelectItem>
                  <SelectItem value="VOLUME">Volume</SelectItem>
                  <SelectItem value="PACKAGED">Packaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newUnit.description}
                onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate(newUnit)}
            disabled={createMutation.isPending || !newUnit.code || !newUnit.name}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Unit Type
          </Button>
        </div>

        {/* Unit Types List */}
        <div className="border rounded-lg divide-y">
          {unitTypes?.map((unit) => (
            <div key={unit.id} className="p-4 flex items-center justify-between">
              {editingId === unit.id ? (
                <div className="flex-1 grid grid-cols-3 gap-2 mr-4">
                  <Input
                    value={editData?.name || ""}
                    onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
                    placeholder="Name"
                  />
                  <Select
                    value={editData?.category || "COUNT"}
                    onValueChange={(v) => setEditData({ ...editData!, category: v as typeof editData.category })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNT">Count</SelectItem>
                      <SelectItem value="WEIGHT">Weight</SelectItem>
                      <SelectItem value="VOLUME">Volume</SelectItem>
                      <SelectItem value="PACKAGED">Packaged</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={editData?.description || ""}
                    onChange={(e) => setEditData({ ...editData!, description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{unit.code}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{unit.name}</span>
                      <Badge className={categoryColors[unit.category]}>
                        {unit.category}
                      </Badge>
                    </div>
                    {unit.description && (
                      <p className="text-sm text-muted-foreground">{unit.description}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {editingId === unit.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMutation.mutate({ id: unit.id, ...editData! })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditData(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(unit.id);
                        setEditData({
                          name: unit.name,
                          category: unit.category,
                          description: unit.description || "",
                        });
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Unit Type</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will deactivate the unit type "{unit.name}".
                            Existing products using this unit will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: unit.id })}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!unitTypes || unitTypes.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No unit types defined
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FEAT-015: Finance Status Customization
// ============================================================================
export function FinanceStatusManager() {
  const [selectedEntity, setSelectedEntity] = useState<"INVOICE" | "ORDER" | "PAYMENT" | "BILL" | "CREDIT">("ORDER");
  const [newStatus, setNewStatus] = useState({
    statusCode: "",
    statusLabel: "",
    color: "#6B7280",
    description: "",
    isTerminal: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    statusLabel: string;
    color: string;
    description: string;
    isTerminal: boolean;
  } | null>(null);

  const { data: statusesGrouped, refetch } = trpc.organizationSettings.financeStatuses.listGrouped.useQuery();
  const statuses = statusesGrouped?.[selectedEntity] || [];

  const createMutation = trpc.organizationSettings.financeStatuses.create.useMutation({
    onSuccess: () => {
      toast.success("Status created");
      setNewStatus({ statusCode: "", statusLabel: "", color: "#6B7280", description: "", isTerminal: false });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const updateMutation = trpc.organizationSettings.financeStatuses.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      setEditingId(null);
      setEditData(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = trpc.organizationSettings.financeStatuses.delete.useMutation({
    onSuccess: () => {
      toast.success("Status removed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Finance Status Customization
        </CardTitle>
        <CardDescription>
          Customize payment and finance status options per entity type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity Type Selector */}
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select
            value={selectedEntity}
            onValueChange={(v) => setSelectedEntity(v as typeof selectedEntity)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORDER">Orders</SelectItem>
              <SelectItem value="INVOICE">Invoices</SelectItem>
              <SelectItem value="PAYMENT">Payments</SelectItem>
              <SelectItem value="BILL">Bills</SelectItem>
              <SelectItem value="CREDIT">Credits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add New Status */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Add New Status for {selectedEntity}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={newStatus.statusCode}
                onChange={(e) => setNewStatus({ ...newStatus, statusCode: e.target.value.toUpperCase() })}
                placeholder="e.g., PENDING"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={newStatus.statusLabel}
                onChange={(e) => setNewStatus({ ...newStatus, statusLabel: e.target.value })}
                placeholder="e.g., Pending Review"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  placeholder="#6B7280"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newStatus.description}
                onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Terminal State</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={newStatus.isTerminal}
                  onCheckedChange={(checked) => setNewStatus({ ...newStatus, isTerminal: checked })}
                />
                <span className="ml-2 text-sm text-muted-foreground">Final status</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate({ entityType: selectedEntity, ...newStatus })}
            disabled={createMutation.isPending || !newStatus.statusCode || !newStatus.statusLabel}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Status
          </Button>
        </div>

        {/* Statuses List */}
        <div className="border rounded-lg divide-y">
          {statuses.map((status) => (
            <div key={status.id} className="p-4 flex items-center justify-between">
              {editingId === status.id ? (
                <div className="flex-1 grid grid-cols-4 gap-2 mr-4">
                  <Input
                    value={editData?.statusLabel || ""}
                    onChange={(e) => setEditData({ ...editData!, statusLabel: e.target.value })}
                    placeholder="Label"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editData?.color || "#6B7280"}
                      onChange={(e) => setEditData({ ...editData!, color: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={editData?.color || ""}
                      onChange={(e) => setEditData({ ...editData!, color: e.target.value })}
                      placeholder="Color"
                      className="flex-1"
                    />
                  </div>
                  <Input
                    value={editData?.description || ""}
                    onChange={(e) => setEditData({ ...editData!, description: e.target.value })}
                    placeholder="Description"
                  />
                  <div className="flex items-center">
                    <Switch
                      checked={editData?.isTerminal || false}
                      onCheckedChange={(checked) => setEditData({ ...editData!, isTerminal: checked })}
                    />
                    <span className="ml-2 text-sm">Terminal</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color || "#6B7280" }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{status.statusCode}</span>
                      <span className="font-medium">{status.statusLabel}</span>
                      {status.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {status.isTerminal && (
                        <Badge variant="outline">Terminal</Badge>
                      )}
                    </div>
                    {status.description && (
                      <p className="text-sm text-muted-foreground">{status.description}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {editingId === status.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMutation.mutate({ id: status.id, ...editData! })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditData(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(status.id);
                        setEditData({
                          statusLabel: status.statusLabel,
                          color: status.color || "#6B7280",
                          description: status.description || "",
                          isTerminal: status.isTerminal,
                        });
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Status</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will deactivate the status "{status.statusLabel}".
                            Existing records using this status will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: status.id })}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          ))}
          {statuses.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No custom statuses defined for {selectedEntity}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Export
// ============================================================================
export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <GeneralOrgSettings />
      <UserPreferencesSettings />
      <UnitTypesManager />
      <FinanceStatusManager />
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  Trash,
  Search,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandling";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PricingRule } from "../../../drizzle/schema";

interface RuleFormData {
  name: string;
  description: string;
  adjustmentType:
    | "PERCENT_MARKUP"
    | "PERCENT_MARKDOWN"
    | "DOLLAR_MARKUP"
    | "DOLLAR_MARKDOWN";
  adjustmentValue: string;
  conditions: Record<string, unknown>;
  logicType: "AND" | "OR";
  priority: string;
}

const emptyFormData: RuleFormData = {
  name: "",
  description: "",
  adjustmentType: "PERCENT_MARKUP",
  adjustmentValue: "0",
  conditions: {},
  logicType: "AND",
  priority: "0",
};

export default function PricingRulesPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData);

  // Condition builder state
  const [conditionKey, setConditionKey] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [deleteConditionConfirm, setDeleteConditionConfirm] = useState<
    string | null
  >(null);

  // Fetch pricing rules
  const { data: rules, isLoading } = trpc.pricing.listRules.useQuery();

  // BUG-097 FIX: Use standardized error handling
  // Create mutation
  const createMutation = trpc.pricing.createRule.useMutation({
    onSuccess: () => {
      toast.success("Pricing rule created successfully");
      utils.pricing.listRules.invalidate();
      setCreateDialogOpen(false);
      setFormData(emptyFormData);
    },
    onError: error => {
      showErrorToast(error, { action: "create", resource: "pricing rule" });
    },
  });

  // Update mutation
  const updateMutation = trpc.pricing.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Pricing rule updated successfully");
      utils.pricing.listRules.invalidate();
      setEditDialogOpen(false);
      setSelectedRule(null);
      setFormData(emptyFormData);
    },
    onError: error => {
      showErrorToast(error, { action: "update", resource: "pricing rule" });
    },
  });

  // Delete mutation
  const deleteMutation = trpc.pricing.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Pricing rule deleted successfully");
      utils.pricing.listRules.invalidate();
      setDeleteDialogOpen(false);
      setSelectedRule(null);
    },
    onError: error => {
      showErrorToast(error, { action: "delete", resource: "pricing rule" });
    },
  });

  // Filter rules by search
  const filteredRules =
    rules?.filter(
      rule =>
        rule.name.toLowerCase().includes(search.toLowerCase()) ||
        rule.description?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  // Handle create
  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      adjustmentType: formData.adjustmentType,
      adjustmentValue: parseFloat(formData.adjustmentValue),
      conditions: formData.conditions as any,
      logicType: formData.logicType as any,
      priority: parseInt(formData.priority),
    });
  };

  // Handle edit
  const handleEdit = () => {
    if (!selectedRule) return;

    updateMutation.mutate({
      ruleId: selectedRule.id,
      name: formData.name,
      description: formData.description || undefined,
      adjustmentType: formData.adjustmentType,
      adjustmentValue: parseFloat(formData.adjustmentValue),
      conditions: formData.conditions as any,
      logicType: formData.logicType as any,
      priority: parseInt(formData.priority),
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedRule) return;
    deleteMutation.mutate({ ruleId: selectedRule.id });
  };

  // Open edit dialog
  const openEditDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue.toString(),
      conditions: (rule.conditions as Record<string, unknown>) || {},
      logicType: rule.logicType || "AND",
      priority: rule.priority?.toString() || "0",
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setDeleteDialogOpen(true);
  };

  // Add condition
  const addCondition = () => {
    if (!conditionKey || !conditionValue) return;

    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        [conditionKey]: conditionValue,
      },
    });
    setConditionKey("");
    setConditionValue("");
  };

  // Remove condition
  const removeCondition = (key: string) => {
    const newConditions = { ...formData.conditions };
    delete newConditions[key];
    setFormData({ ...formData, conditions: newConditions });
  };

  // Get adjustment icon
  const getAdjustmentIcon = (type: string) => {
    if (type.includes("MARKUP"))
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  // Get adjustment badge
  const getAdjustmentBadge = (type: string, value: string) => {
    const isPercent = type.includes("PERCENT");
    const isMarkup = type.includes("MARKUP");
    const variant = isMarkup ? "default" : "destructive";
    const symbol = isPercent ? "%" : "$";
    const sign = isMarkup ? "+" : "-";

    return (
      <Badge variant={variant}>
        {sign}
        {value}
        {symbol}
      </Badge>
    );
  };

  // Render rule form
  const renderRuleForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Premium Flower Markup"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe when this rule applies..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="adjustmentType">Adjustment Type</Label>
          <Select
            value={formData.adjustmentType}
            onValueChange={(value: string) =>
              setFormData({ ...formData, adjustmentType: value as any })
            }
          >
            <SelectTrigger id="adjustmentType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT_MARKUP">% Markup</SelectItem>
              <SelectItem value="PERCENT_MARKDOWN">% Markdown</SelectItem>
              <SelectItem value="DOLLAR_MARKUP">$ Markup</SelectItem>
              <SelectItem value="DOLLAR_MARKDOWN">$ Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="adjustmentValue">Adjustment Value</Label>
          <Input
            id="adjustmentValue"
            type="number"
            step="0.01"
            value={formData.adjustmentValue}
            onChange={e =>
              setFormData({ ...formData, adjustmentValue: e.target.value })
            }
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label>Conditions</Label>
        <div className="space-y-2 mt-2">
          {Object.entries(formData.conditions).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2 bg-muted rounded"
            >
              <span className="text-sm flex-1">
                <strong>{key}:</strong> {value as any}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConditionConfirm(key)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder="Condition key (e.g., category)"
              value={conditionKey}
              onChange={e => setConditionKey(e.target.value)}
            />
            <Input
              placeholder="Value (e.g., Flower)"
              value={conditionValue}
              onChange={e => setConditionValue(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addCondition}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="logicType">Logic Type</Label>
          <Select
            value={formData.logicType}
            onValueChange={(value: string) =>
              setFormData({ ...formData, logicType: value as any })
            }
          >
            <SelectTrigger id="logicType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">
                AND (all conditions must match)
              </SelectItem>
              <SelectItem value="OR">OR (any condition can match)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={e =>
              setFormData({ ...formData, priority: e.target.value })
            }
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading pricing rules...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Pricing Rules</CardTitle>
              <CardDescription>
                Manage pricing adjustments based on product conditions
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Logic</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No pricing rules found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAdjustmentIcon(rule.adjustmentType)}
                          {getAdjustmentBadge(
                            rule.adjustmentType,
                            rule.adjustmentValue.toString()
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {
                            Object.keys(
                              (rule.conditions as Record<string, unknown>) || {}
                            ).length
                          }{" "}
                          condition(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.logicType}</Badge>
                      </TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.isActive ? "default" : "secondary"}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(rule)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Pricing Rule</DialogTitle>
            <DialogDescription>
              Define a new pricing rule with conditions and adjustments
            </DialogDescription>
          </DialogHeader>
          {renderRuleForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pricing Rule</DialogTitle>
            <DialogDescription>
              Update the pricing rule configuration
            </DialogDescription>
          </DialogHeader>
          {renderRuleForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRule?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Condition Delete Confirmation */}
      <ConfirmDialog
        open={deleteConditionConfirm !== null}
        onOpenChange={open => !open && setDeleteConditionConfirm(null)}
        title="Remove Condition"
        description="Are you sure you want to remove this condition from the pricing rule?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteConditionConfirm) {
            removeCondition(deleteConditionConfirm);
          }
          setDeleteConditionConfirm(null);
        }}
      />
    </div>
  );
}

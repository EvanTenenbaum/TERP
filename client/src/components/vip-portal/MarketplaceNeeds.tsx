import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, X, Calendar, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MarketplaceNeedsProps {
  clientId: number;
  config: any;
}

export function MarketplaceNeeds({ clientId, config }: MarketplaceNeedsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<any>(null);

  const { data: needs, refetch } = trpc.vipPortal.marketplace.getNeeds.useQuery({
    clientId,
  });

  const createMutation = trpc.vipPortal.marketplace.createNeed.useMutation({
    onSuccess: () => {
      toast.success("Need posted successfully");
      setCreateDialogOpen(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to post need");
    },
  });

  const updateMutation = trpc.vipPortal.marketplace.updateNeed.useMutation({
    onSuccess: () => {
      toast.success("Need updated successfully");
      setEditDialogOpen(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update need");
    },
  });

  const cancelMutation = trpc.vipPortal.marketplace.cancelNeed.useMutation({
    onSuccess: () => {
      toast.success("Need cancelled");
      refetch();
    },
    onError: () => {
      toast.error("Failed to cancel need");
    },
  });

  const handleCreate = (formData: any) => {
    const expirationDays = config.advancedOptions?.defaultNeedsExpiration === "1_DAY" ? 1 :
                           config.advancedOptions?.defaultNeedsExpiration === "1_WEEK" ? 7 :
                           config.advancedOptions?.defaultNeedsExpiration === "1_MONTH" ? 30 : 5;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    createMutation.mutate({
      clientId,
      ...formData,
      expiresAt,
    });
  };

  const handleCancel = (needId: number) => {
    if (window.confirm("Are you sure you want to cancel this need?")) {
      // clientId is derived server-side from the VIP session token
      cancelMutation.mutate({ id: needId });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">My Needs</h2>
          <p className="text-sm text-muted-foreground">Products you're looking to purchase</p>
        </div>
        {config.featuresConfig?.marketplaceNeeds?.allowCreate && (
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Post a Need
          </Button>
        )}
      </div>

      {/* Active Needs - Mobile-First Card Layout */}
      {config.featuresConfig?.marketplaceNeeds?.showActiveListings && (
        <div className="space-y-3">
          {needs && needs.length > 0 ? (
            needs.map((need: any) => (
              <Card key={need.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                        <Package className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{need.strain || "Any Strain"}</span>
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {need.category || "Any Category"}
                      </CardDescription>
                    </div>
                    <Badge variant={need.status === "ACTIVE" ? "default" : "secondary"} className="flex-shrink-0">
                      {need.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Quantity</p>
                      <p className="font-medium">
                        {need.quantityMin && need.quantityMax
                          ? `${need.quantityMin}-${need.quantityMax} lbs`
                          : need.quantityMin
                          ? `${need.quantityMin}+ lbs`
                          : "Any"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Max Price</p>
                      <p className="font-medium">
                        {need.priceMax ? `$${need.priceMax}/lb` : "Negotiable"}
                      </p>
                    </div>
                  </div>

                  {/* Expiration */}
                  {need.expiresAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        Expires {new Date(need.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {need.notes && (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Notes</p>
                      <p className="text-sm line-clamp-2">{need.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {config.featuresConfig?.marketplaceNeeds?.allowEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedNeed(need);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {config.featuresConfig?.marketplaceNeeds?.allowCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCancel(need.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No active needs</p>
                {config.featuresConfig?.marketplaceNeeds?.allowCreate && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Need
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Need Dialog */}
      <CreateNeedDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        config={config}
      />

      {/* Edit Need Dialog */}
      {selectedNeed && (
        <EditNeedDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          need={selectedNeed}
          onSubmit={(data: any) => updateMutation.mutate({ needId: selectedNeed.id, clientId, ...data })}
          config={config}
        />
      )}
    </div>
  );
}

function CreateNeedDialog({ open, onOpenChange, onSubmit, config }: any) {
  const [formData, setFormData] = useState({
    strain: "",
    productName: "",
    category: "",
    subcategory: "",
    grade: "",
    quantityMin: "",
    quantityMax: "",
    priceMax: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantityMin: formData.quantityMin ? parseFloat(formData.quantityMin) : undefined,
      quantityMax: formData.quantityMax ? parseFloat(formData.quantityMax) : undefined,
      priceMax: formData.priceMax ? parseFloat(formData.priceMax) : undefined,
    });
    setFormData({
      strain: "",
      productName: "",
      category: "",
      subcategory: "",
      grade: "",
      quantityMin: "",
      quantityMax: "",
      priceMax: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a New Need</DialogTitle>
          <DialogDescription>
            Tell us what you're looking to purchase
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLOWER">Flower</SelectItem>
                  <SelectItem value="CONCENTRATE">Concentrate</SelectItem>
                  <SelectItem value="VAPE">Vape</SelectItem>
                  <SelectItem value="EDIBLE">Edible</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Flower vs Non-Flower */}
            {formData.category === "FLOWER" ? (
              // FLOWER: Only strain input
              <div className="space-y-2">
                <Label htmlFor="strain">Strain *</Label>
                <Input
                  id="strain"
                  value={formData.strain}
                  onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                  placeholder="e.g., Blue Dream"
                  required
                />
              </div>
            ) : formData.category ? (
              // NON-FLOWER: Product name + optional strain
              <>
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name (or Strain) *</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="e.g., Ceramic 510 Cart, Mixed Fruit Gummies"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strain">Strain (Optional)</Label>
                  <Input
                    id="strain"
                    value={formData.strain}
                    onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                    placeholder="e.g., OG Kush"
                  />
                </div>
              </>
            ) : (
              // No category selected yet
              <div className="space-y-2">
                <Label>Strain or Product Name</Label>
                <Input
                  disabled
                  placeholder="Select a category first"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantityMin" className="text-sm">Min Qty (lbs)</Label>
                <Input
                  id="quantityMin"
                  type="number"
                  step="0.01"
                  value={formData.quantityMin}
                  onChange={(e) => setFormData({ ...formData, quantityMin: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityMax" className="text-sm">Max Qty (lbs)</Label>
                <Input
                  id="quantityMax"
                  type="number"
                  step="0.01"
                  value={formData.quantityMax}
                  onChange={(e) => setFormData({ ...formData, quantityMax: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMax">Max Price ($/lb)</Label>
              <Input
                id="priceMax"
                type="number"
                step="0.01"
                value={formData.priceMax}
                onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                placeholder="500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any specific requirements..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Post Need</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditNeedDialog({ open, onOpenChange, need, onSubmit }: any) {
  const [formData, setFormData] = useState({
    strain: need.strain || "",
    productName: need.productName || "",
    category: need.category || "",
    quantityMin: need.quantityMin?.toString() || "",
    quantityMax: need.quantityMax?.toString() || "",
    priceMax: need.priceMax?.toString() || "",
    notes: need.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantityMin: formData.quantityMin ? parseFloat(formData.quantityMin) : undefined,
      quantityMax: formData.quantityMax ? parseFloat(formData.quantityMax) : undefined,
      priceMax: formData.priceMax ? parseFloat(formData.priceMax) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Need</DialogTitle>
          <DialogDescription>Update your buying request</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLOWER">Flower</SelectItem>
                  <SelectItem value="CONCENTRATE">Concentrate</SelectItem>
                  <SelectItem value="VAPE">Vape</SelectItem>
                  <SelectItem value="EDIBLE">Edible</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Flower vs Non-Flower */}
            {formData.category === "FLOWER" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-strain">Strain *</Label>
                <Input
                  id="edit-strain"
                  value={formData.strain}
                  onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                  required
                />
              </div>
            ) : formData.category ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-productName">Product Name (or Strain) *</Label>
                  <Input
                    id="edit-productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-strain">Strain (Optional)</Label>
                  <Input
                    id="edit-strain"
                    value={formData.strain}
                    onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-strain">Strain</Label>
                <Input
                  id="edit-strain"
                  value={formData.strain}
                  onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-quantityMin" className="text-sm">Min Qty (lbs)</Label>
                <Input
                  id="edit-quantityMin"
                  type="number"
                  step="0.01"
                  value={formData.quantityMin}
                  onChange={(e) => setFormData({ ...formData, quantityMin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantityMax" className="text-sm">Max Qty (lbs)</Label>
                <Input
                  id="edit-quantityMax"
                  type="number"
                  step="0.01"
                  value={formData.quantityMax}
                  onChange={(e) => setFormData({ ...formData, quantityMax: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priceMax">Max Price ($/lb)</Label>
              <Input
                id="edit-priceMax"
                type="number"
                step="0.01"
                value={formData.priceMax}
                onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Update Need</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

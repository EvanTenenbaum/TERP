import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Package, Edit, XCircle, Calendar, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface MarketplaceSupplyProps {
  clientId: number;
  config: any;
}

export function MarketplaceSupply({ clientId, config }: MarketplaceSupplyProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    strain: "",
    productName: "",
    category: "",
    quantity: "",
    unit: "lb",
    priceMin: "",
    priceMax: "",
    notes: "",
    expiresInDays: "5",
  });

  const utils = trpc.useUtils();
  const { data: supplyData } = trpc.vipPortal.marketplace.getSupply.useQuery({ clientId });
  const createSupply = trpc.vipPortal.marketplace.createSupply.useMutation({
    onSuccess: () => {
      utils.vipPortal.marketplace.getSupply.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
  });
  const updateSupply = trpc.vipPortal.marketplace.updateSupply.useMutation({
    onSuccess: () => {
      utils.vipPortal.marketplace.getSupply.invalidate();
      setEditingSupply(null);
      resetForm();
    },
  });
  const cancelSupply = trpc.vipPortal.marketplace.cancelSupply.useMutation({
    onSuccess: () => {
      utils.vipPortal.marketplace.getSupply.invalidate();
    },
  });

  const resetForm = () => {
    setFormData({
      strain: "",
      productName: "",
      category: "",
      quantity: "",
      unit: "lb",
      priceMin: "",
      priceMax: "",
      notes: "",
      expiresInDays: "5",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      clientId,
      strain: formData.strain,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      priceMin: formData.priceMin ? parseFloat(formData.priceMin) : undefined,
      priceMax: formData.priceMax ? parseFloat(formData.priceMax) : undefined,
      notes: formData.notes || undefined,
      expiresInDays: parseInt(formData.expiresInDays),
    };

    if (editingSupply) {
      updateSupply.mutate({ id: editingSupply.id, ...payload });
    } else {
      createSupply.mutate(payload);
    }
  };

  const handleEdit = (supply: any) => {
    setEditingSupply(supply);
    setFormData({
      strain: supply.strain,
      productName: supply.productName || "",
      category: supply.category,
      quantity: supply.quantity.toString(),
      unit: supply.unit,
      priceMin: supply.priceMin?.toString() || "",
      priceMax: supply.priceMax?.toString() || "",
      notes: supply.notes || "",
      expiresInDays: "5",
    });
  };

  const handleCancel = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this listing?")) {
      cancelSupply.mutate({ id });
    }
  };

  const getStatusBadge = (expiresAt: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 1) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Expires Soon</Badge>;
    } else {
      return <Badge variant="secondary">Active</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">What I Have to Sell</h2>
          <p className="text-sm text-muted-foreground">Post your available inventory</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Post Supply</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post Supply</DialogTitle>
              <DialogDescription>
                List inventory you have available for sale
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flower">Flower</SelectItem>
                    <SelectItem value="vape">Vape</SelectItem>
                    <SelectItem value="edible">Edible</SelectItem>
                    <SelectItem value="concentrate">Concentrate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional: Flower vs Non-Flower */}
              {formData.category === "flower" ? (
                <div className="space-y-2">
                  <Label htmlFor="strain">Strain Name *</Label>
                  <Input
                    id="strain"
                    value={formData.strain}
                    onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                    placeholder="e.g., Blue Dream"
                    required
                  />
                </div>
              ) : formData.category ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name (or Strain) *</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder="e.g., Ceramic 510 Cart"
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
                <div className="space-y-2">
                  <Label>Product Name or Strain</Label>
                  <Input disabled placeholder="Select a category first" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="priceMin">Min Price ($/unit)</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    step="0.01"
                    value={formData.priceMin}
                    onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                    placeholder="50.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Max Price ($/unit)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    step="0.01"
                    value={formData.priceMax}
                    onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                    placeholder="75.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresInDays">Expires In (Days)</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="COA available, indoor grown, etc."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSupply.isPending}>
                  {createSupply.isPending ? "Posting..." : "Post Supply"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supply Listings - Mobile-First Card Layout */}
      <div className="space-y-3">
        {supplyData && supplyData.length > 0 ? (
          supplyData.map((supply: any) => (
            <Card key={supply.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                      <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="truncate">{supply.strain}</span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {supply.category.charAt(0).toUpperCase() + supply.category.slice(1)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(supply.expiresAt)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Quantity</p>
                    <p className="font-medium text-base">
                      {supply.quantity} {supply.unit}
                    </p>
                  </div>
                  {(supply.priceMin || supply.priceMax) && (
                    <div>
                      <p className="text-muted-foreground text-xs">Price Range</p>
                      <p className="font-medium text-base flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {supply.priceMin && supply.priceMax
                          ? `${supply.priceMin} - ${supply.priceMax}`
                          : supply.priceMin || supply.priceMax}
                        <span className="text-xs text-muted-foreground">/{supply.unit}</span>
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires
                    </p>
                    <p className="font-medium text-sm">
                      {new Date(supply.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {supply.notes && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm">{supply.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Dialog open={editingSupply?.id === supply.id} onOpenChange={(open) => !open && setEditingSupply(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(supply)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Supply</DialogTitle>
                        <DialogDescription>
                          Update your supply listing
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Same form fields as create */}
                        <div className="space-y-2">
                          <Label htmlFor="edit-strain">Strain Name *</Label>
                          <Input
                            id="edit-strain"
                            value={formData.strain}
                            onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-category">Category *</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                            required
                          >
                            <SelectTrigger id="edit-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flower">Flower</SelectItem>
                              <SelectItem value="trim">Trim</SelectItem>
                              <SelectItem value="biomass">Biomass</SelectItem>
                              <SelectItem value="isolate">Isolate</SelectItem>
                              <SelectItem value="distillate">Distillate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="edit-quantity">Quantity *</Label>
                            <Input
                              id="edit-quantity"
                              type="number"
                              step="0.01"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-unit">Unit *</Label>
                            <Select
                              value={formData.unit}
                              onValueChange={(value) => setFormData({ ...formData, unit: value })}
                            >
                              <SelectTrigger id="edit-unit">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lb">Pounds (lb)</SelectItem>
                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                <SelectItem value="g">Grams (g)</SelectItem>
                                <SelectItem value="oz">Ounces (oz)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="edit-priceMin">Min Price</Label>
                            <Input
                              id="edit-priceMin"
                              type="number"
                              step="0.01"
                              value={formData.priceMin}
                              onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-priceMax">Max Price</Label>
                            <Input
                              id="edit-priceMax"
                              type="number"
                              step="0.01"
                              value={formData.priceMax}
                              onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-notes">Additional Notes</Label>
                          <Textarea
                            id="edit-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                          />
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setEditingSupply(null)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateSupply.isPending}>
                            {updateSupply.isPending ? "Updating..." : "Update Supply"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCancel(supply.id)}
                    disabled={cancelSupply.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No supply listings yet</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Post Your First Supply
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

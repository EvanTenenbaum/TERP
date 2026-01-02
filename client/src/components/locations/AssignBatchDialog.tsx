/**
 * AssignBatchDialog - Assign batch to location
 * Part of QA-063: Location & Warehouse Management UI
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Location {
  id: number;
  site: string;
  zone: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
}

interface BatchItem {
  batch: {
    id: number;
    code: string | null;
    sku: string | null;
  };
  product: {
    nameCanonical: string | null;
  } | null;
}

interface AssignBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    batchId: number;
    site: string;
    zone?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    quantity: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const AssignBatchDialog = React.memo(function AssignBatchDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: AssignBatchDialogProps): React.ReactElement {
  const [batchId, setBatchId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: locations } = trpc.locations.getAll.useQuery(
    { isActive: true, limit: 500 },
    { enabled: open }
  );

  const { data: inventoryData } = trpc.inventory.list.useQuery(
    { limit: 500 },
    { enabled: open }
  );

  useEffect(() => {
    if (open) {
      setBatchId("");
      setSelectedLocationId("");
      setQuantity("");
      setErrors({});
    }
  }, [open]);

  const selectedLocation = locations?.find(
    (l: Location) => l.id === Number(selectedLocationId)
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!batchId) {
      newErrors.batchId = "Please select a batch";
    }

    if (!selectedLocationId) {
      newErrors.location = "Please select a location";
    }

    if (!quantity.trim()) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [batchId, selectedLocationId, quantity]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate() || !selectedLocation) {
        return;
      }

      await onSubmit({
        batchId: Number(batchId),
        site: selectedLocation.site,
        zone: selectedLocation.zone || undefined,
        rack: selectedLocation.rack || undefined,
        shelf: selectedLocation.shelf || undefined,
        bin: selectedLocation.bin || undefined,
        quantity,
      });
    },
    [batchId, selectedLocation, quantity, onSubmit, validate]
  );

  const formatLocationName = (location: Location): string => {
    const parts = [location.site];
    if (location.zone) parts.push(`Zone ${location.zone}`);
    if (location.rack) parts.push(`Rack ${location.rack}`);
    if (location.shelf) parts.push(`Shelf ${location.shelf}`);
    if (location.bin) parts.push(`Bin ${location.bin}`);
    return parts.join(" > ");
  };

  const formatBatchName = (item: BatchItem): string => {
    const code = item.batch.code || item.batch.sku || `#${item.batch.id}`;
    const productName = item.product?.nameCanonical || "Unknown Product";
    return `${code} - ${productName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Batch to Location</DialogTitle>
            <DialogDescription>
              Select a batch and location to assign inventory placement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="batch">
                Batch <span className="text-destructive">*</span>
              </Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger
                  id="batch"
                  aria-invalid={Boolean(errors.batchId)}
                >
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryData?.items?.map((item: BatchItem) => (
                    <SelectItem key={item.batch.id} value={String(item.batch.id)}>
                      {formatBatchName(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.batchId && (
                <p className="text-sm text-destructive">{errors.batchId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">
                Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger
                  id="location"
                  aria-invalid={Boolean(errors.location)}
                >
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location: Location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {formatLocationName(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                placeholder="e.g., 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={Boolean(errors.quantity)}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

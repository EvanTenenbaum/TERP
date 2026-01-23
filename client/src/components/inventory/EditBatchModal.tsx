import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { FormSkeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Batch status type for type-safe status updates
type BatchStatus =
  | "AWAITING_INTAKE"
  | "LIVE"
  | "PHOTOGRAPHY_COMPLETE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED";

interface EditBatchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batchId: number;
}

export function EditBatchModal({
  open,
  onClose,
  onSuccess,
  batchId,
}: EditBatchModalProps) {
  const [formData, setFormData] = useState({
    status: "",
    locationZone: "",
    locationRack: "",
    locationShelf: "",
    locationBin: "",
    quantity: "",
  });

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [deleteMediaConfirm, setDeleteMediaConfirm] = useState<number | null>(null);

  // Fetch batch details
  const { data: batch, isLoading } = trpc.inventory.getById.useQuery(batchId, {
    enabled: open && batchId > 0,
  });

  // Fetch settings data
  const { data: locations } = trpc.settings.locations.list.useQuery();

  const updateBatchMutation = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully!");
      onClose();
      onSuccess?.();
    },
    onError: error => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  useEffect(() => {
    if (batch) {
      setFormData({
        status: batch.batch.batchStatus,
        locationZone: batch.locations?.[0]?.zone || "",
        locationRack: batch.locations?.[0]?.rack || "",
        locationShelf: batch.locations?.[0]?.shelf || "",
        locationBin: batch.locations?.[0]?.bin || "",
        quantity: batch.batch.onHandQty.toString(),
      });
    }
  }, [batch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateBatchMutation.mutate({
      id: batchId,
      status: formData.status as BatchStatus,
    });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setMediaFiles([...mediaFiles, ...newFiles]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Loading product details...</DialogDescription>
          </DialogHeader>
          <FormSkeleton fields={5} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product - {batch?.batch.sku}</DialogTitle>
          <DialogDescription>
            Update product details, location, and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {/* MEET-053: User-friendly terminology */}
                <Label className="text-sm text-gray-600">Product Code</Label>
                <p className="font-medium">{batch?.batch.sku}</p>
              </div>
              <div>
                {/* MEET-053: User-friendly terminology */}
                <Label className="text-sm text-gray-600">Item Code</Label>
                <p className="font-medium">{batch?.batch.code}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Current Status</Label>
                <p className="font-medium">{batch?.batch.batchStatus}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Quantity</Label>
                <p className="font-medium">{batch?.batch.onHandQty} units</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={value =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AWAITING_INTAKE">Awaiting Intake</SelectItem>
                <SelectItem value="AWAITING_STAGING">
                  Awaiting Staging
                </SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="PHOTOGRAPHY_COMPLETE">
                  Photography Complete
                </SelectItem>
                <SelectItem value="QUARANTINED">Quarantine</SelectItem>
                <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Storage Location */}
          <div className="space-y-4">
            <Label>Storage Location</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Select
                  value={formData.locationZone}
                  onValueChange={value =>
                    setFormData({ ...formData, locationZone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map(
                      loc =>
                        loc.zone && (
                          <SelectItem key={loc.id} value={loc.zone}>
                            {loc.zone}
                          </SelectItem>
                        )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rack">Rack</Label>
                <Input
                  id="rack"
                  value={formData.locationRack}
                  onChange={e =>
                    setFormData({ ...formData, locationRack: e.target.value })
                  }
                  placeholder="e.g., R1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelf">Shelf</Label>
                <Input
                  id="shelf"
                  value={formData.locationShelf}
                  onChange={e =>
                    setFormData({ ...formData, locationShelf: e.target.value })
                  }
                  placeholder="e.g., S3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bin">Bin</Label>
                <Input
                  id="bin"
                  value={formData.locationBin}
                  onChange={e =>
                    setFormData({ ...formData, locationBin: e.target.value })
                  }
                  placeholder="e.g., B12"
                />
              </div>
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Add Product Media</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload-edit"
              />
              <label
                htmlFor="media-upload-edit"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload images or videos
                </span>
              </label>

              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm truncate flex-1">
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteMediaConfirm(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateBatchMutation.isPending}>
              {updateBatchMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ConfirmDialog
        open={deleteMediaConfirm !== null}
        onOpenChange={(open) => !open && setDeleteMediaConfirm(null)}
        title="Remove Media"
        description="Are you sure you want to remove this media file?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteMediaConfirm !== null) {
            removeMedia(deleteMediaConfirm);
          }
          setDeleteMediaConfirm(null);
        }}
      />
    </Dialog>
  );
}

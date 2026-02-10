/**
 * Photography Module Page (WS-010)
 * WS-010A: Integrated PhotographyModule for upload functionality
 * Simple image upload and management for product photography
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Search, CheckCircle, Clock, Upload } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  EmptyState,
  ErrorState,
  emptyStateConfigs,
} from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PhotographyModule,
  ProductPhoto,
} from "@/components/inventory/PhotographyModule";

interface SelectedBatch {
  batchId: number;
  productName: string;
  strainName: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  addedAt?: Date | string | null;
}

/**
 * Convert a File to base64 string (without the data URL prefix)
 */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64String = reader.result.split(",")[1];
        resolve(base64String || "");
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function PhotographyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<SelectedBatch | null>(
    null
  );
  const [modulePhotos, setModulePhotos] = useState<ProductPhoto[]>([]);

  // Queries
  const {
    data: queue,
    isLoading,
    refetch,
    error,
    isError,
  } = trpc.photography.getQueue.useQuery({
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as "PENDING" | "IN_PROGRESS" | "COMPLETED"),
    search: searchTerm || undefined,
  });

  // Mutations
  const markComplete = trpc.photography.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Item marked as photographed");
      refetch();
      setSelectedItems([]);
    },
    onError: mutationError => {
      toast.error(mutationError.message);
    },
  });

  // WS-010A: Use inventory.uploadMedia for file uploads (base64 pattern)
  const uploadMedia = trpc.inventory.uploadMedia.useMutation({
    onError: mutationError => {
      toast.error(mutationError.message);
    },
  });

  const handleMarkComplete = (batchId: number) => {
    markComplete.mutate({ batchId });
  };

  const handleBulkMarkComplete = () => {
    selectedItems.forEach(batchId => {
      markComplete.mutate({ batchId });
    });
  };

  const toggleSelection = (batchId: number) => {
    setSelectedItems(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const selectAll = () => {
    if (queue?.items) {
      // Only select items that can actually be completed (must have at least one photo).
      const pendingIds = queue.items
        .filter(item => item.status === "IN_PROGRESS")
        .map(item => item.batchId);
      setSelectedItems(pendingIds);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Camera className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const handleOpenUploadDialog = (item: SelectedBatch) => {
    setSelectedBatch(item);
    setModulePhotos([]);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = (open: boolean) => {
    setUploadDialogOpen(open);
    if (!open) {
      setSelectedBatch(null);
      setModulePhotos([]);
    }
  };

  /**
   * WS-010A: Handle photo uploads via PhotographyModule
   * Converts files to base64 and uploads via inventory.uploadMedia
   * Then marks the batch as complete with the uploaded URLs
   */
  const handleUploadPhotos = async (files: File[]): Promise<ProductPhoto[]> => {
    if (!selectedBatch) {
      throw new Error("No batch selected for upload");
    }

    const uploadedUrls: string[] = [];

    // Upload each file individually using the existing uploadMedia mutation
    for (const file of files) {
      try {
        const base64Data = await fileToBase64(file);

        const result = await uploadMedia.mutateAsync({
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
          batchId: selectedBatch.batchId,
        });

        if (result.url) {
          uploadedUrls.push(result.url);
        }
      } catch (uploadError) {
        console.error(`Failed to upload ${file.name}:`, uploadError);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error("No files were uploaded successfully");
    }

    // Mark the batch as complete with the uploaded image URLs
    await markComplete.mutateAsync({
      batchId: selectedBatch.batchId,
      imageUrls: uploadedUrls,
    });

    // Create ProductPhoto objects for the PhotographyModule
    const uploadedPhotos: ProductPhoto[] = uploadedUrls.map((url, index) => ({
      id: `${selectedBatch.batchId}-${Date.now()}-${index}`,
      url,
      thumbnailUrl: url,
      filename: files[index]?.name ?? `photo-${index + 1}.jpg`,
      isPrimary:
        index === 0 &&
        (modulePhotos.length === 0 ||
          modulePhotos.every(photo => !photo.isPrimary)),
      order: modulePhotos.length + index,
      uploadedAt: new Date(),
      size: files[index]?.size ?? 0,
    }));

    setModulePhotos(prev => [...prev, ...uploadedPhotos]);

    toast.success(`Uploaded ${uploadedUrls.length} photo(s) successfully`);

    // Close dialog after successful upload
    setUploadDialogOpen(false);
    setSelectedBatch(null);

    return uploadedPhotos;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Photography Queue</h1>
            <p className="text-muted-foreground">
              Manage product photography workflow
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.stats?.pending || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.stats?.inProgress || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {queue?.stats?.completedToday || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queue?.items?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} selected
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkMarkComplete}
                    disabled={markComplete.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Selected Complete
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All In Progress
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading photography queue..." />
          ) : isError ? (
            <ErrorState
              title="Failed to load photography queue"
              description={
                error?.message ||
                "An error occurred while loading the photography queue."
              }
              onRetry={() => refetch()}
            />
          ) : !queue?.items?.length ? (
            <EmptyState {...emptyStateConfigs.photography} size="sm" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedItems.length ===
                        queue.items.filter(i => i.status === "IN_PROGRESS")
                          .length
                      }
                      onCheckedChange={checked => {
                        if (checked) {
                          selectAll();
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.items.map(item => (
                  <TableRow key={item.batchId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.batchId)}
                        onCheckedChange={() => toggleSelection(item.batchId)}
                        disabled={item.status !== "IN_PROGRESS"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell>{item.strainName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.batchId}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.addedAt
                        ? new Date(item.addedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {item.status !== "COMPLETED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenUploadDialog({
                                batchId: item.batchId,
                                productName: item.productName,
                                strainName: item.strainName ?? null,
                                status: item.status,
                                addedAt: item.addedAt,
                              })
                            }
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Photos
                          </Button>
                          {item.status === "IN_PROGRESS" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkComplete(item.batchId)}
                              disabled={markComplete.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* WS-010A: Upload Dialog with PhotographyModule */}
      <Dialog open={uploadDialogOpen} onOpenChange={handleCloseUploadDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
            <DialogDescription>
              {selectedBatch
                ? `Add photos for ${selectedBatch.productName} (Batch #${selectedBatch.batchId})`
                : "Select a batch to upload photos"}
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <PhotographyModule
              productId={selectedBatch.batchId}
              productName={selectedBatch.productName}
              photos={modulePhotos}
              onPhotosChange={setModulePhotos}
              onUpload={handleUploadPhotos}
              maxPhotos={10}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
